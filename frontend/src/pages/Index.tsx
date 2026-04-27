import SearchBox from "@/components/app/SearchBox";
import { suggestedQueries } from "@/data/mock";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { getHistory } from "@/lib/api";
import { getLocalThreads } from "@/lib/localHistory";

export default function Index() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [threads, setThreads] = useState<
    Array<{ id: string; title: string | null; created_at: string }>
  >([]);

  useEffect(() => {
    // Don't load threads if user is not logged in
    if (!token) {
      setThreads([]);
      return;
    }

    async function loadRecentThreads() {
      const local = getLocalThreads();
      try {
        const data = await getHistory(token);
        const merged = [...data.threads, ...local].reduce<
          Array<{ id: string; title: string | null; created_at: string }>
        >((acc, item) => {
          if (!acc.some((thread) => thread.id === item.id)) acc.push(item);
          return acc;
        }, []);
        merged.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setThreads(merged.slice(0, 4));
      } catch {
        setThreads(local.slice(0, 4));
      }
    }

    loadRecentThreads();
  }, [token]);

  const recentThreads = useMemo(
    () =>
      threads.map((thread) => ({
        id: thread.id,
        title: thread.title ?? "Untitled thread",
        time: new Date(thread.created_at).toLocaleString(),
      })),
    [threads],
  );

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-16 animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Where knowledge begins</span>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight">
            <span className="gradient-text">askly</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Ask anything. Get clear answers backed by sources.
          </p>
        </div>

        <SearchBox large />

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-2">
          {suggestedQueries.map((q) => (
            <button
              key={q}
              onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
              className="text-left text-sm px-3 py-2.5 rounded-lg border border-border bg-surface/60 hover:bg-surface hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {token && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Recent threads
              </h2>
              <Link
                to="/library"
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="surface-card divide-y divide-border">
              {recentThreads.slice(0, 4).map((t) => (
                <Link
                  key={t.id}
                  to={`/search?q=${encodeURIComponent(t.title)}&threadId=${t.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-elevated/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-3">
                    {t.time}
                  </span>
                </Link>
              ))}
              {recentThreads.length === 0 && (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No recent threads yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
