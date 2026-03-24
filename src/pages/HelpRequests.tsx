import { MessageCircle, Plus, AlertTriangle, MapPin, User, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { notifyHelpOffer, sendNotification } from "@/lib/notifications";
import { toast } from "sonner";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoiceInputButton from "@/components/VoiceInputButton";
import TranslateButton from "@/components/TranslateButton";
import { useCommunity } from "@/hooks/use-community";
import { moderateContent } from "@/lib/moderation";

type Filter = "all" | "pending" | "assigned" | "resolved";

const urgencyConfig: Record<string, { color: string; labelKey: string }> = {
  high: { color: "bg-emergency text-emergency-foreground", labelKey: "help.urgencyHigh" },
  medium: { color: "bg-help-bg text-help", labelKey: "help.urgencyMedium" },
  low: { color: "bg-events-bg text-events", labelKey: "help.urgencyLow" },
};

interface HelpRequest {
  id: string;
  user_id: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string | null;
  author_name: string | null;
  on_behalf_of_name: string | null;
  assigned_volunteer_name: string | null;
  created_at: string;
}

const HelpDescriptionBlock = ({ text }: { text: string }) => {
  const [content, setContent] = useState(text);
  return (
    <div className="flex items-start justify-between gap-2 mb-1">
      <p className="text-senior-lg font-semibold">{content}</p>
      <div className="flex items-center gap-1 shrink-0">
        <TranslateButton text={content} onTranslated={setContent} size={14} />
        <ReadAloudButton text={content} />
      </div>
    </div>
  );
};

const HelpRequests = () => {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { t } = useLanguage();
  const communityId = useCommunity();
  const [filter, setFilter] = useState<Filter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [location, setLocation] = useState("");
  const [onBehalfName, setOnBehalfName] = useState("");

  const fetchRequests = async () => {
    if (!communityId) { setLoading(false); return; }
    const { data } = await supabase
      .from("help_requests")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [communityId]);

  useEffect(() => {
    const channel = supabase
      .channel("help-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "help_requests" }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = requests.filter(r => filter === "all" || r.status === filter);

  const filterLabels: Record<Filter, string> = {
    all: t("community.showAll"),
    pending: t("help.pending"),
    assigned: t("help.assigned"),
    resolved: t("help.completed"),
  };

  const submitRequest = async () => {
    if (!user || !desc.trim()) return;
    const content = desc.trim();
    const moderationResult = await moderateContent(content);
    if (moderationResult.flagged) {
      toast.error(t("help.requestBlocked").replace("{reason}", moderationResult.reason || "Content requires review"));
      return;
    }

    const authorName = onBehalfName.trim()
      ? `${profile?.display_name} (for ${onBehalfName.trim()})`
      : profile?.display_name || "Anonymous";

    const { error } = await supabase.from("help_requests").insert({
      user_id: user.id,
      category,
      description: content,
      urgency,
      location: location || null,
      author_name: authorName,
      on_behalf_of_name: onBehalfName.trim() || null,
      community_id: communityId,
    });
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(t("help.createRequest") + " ✓");
      setDesc("");
      setLocation("");
      setOnBehalfName("");
      setShowCreate(false);
      fetchRequests();
    }
  };

  const offerHelp = async (requestId: string) => {
    if (!user) return;
    const request = requests.find(r => r.id === requestId);
    if (request?.user_id === user.id) { toast.info(t("help.ownRequest")); return; }
    const { error } = await supabase.from("help_volunteers").insert({
      help_request_id: requestId,
      user_id: user.id,
      display_name: profile?.display_name || "Volunteer",
    });
    if (error) {
      if (error.code === "23505") toast.info(t("help.volunteered") + "!");
      else toast.error("Failed: " + error.message);
    } else {
      toast.success(t("help.volunteer") + " ✓");
      const request = requests.find(r => r.id === requestId);
      if (request && request.user_id !== user.id) {
        // Notify the person who created the help request (could be family member)
        notifyHelpOffer(request.user_id, profile?.display_name || "Someone", request.description, requestId);

        // If request was raised on behalf of someone, also try to notify connected family members
        // The user_id is already the family member who raised it, so they get notified above
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-senior-lg text-muted-foreground">{t("app.loading")}</p></div>;
  }

  return (
    <div className="pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-senior-2xl font-bold">{t("help.title")}</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground text-senior-base"
        >
          <Plus size={20} /> {t("help.create")}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "assigned", "resolved"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-5 py-2.5 text-senior-base font-semibold capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="rounded-lg bg-card border border-border p-5 space-y-3">
          <h2 className="text-senior-lg font-bold">{t("help.createRequest")}</h2>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base">
            <option value="General">{t("help.catGeneral")}</option>
            <option value="Technology">{t("help.catTechnology")}</option>
            <option value="Errands">{t("help.catGroceries")}</option>
            <option value="Transportation">{t("help.catTransport")}</option>
            <option value="Household">{t("help.catGeneral")}</option>
            <option value="Medical">{t("help.catMedical")}</option>
          </select>
          <div className="relative">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("help.whatHelp")}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base"
            />
            <VoiceInputButton
              onResult={(text) => setDesc(prev => prev ? prev + " " + text : text)}
              className="absolute right-2 top-2"
            />
          </div>
          {role === "family_member" && (
            <input
              value={onBehalfName}
              onChange={(e) => setOnBehalfName(e.target.value)}
              placeholder={t("help.onBehalfPlaceholder")}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
            />
          )}
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("help.locationOpt")}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-senior-base"
            />
          </div>
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base">
            <option value="low">{t("help.urgencyLow")}</option>
            <option value="medium">{t("help.urgencyMedium")}</option>
            <option value="high">{t("help.urgencyHigh")}</option>
          </select>
          <button
            onClick={submitRequest}
            disabled={!desc.trim()}
            className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base disabled:opacity-50"
          >
            {t("help.createRequest")}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle size={44} className="mb-3 text-muted-foreground" />
          <h2 className="text-senior-lg font-bold mb-1">{t("help.noRequests")}</h2>
          <p className="text-muted-foreground text-senior-base mb-4">{t("help.noRequestsDesc")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => {
            const urg = urgencyConfig[req.urgency] || urgencyConfig.medium;
            return (
              <div key={req.id} className="rounded-lg bg-card border border-border overflow-hidden">
                <div className={`px-5 py-2 flex items-center gap-2 text-senior-sm font-bold uppercase tracking-wide ${urg.color}`}>
                  {req.urgency === "high" && <AlertTriangle size={15} />}
                  {t(urg.labelKey)}
                </div>
                <div className="p-5">
                  <p className="text-senior-sm font-semibold text-muted-foreground mb-1">{req.category}</p>
                  <HelpDescriptionBlock text={req.description} />
                  <p className="text-senior-sm text-muted-foreground mb-1">— {req.author_name || "Anonymous"}</p>
                  {req.on_behalf_of_name && (
                    <p className="text-senior-sm text-primary font-semibold mb-1">On behalf of: {req.on_behalf_of_name}</p>
                  )}
                  {req.location && (
                    <p className="text-senior-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin size={14} /> {req.location}
                    </p>
                  )}
                  {req.status === "assigned" && req.assigned_volunteer_name && (
                    <div className="flex items-center gap-2 rounded-lg bg-community-bg px-3 py-2 mb-3">
                      <User size={16} className="text-community" />
                      <span className="text-senior-sm font-semibold">{t("help.assigned")}: {req.assigned_volunteer_name}</span>
                    </div>
                  )}
                  {req.status === "resolved" && (
                    <div className="flex items-center gap-2 rounded-lg bg-events-bg px-3 py-2 mb-3">
                      <span className="text-senior-sm font-bold text-events">✓ {t("help.completed")}</span>
                    </div>
                  )}
                  {req.status === "pending" && req.user_id !== user?.id && (
                    <button
                      onClick={() => offerHelp(req.id)}
                      className="w-full rounded-lg bg-primary py-3 text-center font-bold text-primary-foreground text-senior-lg"
                    >
                      {t("help.volunteer")}
                    </button>
                  )}
                  {(req.status === "assigned" || req.status === "pending") && req.user_id !== user?.id && (
                    <button
                      onClick={async () => {
                        await supabase.from("direct_messages").insert({
                          sender_id: user!.id,
                          receiver_id: req.user_id,
                          context_type: "help_request",
                          context_id: req.id,
                          content: `Hi! I'd like to help with: "${req.description.slice(0, 50)}" 🤝`,
                        });
                        navigate(`/messages?context=help_request&contextId=${req.id}&userId=${req.user_id}`);
                      }}
                      className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 font-bold text-primary text-senior-base"
                    >
                      <MessageSquare size={18} /> {t("help.messageRequester")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HelpRequests;
