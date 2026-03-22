import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Calendar, CheckCircle, MessageSquare, Users, Shield, UserCheck, MapPin, Clock, Megaphone, Trophy, Heart, Trash2, Filter, User, Send, Ban, AlertOctagon, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type UrgencyFilter = "all" | "high" | "medium" | "low";

interface HelpRequest {
  id: string;
  author_name: string | null;
  description: string;
  urgency: string;
  location: string | null;
  status: string;
  category: string;
  assigned_volunteer_name: string | null;
  created_at: string;
}

interface Volunteer {
  id: string;
  help_request_id: string;
  display_name: string | null;
  skills: string | null;
  user_id: string;
}

interface CommunityPost {
  id: string;
  author_name: string | null;
  content: string;
  type: string | null;
  flagged: boolean | null;
  flag_reason: string | null;
  removed: boolean | null;
  created_at: string;
}

interface EventItem {
  id: string;
  title: string;
  host_name: string | null;
  event_date: string;
  location: string | null;
  attendee_count: number | null;
  removed: boolean | null;
}

interface SkillItem {
  id: string;
  title: string;
  teacher_name: string | null;
  learner_count: number | null;
  removed: boolean | null;
}

interface Announcement {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
}

const urgencyStyles: Record<string, string> = {
  high: "bg-emergency text-emergency-foreground",
  medium: "bg-help-bg text-help",
  low: "bg-events-bg text-events",
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const pendingDuration = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "Less than 1 hour";
  if (hrs < 24) return `${hrs} hours`;
  return `${Math.floor(hrs / 24)} days`;
};

const ModeratorDashboard = () => {
  const { user, profile } = useAuth();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [showAssignPanel, setShowAssignPanel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const communityId = profile?.community_id || null;

  const fetchData = async () => {
    if (!communityId) {
      setHelpRequests([]);
      setVolunteers([]);
      setPosts([]);
      setEvents([]);
      setSkills([]);
      setAnnouncements([]);
      setMemberCount(0);
      setLoading(false);
      return;
    }

    const [helpRes, volRes, postRes, eventRes, skillRes, annRes, membersRes] = await Promise.all([
      supabase.from("help_requests").select("*").eq("community_id", communityId).order("created_at", { ascending: false }),
      supabase
        .from("help_volunteers")
        .select("*, help_requests!inner(community_id)")
        .eq("help_requests.community_id", communityId),
      supabase.from("community_posts").select("*").eq("community_id", communityId).order("created_at", { ascending: false }),
      supabase.from("events").select("*").eq("community_id", communityId).order("event_date", { ascending: true }),
      supabase.from("skills").select("*").eq("community_id", communityId).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").eq("community_id", communityId).order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("community_id", communityId),
    ]);
    if (helpRes.data) setHelpRequests(helpRes.data);
    if (volRes.data) setVolunteers((volRes.data as any[]).map(({ help_requests: _helpRequest, ...volunteer }) => volunteer as Volunteer));
    if (postRes.data) setPosts(postRes.data);
    if (eventRes.data) setEvents(eventRes.data);
    if (skillRes.data) setSkills(skillRes.data);
    if (annRes.data) setAnnouncements(annRes.data);
    setMemberCount(membersRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [communityId]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("moderator-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "help_requests" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "help_volunteers" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [communityId]);

  const pendingHelp = useMemo(() =>
    helpRequests.filter(h => h.status === "pending" && (urgencyFilter === "all" || h.urgency === urgencyFilter)),
    [helpRequests, urgencyFilter]
  );
  const assignedHelp = helpRequests.filter(h => h.status === "assigned");
  const resolvedHelp = helpRequests.filter(h => h.status === "resolved");
  const flaggedPosts = posts.filter(p => (p.flagged && !p.removed));
  const activePosts = posts.filter(p => !p.removed);
  const activeEvents = events.filter(e => !e.removed);
  const activeSkills = skills.filter(s => !s.removed);

  // Volunteer leaderboard
  const leaderboard = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    helpRequests.filter(h => h.status === "resolved" && h.assigned_volunteer_name).forEach(h => {
      const name = h.assigned_volunteer_name!;
      if (!counts[name]) counts[name] = { name, count: 0 };
      counts[name].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [helpRequests]);

  const assignVolunteer = async (requestId: string, volunteerName: string, volunteerId: string) => {
    await supabase.from("help_requests").update({
      status: "assigned",
      assigned_volunteer_name: volunteerName,
      assigned_volunteer_id: volunteerId,
      updated_at: new Date().toISOString(),
    }).eq("id", requestId);
    setShowAssignPanel(null);
    toast.success(`Assigned to ${volunteerName}!`);
    fetchData();
  };

  const resolveHelp = async (id: string) => {
    await supabase.from("help_requests").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Help request resolved!");
    fetchData();
  };

  const removePost = async (id: string) => {
    await supabase.from("community_posts").update({ removed: true }).eq("id", id);
    toast.success("Post removed.");
    fetchData();
  };

  const removeEvent = async (id: string) => {
    await supabase.from("events").update({ removed: true }).eq("id", id);
    toast.success("Event removed.");
    fetchData();
  };

  const removeSkill = async (id: string) => {
    await supabase.from("skills").update({ removed: true }).eq("id", id);
    toast.success("Skill removed.");
    fetchData();
  };

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim() || !user) return;
    await supabase.from("announcements").insert({
      content: newAnnouncement.trim(),
      author_id: user.id,
      author_name: profile?.display_name || "Moderator",
      community_id: communityId,
    });
    setNewAnnouncement("");
    toast.success("Announcement posted!");
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-senior-lg text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="pb-6 space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <Shield size={28} className="text-primary" />
        <div>
          <h1 className="text-senior-2xl font-bold">Moderator Dashboard</h1>
          <p className="text-senior-sm text-muted-foreground">{profile?.community || "Your Community"}</p>
          <p className="text-senior-sm font-semibold text-foreground">{memberCount} community members</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Members", value: memberCount, icon: Users, color: "text-community", bg: "bg-community-bg" },
          { label: "Pending Help", value: helpRequests.filter(h => h.status === "pending").length, icon: AlertTriangle, color: "text-help", bg: "bg-help-bg" },
          { label: "Assigned", value: assignedHelp.length, icon: UserCheck, color: "text-community", bg: "bg-community-bg" },
          { label: "Active Posts", value: activePosts.length, icon: MessageSquare, color: "text-community", bg: "bg-community-bg" },
          { label: "Events", value: activeEvents.length, icon: Calendar, color: "text-events", bg: "bg-events-bg" },
          { label: "Flagged", value: flaggedPosts.length, icon: AlertOctagon, color: "text-emergency", bg: "bg-emergency-bg" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-lg bg-card border border-border p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-senior-xl font-bold">{value}</p>
              <p className="text-senior-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Community Announcement */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <Megaphone size={20} className="text-primary" /> Community Announcements
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            placeholder="Type announcement..."
            className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
            onKeyDown={(e) => e.key === "Enter" && postAnnouncement()}
          />
          <button
            onClick={postAnnouncement}
            disabled={!newAnnouncement.trim()}
            className="rounded-lg bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
        {announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-senior-base">{a.content}</p>
                <p className="text-senior-sm text-muted-foreground mt-1">— {a.author_name} · {timeAgo(a.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Urgency Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={18} className="text-muted-foreground" />
        {(["all", "high", "medium", "low"] as UrgencyFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setUrgencyFilter(f)}
            className={`rounded-full px-4 py-2 text-senior-sm font-semibold capitalize transition-colors ${
              urgencyFilter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border"
            }`}
          >
            {f === "all" ? "All Requests" : `${f} Urgency`}
          </button>
        ))}
      </div>

      {/* Pending Help Requests */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <AlertTriangle size={20} className="text-help" /> Pending Help Requests ({pendingHelp.length})
        </h3>
        {pendingHelp.length === 0 ? (
          <div className="flex items-center gap-2 text-senior-base text-muted-foreground py-4">
            <CheckCircle size={20} className="text-events" /> All help requests handled!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingHelp.map((req) => {
              const reqVolunteers = volunteers.filter(v => v.help_request_id === req.id);
              const isHighUrgency = req.urgency === "high";
              return (
                <div key={req.id} className={`rounded-lg border overflow-hidden ${isHighUrgency ? "border-emergency/50 shadow-md" : "border-border"}`}>
                  <div className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center justify-between ${urgencyStyles[req.urgency] || "bg-muted"}`}>
                    <span className="flex items-center gap-1.5">
                      {isHighUrgency && <AlertTriangle size={14} />}
                      {req.urgency} urgency
                    </span>
                    <span className="text-xs font-normal normal-case flex items-center gap-1">
                      <Clock size={12} /> Pending for {pendingDuration(req.created_at)}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-senior-base font-semibold">{req.description}</p>
                        <p className="text-senior-sm text-muted-foreground">— {req.author_name || "Unknown"} · {timeAgo(req.created_at)}</p>
                        {req.location && (
                          <p className="text-senior-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin size={14} /> {req.location}
                          </p>
                        )}
                        <span className="inline-block mt-1 rounded-full bg-muted px-3 py-0.5 text-xs font-semibold">{req.category}</span>
                      </div>
                    </div>

                    {/* Volunteer suggestions */}
                    {reqVolunteers.length > 0 && (
                      <div className="mt-3 rounded-lg bg-muted/40 p-3">
                        <p className="text-senior-sm font-bold mb-2">🙋 Volunteers ({reqVolunteers.length})</p>
                        {reqVolunteers.map(v => (
                          <div key={v.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                                <User size={14} className="text-primary" />
                              </div>
                              <div>
                                <span className="text-senior-sm font-semibold">{v.display_name || "Volunteer"}</span>
                                {v.skills && <span className="text-xs text-muted-foreground ml-2">— {v.skills}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => assignVolunteer(req.id, v.display_name || "Volunteer", v.user_id)}
                              className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                            >
                              Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      {reqVolunteers.length === 0 && (
                        <button
                          onClick={() => toast.info("Waiting for community volunteers to offer help...")}
                          className="flex-1 rounded-lg bg-primary py-2.5 text-center font-bold text-primary-foreground text-senior-sm flex items-center justify-center gap-1.5"
                        >
                          <Users size={16} /> Waiting for Volunteers
                        </button>
                      )}
                      <button
                        onClick={() => resolveHelp(req.id)}
                        className="flex-1 rounded-lg border-2 border-primary py-2.5 text-center font-bold text-primary text-senior-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={16} /> Resolve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assigned / In-Progress */}
      {assignedHelp.length > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
            <UserCheck size={20} className="text-community" /> In Progress ({assignedHelp.length})
          </h3>
          <div className="space-y-2">
            {assignedHelp.map(req => (
              <div key={req.id} className="rounded-lg border border-border p-4">
                <p className="text-senior-base font-semibold">{req.description}</p>
                <div className="flex items-center gap-2 mt-2 text-senior-sm">
                  <UserCheck size={14} className="text-community" />
                  <span className="font-semibold">Assigned to {req.assigned_volunteer_name}</span>
                  <span className="text-muted-foreground">· In progress</span>
                </div>
                {req.location && (
                  <p className="text-senior-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {req.location}
                  </p>
                )}
                <button
                  onClick={() => resolveHelp(req.id)}
                  className="mt-3 rounded-lg bg-primary py-2 px-4 font-bold text-primary-foreground text-senior-sm flex items-center gap-1.5"
                >
                  <CheckCircle size={16} /> Mark Resolved
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reported / Flagged Posts */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <MessageSquare size={20} className="text-emergency" /> Flagged Posts ({flaggedPosts.length})
        </h3>
        {flaggedPosts.length === 0 ? (
          <div className="flex items-center gap-2 text-senior-base text-muted-foreground py-4">
            <CheckCircle size={20} className="text-events" /> No flagged posts. Community is healthy!
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedPosts.map(post => (
              <div key={post.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertOctagon size={16} className="text-emergency" />
                  <span className="text-senior-sm font-bold text-emergency">{post.flag_reason || "Flagged content"}</span>
                </div>
                <p className="text-senior-base">{post.content}</p>
                <p className="text-senior-sm text-muted-foreground mt-1">By {post.author_name || "Unknown"} · {timeAgo(post.created_at)}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => removePost(post.id)}
                    className="flex-1 rounded-lg bg-emergency py-2.5 text-center font-bold text-emergency-foreground text-senior-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={16} /> Remove Post
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.from("community_posts").update({ flagged: false, flag_reason: null }).eq("id", post.id);
                      toast.info("Flag dismissed.");
                      fetchData();
                    }}
                    className="flex-1 rounded-lg border border-border py-2.5 text-center font-semibold text-senior-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Posts (for removal) */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <MessageSquare size={20} className="text-community" /> All Community Posts
        </h3>
        {activePosts.length === 0 ? (
          <p className="text-senior-base text-muted-foreground py-4">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {activePosts.slice(0, 10).map(post => (
              <div key={post.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-senior-sm font-semibold truncate">{post.content}</p>
                  <p className="text-xs text-muted-foreground">{post.author_name} · {timeAgo(post.created_at)}</p>
                </div>
                <button
                  onClick={() => removePost(post.id)}
                  className="shrink-0 rounded-md bg-emergency/10 p-2 text-emergency hover:bg-emergency/20"
                  title="Remove post"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Events (for removal) */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <Calendar size={20} className="text-events" /> All Events
        </h3>
        {activeEvents.length === 0 ? (
          <p className="text-senior-base text-muted-foreground py-4">No events.</p>
        ) : (
          <div className="space-y-2">
            {activeEvents.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-lg bg-events-bg px-4 py-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-senior-base font-bold">{e.title}</p>
                  <p className="text-senior-sm text-muted-foreground">By {e.host_name} · {e.attendee_count || 0} going</p>
                  {e.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} /> {e.location}</p>}
                </div>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="shrink-0 rounded-md bg-emergency/10 p-2 text-emergency hover:bg-emergency/20"
                  title="Remove event"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Skills (for removal) */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <Lightbulb size={20} className="text-skills" /> All Skills
        </h3>
        {activeSkills.length === 0 ? (
          <p className="text-senior-base text-muted-foreground py-4">No skills shared yet.</p>
        ) : (
          <div className="space-y-2">
            {activeSkills.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-skills-bg px-4 py-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-senior-base font-bold">{s.title}</p>
                  <p className="text-senior-sm text-muted-foreground">By {s.teacher_name} · {s.learner_count || 0} learners</p>
                </div>
                <button
                  onClick={() => removeSkill(s.id)}
                  className="shrink-0 rounded-md bg-emergency/10 p-2 text-emergency hover:bg-emergency/20"
                  title="Remove skill"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Volunteer Leaderboard */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-senior-lg font-bold mb-3 flex items-center gap-2">
          <Trophy size={20} className="text-help" /> Top Volunteers
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-senior-base text-muted-foreground py-4">No volunteers yet. Leaderboard builds as help requests are resolved.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((v, i) => (
              <div key={v.name} className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
                <span className="text-senior-lg font-bold text-primary w-8">{["🥇", "🥈", "🥉"][i] || `#${i + 1}`}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                  <User size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-senior-base font-bold">{v.name}</p>
                </div>
                <span className="text-senior-sm font-bold text-primary">{v.count} helps</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorDashboard;
