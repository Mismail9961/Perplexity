import { supabase } from "../lib/supabase.js";

// ─── Table: public.users ──────────────────────────────────────────────────────
//
//  Extends Supabase's built-in auth.users table.
//  Created automatically after a user signs up via Supabase Auth.
//
//  Fields:
//    id                – UUID, matches auth.users.id
//    email             – unique email address
//    display_name      – shown in the UI (optional)
//    avatar_url        – profile picture URL (optional)
//    subscription_tier – 'free' | 'pro' | 'enterprise'
//    searches_this_month – usage counter, reset monthly
//    default_mode      – preferred answer style: 'concise' | 'detailed' | 'creative'
//    default_focus     – preferred search scope: 'web' | 'academic' | 'news' | 'youtube' | 'reddit' | 'all'
//    language          – UI language code, e.g. 'en'
//    created_at        – when the profile was created
//    updated_at        – last profile update
//    last_active_at    – last time the user made a request
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single user profile by their ID.
 * @param {string} userId - The user's UUID
 */
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new user profile (called after Supabase Auth signup).
 * @param {{ id: string, email: string, display_name?: string, avatar_url?: string }} profile
 */
export async function createUser(profile) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      subscription_tier: "free",      // everyone starts on free
      searches_this_month: 0,
      default_mode: "concise",
      default_focus: "web",
      language: "en",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update any fields on a user profile.
 * @param {string} userId
 * @param {Partial<{ display_name, avatar_url, default_mode, default_focus, language, subscription_tier, subscription_ends_at }>} updates
 */
export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Increment the monthly search counter for a user by 1.
 * @param {string} userId
 */
export async function incrementSearchCount(userId) {
  const { error } = await supabase.rpc("increment_search_count", {
    user_id: userId,
  });
  if (error) throw error;
}

/**
 * Record the current time as the user's last_active_at timestamp.
 * @param {string} userId
 */
export async function touchLastActive(userId) {
  const { error } = await supabase
    .from("users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}