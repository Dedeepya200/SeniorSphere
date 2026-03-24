import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { showBrowserNotification, requestNotificationPermission } from "@/lib/browser-notifications";
import NotificationContent from "./NotificationContent";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

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

const NotificationBell = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  };

  // Request browser notification permission on mount
  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Realtime subscription with browser push
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Show browser notification if tab is not focused
        showBrowserNotification(newNotif.title, newNotif.message);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emergency text-[10px] font-bold text-emergency-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-senior-base font-bold">{t("notifications.title")}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-primary"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-senior-sm text-muted-foreground">{t("notifications.noNotifications")}</p>
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0">{typeEmoji[n.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0 flex gap-2">
                      <div className="flex-1 min-w-0">
                        <NotificationContent
                          title={n.title}
                          message={n.message}
                          readAloudSize={14}
                          translateSize={14}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
