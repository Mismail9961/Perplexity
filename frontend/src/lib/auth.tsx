import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type AuthState = {
  token: string | null;
  email: string | null;
};

type StoredSession = AuthState & {
  expiresAt: number; // Unix ms timestamp
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  setSession: (token: string, email?: string | null) => void;
  clearSession: () => void;
};

const STORAGE_KEY = "askly_auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, email: null });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      // Auto-logout if token has expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setState({ token: parsed.token, email: parsed.email });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.token),
      setSession: (token, email = null) => {
        const next: StoredSession = {
          token,
          email,
          expiresAt: Date.now() + SESSION_DURATION_MS,
        };
        setState({ token, email });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      clearSession: () => {
        setState({ token: null, email: null });
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
