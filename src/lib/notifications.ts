import { supabase } from "@/integrations/supabase/client";

/**
 * Send a notification to a user.
 */
export const sendNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId?: string,
) => {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    related_id: relatedId || null,
  });
};

/**
 * Notify event host when someone joins their event.
 */
export const notifyEventJoin = async (
  hostId: string,
  eventTitle: string,
  joinerName: string,
  eventId: string,
) => {
  await sendNotification(
    hostId,
    "event_join",
    "New Event Attendee!",
    `${joinerName} joined your event "${eventTitle}"`,
    eventId,
  );
};

/**
 * Notify help requester when someone offers to help.
 */
export const notifyHelpOffer = async (
  requesterId: string,
  volunteerName: string,
  helpDescription: string,
  helpRequestId: string,
) => {
  await sendNotification(
    requesterId,
    "help_offer",
    "Someone Offered to Help!",
    `${volunteerName} offered to help with: "${helpDescription.slice(0, 60)}${helpDescription.length > 60 ? "..." : ""}"`,
    helpRequestId,
  );
};

/**
 * Notify connected family members when a senior checks in.
 */
export const notifyFamilyCheckin = async (
  seniorId: string,
  seniorName: string,
) => {
  const { data: connections } = await supabase
    .from("family_connections")
    .select("family_user_id")
    .eq("senior_user_id", seniorId);

  if (!connections || connections.length === 0) return;

  for (const conn of connections) {
    await sendNotification(
      conn.family_user_id,
      "checkin",
      "Daily Check-in! 💚",
      `${seniorName} has checked in and is doing well.`,
      seniorId,
    );
  }
};

/**
 * Notify skill owner when someone joins their skill.
 */
export const notifySkillJoin = async (
  ownerId: string,
  skillTitle: string,
  learnerName: string,
  skillId: string,
) => {
  await sendNotification(
    ownerId,
    "skill_join",
    "New Learner! 📚",
    `${learnerName} wants to learn "${skillTitle}"`,
    skillId,
  );
};

/**
 * Notify skill owner when someone offers to teach their request.
 */
export const notifySkillTeachOffer = async (
  requesterId: string,
  teacherName: string,
  skillTitle: string,
  skillId: string,
) => {
  await sendNotification(
    requesterId,
    "skill_teach",
    "Someone Can Teach You! 🎓",
    `${teacherName} offered to teach "${skillTitle}"`,
    skillId,
  );
};

/**
 * Notify skill owner when someone comments on their skill.
 */
export const notifySkillComment = async (
  ownerId: string,
  commenterName: string,
  skillTitle: string,
  skillId: string,
) => {
  await sendNotification(
    ownerId,
    "skill_comment",
    "New Comment 💬",
    `${commenterName} commented on "${skillTitle}"`,
    skillId,
  );
};
