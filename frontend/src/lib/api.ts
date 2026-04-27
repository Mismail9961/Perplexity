const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://perplexity-backend-nine.vercel.app";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string | null;
};

const STORAGE_KEY = "askly_auth";

/** Read the stored refresh_token from localStorage without importing auth context */
function getStoredRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.refreshToken ?? null;
  } catch {
    return null;
  }
}

/** Overwrite the stored access token after a silent refresh */
function updateStoredAccessToken(
  newToken: string,
  newRefreshToken?: string,
  expiresIn?: number,
) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.token = newToken;
    if (newRefreshToken) parsed.refreshToken = newRefreshToken;
    if (expiresIn) parsed.accessTokenExpiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

/** Clear the whole session (forces re-login) */
function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}

async function rawFetch(path: string, options: RequestOptions, token?: string | null) {
  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await rawFetch(path, options, options.token);

  // On 401 — try to silently refresh the token and retry once
  if (response.status === 401 && options.token) {
    const storedRefresh = getStoredRefreshToken();
    if (storedRefresh) {
      try {
        const refreshResp = await rawFetch(
          "/api/auth/refresh",
          { method: "POST", body: { refreshToken: storedRefresh } },
          null,
        );
        if (refreshResp.ok) {
          const refreshData = await refreshResp.json();
          const newAccessToken = refreshData.session?.access_token;
          const newRefreshToken = refreshData.session?.refresh_token;
          const expiresIn = refreshData.session?.expires_in;
          if (newAccessToken) {
            updateStoredAccessToken(newAccessToken, newRefreshToken, expiresIn);
            // Retry the original request with the new token
            response = await rawFetch(path, options, newAccessToken);
          }
        } else {
          // Refresh failed — clear session so user is sent to sign-in
          clearStoredSession();
          window.dispatchEvent(new Event("askly:session-expired"));
        }
      } catch {
        clearStoredSession();
        window.dispatchEvent(new Event("askly:session-expired"));
      }
    }
  }

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
  images: string[];
  threadId: string;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
};

export function refreshToken(refreshToken: string) {
  return request<AuthResponse>("/api/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

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
  llmConfigOverride?: {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
  },
) {
  return request<SearchResponse>("/api/search", {
    method: "POST",
    token,
    body: { query, threadId, llmKeyId, llmConfigOverride },
  });
}

export function getHistory(token: string) {
  return request<{
    threads: Array<{ id: string; title: string | null; created_at: string }>;
  }>("/api/search/history", { token });
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
    messages: Array<{
      id: string;
      role: "user" | "assistant" | "system";
      content: string;
      created_at: string;
    }>;
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
  return request<{
    keys: Array<{
      id: string;
      provider: string;
      model: string;
      name: string | null;
      is_default: boolean;
      key_hint: string;
    }>;
  }>("/api/search/llm-keys", { token });
}

export function addLlmKey(
  token: string,
  payload: {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
    name?: string;
    isDefault?: boolean;
  },
) {
  return request<{ message: string }>("/api/search/llm-keys", {
    method: "POST",
    token,
    body: payload,
  });
}
