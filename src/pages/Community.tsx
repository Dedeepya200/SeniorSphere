import { useState, useEffect } from "react";
import { MessageSquare, Filter, Plus, Send, AlertOctagon, Flag, Trash2, User, Megaphone, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoiceInputButton from "@/components/VoiceInputButton";
import TranslateButton from "@/components/TranslateButton";
import { useCommunity } from "@/hooks/use-community";
import { moderateContent } from "@/lib/moderation";

interface Announcement {
  id: string;
  author_name: string | null;
  content: string;
  created_at: string | null;
}

interface Post {
  id: string;
  user_id: string;
  author_name: string | null;
  type: string | null;
  content: string;
  flagged: boolean | null;
  flag_reason: string | null;
  removed: boolean | null;
  created_at: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const AnnouncementCard = ({ a, t }: { a: Announcement; t: (k: string) => string }) => {
  const [content, setContent] = useState(a.content);
  return (
    <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
      <Megaphone size={20} className="text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-senior-base text-foreground">{content}</p>
          <div className="flex items-center gap-1 shrink-0">
            <TranslateButton text={content} onTranslated={setContent} size={14} />
            <ReadAloudButton text={content} />
          </div>
        </div>
        <p className="text-senior-sm text-muted-foreground mt-1">— {a.author_name || t("role.moderator")} · {a.created_at ? timeAgo(a.created_at) : ""}</p>
      </div>
    </div>
  );
};

const PostCard = ({ post, timeAgoStr }: { post: Post; timeAgoStr: string }) => {
  const [content, setContent] = useState(post.content);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-senior-base font-bold">{post.author_name || "Anonymous"}</span>
        <span className="text-senior-sm text-muted-foreground">· {timeAgoStr}</span>
      </div>
      <div className="flex items-start justify-between gap-2 mt-1">
        <p className="text-senior-base text-foreground whitespace-pre-wrap">{content}</p>
        <div className="flex items-center gap-1 shrink-0">
          <TranslateButton text={content} onTranslated={setContent} size={14} />
          <ReadAloudButton text={content} />
        </div>
      </div>
    </div>
  );
};

const Community = () => {
  const { user, profile, role } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const communityId = useCommunity();
  const isModerator = role === "moderator" || role === "admin";

  const fetchPosts = async () => {
    if (!communityId) { setLoading(false); return; }
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .eq("removed", false)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPosts(data);
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setAnnouncements(data);
  };

  useEffect(() => { fetchPosts(); fetchAnnouncements(); }, [communityId]);

  useEffect(() => {
    const channel = supabase
      .channel("community-posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const createPost = async () => {
    if (!user || !newPost.trim()) return;
    setPosting(true);
    const content = newPost.trim();

    const moderationResult = await moderateContent(content);
    if (moderationResult.flagged) {
      toast.error(`Post blocked: ${moderationResult.reason || "Content requires review"}`);
      setPosting(false);
      return;
    }

    const { data: insertedPost, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        author_name: profile?.display_name || "Anonymous",
        content,
        type: "post",
        community_id: communityId,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to post: " + error.message);
      setPosting(false);
      return;
    }

    setNewPost("");
    toast.success("Post shared!");

    setPosting(false);
    fetchPosts();
  };

  const flagPost = async (postId: string, reason: string) => {
    await supabase.from("community_posts").update({ flagged: true, flag_reason: reason }).eq("id", postId);
    toast.success("Post flagged for review.");
    fetchPosts();
  };

  const removePost = async (postId: string) => {
    await supabase.from("community_posts").update({ removed: true }).eq("id", postId);
    toast.success("Post removed.");
    fetchPosts();
  };

  const unflagPost = async (postId: string) => {
    await supabase.from("community_posts").update({ flagged: false, flag_reason: null }).eq("id", postId);
    toast.info("Flag dismissed.");
    fetchPosts();
  };

  const savePostEdit = async (postId: string) => {
    if (!editPostText.trim()) return;
    const moderationResult = await moderateContent(editPostText.trim());
    await supabase
      .from("community_posts")
      .update({
        content: editPostText.trim(),
        flagged: moderationResult.flagged,
        flag_reason: moderationResult.flagged
          ? `Flagged: ${moderationResult.reason ?? "Content requires review"} (${moderationResult.severity})`
          : null,
      })
      .eq("id", postId);

    if (moderationResult.flagged) {
      toast.warning("Edited post was flagged for moderator review.");
    }

    toast.success(t("common.saved"));
    setEditingPostId(null);
    fetchPosts();
  };

  const displayPosts = showFlagged ? posts.filter(p => p.flagged) : posts.filter(p => !p.flagged || isModerator);

  return (
    <div className="pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-senior-2xl font-bold">{t("community.title")}</h1>
          <p className="text-muted-foreground text-senior-sm">{profile?.community || t("profile.noCommunity")} {t("community.activity")}</p>
        </div>
        {isModerator && (
          <button
            onClick={() => setShowFlagged(!showFlagged)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-senior-base font-semibold transition-colors ${
              showFlagged ? "bg-emergency/10 border-emergency text-emergency" : "border-border bg-card"
            }`}
          >
            <Flag size={18} />
            {showFlagged ? t("community.showAll") : t("community.flagged")}
          </button>
        )}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map(a => (
            <AnnouncementCard key={a.id} a={a} t={t} />
          ))}
        </div>
      )}

      {/* Create Post */}
      <div className="rounded-lg bg-card border border-border p-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <User size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="relative">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={t("community.shareSomething")}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createPost(); } }}
              />
              <VoiceInputButton
                onResult={(text) => setNewPost(prev => prev ? prev + " " + text : text)}
                className="absolute right-2 top-2"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{t("community.aiModeration")}</p>
              <button
                onClick={createPost}
                disabled={!newPost.trim() || posting}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-bold text-primary-foreground text-senior-sm disabled:opacity-50"
              >
                <Send size={16} /> {posting ? t("community.posting") : t("community.post")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-senior-lg text-muted-foreground">{t("app.loading")}</p>
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare size={44} className="mb-3 text-muted-foreground" />
          <h2 className="text-senior-lg font-bold mb-1">{showFlagged ? t("community.noFlagged") : t("community.noPosts")}</h2>
          <p className="text-muted-foreground text-senior-base">
            {showFlagged ? t("community.healthy") : t("community.noPostsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayPosts.map(post => (
            <div
              key={post.id}
              className={`rounded-lg bg-card border p-4 transition-all ${
                post.flagged ? "border-emergency/40 bg-emergency-bg/30" : "border-border"
              }`}
            >
              {post.flagged && (
                <div className="flex items-center gap-2 mb-3 rounded-md bg-emergency/10 px-3 py-2">
                  <AlertOctagon size={16} className="text-emergency shrink-0" />
                  <p className="text-senior-sm font-semibold text-emergency">{post.flag_reason || t("community.flagged")}</p>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-community-bg">
                  <User size={18} className="text-community" />
                </div>
                <PostCard post={post} timeAgoStr={timeAgo(post.created_at)} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pl-13">
                {user && post.user_id === user.id && editingPostId !== post.id && (
                  <button
                    onClick={() => { setEditingPostId(post.id); setEditPostText(post.content); }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 hover:bg-muted transition-colors"
                  >
                    <Pencil size={13} /> {t("common.edit")}
                  </button>
                )}
                {editingPostId === post.id && (
                  <div className="flex-1 flex gap-2">
                    <input
                      value={editPostText}
                      onChange={(e) => setEditPostText(e.target.value)}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-senior-sm"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") savePostEdit(post.id); if (e.key === "Escape") setEditingPostId(null); }}
                    />
                    <button onClick={() => savePostEdit(post.id)} className="text-primary hover:opacity-80"><Check size={16} /></button>
                    <button onClick={() => setEditingPostId(null)} className="text-muted-foreground hover:opacity-80"><X size={16} /></button>
                  </div>
                )}
                {!post.flagged && user && post.user_id !== user.id && (
                  <button
                    onClick={() => flagPost(post.id, "Reported by community member")}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 hover:bg-muted transition-colors"
                    title={t("community.report")}
                  >
                    <Flag size={13} /> {t("community.report")}
                  </button>
                )}

                {isModerator && (
                  <>
                    {post.flagged && (
                      <button
                        onClick={() => unflagPost(post.id)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-events-bg text-events hover:bg-events-bg/80 transition-colors"
                      >
                        {t("community.dismissFlag")}
                      </button>
                    )}
                    <button
                      onClick={() => removePost(post.id)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-emergency/10 text-emergency hover:bg-emergency/20 transition-colors"
                    >
                      <Trash2 size={13} /> {t("community.remove")}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;
