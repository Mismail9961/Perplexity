import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import SearchBox from "@/components/app/SearchBox";
import {
  BookOpen,
  Globe,
  Image as ImageIcon,
  ListTree,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Copy,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listLlmKeys, searchQuery, type SearchResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { saveLocalThread } from "@/lib/localHistory";
import { getLocalLlmKeys, type LocalLlmKey } from "@/lib/localLlmKeys";

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const threadId = params.get("threadId") ?? undefined;
  const { token } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmKeys, setLlmKeys] = useState<
    Array<{ id: string; provider: string; model: string; name: string | null }>
  >([]);
  const [selectedLlmKeyId, setSelectedLlmKeyId] = useState<string>(
    () => localStorage.getItem("askly_selected_llm_key_id") ?? "",
  );
  const [localLlmKeys] = useState<LocalLlmKey[]>(() => getLocalLlmKeys());
  const lastSavedSignatureRef = useRef<string>("");

  useEffect(() => {
    async function runSearch() {
      if (!q || !token) return;
      setLoading(true);
      setError(null);
      try {
        const localKey = localLlmKeys.find(
          (key) => key.id === selectedLlmKeyId,
        );
        const effectiveThreadId = threadId?.startsWith("local_")
          ? undefined
          : threadId;
        const data = await searchQuery(
          token,
          q,
          effectiveThreadId,
          localKey ? undefined : selectedLlmKeyId || undefined,
          localKey
            ? {
                provider: localKey.provider,
                apiKey: localKey.apiKey,
                model: localKey.model,
                baseUrl: localKey.baseUrl,
              }
            : undefined,
        );
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }

    runSearch();
  }, [q, token, threadId, selectedLlmKeyId, localLlmKeys]);

  useEffect(() => {
    async function loadLlmKeys() {
      if (!token) return;
      try {
        const data = await listLlmKeys(token);
        setLlmKeys(data.keys);
      } catch {
        setLlmKeys([]);
      }
    }
    loadLlmKeys();
  }, [token]);

  useEffect(() => {
    if (!q.trim()) return;
    const signature = `${result?.threadId ?? "local"}::${q.trim().toLowerCase()}`;
    if (lastSavedSignatureRef.current === signature) return;
    lastSavedSignatureRef.current = signature;

    saveLocalThread({
      id:
        result?.threadId ??
        `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: q.trim(),
      created_at: new Date().toISOString(),
    });
  }, [result?.threadId, q]);

  const sources = result?.sources ?? [];
  const answerText = result?.answer ?? "";
  const related = useMemo(
    () => [
      `Explain ${q || "this"} with examples`,
      `Latest updates on ${q || "this topic"}`,
      `Beginner guide for ${q || "this"}`,
    ],
    [q],
  );
  const modelOptions = useMemo(
    () => [
      ...llmKeys.map((key) => ({
        id: key.id,
        label: `${key.provider}/${key.model}${key.name ? ` (${key.name})` : ""}`,
      })),
      ...localLlmKeys.map((key) => ({
        id: key.id,
        label: `${key.provider}/${key.model}${key.name ? ` (${key.name})` : ""} (local)`,
      })),
    ],
    [llmKeys, localLlmKeys],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 animate-fade-up">
      <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-2">
        {q || "Ask a question"}
      </h1>
      {!token && (
        <p className="text-sm text-muted-foreground mb-4">
          Please{" "}
          <Link to="/sign-in" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to search.
        </p>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6 text-sm">
        {[
          { label: "Answer", icon: BookOpen, active: true },
          { label: "Images", icon: ImageIcon },
          { label: "Sources", icon: Globe },
          { label: "Steps", icon: ListTree },
        ].map((t) => (
          <button
            key={t.label}
            className={`flex items-center gap-2 px-3 py-2 -mb-px border-b-2 ${
              t.active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <article className="space-y-6">
          {/* Sources strip */}
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Globe className="h-3.5 w-3.5" /> Sources
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sources.slice(0, 3).map((s, idx) => (
                <a
                  key={`${s.url}-${idx}`}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="surface-card p-3 hover:border-primary/40 transition-colors group"
                >
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    {getDomain(s.url)}
                  </div>
                  <div className="text-sm font-medium line-clamp-2 group-hover:text-primary">
                    {s.title}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Answer */}
          <div className="surface-card p-6 space-y-5">
            {loading && (
              <p className="text-muted-foreground text-sm">Searching...</p>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            {!loading && !error && answerText && (
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                {answerText}
              </p>
            )}

            <div className="flex items-center gap-1 pt-2 border-t border-border">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Related */}
          <div>
            <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Related
            </h2>
            <div className="surface-card divide-y divide-border">
              {related.map((r) => (
                <Link
                  key={r}
                  to={`/search?q=${encodeURIComponent(r)}${result?.threadId ? `&threadId=${result.threadId}` : ""}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-elevated/50 text-sm"
                >
                  <span className="truncate">{r}</span>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <SearchBox
              modelOptions={modelOptions}
              selectedModelId={selectedLlmKeyId}
              onModelChange={(id) => {
                setSelectedLlmKeyId(id);
                localStorage.setItem("askly_selected_llm_key_id", id);
              }}
              onSubmit={(nextQuery) => {
                if (!token) {
                  navigate("/sign-in");
                  return;
                }

                const next = new URLSearchParams();
                next.set("q", nextQuery);
                if (result?.threadId) next.set("threadId", result.threadId);
                setParams(next);
              }}
            />
          </div>
        </article>

        {/* Right rail: all sources */}
        <aside className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            All sources
          </h3>
          <ol className="space-y-2">
            {sources.map((s, idx) => (
              <li key={`${s.url}-${idx}`}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block surface-card p-3 hover:border-primary/40"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="h-5 w-5 grid place-items-center rounded-md bg-secondary text-foreground text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="truncate">{getDomain(s.url)}</span>
                  </div>
                  <div className="text-sm font-medium line-clamp-2">
                    {s.title}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {s.snippet}
                  </p>
                </a>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
