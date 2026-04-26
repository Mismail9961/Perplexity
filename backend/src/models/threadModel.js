import { supabase } from "../lib/supabase.js";

// ─── Table: public.threads ────────────────────────────────────────────────────
//
//  A "thread" is one conversation / search session.
//  It contains multiple messages (turns) back and forth.
//
//  Fields:
//    id            – UUID, auto-generated
//    user_id       – owner of the thread (null = anonymous guest)
//    title         – auto-generated from the first user message (max 80 chars)
//    is_public     – true means anyone with the link can view it
//    share_token   – random token used to build shareable URLs
//    mode          – answer style: 'concise' | 'detailed' | 'creative'
//    focus         – search scope: 'web' | 'academic' | 'news' | 'youtube' | 'reddit' | 'all'
//    message_count – total messages in this thread (incremented by a DB trigger)
//    created_at    – when the thread was started
//    updated_at    – last time any message was added
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new thread (e.g. when the user asks their first question).
 * @param {{ user_id?: string, mode?: string, focus?: string }} opts
 */
export async function createThread({ user_id = null, mode = "concise", focus = "web" } = {}) {
  const { data, error } = await supabase
    .from("threads")
    .insert({ user_id, mode, focus })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch a thread by its ID.
 * @param {string} threadId
 */
export async function getThreadById(threadId) {
  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all threads that belong to a user, newest first.
 * @param {string} userId
 * @param {{ limit?: number, offset?: number }} pagination
 */
export async function getThreadsByUser(userId, { limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

/**
 * Look up a publicly shared thread by its share_token.
 * @param {string} token
 */
export async function getThreadByShareToken(token) {
  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update thread fields (title, mode, focus, is_public, share_token, etc.).
 * @param {string} threadId
 * @param {object} updates
 */
export async function updateThread(threadId, updates) {
  const { data, error } = await supabase
    .from("threads")
    .update(updates)
    .eq("id", threadId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a thread and all its messages (cascades via DB foreign keys).
 * @param {string} threadId
 */
export async function deleteThread(threadId) {
  const { error } = await supabase
    .from("threads")
    .delete()
    .eq("id", threadId);

  if (error) throw error;
}
