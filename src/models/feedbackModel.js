import { supabase } from "../lib/supabase.js";

// ─── Table: public.feedback ───────────────────────────────────────────────────
//
//  Users can give a thumbs up or thumbs down on any assistant answer.
//  One user can only rate each message once (enforced by a DB unique constraint).
//
//  Fields:
//    id         – UUID, auto-generated
//    message_id – which assistant message was rated
//    user_id    – who gave the rating (null = anonymous)
//    value      – 'up' (👍) or 'down' (👎)
//    comment    – optional free-text explanation of the rating
//    created_at – when the rating was submitted
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a thumbs up or thumbs down rating for an assistant message.
 * If the user already rated this message, the old rating is replaced.
 * @param {{
 *   message_id: string,
 *   user_id?: string,
 *   value: 'up' | 'down',
 *   comment?: string
 * }} feedback
 */
export async function submitFeedback({ message_id, user_id = null, value, comment = null }) {
  const { data, error } = await supabase
    .from("feedback")
    .upsert(
      { message_id, user_id, value, comment },
      { onConflict: "message_id,user_id" }   // replace if already rated
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the feedback rating a specific user gave to a specific message.
 * Returns null if they haven't rated it yet.
 * @param {string} messageId
 * @param {string} userId
 */
export async function getFeedbackForMessage(messageId, userId) {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") return null;  // not rated yet
  if (error) throw error;
  return data;
}

/**
 * Get aggregated feedback counts for a message.
 * Returns { up: number, down: number }.
 * @param {string} messageId
 */
export async function getFeedbackSummary(messageId) {
  const { data, error } = await supabase
    .from("feedback")
    .select("value")
    .eq("message_id", messageId);

  if (error) throw error;

  return data.reduce(
    (counts, row) => {
      counts[row.value] = (counts[row.value] ?? 0) + 1;
      return counts;
    },
    { up: 0, down: 0 }
  );
}
