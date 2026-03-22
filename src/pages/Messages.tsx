import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Send, ArrowLeft, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoiceInputButton from "@/components/VoiceInputButton";
import { toast } from "sonner";
import { moderateContent } from "@/lib/moderation";

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  context_type: string;
  context_id: string;
  context_title: string;
  last_message: string;
  last_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  context_type: string;
  context_id: string;
}

const Messages = () => {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchConversations = async () => {
    if (!user) return;
    // Get all messages involving the user
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Group by other user + context
    const convoMap = new Map<string, Conversation>();
    for (const msg of data as Message[]) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const key = `${otherId}-${msg.context_type}-${msg.context_id}`;
      if (!convoMap.has(key)) {
        convoMap.set(key, {
          other_user_id: otherId,
          other_user_name: "",
          context_type: msg.context_type,
          context_id: msg.context_id,
          context_title: "",
          last_message: msg.content,
          last_at: msg.created_at,
          unread_count: 0,
        });
      }
      if (!msg.read && msg.receiver_id === user.id) {
        convoMap.get(key)!.unread_count++;
      }
    }

    // Fetch profile names for other users
    const otherIds = [...new Set([...convoMap.values()].map(c => c.other_user_id))];
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", otherIds);
      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      for (const convo of convoMap.values()) {
        convo.other_user_name = nameMap.get(convo.other_user_id) || "User";
      }
    }

    // Fetch context titles
    const skillIds = [...convoMap.values()].filter(c => c.context_type === "skill").map(c => c.context_id);
    const helpIds = [...convoMap.values()].filter(c => c.context_type === "help_request").map(c => c.context_id);
    const eventIds = [...convoMap.values()].filter(c => c.context_type === "event").map(c => c.context_id);

    if (skillIds.length > 0) {
      const { data: skills } = await supabase.from("skills").select("id, title").in("id", skillIds);
      const titleMap = new Map(skills?.map(s => [s.id, s.title]) || []);
      for (const c of convoMap.values()) {
        if (c.context_type === "skill") c.context_title = titleMap.get(c.context_id) || "Skill";
      }
    }
    if (helpIds.length > 0) {
      const { data: helps } = await supabase.from("help_requests").select("id, description").in("id", helpIds);
      const titleMap = new Map(helps?.map(h => [h.id, h.description.slice(0, 40)]) || []);
      for (const c of convoMap.values()) {
        if (c.context_type === "help_request") c.context_title = titleMap.get(c.context_id) || "Help Request";
      }
    }
    if (eventIds.length > 0) {
      const { data: evts } = await supabase.from("events").select("id, title").in("id", eventIds);
      const titleMap = new Map(evts?.map(e => [e.id, e.title]) || []);
      for (const c of convoMap.values()) {
        if (c.context_type === "event") c.context_title = titleMap.get(c.context_id) || "Event";
      }
    }

    setConversations([...convoMap.values()].sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()));
    setLoading(false);
  };

  const fetchMessages = async (convo: Conversation) => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("context_type", convo.context_type)
      .eq("context_id", convo.context_id)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${convo.other_user_id}),and(sender_id.eq.${convo.other_user_id},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);

    // Mark as read
    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", convo.other_user_id)
      .eq("context_type", convo.context_type)
      .eq("context_id", convo.context_id);
  };

  const sendMessage = async () => {
    if (!user || !activeConvo || !newMsg.trim()) return;
    const content = newMsg.trim();
    setNewMsg("");

    // Moderate content before sending
    const modResult = await moderateContent(content);
    if (modResult.flagged) {
      toast.error(`Message blocked: ${modResult.reason || "Inappropriate content detected"}`);
      setNewMsg(content);
      return;
    }

    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeConvo.other_user_id,
      context_type: activeConvo.context_type,
      context_id: activeConvo.context_id,
      content,
    });
  };

  const saveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    const modResult = await moderateContent(editText.trim());
    if (modResult.flagged) {
      toast.error(`Edit blocked: ${modResult.reason || "Inappropriate content"}`);
      return;
    }
    await supabase.from("direct_messages").update({ content: editText.trim() }).eq("id", msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim() } : m));
    setEditingId(null);
  };

  useEffect(() => { fetchConversations(); }, [user]);

  // Auto-open conversation from URL params
  useEffect(() => {
    if (autoOpened || loading || conversations.length === 0) return;
    const contextType = searchParams.get("context");
    const contextId = searchParams.get("contextId");
    const userId = searchParams.get("userId");
    if (contextType && contextId && userId) {
      const match = conversations.find(
        c => c.context_type === contextType && c.context_id === contextId && c.other_user_id === userId
      );
      if (match) {
        setActiveConvo(match);
        setAutoOpened(true);
      }
    }
  }, [conversations, loading, autoOpened, searchParams]);

  useEffect(() => {
    if (activeConvo) fetchMessages(activeConvo);
  }, [activeConvo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          if (activeConvo && msg.context_id === activeConvo.context_id) {
            setMessages(prev => [...prev, msg]);
          }
          fetchConversations();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConvo]);

  const contextEmoji: Record<string, string> = {
    skill: "📚",
    help_request: "🤝",
    event: "📅",
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!user) return <div className="p-6 text-center text-muted-foreground">Please log in to view messages.</div>;

  // Chat view
  if (activeConvo) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <button onClick={() => setActiveConvo(null)} className="p-1 rounded-lg hover:bg-muted">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-senior-base font-bold truncate">{activeConvo.other_user_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {contextEmoji[activeConvo.context_type]} {activeConvo.context_title}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-senior-sm py-8">No messages yet. Say hello! 👋</p>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user.id;
            const isEditing = editingId === msg.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 rounded bg-background/20 px-2 py-1 text-senior-sm text-foreground"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(msg.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button onClick={() => saveEdit(msg.id)} className="text-primary-foreground hover:opacity-80"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-primary-foreground hover:opacity-80"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-senior-sm">{msg.content}</p>
                      <div className={`flex items-center gap-2 mt-1 ${isMine ? "justify-end" : ""}`}>
                        <p className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {timeAgo(msg.created_at)}
                        </p>
                        {isMine && (
                          <button
                            onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}
                            className="text-primary-foreground/60 hover:text-primary-foreground/90"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-card flex items-center gap-2">
          <VoiceInputButton onResult={setNewMsg} />
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-senior-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={sendMessage}
            disabled={!newMsg.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="pb-6">
      <h1 className="text-senior-2xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare size={24} className="text-primary" />
        {t("nav.messages") || "Messages"}
      </h1>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-senior-base text-muted-foreground">No messages yet.</p>
          <p className="text-senior-sm text-muted-foreground mt-1">
            Messages will appear when you connect with someone through skills, events, or help requests.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((convo) => (
            <button
              key={`${convo.other_user_id}-${convo.context_id}`}
              onClick={() => setActiveConvo(convo)}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:shadow-md transition-all text-left"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
                {contextEmoji[convo.context_type] || "💬"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-senior-base font-bold truncate">{convo.other_user_name}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(convo.last_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{convo.context_title}</p>
                <p className="text-senior-sm text-muted-foreground truncate">{convo.last_message}</p>
              </div>
              {convo.unread_count > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
                  {convo.unread_count > 9 ? "9+" : convo.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
