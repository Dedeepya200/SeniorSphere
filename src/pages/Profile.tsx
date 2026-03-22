import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, MapPin, LogOut, Shield, Heart, Save, UserPlus, CheckCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EmergencyContact {
  id: string;
  contact_name: string;
  phone: string;
  email: string | null;
  relationship: string | null;
}

interface FamilyConnection {
  id: string;
  family_user_id: string;
  family_name?: string;
}

const Profile = () => {
  const { user, profile, role, signOut, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [community, setCommunity] = useState(profile?.community || "");

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecEmail, setEcEmail] = useState("");
  const [ecRelation, setEcRelation] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);

  const [familyConnections, setFamilyConnections] = useState<FamilyConnection[]>([]);
  const [allowFamilyView, setAllowFamilyView] = useState(false);

  const fetchEmergencyContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setEmergencyContacts(data);
  };

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      if (role === "senior") {
        await fetchEmergencyContacts();

        // Fetch allow_family_view
        const { data: profileData } = await supabase
          .from("profiles")
          .select("allow_family_view")
          .eq("user_id", user.id)
          .single();
        if (profileData) setAllowFamilyView(profileData.allow_family_view ?? false);

        const { data: famData } = await supabase
          .from("family_connections")
          .select("id, family_user_id")
          .eq("senior_user_id", user.id);
        if (famData && famData.length > 0) {
          const famIds = famData.map(f => f.family_user_id);
          const { data: famProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", famIds);
          const connections = famData.map(f => ({
            ...f,
            family_name: famProfiles?.find(p => p.user_id === f.family_user_id)?.display_name || "Family Member",
          }));
          setFamilyConnections(connections);
        }
      }
    };
    loadData();
  }, [user, role]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), community: community.trim(), updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      refreshProfile();
    }
  };

  const addEmergencyContact = async () => {
    if (!user || !ecName.trim() || !ecPhone.trim()) return;
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user.id,
      contact_name: ecName.trim(),
      phone: ecPhone.trim(),
      email: ecEmail.trim().toLowerCase() || null,
      relationship: ecRelation.trim() || null,
    });
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(t("profile.saveContact") + " ✓");
      setEcName("");
      setEcPhone("");
      setEcEmail("");
      setEcRelation("");
      setShowAddContact(false);
      fetchEmergencyContacts();
    }
  };

  const deleteEmergencyContact = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    toast.success("Contact removed");
    fetchEmergencyContacts();
  };

  return (
    <div className="pb-6 space-y-5">
      <h1 className="text-senior-2xl font-bold">{t("profile.title")}</h1>

      {/* Avatar & Info */}
      <div className="rounded-lg bg-card p-5 border border-border">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <User size={32} className="text-primary" />
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-senior-xl font-bold rounded-lg border border-input bg-background px-3 py-2 w-full"
              />
            ) : (
              <h2 className="text-senior-xl font-bold">{profile?.display_name || "User"}</h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              {role === "moderator" && <Shield size={16} className="text-primary" />}
              {role === "family_member" && <Heart size={16} className="text-help" />}
              <p className="text-senior-base text-muted-foreground">{t(`role.${role || "senior"}`)}</p>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-senior-sm mt-1">
              <MapPin size={14} />
              {editing ? (
                <input
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  className="rounded border border-input bg-background px-2 py-1 text-senior-sm"
                />
              ) : (
                <span>{profile?.community || t("profile.noCommunity")}</span>
              )}
            </div>
            <p className="text-senior-sm text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {editing ? (
            <>
              <button onClick={saveProfile} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base">
                <Save size={18} /> {t("profile.save")}
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-border py-3 font-semibold text-senior-base">
                {t("profile.cancel")}
              </button>
            </>
          ) : (
            <button onClick={() => { setDisplayName(profile?.display_name || ""); setCommunity(profile?.community || ""); setEditing(true); }} className="w-full rounded-lg border-2 border-primary py-3 font-bold text-primary text-senior-base">
              {t("profile.editProfile")}
            </button>
          )}
        </div>
      </div>

      {/* Emergency Contacts - Multiple */}
      {role === "senior" && (
        <div className="rounded-lg bg-card p-5 border border-border">
          <h3 className="text-senior-lg font-bold mb-4 flex items-center gap-2">
            <Phone size={20} className="text-emergency" /> {t("profile.emergencyContact")}
          </h3>

          {/* Existing contacts list */}
          {emergencyContacts.length > 0 && (
            <div className="space-y-2 mb-4">
              {emergencyContacts.map(ec => (
                <div key={ec.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-senior-base font-semibold">{ec.contact_name}</p>
                    <p className="text-senior-sm text-muted-foreground">
                      {ec.phone}
                      {ec.email ? ` • ${ec.email}` : ""}
                      {ec.relationship ? ` • ${ec.relationship}` : ""}
                    </p>
                  </div>
                  <button onClick={() => deleteEmergencyContact(ec.id)} className="rounded-md p-2 text-emergency hover:bg-emergency/10">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new contact form */}
          {showAddContact ? (
            <div className="space-y-3">
              <input placeholder={t("profile.contactName")} value={ecName} onChange={(e) => setEcName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base" />
              <input placeholder={t("profile.phone")} value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base" />
              <input type="email" placeholder={t("profile.emailOptional")} value={ecEmail} onChange={(e) => setEcEmail(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base" />
              <input placeholder={t("profile.relationship")} value={ecRelation} onChange={(e) => setEcRelation(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base" />
              <div className="flex gap-2">
                <button onClick={addEmergencyContact} disabled={!ecName.trim() || !ecPhone.trim()} className="flex-1 rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base disabled:opacity-50">
                  {t("profile.saveContact")}
                </button>
                <button onClick={() => { setShowAddContact(false); setEcName(""); setEcPhone(""); setEcEmail(""); setEcRelation(""); }} className="flex-1 rounded-lg border border-border py-3 font-semibold text-senior-base">
                  {t("profile.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddContact(true)} className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-primary py-3 font-bold text-primary text-senior-base">
              <Plus size={18} /> {t("profile.saveContact")}
            </button>
          )}
        </div>
      )}

      {/* Family Members & Visibility Toggle */}
      {role === "senior" && (
        <div className="rounded-lg bg-card p-5 border border-border">
          <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
            <UserPlus size={20} className="text-help" /> {t("profile.familyMembers")}
          </h3>

          {/* Allow family view toggle */}
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3 mb-4">
            <div>
              <p className="text-senior-base font-semibold">Allow family to view my activity</p>
              <p className="text-senior-sm text-muted-foreground">Family members can see your check-ins, events & help requests</p>
            </div>
            <button
              onClick={async () => {
                if (!user) return;
                const newVal = !allowFamilyView;
                const { error } = await supabase.from("profiles").update({ allow_family_view: newVal }).eq("user_id", user.id);
                if (error) { toast.error("Failed to update"); return; }
                setAllowFamilyView(newVal);
                toast.success(newVal ? "Family viewing enabled" : "Family viewing disabled");
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${allowFamilyView ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${allowFamilyView ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {familyConnections.length > 0 && (
            <div className="space-y-2 mb-4">
              {familyConnections.map(fc => (
                <div key={fc.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-help-bg flex items-center justify-center">
                    <Heart size={16} className="text-help" />
                  </div>
                  <div>
                    <p className="text-senior-base font-semibold">{fc.family_name}</p>
                    <p className="text-senior-sm text-muted-foreground">{t("profile.connectedFamily")}</p>
                  </div>
                  <CheckCircle size={18} className="ml-auto text-events" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderator info */}
      {(role === "moderator" || role === "admin") && (
        <div className="rounded-lg bg-card p-5 border border-border">
          <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
            <Shield size={20} className="text-primary" /> {t("profile.moderatorInfo")}
          </h3>
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/40 px-4 py-3 flex justify-between">
              <span className="text-senior-base">{t("profile.community")}</span>
              <span className="text-senior-base font-semibold">{profile?.community || "—"}</span>
            </div>
            <div className="rounded-lg bg-muted/40 px-4 py-3 flex justify-between">
              <span className="text-senior-base">{t("profile.role")}</span>
              <span className="text-senior-base font-semibold">{t(`role.${role || "moderator"}`)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Family member info */}
      {role === "family_member" && (
        <div className="rounded-lg bg-card p-5 border border-border">
          <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
            <Heart size={20} className="text-help" /> {t("profile.familyInfo")}
          </h3>
          <p className="text-senior-base text-muted-foreground">{t("profile.familyInfoDesc")}</p>
        </div>
      )}

      {/* Actions - removed non-functional Settings button */}
      <div className="space-y-2">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg bg-card p-4 border border-border text-senior-base font-semibold text-emergency">
          <LogOut size={20} /> {t("nav.logout")}
        </button>
      </div>
    </div>
  );
};

export default Profile;
