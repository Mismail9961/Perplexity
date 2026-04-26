import { supabase } from "../lib/supabase.js";

// ─── Table: public.collections ────────────────────────────────────────────────
//
//  A collection is like a bookmark folder — users can save / organise threads.
//
//  Fields:
//    id          – UUID, auto-generated
//    user_id     – owner of the collection
//    name        – e.g. "AI Research", "Work Stuff"
//    description – optional longer description
//    created_at  – when the collection was created
//
// ─── Table: public.collection_threads ────────────────────────────────────────
//
//  Many-to-many join: which threads are saved in which collection.
// ─────────────────────────────────────────────────────────────────────────────

// ── Collections ───────────────────────────────────────────────────────────────

/**
 * Create a new collection for a user.
 * @param {{ user_id: string, name: string, description?: string }} opts
 */
export async function createCollection({ user_id, name, description = null }) {
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id, name, description })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all collections belonging to a user.
 * @param {string} userId
 */
export async function getCollectionsByUser(userId) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update a collection's name or description.
 * @param {string} collectionId
 * @param {{ name?: string, description?: string }} updates
 */
export async function updateCollection(collectionId, updates) {
  const { data, error } = await supabase
    .from("collections")
    .update(updates)
    .eq("id", collectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a collection (also removes all saved thread references).
 * @param {string} collectionId
 */
export async function deleteCollection(collectionId) {
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId);

  if (error) throw error;
}

// ── Saved Threads ─────────────────────────────────────────────────────────────

/**
 * Save a thread into a collection (bookmark it).
 * @param {string} collectionId
 * @param {string} threadId
 */
export async function saveThreadToCollection(collectionId, threadId) {
  const { data, error } = await supabase
    .from("collection_threads")
    .insert({ collection_id: collectionId, thread_id: threadId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all threads saved in a collection, newest first.
 * @param {string} collectionId
 */
export async function getThreadsInCollection(collectionId) {
  const { data, error } = await supabase
    .from("collection_threads")
    .select("saved_at, threads(*)")
    .eq("collection_id", collectionId)
    .order("saved_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Remove a thread from a collection (un-bookmark).
 * @param {string} collectionId
 * @param {string} threadId
 */
export async function removeThreadFromCollection(collectionId, threadId) {
  const { error } = await supabase
    .from("collection_threads")
    .delete()
    .eq("collection_id", collectionId)
    .eq("thread_id", threadId);

  if (error) throw error;
}
