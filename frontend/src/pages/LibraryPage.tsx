import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Library as LibraryIcon, Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getHistory } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getLocalThreads } from "@/lib/localHistory";

export default function LibraryPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<Array<{ id: string; title: string | null; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      const local = getLocalThreads();
      setThreads(local);
      if (!token) return;
      try {
        const data = await getHistory(token);
        const merged = [...data.threads, ...local].reduce<Array<{ id: string; title: string | null; created_at: string }>>(
          (acc, item) => {
            if (!acc.some((thread) => thread.id === item.id)) acc.push(item);
            return acc;
          },
          []
        );
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setThreads(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      }
    }
    loadHistory();
  }, [token]);

  const filtered = useMemo(
    () =>
      threads.filter((thread) =>
        (thread.title ?? "Untitled thread").toLowerCase().includes(search.trim().toLowerCase())
      ),
    [threads, search]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <LibraryIcon className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Library</h1>
      </div>
      <p className="text-muted-foreground mb-6">Your past threads and saved searches.</p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search threads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-surface border-border"
        />
      </div>

      {!token && (
        <p className="text-sm text-muted-foreground">
          Sign in to see your saved chat history.
        </p>
      )}
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="surface-card divide-y divide-border">
        {filtered.map((t) => (
          <Link
            key={t.id}
            to={`/search?q=${encodeURIComponent(t.title ?? "Untitled thread")}&threadId=${t.id}`}
            className="flex items-center justify-between px-4 py-4 hover:bg-surface-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-secondary grid place-items-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{t.title ?? "Untitled thread"}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No chats yet. Ask something from Home to start a thread.
          </div>
        )}
      </div>
    </div>
  );
}