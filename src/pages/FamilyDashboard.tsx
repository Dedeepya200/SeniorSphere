import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Activity, Clock, Bell, AlertTriangle, UserPlus, Search, CheckCircle, MessageCircle, Plus, MapPin, ChevronLeft, Users, Calendar, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoiceInputButton from "@/components/VoiceInputButton";
import NotificationContent from "@/components/NotificationContent";
import { sendNotification } from "@/lib/notifications";

interface SeniorProfile {
  user_id: string;
  display_name: string;
  community: string | null;
}

interface HelpRequest {
  id: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  author_name: string | null;
  on_behalf_of_name: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface SeniorEvent {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

interface SeniorSkill {
  id: string;
  title: string;
  teacher_name: string | null;
  type: string;
}

const FamilyDashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [connectedSeniors, setConnectedSeniors] = useState<SeniorProfile[]>([]);
  const [selectedSenior, setSelectedSenior] = useState<SeniorProfile | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<SeniorProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seniorHelp, setSeniorHelp] = useState<HelpRequest[]>([]);
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [seniorEvents, setSeniorEvents] = useState<SeniorEvent[]>([]);
  const [seniorSkills, setSeniorSkills] = useState<SeniorSkill[]>([]);

  // Help on behalf form
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpDesc, setHelpDesc] = useState("");
  const [helpUrgency, setHelpUrgency] = useState("medium");
  const [helpCategory, setHelpCategory] = useState("General");
  const [helpLocation, setHelpLocation] = useState("");

  // Load all connected seniors
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: connections } = await supabase
        .from("family_connections")
        .select("senior_user_id")
        .eq("family_user_id", user.id);

      if (connections && connections.length > 0) {
        const seniorIds = connections.map(c => c.senior_user_id);
        const { data: seniorProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, community")
          .in("user_id", seniorIds);

        if (seniorProfiles && seniorProfiles.length > 0) {
          setConnectedSeniors(seniorProfiles);
        }
      }

      // Fetch family member's own notifications
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (notifData) setNotifications(notifData as Notification[]);

      setLoading(false);
    };
    load();
  }, [user]);

  // Load selected senior's data
  useEffect(() => {
    if (!user || !selectedSenior) {
      setSeniorHelp([]);
      setLastCheckin(null);
      setSeniorEvents([]);
      setSeniorSkills([]);
      return;
    }
    const loadSeniorData = async () => {
      const seniorId = selectedSenior.user_id;
      const [helpRes, checkinRes, attendeeRes, learnerRes] = await Promise.all([
        supabase
          .from("help_requests")
          .select("*")
          .or(`user_id.eq.${seniorId},user_id.eq.${user.id}`)
          .order("created_at", { ascending: false }),
        supabase
          .from("daily_checkins")
          .select("checked_in_at")
          .eq("user_id", seniorId)
          .order("checked_in_at", { ascending: false })
          .limit(1),
        supabase
          .from("event_attendees")
          .select("event_id")
          .eq("user_id", seniorId),
        supabase
          .from("skills")
          .select("id, title, teacher_name, type")
          .eq("user_id", seniorId)
          .eq("type", "request")
          .eq("removed", false)
          .order("created_at", { ascending: false }),
      ]);

      if (helpRes.data) setSeniorHelp(helpRes.data);

      const checkinData = checkinRes.data;
      if (checkinData && checkinData.length > 0) {
        setLastCheckin(new Date(checkinData[0].checked_in_at).toLocaleString());
      } else {
        setLastCheckin(null);
      }

      const eventIds = [...new Set((attendeeRes.data || []).map((row) => row.event_id))];
      if (eventIds.length > 0) {
        const { data: eventData } = await supabase
          .from("events")
          .select("id, title, event_date, location")
          .in("id", eventIds)
          .eq("removed", false)
          .order("event_date", { ascending: true });
        setSeniorEvents((eventData as SeniorEvent[]) || []);
      } else {
        setSeniorEvents([]);
      }

      setSeniorSkills((learnerRes.data as SeniorSkill[]) || []);
    };
    loadSeniorData();
  }, [user, selectedSenior]);

  // Realtime notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("family-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        toast.info(`${n.title}: ${n.message}`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const searchSeniors = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, community, allow_family_view")
      .ilike("display_name", `%${searchName}%`)
      .eq("allow_family_view", true);

    if (data) {
      const connectedIds = connectedSeniors.map(s => s.user_id);
      const seniorResults: SeniorProfile[] = [];
      for (const p of data) {
        if (connectedIds.includes(p.user_id)) continue; // skip already connected
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.user_id)
          .single();
        if (roleData?.role === "senior") seniorResults.push(p);
      }
      setSearchResults(seniorResults);
      if (seniorResults.length === 0) toast.info("No seniors found. The senior must enable family viewing and add your email in Emergency Contacts first.");
    }
    setSearching(false);
  };

  const connectToSenior = async (senior: SeniorProfile) => {
    if (!user) return;
    const { error } = await supabase.from("family_connections").insert({
      family_user_id: user.id,
      senior_user_id: senior.user_id,
    });
    if (error) {
      const message = error.message.includes("row-level security")
        ? "Connection allowed only when this senior saved your email in Emergency Contacts and enabled family viewing."
        : error.message;
      toast.error("Failed to connect: " + message);
    } else {
      setConnectedSeniors(prev => [...prev, senior]);
      setSearchResults(prev => prev.filter(s => s.user_id !== senior.user_id));
      setSearchName("");
      setShowSearch(false);
      toast.success(`Connected to ${senior.display_name}!`);
    }
  };

  const raiseHelpOnBehalf = async () => {
    if (!user || !selectedSenior || !helpDesc.trim()) return;
    const { error } = await supabase.from("help_requests").insert({
      user_id: user.id,
      on_behalf_of_name: selectedSenior.display_name,
      description: helpDesc.trim(),
      urgency: helpUrgency,
      category: helpCategory,
      location: helpLocation || null,
      author_name: `${profile?.display_name} (for ${selectedSenior.display_name})`,
    });
    if (error) {
      toast.error("Failed to create request: " + error.message);
    } else {
      toast.success("Help request raised on behalf of " + selectedSenior.display_name);
      setHelpDesc("");
      setHelpLocation("");
      setShowHelpForm(false);
      const { data: helpData } = await supabase
        .from("help_requests")
        .select("*")
        .or(`user_id.eq.${selectedSenior.user_id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (helpData) setSeniorHelp(helpData);
    }
  };

  const sendReminderToSenior = async () => {
    if (!user || !selectedSenior) return;

    try {
      await sendNotification(
        selectedSenior.user_id,
        "general",
        "Reminder from family",
        `${profile?.display_name || "A family member"} sent you a reminder to check in.`
      );
      toast.success(`Reminder sent to ${selectedSenior.display_name}`);
    } catch (error) {
      toast.error("Failed to send reminder");
      console.error("send reminder failed:", error);
    }
  };

  const typeEmoji: Record<string, string> = {
    event_join: "📅",
    help_offer: "🤝",
    checkin: "💚",
    help_assigned: "✅",
    general: "🔔",
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-senior-lg text-muted-foreground">{t("app.loading")}</p></div>;
  }

  // ============ SENIOR DETAIL VIEW ============
  if (selectedSenior) {
    const missedCheckin = !lastCheckin;

    return (
      <div className="pb-6 space-y-5">
        {/* Back button + header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedSenior(null)} className="rounded-lg border border-border p-2.5 hover:bg-muted/50">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-senior-2xl font-bold">{selectedSenior.display_name}</h1>
        </div>

        {/* Senior Status */}
        <div className="rounded-lg bg-card border border-border p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <User size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-senior-xl font-bold">{selectedSenior.display_name}</h2>
                <CheckCircle size={18} className="text-events" />
              </div>
              <p className="text-senior-sm text-muted-foreground">{selectedSenior.community}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${missedCheckin ? "bg-emergency-bg" : "bg-events-bg"}`}>
            <Clock size={18} className={missedCheckin ? "text-emergency" : "text-events"} />
            <div>
              <p className="text-senior-sm font-semibold">Last Check-in</p>
              <p className="text-senior-base font-bold">{lastCheckin || "No check-in yet"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 px-4 py-3">
              <p className="text-senior-sm text-muted-foreground">Events Joined</p>
              <p className="text-senior-xl font-bold">{seniorEvents.length}</p>
            </div>
            <div className="rounded-lg bg-muted/30 px-4 py-3">
              <p className="text-senior-sm text-muted-foreground">Skills Requested</p>
              <p className="text-senior-xl font-bold">{seniorSkills.length}</p>
            </div>
          </div>
        </div>

        {/* Safety Alert */}
        {missedCheckin && (
          <div className="rounded-lg bg-emergency-bg border-2 border-emergency p-4 flex items-center gap-3">
            <AlertTriangle size={24} className="text-emergency shrink-0" />
            <div>
              <p className="text-senior-base font-bold text-emergency">Safety Alert</p>
              <p className="text-senior-sm">{selectedSenior.display_name} has not checked in yet.</p>
            </div>
          </div>
        )}

        {/* Raise Help on Behalf */}
        <div className="rounded-lg bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-senior-lg font-bold flex items-center gap-2">
              <MessageCircle size={20} className="text-help" /> Help Requests
            </h3>
            <button
              onClick={() => setShowHelpForm(!showHelpForm)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-senior-sm font-bold text-primary-foreground"
            >
              <Plus size={16} /> Raise on behalf
            </button>
          </div>

          {showHelpForm && (
            <div className="rounded-lg bg-muted/30 p-4 mb-4 space-y-3">
              <p className="text-senior-sm font-semibold text-muted-foreground">
                Raising help request for {selectedSenior.display_name}
              </p>
              <select
                value={helpCategory}
                onChange={(e) => setHelpCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
              >
                <option>General</option>
                <option>Technology</option>
                <option>Errands</option>
                <option>Transportation</option>
                <option>Household</option>
                <option>Medical</option>
              </select>
              <div className="relative">
                <textarea
                  value={helpDesc}
                  onChange={(e) => setHelpDesc(e.target.value)}
                  placeholder="Describe what help is needed..."
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base"
                />
                <VoiceInputButton
                  onResult={(text) => setHelpDesc(prev => prev ? prev + " " + text : text)}
                  className="absolute right-2 top-2"
                />
              </div>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={helpLocation}
                  onChange={(e) => setHelpLocation(e.target.value)}
                  placeholder="Location (e.g. Block B, Sunrise Community)"
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-senior-base"
                />
              </div>
              <select
                value={helpUrgency}
                onChange={(e) => setHelpUrgency(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
              >
                <option value="low">Low urgency</option>
                <option value="medium">Medium urgency</option>
                <option value="high">High urgency</option>
              </select>
              <button
                onClick={raiseHelpOnBehalf}
                disabled={!helpDesc.trim()}
                className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          )}

          {seniorHelp.length === 0 ? (
            <p className="text-senior-base text-muted-foreground py-2">No help requests yet.</p>
          ) : (
            <div className="space-y-2">
              {seniorHelp.map(h => (
                <div key={h.id} className="rounded-lg bg-muted/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-senior-base font-semibold">{h.description}</p>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                      h.status === "resolved" ? "bg-events-bg text-events" :
                      h.status === "assigned" ? "bg-community-bg text-community" :
                      "bg-help-bg text-help"
                    }`}>{h.status}</span>
                  </div>
                  {h.on_behalf_of_name && (
                    <p className="text-xs text-muted-foreground">On behalf of {h.on_behalf_of_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at!).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-card border border-border p-5">
          <h3 className="text-senior-lg font-bold flex items-center gap-2 mb-3">
            <Calendar size={20} className="text-events" /> Events Joined
          </h3>
          {seniorEvents.length === 0 ? (
            <p className="text-senior-base text-muted-foreground py-2">No joined events yet.</p>
          ) : (
            <div className="space-y-2">
              {seniorEvents.map((event) => (
                <div key={event.id} className="rounded-lg bg-muted/30 px-4 py-3">
                  <p className="text-senior-base font-semibold">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.event_date).toLocaleString()}
                    {event.location ? ` • ${event.location}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-card border border-border p-5">
          <h3 className="text-senior-lg font-bold flex items-center gap-2 mb-3">
            <Lightbulb size={20} className="text-skills" /> Skills Requested
          </h3>
          {seniorSkills.length === 0 ? (
            <p className="text-senior-base text-muted-foreground py-2">No skill requests yet.</p>
          ) : (
            <div className="space-y-2">
              {seniorSkills.map((skill) => (
                <div key={skill.id} className="rounded-lg bg-muted/30 px-4 py-3">
                  <p className="text-senior-base font-semibold">{skill.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {skill.type === "request" ? "Requested skill" : "Learning from"}
                    {skill.teacher_name ? ` ${skill.teacher_name}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-senior-lg font-bold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={sendReminderToSenior} className="flex flex-col items-center gap-2 rounded-lg bg-card border border-border py-4">
              <Bell size={24} className="text-help" />
              <span className="text-senior-base font-bold">Send Reminder</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ SENIORS LIST VIEW ============
  return (
    <div className="pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-senior-2xl font-bold">Family Dashboard</h1>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-senior-sm font-bold text-primary-foreground"
        >
          <UserPlus size={16} /> Add Senior
        </button>
      </div>

      {/* Search to add new senior */}
      {showSearch && (
        <div className="rounded-lg bg-card border border-border p-5">
          <h3 className="text-senior-lg font-bold mb-2">Connect to a Senior</h3>
          <p className="text-senior-sm text-muted-foreground mb-4">
            The senior must enable "Allow family to view my activity" in their profile first.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchSeniors()}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
            />
            <button
              onClick={searchSeniors}
              disabled={searching}
              className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground text-senior-base disabled:opacity-50"
            >
              <Search size={20} />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(senior => (
                <div key={senior.user_id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-senior-base font-bold">{senior.display_name}</p>
                      <p className="text-senior-sm text-muted-foreground">{senior.community}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => connectToSenior(senior)}
                    className="rounded-lg bg-primary px-4 py-2.5 font-bold text-primary-foreground text-senior-sm"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <h3 className="text-senior-lg font-bold flex items-center gap-2 mb-3">
            <Bell size={20} className="text-primary" /> {t("notifications.title")}
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} className={`rounded-lg border border-border p-3 flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}>
                <span className="text-lg shrink-0">{typeEmoji[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2">
                    <NotificationContent
                      title={n.title}
                      message={n.message}
                      readAloudSize={14}
                      translateSize={14}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Seniors List */}
      {connectedSeniors.length > 0 ? (
        <div className="rounded-lg bg-card border border-border p-5">
          <h3 className="text-senior-lg font-bold flex items-center gap-2 mb-4">
            <Users size={20} className="text-primary" /> Connected Seniors
          </h3>
          <div className="space-y-3">
            {connectedSeniors.map(senior => (
              <button
                key={senior.user_id}
                onClick={() => setSelectedSenior(senior)}
                className="w-full flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <User size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-senior-base font-bold">{senior.display_name}</p>
                  <p className="text-senior-sm text-muted-foreground">{senior.community || "No community"}</p>
                </div>
                <ChevronLeft size={20} className="text-muted-foreground rotate-180" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-card border border-border p-6 text-center">
          <UserPlus size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-senior-xl font-bold mb-2">No Seniors Connected</h2>
          <p className="text-senior-base text-muted-foreground">
            Tap "Add Senior" above to search and connect with your family members.
          </p>
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;
