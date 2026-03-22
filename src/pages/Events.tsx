import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Plus, Trash2, Link2, ExternalLink, MessageSquare, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { notifyEventJoin } from "@/lib/notifications";
import { toast } from "sonner";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoiceInputButton from "@/components/VoiceInputButton";
import TranslateButton from "@/components/TranslateButton";
import { useCommunity } from "@/hooks/use-community";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  host_name: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  link: string | null;
  attendee_count: number | null;
  removed: boolean | null;
}

const EventDescriptionBlock = ({ text }: { text: string }) => {
  const [content, setContent] = useState(text);
  return (
    <div className="flex items-start justify-between gap-2 mb-3">
      <p className="text-senior-base text-muted-foreground">{content}</p>
      <div className="flex items-center gap-1 shrink-0">
        <TranslateButton text={content} onTranslated={setContent} size={14} />
        <ReadAloudButton text={content} />
      </div>
    </div>
  );
};

const Events = () => {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");

  const communityId = useCommunity();
  const isModerator = role === "moderator" || role === "admin";

  const fetchEvents = async () => {
    if (!communityId) { setLoading(false); return; }
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("removed", false)
      .eq("community_id", communityId)
      .order("event_date", { ascending: true });
    if (data) setEvents(data as EventItem[]);
    setLoading(false);
  };

  const fetchJoined = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("event_attendees")
      .select("event_id")
      .eq("user_id", user.id);
    if (data) setJoinedIds(new Set(data.map(d => d.event_id)));
  };

  useEffect(() => { fetchEvents(); fetchJoined(); }, [user, communityId]);

  useEffect(() => {
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const createEvent = async () => {
    if (!user || !title.trim() || !date) return;
    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      event_time: time || null,
      location: isOnline ? null : (location.trim() || null),
      host_id: user.id,
      host_name: profile?.display_name || "Anonymous",
      community_id: profile?.community_id || null,
      link: isOnline ? (link.trim() || null) : null,
    } as any);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(t("events.createEvent") + " ✓");
      setTitle(""); setDate(""); setTime(""); setLocation(""); setDescription(""); setLink(""); setIsOnline(false);
      setShowCreate(false);
      fetchEvents();
    }
  };

  const joinEvent = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase.from("event_attendees").insert({
      event_id: eventId,
      user_id: user.id,
      display_name: profile?.display_name || "Attendee",
    });
    if (error) {
      if (error.code === "23505") toast.info(t("events.joined") + "!");
      else toast.error("Failed: " + error.message);
    } else {
      const event = events.find(e => e.id === eventId);
      if (event) {
        await supabase.from("events").update({ attendee_count: (event.attendee_count || 0) + 1 }).eq("id", eventId);
        if (event.host_id !== user.id) {
          notifyEventJoin(event.host_id, event.title, profile?.display_name || "Someone", eventId);
        }
      }
      toast.success(t("events.joined") + "!");
      setJoinedIds(prev => new Set([...prev, eventId]));
      fetchEvents();
    }
  };

  const removeEvent = async (eventId: string) => {
    await supabase.from("events").update({ removed: true }).eq("id", eventId);
    toast.success(t("events.remove") + " ✓");
    fetchEvents();
  };

  const saveEventEdit = async (eventId: string) => {
    if (!editTitle.trim()) return;
    await supabase.from("events").update({ title: editTitle.trim(), description: editDesc.trim() || null }).eq("id", eventId);
    toast.success(t("common.saved"));
    setEditingId(null);
    fetchEvents();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-senior-lg text-muted-foreground">{t("app.loading")}</p></div>;
  }

  return (
    <div className="pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-senior-2xl font-bold">{t("events.title")}</h1>
          <p className="text-muted-foreground text-senior-sm">{profile?.community || t("profile.noCommunity")}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground text-senior-base"
        >
          <Plus size={20} /> {t("events.create")}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg bg-card border border-border p-5 space-y-3">
          <h2 className="text-senior-lg font-bold">{t("events.createEvent")}</h2>
          <div className="relative">
            <input
              placeholder={t("events.eventTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base"
            />
            <VoiceInputButton
              onResult={(text) => setTitle(text)}
              className="absolute right-2 top-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base" />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsOnline(false)}
              className={`flex-1 rounded-lg py-2.5 text-senior-base font-semibold border ${!isOnline ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
            >
              📍 Offline
            </button>
            <button
              type="button"
              onClick={() => setIsOnline(true)}
              className={`flex-1 rounded-lg py-2.5 text-senior-base font-semibold border ${isOnline ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
            >
              🌐 Online
            </button>
          </div>
          {!isOnline ? (
            <input
              placeholder={t("events.location")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
            />
          ) : (
            <div className="relative">
              <Link2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Meeting link (Zoom, Google Meet, etc.)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                type="url"
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-senior-base"
              />
            </div>
          )}
          <div className="relative">
            <textarea
              placeholder={t("events.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base"
            />
            <VoiceInputButton
              onResult={(text) => setDescription(prev => prev ? prev + " " + text : text)}
              className="absolute right-2 top-2"
            />
          </div>
          <button
            onClick={createEvent}
            disabled={!title.trim() || !date}
            className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base disabled:opacity-50"
          >
            {t("events.createEvent")}
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar size={44} className="mb-3 text-muted-foreground" />
          <h2 className="text-senior-lg font-bold mb-1">{t("events.noEvents")}</h2>
          <p className="text-muted-foreground text-senior-base">{t("events.noEventsDesc")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => {
            const isHost = event.host_id === user?.id;
            const hasJoined = joinedIds.has(event.id);
            return (
              <div key={event.id} className="rounded-lg bg-card border border-border overflow-hidden">
                <div className="bg-events-bg px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                      <Calendar size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-primary text-senior-lg">{event.title}</p>
                      <p className="text-senior-sm text-muted-foreground">{t("events.by")} {event.host_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHost && editingId !== event.id && (
                      <button
                        onClick={() => { setEditingId(event.id); setEditTitle(event.title); setEditDesc(event.description || ""); }}
                        className="rounded-md bg-muted p-2 text-muted-foreground hover:bg-muted/80"
                        title={t("common.edit")}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isModerator && (
                      <button onClick={() => removeEvent(event.id)} className="rounded-md bg-emergency/10 p-2 text-emergency hover:bg-emergency/20" title={t("events.remove")}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  {editingId === event.id ? (
                    <div className="space-y-2 mb-3">
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-base font-bold" autoFocus />
                      <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEventEdit(event.id)} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-primary-foreground text-senior-sm font-bold"><Check size={14} /> {t("common.save")}</button>
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-muted-foreground text-senior-sm"><X size={14} /> {t("common.cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                  {event.description && <EventDescriptionBlock text={event.description} />}
                  <div className="space-y-2 mb-3">
                    <span className="flex items-center gap-2 text-senior-base"><Calendar size={18} className="text-muted-foreground" /> {new Date(event.event_date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</span>
                    {event.event_time && <span className="flex items-center gap-2 text-senior-base"><Clock size={18} className="text-muted-foreground" /> {event.event_time}</span>}
                    {event.location && <span className="flex items-center gap-2 text-senior-base"><MapPin size={18} className="text-muted-foreground" /> {event.location}</span>}
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-senior-base text-primary font-semibold hover:underline"
                      >
                        <ExternalLink size={18} /> Join Online
                      </a>
                    )}
                    <span className="flex items-center gap-2 text-senior-base"><Users size={18} className="text-muted-foreground" /> {event.attendee_count || 0} {t("events.attendees")}</span>
                  </div>
                  {isHost ? (
                    <div className="w-full rounded-lg bg-muted py-3 text-center font-semibold text-muted-foreground text-senior-base">
                      {t("events.joined")}
                    </div>
                  ) : hasJoined ? (
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg bg-events-bg py-3 text-center font-semibold text-events text-senior-base">
                        ✓ {t("events.joined")}
                      </div>
                      <button
                        onClick={async () => {
                          await supabase.from("direct_messages").insert({
                            sender_id: user!.id,
                            receiver_id: event.host_id,
                            context_type: "event",
                            context_id: event.id,
                            content: `Hi! I'm attending "${event.title}" 📅`,
                          });
                          navigate(`/messages?context=event&contextId=${event.id}&userId=${event.host_id}`);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground text-senior-base"
                      >
                        <MessageSquare size={18} /> Message
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinEvent(event.id)}
                      className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-lg"
                    >
                      {t("events.join")}
                    </button>
                  )}
                    </>
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

export default Events;
