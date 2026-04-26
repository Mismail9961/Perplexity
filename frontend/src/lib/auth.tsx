import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthState = {
  token: string | null;
  email: string | null;
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
      const parsed = JSON.parse(raw) as AuthState;
      setState(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.token),
      setSession: (token, email = null) => {
        const next = { token, email };
        setState(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      clearSession: () => {
        setState({ token: null, email: null });
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [state]
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
