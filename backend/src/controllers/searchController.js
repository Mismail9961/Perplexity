// ============================================
// searchController.js — The brain of /api/search
// ============================================
// This file is the controller for the search endpoint.
// It receives the user's question, runs the pipeline:
//
//   Step 1: searchWeb(query)    → get web results
//   Step 2: summarizeWithAI()  → generate cited answer
//   Step 3: send back response
//
// If anything goes wrong, we catch the error and
// send back a clear error message.
// ============================================

import { searchWeb } from "../services/webSearch.js";
import { summarizeWithAI } from "../services/aiSummarize.js";

const search = async (req, res) => {
  // --- 1. Get the user's question from the request body ---
  const { query } = req.body;

  // Validate: query is required
  if (!query || query.trim() === "") {
    return res.status(400).json({
      message: "Please provide a search query",
      example: { query: "What is quantum computing?" },
    });
  }

  console.log(`🔍 New search: "${query}"`);

  try {
    // --- 2. STEP 1: Search the web ---
    console.log("  → Searching the web via Tavily...");
    const sources = await searchWeb(query);
    console.log(`  → Got ${sources.length} results from the web`);

    // If Tavily returned nothing, stop early
    if (!sources || sources.length === 0) {
      return res.status(200).json({
        answer: "Sorry, I couldn't find any relevant results for your query.",
        sources: [],
      });
    }

    // --- 3. STEP 2: Ask the AI to summarize ---
    console.log("  → Asking AI to summarize...");
    const answer = await summarizeWithAI(query, sources);
    console.log("  → AI answer generated ✓");

    // --- 4. STEP 3: Send back the final response ---
    return res.status(200).json({
      answer,    // the AI-generated answer with [1][2] citations
      sources,   // the raw web results (title, url, snippet)
    });

  } catch (error) {
    // Something went wrong — log it and tell the user
    console.error("Search error:", error.message);
    return res.status(500).json({
      message: "Search failed. Please try again.",
      error: error.message, // helpful for debugging
    });
  }
};

export default { search };
