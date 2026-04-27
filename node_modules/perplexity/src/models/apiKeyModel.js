import { supabase } from "../lib/supabase.js";

// ─── Table: public.api_keys ───────────────────────────────────────────────────
//
//  Pro users can generate API keys to use the Perplexity API programmatically.
//  We never store the raw key — only a hash of it (like passwords).
//  The key_prefix (first ~8 chars) is shown in the UI so users can identify keys.
//
//  Fields:
//    id           – UUID, auto-generated
//    user_id      – which user this key belongs to
//    key_hash     – bcrypt hash of the actual key (we never store the raw key)
//    key_prefix   – e.g. "pplx-ab12" — shown in the UI for identification
//    name         – user-chosen label, e.g. "My App", "GitHub Actions"
//    last_used_at – timestamp of the last successful API call with this key
//    expires_at   – optional expiry date (null = never expires)
//    is_active    – false if the user revoked this key
//    created_at   – when the key was generated
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a newly generated API key record.
 * Note: call this AFTER generating and showing the raw key to the user once.
 * @param {{
 *   user_id: string,
 *   key_hash: string,
 *   key_prefix: string,
 *   name?: string,
 *   expires_at?: string
 * }} opts
 */
export async function createApiKey({ user_id, key_hash, key_prefix, name = null, expires_at = null }) {
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id, key_hash, key_prefix, name, expires_at, is_active: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all API keys for a user (for the dashboard listing).
 * Never returns key_hash — only safe display fields.
 * @param {string} userId
 */
export async function getApiKeysByUser(userId) {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, key_prefix, name, last_used_at, expires_at, is_active, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Look up a key by its hash (used during API request authentication).
 * @param {string} keyHash
 */
export async function getApiKeyByHash(keyHash) {
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (error?.code === "PGRST116") return null;  // not found
  if (error) throw error;
  return data;
}

/**
 * Record the current time as last_used_at for a key.
 * @param {string} apiKeyId
 */
export async function touchApiKeyLastUsed(apiKeyId) {
  const { error } = await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyId);

  if (error) throw error;
}

/**
 * Revoke (deactivate) an API key.
 * @param {string} apiKeyId
 */
export async function revokeApiKey(apiKeyId) {
  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", apiKeyId);

  if (error) throw error;
}
