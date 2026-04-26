import { supabase } from "../lib/supabase.js";

// ─── Table: public.search_cache ───────────────────────────────────────────────
//
//  Caches raw search API responses to avoid calling the (paid) search API
//  twice for the exact same query within a short time window (default: 1 hour).
//
//  How it works:
//    1. Before hitting the search API, hash the normalised query string.
//    2. Look for a cached row with that hash that hasn't expired yet.
//    3. If found, use the cached results (free). If not, call the API and store it.
//
//  Fields:
//    id           – UUID, auto-generated
//    query_hash   – SHA-256 of the normalised query string (used as the lookup key)
//    query_text   – original query text (for debugging)
//    focus        – search scope used for this query
//    raw_results  – the full JSON array returned by the search API
//    hit_count    – how many times this cache entry has been reused
//    expires_at   – when this cache entry becomes stale (usually now + 1 hour)
//    created_at   – when the entry was first stored
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a cached search result.
 * Returns null if nothing is found or the entry has expired.
 * @param {string} queryHash – SHA-256 hex string of the query
 */
export async function getCachedSearch(queryHash) {
  const { data, error } = await supabase
    .from("search_cache")
    .select("*")
    .eq("query_hash", queryHash)
    .gt("expires_at", new Date().toISOString())   // only return non-expired rows
    .single();

  // code PGRST116 = "no rows found" — that's fine, just means cache miss
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data;
}

/**
 * Store a new search result in the cache.
 * @param {{
 *   query_hash: string,
 *   query_text: string,
 *   focus: string,
 *   raw_results: object[],
 *   ttl_minutes?: number   // how long to cache, default 60 minutes
 * }} entry
 */
export async function setCachedSearch({ query_hash, query_text, focus, raw_results, ttl_minutes = 60 }) {
  const expires_at = new Date(Date.now() + ttl_minutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("search_cache")
    .upsert(
      { query_hash, query_text, focus, raw_results, expires_at, hit_count: 1 },
      { onConflict: "query_hash" }   // update if it already exists
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Increment the hit counter on a cache entry (called every time a cache hit occurs).
 * @param {string} cacheId
 */
export async function incrementCacheHitCount(cacheId) {
  const { error } = await supabase.rpc("increment_cache_hits", { cache_id: cacheId });
  if (error) throw error;
}

/**
 * Delete all expired cache rows (call this from a cron job, e.g. every hour).
 */
export async function purgeExpiredCache() {
  const { error } = await supabase
    .from("search_cache")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (error) throw error;
}
