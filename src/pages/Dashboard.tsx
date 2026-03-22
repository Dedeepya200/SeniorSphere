import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Lightbulb, MessageCircle, MessageSquare, MapPin, User, Users, HelpCircle, BookOpen, Clock, ArrowRight, CheckCircle, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { notifyFamilyCheckin } from "@/lib/notifications";
import ReadAloudButton from "@/components/ReadAloudButton";
import { useCommunity } from "@/hooks/use-community";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const communityId = useCommunity();
  const [stats, setStats] = useState({ members: 0, events: 0, helpRequests: 0, skills: 0 });
  const [checkedIn, setCheckedIn] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [recentHelp, setRecentHelp] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);

  const quickActions = [
    { to: "/events", icon: Calendar, label: t("dashboard.createEvent"), desc: t("dashboard.createEventDesc"), color: "bg-events-bg", iconColor: "text-events" },
    { to: "/skills", icon: Lightbulb, label: t("dashboard.shareSkill"), desc: t("dashboard.shareSkillDesc"), color: "bg-skills-bg", iconColor: "text-skills" },
    { to: "/help", icon: MessageCircle, label: t("dashboard.askHelp"), desc: t("dashboard.askHelpDesc"), color: "bg-help-bg", iconColor: "text-help" },
    { to: "/community", icon: MessageSquare, label: t("dashboard.createPost"), desc: t("dashboard.createPostDesc"), color: "bg-community-bg", iconColor: "text-community" },
  ];

  useEffect(() => {
    if (!user || !communityId) return;
    const fetchStats = async () => {
      const [membersRes, eventsRes, helpRes, skillsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("community_id", communityId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("removed", false).eq("community_id", communityId),
        supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "pending").eq("community_id", communityId),
        supabase.from("skills").select("id", { count: "exact", head: true }).eq("removed", false).eq("community_id", communityId),
      ]);
      setStats({
        members: membersRes.count || 0,
        events: eventsRes.count || 0,
        helpRequests: helpRes.count || 0,
        skills: skillsRes.count || 0,
      });

      const { data: evData } = await supabase.from("events").select("*").eq("removed", false).eq("community_id", communityId).order("event_date", { ascending: true }).limit(3);
      if (evData) setRecentEvents(evData);

      const { data: helpData } = await supabase.from("help_requests").select("*").eq("status", "pending").eq("community_id", communityId).order("created_at", { ascending: false }).limit(2);
      if (helpData) setRecentHelp(helpData);

      const today = new Date().toISOString().split("T")[0];
      const { data: checkinData } = await supabase.from("daily_checkins").select("id").eq("user_id", user.id).gte("checked_in_at", today);
      if (checkinData && checkinData.length > 0) setCheckedIn(true);

      // Fetch recent notifications
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (notifData) setRecentNotifications(notifData as Notification[]);
    };
    fetchStats();
  }, [user, communityId]);

  const doCheckin = async () => {
    if (!user || checkedIn) return;
    const { error } = await supabase.from("daily_checkins").insert({ user_id: user.id });
    if (!error) {
      setCheckedIn(true);
      notifyFamilyCheckin(user.id, profile?.display_name || "Your senior");
    }
  };

  const statItems = [
    { icon: Users, label: t("dashboard.members"), value: stats.members, color: "text-community", bg: "bg-community-bg" },
    { icon: Calendar, label: t("dashboard.upcomingEvents"), value: stats.events, color: "text-events", bg: "bg-events-bg" },
    { icon: HelpCircle, label: t("dashboard.helpRequests"), value: stats.helpRequests, color: "text-help", bg: "bg-help-bg" },
    { icon: BookOpen, label: t("dashboard.skillsShared"), value: stats.skills, color: "text-skills", bg: "bg-skills-bg" },
  ];

  const welcomeText = `${t("dashboard.hello")}, ${profile?.display_name || "Friend"}! ${t("dashboard.whatToDo")}`;

  const typeEmoji: Record<string, string> = {
    event_join: "📅",
    event_reminder: "⏰",
    help_offer: "🤝",
    checkin: "💚",
    help_assigned: "✅",
    skill_join: "📚",
    skill_teach: "🎓",
    skill_comment: "💬",
    skill_reminder: "📖",
    general: "🔔",
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("dashboard.justNow") || "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="pb-6 space-y-6">
      {/* Welcome */}
      <div className="rounded-lg bg-primary/10 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <User size={30} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-senior-2xl font-bold">{t("dashboard.hello")}, {profile?.display_name || "Friend"}!</h1>
              <ReadAloudButton text={welcomeText} size={20} />
            </div>
            <p className="text-senior-base text-muted-foreground">{t("dashboard.whatToDo")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-senior-sm mt-3">
          <MapPin size={16} />
          <span>{profile?.community || t("profile.noCommunity")}</span>
        </div>
      </div>

      {/* Daily Check-in */}
      <button
        onClick={doCheckin}
        disabled={checkedIn}
        className={`w-full rounded-lg py-4 text-senior-lg font-bold flex items-center justify-center gap-3 transition-colors ${
          checkedIn
            ? "bg-events-bg text-events"
            : "bg-primary text-primary-foreground active:scale-[0.98]"
        }`}
      >
        <CheckCircle size={24} />
        {checkedIn ? t("dashboard.checkedIn") : t("dashboard.checkin")}
      </button>

      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <div>
          <h2 className="text-senior-xl font-bold mb-4 flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            {t("notifications.title")}
          </h2>
          <div className="space-y-2">
            {recentNotifications.map(n => (
              <div key={n.id} className={`rounded-lg border border-border p-4 flex items-start gap-3 ${!n.read ? "bg-primary/5" : "bg-card"}`}>
                <span className="text-lg shrink-0">{typeEmoji[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-senior-sm font-bold">{n.title}</p>
                  <p className="text-senior-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <ReadAloudButton text={`${n.title}. ${n.message}`} size={16} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Stats */}
      <div>
        <h2 className="text-senior-xl font-bold mb-4">{t("dashboard.communityStats")}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statItems.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="rounded-lg bg-card border border-border p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <p className="text-senior-xl font-bold">{value}</p>
                <p className="text-senior-sm text-muted-foreground leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      {recentEvents.length > 0 && (
        <div>
          <h2 className="text-senior-xl font-bold mb-4">{t("dashboard.upcomingEvents")}</h2>
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="rounded-lg bg-card border border-border border-l-4 border-l-events overflow-hidden">
                <div className="p-4 flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-events-bg">
                    <span className="text-xl">📅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-senior-lg font-bold">{event.title}</p>
                      <ReadAloudButton text={`${event.title}. ${event.description || ""} on ${new Date(event.event_date).toLocaleDateString()}`} size={16} />
                    </div>
                    <p className="text-senior-sm text-muted-foreground">{t("events.by")} {event.host_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <span className="flex items-center gap-1.5 text-senior-sm font-semibold text-foreground">
                        <Clock size={15} className="text-muted-foreground" /> {new Date(event.event_date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5 text-senior-sm text-muted-foreground">
                          <MapPin size={15} /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => navigate("/events")}
                    className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base flex items-center justify-center gap-2"
                  >
                    {t("dashboard.viewEvents")} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Help Requests */}
      {recentHelp.length > 0 && (
        <div>
          <h2 className="text-senior-xl font-bold mb-4">{t("dashboard.helpRequests")}</h2>
          <div className="space-y-2">
            {recentHelp.map((h) => (
              <div key={h.id} className="rounded-lg bg-card border border-border border-l-4 border-l-help p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-senior-base font-bold">{h.description}</p>
                    <p className="text-senior-sm text-muted-foreground">— {h.author_name || "Anonymous"}</p>
                  </div>
                  <ReadAloudButton text={h.description} size={16} />
                </div>
                <button
                  onClick={() => navigate("/help")}
                  className="mt-2 w-full rounded-lg bg-help/10 py-2 text-center font-bold text-help text-senior-sm"
                >
                  {t("help.volunteer")} →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-senior-xl font-bold mb-4">{t("dashboard.quickActions")}</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map(({ to, icon: Icon, label, desc, color, iconColor }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-3 rounded-lg bg-card p-5 shadow-sm border border-border transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
                <Icon size={24} className={iconColor} />
              </div>
              <div className="text-center">
                <p className="text-senior-base font-bold">{label}</p>
                <p className="text-senior-sm text-muted-foreground leading-snug">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
