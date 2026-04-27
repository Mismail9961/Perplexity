import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { refreshToken as apiRefreshToken } from "./api";

// Supabase access_tokens expire after 1 hour.
// We keep a 7-day local expiry for the refresh_token.
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type AuthState = {
  token: string | null;
  email: string | null;
};

type StoredSession = AuthState & {
  refreshToken: string | null;
  expiresAt: number; // Unix ms — expiry of the *refresh* token window
  accessTokenExpiresAt?: number; // Unix ms — expiry of the Supabase JWT
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  setSession: (
    token: string,
    email?: string | null,
    refreshToken?: string | null,
    expiresIn?: number | null
  ) => void;
  clearSession: () => void;
};

const STORAGE_KEY = "askly_auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, email: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setReady(true);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredSession;

        // Refresh-token window expired → full logout
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(STORAGE_KEY);
          setReady(true);
          return;
        }

        // Access token still valid?
        const accessExpired =
          parsed.accessTokenExpiresAt &&
          Date.now() > parsed.accessTokenExpiresAt - 30_000; // 30 s buffer

        if (accessExpired && parsed.refreshToken) {
          // Silently refresh
          try {
            const res = await apiRefreshToken(parsed.refreshToken);
            if (res.session?.access_token) {
              const expiresIn = (res.session as any).expires_in as
                | number
                | undefined;
              const next: StoredSession = {
                token: res.session.access_token,
                email: parsed.email,
                refreshToken:
                  res.session.refresh_token ?? parsed.refreshToken,
                expiresAt: parsed.expiresAt, // keep original 7-day window
                accessTokenExpiresAt: expiresIn
                  ? Date.now() + expiresIn * 1000
                  : undefined,
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              setState({ token: next.token, email: next.email });
              setReady(true);
              return;
            }
          } catch {
            // Refresh failed — clear session so user re-signs-in
            localStorage.removeItem(STORAGE_KEY);
            setReady(true);
            return;
          }
        }

        setState({ token: parsed.token, email: parsed.email });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }

      setReady(true);
    }

    init();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.token),
      setSession: (token, email = null, refreshTok = null, expiresIn = null) => {
        const existing = (() => {
          try {
            return JSON.parse(
              localStorage.getItem(STORAGE_KEY) ?? "{}"
            ) as Partial<StoredSession>;
          } catch {
            return {};
          }
        })();

        const next: StoredSession = {
          token,
          email,
          refreshToken: refreshTok ?? existing.refreshToken ?? null,
          expiresAt: Date.now() + SESSION_DURATION_MS,
          accessTokenExpiresAt: expiresIn
            ? Date.now() + expiresIn * 1000
            : undefined,
        };
        setState({ token, email });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      clearSession: () => {
        setState({ token: null, email: null });
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [state]
  );

  // Don't render children until we've attempted the token refresh
  if (!ready) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
