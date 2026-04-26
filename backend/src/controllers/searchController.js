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
import {
  createUserLlmKey,
  createMessage,
  createThread,
  createUser,
  deleteUserLlmKey,
  getDefaultLlmConfig,
  getUserLlmConfigById,
  getUserLlmKeys,
  getMessagesByThread,
  getMonthlyUsageSummary,
  getThreadById,
  getThreadsByUser,
  getUserById,
  logUsageEvent,
  deleteThreadsByUser,
} from "../models/index.js";

const FREE_PLAN_MONTHLY_TOKEN_LIMIT = Number(
  process.env.FREE_PLAN_MONTHLY_TOKEN_LIMIT ?? 50000
);

function isMissingTableError(error) {
  const message = String(error?.message ?? "");
  return (
    error?.code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

function isNotFoundError(error) {
  return error?.code === "PGRST116";
}

async function getOrCreateProfile(authUser) {
  try {
    return await getUserById(authUser.id);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    return createUser({
      id: authUser.id,
      email: authUser.email,
      display_name: authUser.user_metadata?.name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
    });
  }
}

function estimatePromptTokens(query, sources) {
  const sourceChars = sources.reduce((sum, source) => sum + (source.snippet?.length ?? 0), 0);
  return Math.ceil((query.length + sourceChars) / 4);
}

async function resolveDbCapabilities(authUser) {
  try {
    const profile = await getOrCreateProfile(authUser);
    const usage = await getMonthlyUsageSummary(authUser.id);
    return {
      enabled: true,
      profile,
      usage,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("DB schema not ready; running /api/search in stateless mode.");
      return {
        enabled: false,
        profile: { subscription_tier: "pro" },
        usage: { total_prompt_tokens: 0, total_completion_tokens: 0 },
      };
    }
    throw error;
  }
}

const search = async (req, res) => {
  const { query, threadId, llmKeyId, llmConfigOverride } = req.body;

  if (!query || query.trim() === "") {
    return res.status(400).json({
      message: "Please provide a search query",
      example: { query: "What is quantum computing?" },
    });
  }

  console.log(`🔍 New search: "${query}"`);

  try {
    const db = await resolveDbCapabilities(req.user);
    const profile = db.profile;
    const usage = db.usage;
    const usedTokens = usage.total_prompt_tokens + usage.total_completion_tokens;
    const isPremium = profile.subscription_tier !== "free";

    if (!isPremium && usedTokens >= FREE_PLAN_MONTHLY_TOKEN_LIMIT) {
      return res.status(403).json({
        message: "Free plan token limit reached. Upgrade to premium for unlimited usage.",
        tokenLimit: FREE_PLAN_MONTHLY_TOKEN_LIMIT,
        tokensUsed: usedTokens,
      });
    }

    let thread = { id: threadId ?? null };
    let existingMessages = [];
    let userMessage = null;

    if (db.enabled) {
      if (threadId) {
        thread = await getThreadById(threadId);
        if (!thread || thread.user_id !== req.user.id) {
          return res.status(403).json({ message: "You cannot access this thread." });
        }
      } else {
        thread = await createThread({ user_id: req.user.id });
      }

      existingMessages = await getMessagesByThread(thread.id);
      userMessage = await createMessage({
        thread_id: thread.id,
        role: "user",
        content: query,
        position: existingMessages.length + 1,
      });
    }

    console.log("  → Searching the web via Tavily...");
    const sources = await searchWeb(query);
    console.log(`  → Got ${sources.length} results from the web`);

    if (!sources || sources.length === 0) {
      return res.status(200).json({
        answer: "Sorry, I couldn't find any relevant results for your query.",
        sources: [],
        threadId: thread?.id,
      });
    }

    let llmConfig = null;
    if (llmConfigOverride?.provider && llmConfigOverride?.apiKey && llmConfigOverride?.model) {
      llmConfig = {
        provider: llmConfigOverride.provider,
        apiKey: llmConfigOverride.apiKey,
        model: llmConfigOverride.model,
        baseUrl: llmConfigOverride.baseUrl ?? null,
      };
    } else if (db.enabled) {
      try {
        llmConfig = llmKeyId
          ? await getUserLlmConfigById(req.user.id, llmKeyId)
          : await getDefaultLlmConfig(req.user.id);
      } catch (error) {
        if (!isMissingTableError(error)) throw error;
      }
    }
    console.log("  → Asking AI to summarize...");
    const aiResult = await summarizeWithAI(query, sources, llmConfig);
    console.log("  → AI answer generated ✓");

    const inputTokens = aiResult.usage.prompt_tokens || estimatePromptTokens(query, sources);
    const outputTokens = aiResult.usage.completion_tokens || 0;

    if (db.enabled) {
      const assistantMessage = await createMessage({
        thread_id: thread.id,
        role: "assistant",
        content: aiResult.answer,
        model: aiResult.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        position: existingMessages.length + 2,
      });

      await logUsageEvent({
        user_id: req.user.id,
        thread_id: thread.id,
        message_id: assistantMessage.id,
        event_type: "search",
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        model: aiResult.model,
        metadata: {
          provider: aiResult.provider,
          used_custom_key: Boolean(llmConfig),
          user_message_id: userMessage?.id ?? null,
        },
      });
    }

    return res.status(200).json({
      answer: aiResult.answer,
      sources,
      threadId: thread?.id,
      model: aiResult.model,
      tokenUsage: {
        prompt: inputTokens,
        completion: outputTokens,
      },
    });
  } catch (error) {
    console.error("Search error:", error.message);
    return res.status(500).json({
      message: "Search failed. Please try again.",
      error: error.message,
    });
  }
};

const getHistory = async (req, res) => {
  try {
    const threads = await getThreadsByUser(req.user.id, { limit: 50, offset: 0 });
    return res.status(200).json({ threads });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(200).json({ threads: [], unavailable: true });
    }
    return res.status(500).json({
      message: "Failed to load history",
      error: error.message,
    });
  }
};

const getThreadHistory = async (req, res) => {
  try {
    const thread = await getThreadById(req.params.threadId);
    if (!thread || thread.user_id !== req.user.id) {
      return res.status(403).json({ message: "You cannot access this thread." });
    }

    const messages = await getMessagesByThread(thread.id);
    return res.status(200).json({ thread, messages });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(200).json({
        thread: null,
        messages: [],
        unavailable: true,
      });
    }
    return res.status(500).json({
      message: "Failed to load thread",
      error: error.message,
    });
  }
};

const getTokenStatus = async (req, res) => {
  try {
    const db = await resolveDbCapabilities(req.user);
    const profile = db.profile;
    const usage = db.usage;
    const tokensUsed = usage.total_prompt_tokens + usage.total_completion_tokens;
    const isPremium = profile.subscription_tier !== "free";

    return res.status(200).json({
      tier: profile.subscription_tier,
      isPremium,
      tokensUsed,
      tokenLimit: isPremium ? null : FREE_PLAN_MONTHLY_TOKEN_LIMIT,
      unlimited: isPremium,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load token status",
      error: error.message,
    });
  }
};

const addUserLlmKey = async (req, res) => {
  const { provider, apiKey, model, baseUrl, name, isDefault } = req.body;

  if (!provider || !apiKey || !model) {
    return res.status(400).json({
      message: "provider, apiKey and model are required",
    });
  }

  try {
    const saved = await createUserLlmKey({
      user_id: req.user.id,
      provider,
      api_key: apiKey,
      model,
      base_url: baseUrl ?? null,
      name: name ?? null,
      is_default: Boolean(isDefault),
    });

    return res.status(201).json({
      message: "LLM key saved",
      key: saved,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(503).json({
        message: "LLM key storage unavailable. Run DB migrations first.",
      });
    }
    return res.status(500).json({
      message: "Failed to save LLM key",
      error: error.message,
    });
  }
};

const listUserLlmKeys = async (req, res) => {
  try {
    const keys = await getUserLlmKeys(req.user.id);
    return res.status(200).json({ keys });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(200).json({ keys: [], unavailable: true });
    }
    return res.status(500).json({
      message: "Failed to load LLM keys",
      error: error.message,
    });
  }
};

const removeUserLlmKey = async (req, res) => {
  try {
    await deleteUserLlmKey(req.user.id, req.params.keyId);
    return res.status(200).json({ message: "LLM key removed" });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(503).json({
        message: "LLM key storage unavailable. Run DB migrations first.",
      });
    }
    return res.status(500).json({
      message: "Failed to remove LLM key",
      error: error.message,
    });
  }
};

const clearHistory = async (req, res) => {
  try {
    await deleteThreadsByUser(req.user.id);
    return res.status(200).json({ message: "Chat history cleared" });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.status(200).json({
        message: "History cleared locally. DB history is unavailable.",
        unavailable: true,
      });
    }
    return res.status(500).json({
      message: "Failed to clear history",
      error: error.message,
    });
  }
};

export default {
  search,
  getHistory,
  getThreadHistory,
  getTokenStatus,
  addUserLlmKey,
  listUserLlmKeys,
  removeUserLlmKey,
  clearHistory,
};
