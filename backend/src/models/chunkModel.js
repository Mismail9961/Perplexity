import { supabase } from "../lib/supabase.js";

// ─── Table: public.document_chunks ───────────────────────────────────────────
//
//  When a source page is scraped, its text is split into small chunks
//  (~500 tokens each). Each chunk gets a vector embedding so we can
//  find the most relevant pieces using semantic (similarity) search.
//
//  Fields:
//    id          – UUID, auto-generated
//    source_id   – which source this chunk came from
//    chunk_index – order of this chunk within the document (0, 1, 2 …)
//    content     – the raw text of this chunk
//    token_count – approximate token count of the text
//    embedding   – 1536-dimensional vector (from text-embedding-3-small)
//    created_at  – when the chunk was stored
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store one or more chunks for a source document.
 * @param {Array<{
 *   source_id: string,
 *   chunk_index: number,
 *   content: string,
 *   token_count?: number,
 *   embedding?: number[]   // 1536-element array
 * }>} chunks
 */
export async function saveChunks(chunks) {
  const { data, error } = await supabase
    .from("document_chunks")
    .insert(chunks)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Fetch all chunks for a given source, in document order.
 * @param {string} sourceId
 */
export async function getChunksBySource(sourceId) {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, chunk_index, content, token_count")
    .eq("source_id", sourceId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Semantic similarity search — finds the most relevant chunks for a query.
 * Calls the match_chunks Postgres function which uses the pgvector HNSW index.
 *
 * @param {number[]} queryEmbedding  – 1536-element embedding of the search query
 * @param {{
 *   matchThreshold?: number,  // minimum similarity score (0–1), default 0.7
 *   matchCount?: number,      // max results to return, default 10
 *   sourceIds?: string[]      // optional: restrict to specific sources
 * }} opts
 * @returns {Promise<Array<{ id, source_id, content, similarity }>>}
 */
export async function searchSimilarChunks(queryEmbedding, {
  matchThreshold = 0.7,
  matchCount = 10,
  sourceIds = null,
} = {}) {
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    p_source_ids: sourceIds,
  });

  if (error) throw error;
  return data;
}
