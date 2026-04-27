// ============================================
// webSearch.js — Step 1 of the search pipeline
// ============================================
// This file talks to the Tavily API.
// Tavily is a search engine built for AI apps.
// It returns clean text snippets (no HTML mess).
//
// Input:  A question string, e.g. "What is quantum computing?"
// Output: An array of sources like:
//         [{ title, url, content }, ...]
// ============================================

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_URL = "https://api.tavily.com/search";

export async function searchWeb(query) {
  // Tell Tavily what we want to search for
  const response = await fetch(TAVILY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,  // our API key
      query: query,             // the user's question
      max_results: 5,           // get top 5 results (enough context for the AI)
      include_answer: false,    // we want raw results, not Tavily's own answer
    }),
  });

  // If something went wrong with Tavily, throw an error
  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`);
  }

  const data = await response.json();

  // Tavily returns: { results: [{ title, url, content, score }, ...] }
  // We just pull out the fields we need
  const sources = data.results.map((result) => ({
    title: result.title,
    url: result.url,
    snippet: result.content, // the actual text snippet from the page
  }));

  return sources; // e.g. [{title, url, snippet}, {title, url, snippet}, ...]
}
