import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface EmergencyContact {
  id: string;
  contact_name: string;
  phone: string;
  relationship: string | null;
}

const EmergencyButton = () => {
  const [showContact, setShowContact] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loadingContact, setLoadingContact] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const hideFloatingButton = location.pathname === "/messages";

  const fetchEmergencyContacts = async () => {
    if (!user) {
      setContacts([]);
      return;
    }

    setLoadingContact(true);
    const { data } = await supabase
      .from("emergency_contacts")
      .select("id, contact_name, phone, relationship")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    setContacts(data ?? []);
    setLoadingContact(false);
  };

  useEffect(() => {
    fetchEmergencyContacts();
  }, [user]);

  useEffect(() => {
    if (showContact) {
      fetchEmergencyContacts();
    }
  }, [showContact]);

  return (
    <>
      {showContact && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4" onClick={() => setShowContact(false)}>
          <div className="w-full max-w-sm rounded-lg bg-card p-6 text-center" onClick={e => e.stopPropagation()}>
            <Phone size={36} className="mx-auto mb-3 text-emergency" />
            <h2 className="mb-2 text-senior-xl font-bold">{t("emergency.title")}</h2>
            <div className="mb-4 space-y-2 text-left">
              {loadingContact ? (
                <p className="text-senior-base text-muted-foreground text-center">{t("emergency.loading")}</p>
              ) : contacts.length > 0 ? (
                contacts.map((contact) => (
                  <a
                    key={contact.id}
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/30"
                  >
                    <div>
                      <p className="text-senior-base font-semibold">{contact.contact_name}</p>
                      <p className="text-senior-sm text-muted-foreground">{contact.relationship || t("emergency.title")}</p>
                      <p className="text-senior-base font-bold text-emergency">{contact.phone}</p>
                    </div>
                    <span className="rounded-lg bg-emergency px-3 py-2 text-senior-sm font-bold text-emergency-foreground">
                      {t("emergency.callNow")}
                    </span>
                  </a>
                ))
              ) : (
                <div className="text-center">
                  <p className="text-senior-base font-semibold">{t("emergency.noContact")}</p>
                  <p className="text-senior-sm text-muted-foreground">{t("emergency.addContact")}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowContact(false)}
                className="flex-1 rounded-lg border border-border py-3 text-senior-base font-semibold"
              >
                {t("emergency.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {!hideFloatingButton && (
        <button
          onClick={() => setShowContact(true)}
          className="fixed bottom-28 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emergency text-emergency-foreground shadow-lg animate-pulse-gentle md:bottom-6"
          aria-label="Emergency Call"
        >
          <Phone size={22} />
        </button>
      )}
    </>
  );
};

export default EmergencyButton;
