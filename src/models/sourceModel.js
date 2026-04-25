import { supabase } from "../lib/supabase.js";

// ─── Table: public.sources ────────────────────────────────────────────────────
//
//  A source is one web result that was fetched during a search turn.
//  Each source is linked to the assistant message that used it.
//  The citation_index is the number shown in the answer, e.g. [1], [2].
//
//  Fields:
//    id              – UUID, auto-generated
//    message_id      – the assistant message this source belongs to
//    citation_index  – display number in the answer (1, 2, 3 …)
//    source_type     – 'web' | 'pdf' | 'youtube' | 'reddit' | 'news' | 'academic'
//    url             – full URL of the page
//    title           – page title
//    description     – meta description or snippet
//    favicon_url     – small icon for the source website
//    published_at    – when the article / page was published (if known)
//    domain          – extracted hostname, e.g. 'wikipedia.org'
//    search_rank     – position in the raw search results (1 = top)
//    relevance_score – reranker confidence score, 0–1
//    is_cited        – true if this source is actually referenced in the answer
//    created_at      – when the record was saved
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a batch of sources for one assistant message.
 * @param {Array<{
 *   message_id: string,
 *   citation_index: number,
 *   url: string,
 *   title?: string,
 *   description?: string,
 *   favicon_url?: string,
 *   published_at?: string,
 *   domain?: string,
 *   source_type?: string,
 *   search_rank?: number,
 *   relevance_score?: number,
 *   is_cited?: boolean
 * }>} sources
 */
export async function saveSources(sources) {
  const { data, error } = await supabase
    .from("sources")
    .insert(sources)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Fetch all sources attached to a specific message, ordered by citation_index.
 * @param {string} messageId
 */
export async function getSourcesByMessage(messageId) {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("message_id", messageId)
    .order("citation_index", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Mark specific sources as actually cited inside the answer text.
 * @param {string[]} sourceIds – list of source UUIDs to mark as cited
 */
export async function markSourcesAsCited(sourceIds) {
  const { error } = await supabase
    .from("sources")
    .update({ is_cited: true })
    .in("id", sourceIds);

  if (error) throw error;
}
