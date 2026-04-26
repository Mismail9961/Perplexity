import { supabase } from "../lib/supabase.js";

// ─── Table: public.follow_up_questions ───────────────────────────────────────
//
//  After each assistant answer, we suggest 3 follow-up questions the user
//  might want to ask next. We track whether they clicked one.
//
//  Fields:
//    id          – UUID, auto-generated
//    message_id  – the assistant message these suggestions belong to
//    question    – the suggested follow-up question text
//    position    – display order: 1, 2, or 3
//    was_clicked – true if the user tapped this suggestion
//    created_at  – when the suggestions were generated
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save the suggested follow-up questions for an assistant message.
 * @param {string} messageId
 * @param {string[]} questions – array of up to 3 question strings
 */
export async function saveFollowUpQuestions(messageId, questions) {
  const rows = questions.map((question, index) => ({
    message_id: messageId,
    question,
    position: index + 1,  // 1-based
    was_clicked: false,
  }));

  const { data, error } = await supabase
    .from("follow_up_questions")
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Get the follow-up questions for a message, in display order.
 * @param {string} messageId
 */
export async function getFollowUpQuestions(messageId) {
  const { data, error } = await supabase
    .from("follow_up_questions")
    .select("*")
    .eq("message_id", messageId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Mark a follow-up question as clicked (so we can track which ones are popular).
 * @param {string} followUpId
 */
export async function markFollowUpClicked(followUpId) {
  const { error } = await supabase
    .from("follow_up_questions")
    .update({ was_clicked: true })
    .eq("id", followUpId);

  if (error) throw error;
}
