const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed");
  }

  return payload as T;
}

export type AuthResponse = {
  message: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  session?: {
    access_token: string;
    refresh_token?: string;
  };
};

export type SearchResponse = {
  answer: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  threadId: string;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
};

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function signup(name: string, email: string, password: string) {
  return request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: { name, email, password },
  });
}

export function searchQuery(
  token: string,
  query: string,
  threadId?: string,
  llmKeyId?: string,
  llmConfigOverride?: { provider: string; apiKey: string; model: string; baseUrl?: string }
) {
  return request<SearchResponse>("/api/search", {
    method: "POST",
    token,
    body: { query, threadId, llmKeyId, llmConfigOverride },
  });
}

export function getHistory(token: string) {
  return request<{ threads: Array<{ id: string; title: string | null; created_at: string }> }>(
    "/api/search/history",
    { token }
  );
}

export function clearHistory(token: string) {
  return request<{ message: string }>("/api/search/history", {
    method: "DELETE",
    token,
  });
}

export function getThread(token: string, threadId: string) {
  return request<{
    thread: { id: string; title: string | null };
    messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; created_at: string }>;
  }>(`/api/search/history/${threadId}`, { token });
}

export function getTokenStatus(token: string) {
  return request<{
    tier: string;
    isPremium: boolean;
    tokensUsed: number;
    tokenLimit: number | null;
    unlimited: boolean;
  }>("/api/search/tokens", { token });
}

export function listLlmKeys(token: string) {
  return request<{ keys: Array<{ id: string; provider: string; model: string; name: string | null; is_default: boolean; key_hint: string }> }>(
    "/api/search/llm-keys",
    { token }
  );
}

export function addLlmKey(
  token: string,
  payload: { provider: string; apiKey: string; model: string; baseUrl?: string; name?: string; isDefault?: boolean }
) {
  return request<{ message: string }>("/api/search/llm-keys", {
    method: "POST",
    token,
    body: payload,
  });
}
