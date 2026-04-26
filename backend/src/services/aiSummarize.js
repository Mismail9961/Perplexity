// ============================================
// aiSummarize.js — Step 2 of the search pipeline
// ============================================
// This file talks to the Groq API (fast free LLM).
// We give it:
//   - The user's question
//   - The web search results (as text)
// And it gives us back a clear, cited answer.
//
// Input:  query (string), sources (array of {title, url, snippet})
// Output: A string answer with [1][2] style citations
// ============================================

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function summarizeWithAI(query, sources) {
  // ---- Build the "context" block from search results ----
  // We number each source so the AI can reference them as [1], [2], etc.
  //
  // Example output:
  //   [1] Title: Wikipedia - Quantum Computing
  //       URL: https://en.wikipedia.org/...
  //       Content: Quantum computing is a type of computation...
  //
  //   [2] Title: IBM - What is Quantum Computing?
  //       ...

  const sourcesText = sources
    .map(
      (source, index) =>
        `[${index + 1}] Title: ${source.title}\n    URL: ${source.url}\n    Content: ${source.snippet}`
    )
    .join("\n\n");

  // ---- Build the full prompt for the AI ----
  // We tell the AI clearly:
  //   1. What role it plays (a helpful search assistant)
  //   2. What the user asked
  //   3. The web results to use as context
  //   4. How to format the answer

  const prompt = `You are a helpful AI search assistant, similar to Perplexity AI.
The user asked: "${query}"

Here are the top web search results to help you answer:

${sourcesText}

Instructions:
- Answer the user's question clearly and accurately.
- Use the search results above as your source of truth.
- When you use information from a source, cite it like this: [1] or [2].
- Keep the answer concise but complete (2-4 paragraphs).
- Do NOT make up information. Only use what's in the sources.
- End with a short summary sentence.`;

  // ---- Call Groq API ----
  const chatCompletion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // fast, free Groq model (Llama 3.1)
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.5,   // lower = more factual, higher = more creative
    max_tokens: 1024,   // limit response length
  });

  // Pull the text answer from the response
  const answer = chatCompletion.choices[0].message.content;

  return answer;
}
