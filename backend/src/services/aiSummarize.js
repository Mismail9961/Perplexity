const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export async function summarizeWithAI(query, sources, llmConfig = null) {
  const sourcesText = sources
    .map(
      (source, index) =>
        `[${index + 1}] Title: ${source.title}\n    URL: ${source.url}\n    Content: ${source.snippet}`
    )
    .join("\n\n");

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

  const effective = {
    provider: llmConfig?.provider ?? "groq",
    apiKey: llmConfig?.apiKey ?? process.env.GROQ_API_KEY,
    model: llmConfig?.model ?? DEFAULT_MODEL,
    baseUrl: llmConfig?.baseUrl ?? DEFAULT_GROQ_BASE_URL,
  };

  if (!effective.apiKey) {
    throw new Error("No LLM API key configured");
  }

  const response = await fetch(`${effective.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${effective.apiKey}`,
    },
    body: JSON.stringify({
      model: effective.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText}`);
  }

  const completion = await response.json();
  const answer = completion?.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error("LLM response did not include an answer");
  }

  return {
    answer,
    model: completion?.model ?? effective.model,
    usage: {
      prompt_tokens: completion?.usage?.prompt_tokens ?? 0,
      completion_tokens: completion?.usage?.completion_tokens ?? 0,
    },
    provider: effective.provider,
  };
}
