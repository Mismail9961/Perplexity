import { supabase } from "../lib/supabase.js";

// ─── Table: public.spaces ─────────────────────────────────────────────────────
//
//  A Space is a shared workspace (like a Notion workspace or Slack channel).
//  Users can add threads to a space, invite collaborators, and set a custom
//  system prompt that applies to every search done inside that space.
//
//  Fields:
//    id            – UUID, auto-generated
//    owner_id      – user who created and owns this space
//    name          – display name of the space
//    description   – optional description
//    is_public     – whether non-members can view the space
//    system_prompt – custom instructions injected into every search in this space
//    created_at    – when the space was created
//    updated_at    – last modification time
//
// ─── Table: public.space_members ─────────────────────────────────────────────
//
//  Many-to-many join between spaces and users.
//  Each member has a role: 'owner' | 'editor' | 'viewer'.
// ─────────────────────────────────────────────────────────────────────────────

// ── Spaces ────────────────────────────────────────────────────────────────────

/**
 * Create a new space.
 * @param {{ owner_id: string, name: string, description?: string, system_prompt?: string }} opts
 */
export async function createSpace({ owner_id, name, description = null, system_prompt = null }) {
  const { data, error } = await supabase
    .from("spaces")
    .insert({ owner_id, name, description, system_prompt })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch a space by its ID.
 * @param {string} spaceId
 */
export async function getSpaceById(spaceId) {
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", spaceId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all spaces a user owns or is a member of.
 * @param {string} userId
 */
export async function getSpacesForUser(userId) {
  const { data, error } = await supabase
    .from("spaces")
    .select(`
      *,
      space_members!inner(role)
    `)
    .eq("space_members.user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update space settings (name, description, system_prompt, is_public).
 * @param {string} spaceId
 * @param {object} updates
 */
export async function updateSpace(spaceId, updates) {
  const { data, error } = await supabase
    .from("spaces")
    .update(updates)
    .eq("id", spaceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a space and all its member records.
 * @param {string} spaceId
 */
export async function deleteSpace(spaceId) {
  const { error } = await supabase.from("spaces").delete().eq("id", spaceId);
  if (error) throw error;
}

// ── Space Members ─────────────────────────────────────────────────────────────

/**
 * Add a user to a space with a given role.
 * @param {{ space_id: string, user_id: string, role?: 'owner' | 'editor' | 'viewer' }} opts
 */
export async function addSpaceMember({ space_id, user_id, role = "viewer" }) {
  const { data, error } = await supabase
    .from("space_members")
    .insert({ space_id, user_id, role })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * List all members of a space along with their user profile.
 * @param {string} spaceId
 */
export async function getSpaceMembers(spaceId) {
  const { data, error } = await supabase
    .from("space_members")
    .select("role, joined_at, users(id, email, display_name, avatar_url)")
    .eq("space_id", spaceId);

  if (error) throw error;
  return data;
}

/**
 * Update a member's role inside a space.
 * @param {string} spaceId
 * @param {string} userId
 * @param {'owner' | 'editor' | 'viewer'} role
 */
export async function updateSpaceMemberRole(spaceId, userId, role) {
  const { error } = await supabase
    .from("space_members")
    .update({ role })
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Remove a user from a space.
 * @param {string} spaceId
 * @param {string} userId
 */
export async function removeSpaceMember(spaceId, userId) {
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ── Space Threads ─────────────────────────────────────────────────────────────

/**
 * Add a thread to a space.
 * @param {string} spaceId
 * @param {string} threadId
 */
export async function addThreadToSpace(spaceId, threadId) {
  const { data, error } = await supabase
    .from("space_threads")
    .insert({ space_id: spaceId, thread_id: threadId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all threads that have been added to a space.
 * @param {string} spaceId
 */
export async function getThreadsInSpace(spaceId) {
  const { data, error } = await supabase
    .from("space_threads")
    .select("added_at, threads(*)")
    .eq("space_id", spaceId)
    .order("added_at", { ascending: false });

  if (error) throw error;
  return data;
}
