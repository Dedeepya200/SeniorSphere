import { Lightbulb, Plus, Users, Trash2, Link2, ExternalLink, MapPin, MessageCircle, MessageSquare, Send, HandHelping, Pencil, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TranslateButton from "@/components/TranslateButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { notifySkillJoin, notifySkillTeachOffer, notifySkillComment } from "@/lib/notifications";
import { toast } from "sonner";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoiceInputButton from "@/components/VoiceInputButton";
import { useCommunity } from "@/hooks/use-community";

interface Skill {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  teacher_name: string | null;
  learner_count: number | null;
  removed: boolean | null;
  link: string | null;
  location: string | null;
  is_online: boolean;
  type: string;
}

interface SkillComment {
  id: string;
  skill_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
}

const SkillDescriptionBlock = ({ text }: { text: string }) => {
  const [content, setContent] = useState(text);
  return (
    <div className="flex items-start justify-between gap-2 mb-4">
      <p className="text-senior-base text-muted-foreground">{content}</p>
      <div className="flex items-center gap-1 shrink-0">
        <TranslateButton text={content} onTranslated={setContent} size={14} />
        <ReadAloudButton text={content} />
      </div>
    </div>
  );
};

type SkillTab = "offers" | "requests";

const Skills = () => {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { t } = useLanguage();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"offer" | "request">("offer");
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SkillTab>("offers");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillTitle, setEditSkillTitle] = useState("");
  const [editSkillDesc, setEditSkillDesc] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  // Comments
  const [comments, setComments] = useState<Record<string, SkillComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const communityId = useCommunity();
  const isModerator = role === "moderator" || role === "admin";

  const fetchSkills = async () => {
    if (!communityId) { setLoading(false); return; }
    const { data } = await supabase
      .from("skills")
      .select("*")
      .eq("removed", false)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
    if (data) setSkills(data as Skill[]);
    setLoading(false);
  };

  const fetchLearned = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("skill_learners")
      .select("skill_id")
      .eq("user_id", user.id);
    if (data) setLearnedIds(new Set(data.map(d => d.skill_id)));
  };

  const fetchComments = async (skillId: string) => {
    const { data } = await supabase
      .from("skill_comments" as any)
      .select("*")
      .eq("skill_id", skillId)
      .order("created_at", { ascending: true });
    if (data) setComments(prev => ({ ...prev, [skillId]: data as unknown as SkillComment[] }));
  };

  useEffect(() => { fetchSkills(); fetchLearned(); }, [user, communityId]);

  useEffect(() => {
    const channel = supabase
      .channel("skills-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => fetchSkills())
      .on("postgres_changes", { event: "*", schema: "public", table: "skill_comments" }, (payload: any) => {
        if (payload.new?.skill_id) fetchComments(payload.new.skill_id);
        if (payload.old?.skill_id) fetchComments(payload.old.skill_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const submitSkill = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("skills").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      teacher_name: profile?.display_name || "Anonymous",
      community_id: profile?.community_id || null,
      link: isOnline ? (link.trim() || null) : null,
      location: !isOnline ? (location.trim() || null) : null,
      is_online: isOnline,
      type: formType,
    } as any);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success((formType === "offer" ? t("skills.offerSkill") : "Skill Request") + " ✓");
      resetForm();
      fetchSkills();
    }
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setLink(""); setLocation(""); setIsOnline(true);
    setShowForm(false);
  };

  const requestToLearn = async (skillId: string) => {
    if (!user) return;
    const skill = skills.find(s => s.id === skillId);
    if (skill?.user_id === user.id) { toast.info("This is your own listing!"); return; }
    const { error } = await supabase.from("skill_learners").insert({
      skill_id: skillId,
      user_id: user.id,
      display_name: profile?.display_name || "Learner",
    });
    if (error) {
      if (error.code === "23505") toast.info("Already joined!");
      else toast.error("Failed: " + error.message);
    } else {
      const skill = skills.find(s => s.id === skillId);
      if (skill) {
        await supabase.from("skills").update({ learner_count: (skill.learner_count || 0) + 1 }).eq("id", skillId);
        // Notify skill owner
        if (skill.user_id !== user.id) {
          if (skill.type === "request") {
            notifySkillTeachOffer(skill.user_id, profile?.display_name || "Someone", skill.title, skillId);
          } else {
            notifySkillJoin(skill.user_id, skill.title, profile?.display_name || "Someone", skillId);
          }
        }
      }
      toast.success("Joined ✓");
      setLearnedIds(prev => new Set([...prev, skillId]));
      fetchSkills();
    }
  };

  const removeSkill = async (skillId: string) => {
    await supabase.from("skills").update({ removed: true }).eq("id", skillId);
    toast.success(t("skills.remove") + " ✓");
    fetchSkills();
  };

  const saveSkillEdit = async (skillId: string) => {
    if (!editSkillTitle.trim()) return;
    await supabase.from("skills").update({ title: editSkillTitle.trim(), description: editSkillDesc.trim() || null }).eq("id", skillId);
    toast.success(t("common.saved"));
    setEditingSkillId(null);
    fetchSkills();
  };

  const toggleComments = (skillId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
        if (!comments[skillId]) fetchComments(skillId);
      }
      return next;
    });
  };

  const postComment = async (skillId: string) => {
    const text = commentText[skillId]?.trim();
    if (!user || !text) return;
    const { error } = await supabase.from("skill_comments" as any).insert({
      skill_id: skillId,
      user_id: user.id,
      display_name: profile?.display_name || "Anonymous",
      content: text,
    });
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      setCommentText(prev => ({ ...prev, [skillId]: "" }));
      fetchComments(skillId);
      // Notify skill owner about comment
      const skill = skills.find(s => s.id === skillId);
      if (skill && skill.user_id !== user.id) {
        notifySkillComment(skill.user_id, profile?.display_name || "Someone", skill.title, skillId);
      }
    }
  };

  const startDM = async (otherUserId: string, skillId: string) => {
    if (!user) return;
    // Send an initial greeting message to start the conversation
    const skill = skills.find(s => s.id === skillId);
    const greeting = skill?.type === "request"
      ? `Hi! I'd like to help teach "${skill?.title}"`
      : `Hi! I'm interested in learning "${skill?.title}"`;
    
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: otherUserId,
      context_type: "skill",
      context_id: skillId,
      content: greeting,
    });
    toast.success("Message sent! Opening conversation...");
    navigate(`/messages?context=skill&contextId=${skillId}&userId=${otherUserId}`);
  };

  const filteredSkills = skills.filter(s => activeTab === "offers" ? s.type === "offer" : s.type === "request");

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-senior-lg text-muted-foreground">{t("app.loading")}</p></div>;
  }

  const openForm = (type: "offer" | "request") => {
    setFormType(type);
    setShowForm(true);
  };

  return (
    <div className="pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-senior-2xl font-bold">{t("skills.title")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => openForm("request")}
            className="flex items-center gap-1.5 rounded-full border-2 border-primary px-4 py-2.5 font-bold text-primary text-senior-sm"
          >
            <HandHelping size={18} /> Request
          </button>
          <button
            onClick={() => openForm("offer")}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 font-bold text-primary-foreground text-senior-sm"
          >
            <Plus size={18} /> {t("skills.offer")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("offers")}
          className={`flex-1 rounded-full py-2.5 text-senior-base font-semibold ${activeTab === "offers" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
        >
          🎓 Offered Skills
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 rounded-full py-2.5 text-senior-base font-semibold ${activeTab === "requests" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
        >
          🙋 Skill Requests
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg bg-card border border-border p-5 space-y-3">
          <h2 className="text-senior-lg font-bold">
            {formType === "offer" ? t("skills.offerSkill") : "Request a Skill"}
          </h2>
          <div className="relative">
            <input
              placeholder={formType === "offer" ? t("skills.skillTitle") : "What skill do you want to learn?"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base"
            />
            <VoiceInputButton onResult={(text) => setTitle(text)} className="absolute right-2 top-1.5" />
          </div>
          <div className="relative">
            <textarea
              placeholder={formType === "offer" ? t("skills.description") : "Describe what you'd like to learn..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-senior-base"
            />
            <VoiceInputButton onResult={(text) => setDescription(prev => prev ? prev + " " + text : text)} className="absolute right-2 top-2" />
          </div>


          {/* Online / Offline toggle — only for offers */}
          {formType === "offer" && (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOnline(true)}
                  className={`flex-1 rounded-lg py-2.5 text-senior-base font-semibold border ${isOnline ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                >
                  🌐 Online
                </button>
                <button
                  type="button"
                  onClick={() => setIsOnline(false)}
                  className={`flex-1 rounded-lg py-2.5 text-senior-base font-semibold border ${!isOnline ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                >
                  📍 Offline
                </button>
              </div>

              {isOnline ? (
                <div className="relative">
                  <Link2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Session link (Zoom, Google Meet, etc.) - optional"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    type="url"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-senior-base"
                  />
                </div>
              ) : (
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Location (e.g. Community Hall, Park)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-senior-base"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 rounded-lg border border-border py-3 font-bold text-muted-foreground text-senior-base"
            >
              Cancel
            </button>
            <button
              onClick={submitSkill}
              disabled={!title.trim()}
              className="flex-1 rounded-lg bg-primary py-3 font-bold text-primary-foreground text-senior-base disabled:opacity-50"
            >
              {formType === "offer" ? t("skills.offerSkill") : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      {/* Skills List */}
      {filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Lightbulb size={44} className="mb-3 text-muted-foreground" />
          <h2 className="text-senior-lg font-bold mb-1">
            {activeTab === "offers" ? t("skills.noSkills") : "No skill requests yet"}
          </h2>
          <p className="text-muted-foreground text-senior-base">
            {activeTab === "offers" ? t("skills.noSkillsDesc") : "Be the first to request a skill you'd like to learn!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSkills.map(skill => {
            const isOwner = skill.user_id === user?.id;
            const hasJoined = learnedIds.has(skill.id);
            const isRequest = skill.type === "request";
            const skillComments = comments[skill.id] || [];
            const isExpanded = expandedComments.has(skill.id);

            return (
              <div key={skill.id} className="rounded-lg bg-card border border-border overflow-hidden">
                {/* Header badge */}
                <div className={`px-5 py-2 flex items-center gap-2 text-senior-sm font-bold uppercase tracking-wide ${
                  isRequest ? "bg-accent/30 text-accent-foreground" : "bg-skills-bg text-skills"
                }`}>
                  {isRequest ? "🙋 Skill Request" : "🎓 Skill Offered"}
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isRequest ? "bg-accent/20" : "bg-skills-bg"}`}>
                        {isRequest ? <HandHelping size={22} className="text-accent-foreground" /> : <Lightbulb size={22} className="text-skills" />}
                      </div>
                      <div>
                        <p className="font-bold text-senior-lg">{skill.title}</p>
                        <p className="text-senior-sm text-muted-foreground">
                          {isRequest ? "Requested by" : t("skills.taughtBy")} {skill.teacher_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && editingSkillId !== skill.id && (
                        <button
                          onClick={() => { setEditingSkillId(skill.id); setEditSkillTitle(skill.title); setEditSkillDesc(skill.description || ""); }}
                          className="rounded-md bg-muted p-2 text-muted-foreground hover:bg-muted/80"
                          title={t("common.edit")}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {isModerator && (
                        <button onClick={() => removeSkill(skill.id)} className="rounded-md bg-emergency/10 p-2 text-emergency hover:bg-emergency/20" title={t("skills.remove")}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingSkillId === skill.id ? (
                    <div className="space-y-2 mb-3">
                      <input value={editSkillTitle} onChange={(e) => setEditSkillTitle(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-base font-bold" autoFocus />
                      <textarea value={editSkillDesc} onChange={(e) => setEditSkillDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => saveSkillEdit(skill.id)} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-primary-foreground text-senior-sm font-bold"><Check size={14} /> {t("common.save")}</button>
                        <button onClick={() => setEditingSkillId(null)} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-muted-foreground text-senior-sm"><X size={14} /> {t("common.cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                  {skill.description && <SkillDescriptionBlock text={skill.description} />}

                  {/* Location / Link info */}
                  <div className="space-y-1.5 mb-3">
                    {skill.is_online && skill.link && (isOwner || hasJoined) && (
                      <a href={skill.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-senior-base text-primary font-semibold hover:underline">
                        <ExternalLink size={16} /> {isOwner ? "Open Link" : "Join Online"}
                      </a>
                    )}
                    {skill.is_online && skill.link && !isOwner && !hasJoined && (
                      <p className="flex items-center gap-1.5 text-senior-sm text-muted-foreground">
                        <Link2 size={14} /> Online session — join to get the link
                      </p>
                    )}
                    {!skill.is_online && skill.location && (
                      <p className="flex items-center gap-2 text-senior-base text-muted-foreground">
                        <MapPin size={16} /> {skill.location}
                      </p>
                    )}
                    {skill.is_online && !skill.link && (
                      <p className="flex items-center gap-1.5 text-senior-sm text-muted-foreground">
                        <Link2 size={14} /> Online
                      </p>
                    )}
                    {!skill.is_online && !skill.location && (
                      <p className="flex items-center gap-1.5 text-senior-sm text-muted-foreground">
                        <MapPin size={14} /> In-person
                      </p>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-senior-sm text-muted-foreground">
                      <Users size={16} /> {skill.learner_count || 0} {isRequest ? "interested" : t("skills.learners")}
                    </span>
                    {isOwner ? (
                      <span className="rounded-lg bg-muted px-5 py-2.5 text-senior-base font-semibold text-muted-foreground">
                        {isRequest ? "Your request" : "Your skill"}
                      </span>
                    ) : hasJoined ? (
                      <span className="rounded-lg bg-skills-bg px-5 py-2.5 text-senior-base font-semibold text-skills">
                        ✓ {isRequest ? "Offered to help" : t("skills.learning")}
                      </span>
                    ) : (
                      <button
                        onClick={() => requestToLearn(skill.id)}
                        className="rounded-lg border-2 border-primary px-5 py-2.5 text-senior-base font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {isRequest ? "I can teach this!" : t("skills.learnThis")}
                      </button>
                    )}
                  </div>

                  {/* Message & Comments row */}
                  <div className="flex items-center gap-3 mt-2">
                    {!isOwner && hasJoined && (
                      <button
                        onClick={() => startDM(skill.user_id, skill.id)}
                        className="flex items-center gap-1.5 text-senior-sm text-primary font-semibold hover:underline"
                      >
                        <MessageSquare size={15} /> Message {skill.teacher_name?.split(" ")[0]}
                      </button>
                    )}
                    <button
                      onClick={() => toggleComments(skill.id)}
                      className="flex items-center gap-1.5 text-senior-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                    <MessageCircle size={16} />
                    {isExpanded ? "Hide comments" : `Comments${skillComments.length > 0 ? ` (${skillComments.length})` : ""}`}
                  </button>
                  </div>

                  {/* Comments section */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      {skillComments.length === 0 && (
                        <p className="text-senior-sm text-muted-foreground">No comments yet. Be the first!</p>
                      )}
                      {skillComments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-senior-sm font-bold text-primary">
                            {(c.display_name || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-senior-sm">{c.display_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <p className="text-senior-sm">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {user && (
                        <div className="flex gap-2">
                          <input
                            value={commentText[skill.id] || ""}
                            onChange={(e) => setCommentText(prev => ({ ...prev, [skill.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-senior-sm"
                            onKeyDown={(e) => e.key === "Enter" && postComment(skill.id)}
                          />
                          <button
                            onClick={() => postComment(skill.id)}
                            disabled={!commentText[skill.id]?.trim()}
                            className="rounded-lg bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      )}
                    </div>
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

export default Skills;
