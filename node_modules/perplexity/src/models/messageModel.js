import { supabase } from "../lib/supabase.js";

// ─── Table: public.messages ───────────────────────────────────────────────────
//
//  A message is one turn inside a thread.
//  Roles alternate: user → assistant → user → assistant …
//
//  Fields:
//    id            – UUID, auto-generated
//    thread_id     – which thread this message belongs to
//    role          – who sent it: 'user' | 'assistant' | 'system'
//    content       – full text / markdown of the message
//    model         – AI model used (assistant only), e.g. 'gpt-4o'
//    input_tokens  – prompt token count (assistant only)
//    output_tokens – completion token count (assistant only)
//    latency_ms    – milliseconds to first token (assistant only)
//    position      – 1-based index of this message within its thread
//    created_at    – when the message was created
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a new message to a thread.
 * @param {{
 *   thread_id: string,
 *   role: 'user' | 'assistant' | 'system',
 *   content: string,
 *   position: number,
 *   model?: string,
 *   input_tokens?: number,
 *   output_tokens?: number,
 *   latency_ms?: number
 * }} message
 */
export async function createMessage(message) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_id: message.thread_id,
      role: message.role,
      content: message.content,
      position: message.position,
      model: message.model ?? null,
      input_tokens: message.input_tokens ?? null,
      output_tokens: message.output_tokens ?? null,
      latency_ms: message.latency_ms ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all messages in a thread, ordered by position (oldest first).
 * @param {string} threadId
 */
export async function getMessagesByThread(threadId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Fetch a single message by its ID.
 * @param {string} messageId
 */
export async function getMessageById(messageId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an assistant message with token counts and latency
 * (useful after streaming is complete).
 * @param {string} messageId
 * @param {{ model?: string, input_tokens?: number, output_tokens?: number, latency_ms?: number }} stats
 */
export async function updateMessageStats(messageId, stats) {
  const { data, error } = await supabase
    .from("messages")
    .update(stats)
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
