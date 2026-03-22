import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = in24h.toISOString().split("T")[0];

    const { data: upcomingEvents, error: eventsError } = await supabase
      .from("events")
      .select("id, title, event_date, event_time, host_id")
      .eq("removed", false)
      .gte("event_date", todayStr)
      .lte("event_date", tomorrowStr);

    if (eventsError) throw eventsError;

    let eventReminders = 0;
    if (upcomingEvents) {
      for (const event of upcomingEvents) {
        const { data: attendees, error: attendeesError } = await supabase
          .from("event_attendees")
          .select("user_id")
          .eq("event_id", event.id);

        if (attendeesError) {
          console.error("Failed to fetch attendees:", attendeesError);
          continue;
        }

        const userIds = [event.host_id, ...(attendees?.map((a) => a.user_id) || [])].filter(Boolean);
        const uniqueIds = [...new Set(userIds)];

        for (const userId of uniqueIds) {
          const { data: existing, error: existingError } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "event_reminder")
            .eq("related_id", event.id)
            .limit(1);

          if (existingError) {
            console.error("Failed to check existing event reminder:", existingError);
            continue;
          }

          if (existing && existing.length > 0) continue;

          const { error: insertError } = await supabase.from("notifications").insert({
            user_id: userId,
            type: "event_reminder",
            title: "Event Tomorrow! 📅",
            message: `"${event.title}" is happening ${event.event_time ? "at " + event.event_time : "tomorrow"}. Don't miss it!`,
            related_id: event.id,
          });

          if (insertError) {
            console.error("Failed to insert event reminder:", insertError);
            continue;
          }

          eventReminders++;
        }
      }
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSkills, error: skillsError } = await supabase
      .from("skills")
      .select("id, title, user_id, type")
      .eq("removed", false)
      .eq("type", "offer")
      .gte("created_at", sevenDaysAgo);

    if (skillsError) throw skillsError;

    let skillReminders = 0;
    if (recentSkills) {
      for (const skill of recentSkills) {
        const { data: learners, error: learnersError } = await supabase
          .from("skill_learners")
          .select("user_id")
          .eq("skill_id", skill.id);

        if (learnersError) {
          console.error("Failed to fetch learners:", learnersError);
          continue;
        }

        if (!learners || learners.length === 0 || !skill.user_id) continue;

        const { data: existingTeacher, error: existingTeacherError } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", skill.user_id)
          .eq("type", "skill_reminder")
          .eq("related_id", skill.id)
          .gte("created_at", sevenDaysAgo)
          .limit(1);

        if (existingTeacherError) {
          console.error("Failed to check existing skill reminder:", existingTeacherError);
          continue;
        }

        if (!existingTeacher || existingTeacher.length === 0) {
          const { error: insertError } = await supabase.from("notifications").insert({
            user_id: skill.user_id,
            type: "skill_reminder",
            title: "Skill Session Reminder 📚",
            message: `You have ${learners.length} learner(s) for "${skill.title}". Schedule a session!`,
            related_id: skill.id,
          });

          if (insertError) {
            console.error("Failed to insert skill reminder:", insertError);
            continue;
          }

          skillReminders++;
        }
      }
    }

    return jsonResponse({ eventReminders, skillReminders });
  } catch (error) {
    console.error("send-reminders error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
});
