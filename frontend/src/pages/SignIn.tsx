import { Link } from "react-router-dom";
import { Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { login, signup } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

export default function SignIn() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  async function handleEmailAuth() {
    if (
      !email.trim() ||
      !password.trim() ||
      (mode === "signup" && !name.trim())
    )
      return;
    setError(null);
    setLoading(true);
    try {
      const response =
        mode === "login"
          ? await login(email, password)
          : await signup(name.trim(), email, password);

      if (response.session?.access_token) {
        setSession(
          response.session.access_token,
          response.user?.email ?? email,
          response.session.refresh_token ?? null,
          (response.session as any).expires_in ?? null,
        );
        navigate("/");
        return;
      }

      setError("Signed up successfully. Please sign in to continue.");
      if (mode === "signup") setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] grid place-items-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md surface-card p-8 animate-fade-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to continue your research.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full bg-secondary border-border hover:bg-surface-elevated"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.98h5.35c-.23 1.5-1.66 4.39-5.35 4.39-3.22 0-5.84-2.66-5.84-5.94S8.78 6.59 12 6.59c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.78 4.05 14.6 3 12 3 6.99 3 3 6.99 3 12s3.99 9 9 9c5.2 0 8.64-3.65 8.64-8.79 0-.59-.06-1.04-.14-1.51z"
              />
            </svg>
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full bg-secondary border-border hover:bg-surface-elevated"
          >
            <svg
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16.365 1.43c0 1.14-.49 2.27-1.27 3.07-.83.85-2.18 1.5-3.3 1.41-.14-1.1.41-2.27 1.18-3.04.85-.85 2.3-1.5 3.39-1.44zM20.5 17.27c-.55 1.27-.81 1.83-1.51 2.95-.98 1.55-2.36 3.48-4.07 3.5-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.71-.02-3.02-1.76-4-3.31C.21 16.07.04 10.6 2.71 7.7c1.4-1.53 3.6-2.5 5.7-2.5 2.13 0 3.47 1.16 5.23 1.16 1.71 0 2.75-1.16 5.21-1.16 1.86 0 3.83 1.01 5.23 2.76-4.6 2.52-3.85 9.1-3.58 9.31z" />
            </svg>
            Continue with Apple
          </Button>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary border-border"
            />
          )}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-secondary border-border"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-secondary border-border"
          />
          <Button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in with email"
                : "Create account"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          By continuing you agree to our terms.{" "}
          <Link to="/" className="text-primary hover:underline">
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  );
}
