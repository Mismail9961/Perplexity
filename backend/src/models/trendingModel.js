import { supabase } from "../lib/supabase.js";

// ─── Table: public.trending_queries ───────────────────────────────────────────
//
//  Tracks which search queries are popular within hourly time windows.
//  Used to populate the "Trending" section on the home screen.
//  The table is refreshed/aggregated by a background job (e.g. cron).
//
//  Fields:
//    id           – UUID, auto-generated
//    query_text   – the search query string
//    focus        – which search scope was used: 'web' | 'news' | 'academic' …
//    search_count – how many times this query was searched in this window
//    window_start – the hourly bucket this record belongs to
//    created_at   – when the record was created
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the top trending queries for the most recent completed hour.
 * @param {{ limit?: number, focus?: string }} opts
 */
export async function getTrendingQueries({ limit = 10, focus = null } = {}) {
  // Find the start of the latest hour window we have data for
  const latestWindowStart = new Date();
  latestWindowStart.setMinutes(0, 0, 0);           // round down to current hour
  latestWindowStart.setHours(latestWindowStart.getHours() - 1);  // use previous hour (complete data)

  let query = supabase
    .from("trending_queries")
    .select("query_text, focus, search_count, window_start")
    .gte("window_start", latestWindowStart.toISOString())
    .order("search_count", { ascending: false })
    .limit(limit);

  // optionally filter by search focus
  if (focus) query = query.eq("focus", focus);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Upsert a trending record — increments the count if the query+focus+window
 * combination already exists, otherwise creates a new row.
 * Called by the analytics / ingestion pipeline.
 * @param {{ query_text: string, focus: string, window_start: string }} opts
 */
export async function recordTrendingQuery({ query_text, focus, window_start }) {
  // Try to increment first, then fall back to insert
  const { data: existing } = await supabase
    .from("trending_queries")
    .select("id, search_count")
    .eq("query_text", query_text)
    .eq("focus", focus)
    .eq("window_start", window_start)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("trending_queries")
      .update({ search_count: existing.search_count + 1 })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("trending_queries")
      .insert({ query_text, focus, window_start, search_count: 1 });
    if (error) throw error;
  }
}
