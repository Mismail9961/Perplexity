import { supabase } from "../lib/supabase.js";

// ─── Table: public.usage_events ───────────────────────────────────────────────
//
//  An append-only log of every billable action.
//  Never update or delete rows — only insert.
//  Used for analytics, billing, and rate-limiting.
//
//  Fields:
//    id                – UUID, auto-generated
//    user_id           – who triggered the event (null = anonymous)
//    thread_id         – related thread (optional)
//    message_id        – related message (optional)
//    event_type        – what happened: 'search' | 'image_gen' | 'api_call' | …
//    prompt_tokens     – tokens sent to the model
//    completion_tokens – tokens received from the model
//    cost_microcents   – cost in USD × 10,000,000 (avoids floating-point errors)
//    model             – which AI model was used
//    metadata          – any extra JSON data (e.g. focus, search API used)
//    created_at        – when the event occurred
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a single usage event.
 * @param {{
 *   user_id?: string,
 *   thread_id?: string,
 *   message_id?: string,
 *   event_type: string,
 *   prompt_tokens?: number,
 *   completion_tokens?: number,
 *   cost_microcents?: number,
 *   model?: string,
 *   metadata?: object
 * }} event
 */
export async function logUsageEvent(event) {
  const { data, error } = await supabase
    .from("usage_events")
    .insert({
      user_id: event.user_id ?? null,
      thread_id: event.thread_id ?? null,
      message_id: event.message_id ?? null,
      event_type: event.event_type,
      prompt_tokens: event.prompt_tokens ?? 0,
      completion_tokens: event.completion_tokens ?? 0,
      cost_microcents: event.cost_microcents ?? 0,
      model: event.model ?? null,
      metadata: event.metadata ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all usage events for a user within a date range.
 * @param {string} userId
 * @param {{ from: string, to: string }} dateRange – ISO date strings
 */
export async function getUsageByUser(userId, { from, to }) {
  const { data, error } = await supabase
    .from("usage_events")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get the total token and cost usage for a user in the current calendar month.
 * @param {string} userId
 */
export async function getMonthlyUsageSummary(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_events")
    .select("prompt_tokens, completion_tokens, cost_microcents")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) throw error;

  // Sum everything up on the JS side
  return data.reduce(
    (totals, row) => ({
      total_prompt_tokens: totals.total_prompt_tokens + (row.prompt_tokens ?? 0),
      total_completion_tokens: totals.total_completion_tokens + (row.completion_tokens ?? 0),
      total_cost_microcents: totals.total_cost_microcents + (row.cost_microcents ?? 0),
    }),
    { total_prompt_tokens: 0, total_completion_tokens: 0, total_cost_microcents: 0 }
  );
}
