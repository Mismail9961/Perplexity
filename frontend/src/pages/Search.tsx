import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import SearchBox from "@/components/app/SearchBox";
import {
  BookOpen,
  Globe,
  Image as ImageIcon,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Copy,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchQuery, getThread, type SearchResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { saveLocalThread } from "@/lib/localHistory";
import { getLocalLlmKeys } from "@/lib/localLlmKeys";
import { PRESET_MODELS } from "@/components/app/ModelSelector";

type Tab = "answer" | "images" | "sources";

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getFavicon(url: string) {
  try {
    const { origin } = new URL(url);
    return `${origin}/favicon.ico`;
  } catch {
    return "";
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
  const [activeTab, setActiveTab] = useState<Tab>("answer");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    () => localStorage.getItem("askly_selected_model_id") ?? "",
  );
  const lastFetchedRef = useRef<string>("");
  const lastSavedSignatureRef = useRef<string>("");

  // Reset tab to "answer" on new query
  useEffect(() => {
    setActiveTab("answer");
  }, [q]);

  useEffect(() => {
    async function load() {
      if (!q || !token) return;

      const isLocalThread = threadId?.startsWith("local_");
      const fetchKey = `${threadId ?? "new"}::${q.trim().toLowerCase()}`;
      if (lastFetchedRef.current === fetchKey) return;
      lastFetchedRef.current = fetchKey;

      setLoading(true);
      setError(null);

      try {
        // ── Case 1: Returning to an existing server thread ──────────────────
        if (threadId && !isLocalThread) {
          const data = await getThread(token, threadId);
          const assistantMsg = [...(data.messages ?? [])]
            .reverse()
            .find((m) => m.role === "assistant");

          if (assistantMsg) {
            setResult({
              answer: assistantMsg.content,
              sources: [],
              images: [],
              threadId,
            });
            setLoading(false);
            return;
          }
        }

        // ── Case 2: New query or local thread ───────────────────────────────
        const localKeys = getLocalLlmKeys();
        const localKey = localKeys.find((k) => k.id === selectedModelId);

        let llmConfigOverride:
          | { provider: string; apiKey: string; model: string; baseUrl?: string }
          | undefined;

        if (localKey) {
          llmConfigOverride = {
            provider: localKey.provider,
            apiKey: localKey.apiKey,
            model: localKey.model,
            baseUrl: localKey.baseUrl,
          };
        }

        const effectiveThreadId = isLocalThread ? undefined : threadId;
        const data = await searchQuery(token, q, effectiveThreadId, undefined, llmConfigOverride);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [q, token, threadId, selectedModelId]);

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
  const images = result?.images ?? [];
  const answerText = result?.answer ?? "";

  const related = useMemo(
    () => [
      `Explain ${q || "this"} with examples`,
      `Latest updates on ${q || "this topic"}`,
      `Beginner guide for ${q || "this"}`,
    ],
    [q],
  );

  const tabs = [
    { id: "answer" as Tab, label: "Answer", icon: BookOpen },
    { id: "images" as Tab, label: "Images", icon: ImageIcon, count: images.length },
    { id: "sources" as Tab, label: "Sources", icon: Globe, count: sources.length },
  ];

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
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="text-[10px] bg-secondary rounded-full px-1.5 py-0.5 leading-none">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ANSWER TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "answer" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <article className="space-y-6">
            {/* Sources strip */}
            {sources.length > 0 && (
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
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <img
                          src={getFavicon(s.url)}
                          alt=""
                          className="h-3 w-3 rounded-sm"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                        <span className="truncate">{getDomain(s.url)}</span>
                      </div>
                      <div className="text-sm font-medium line-clamp-2 group-hover:text-primary">
                        {s.title}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Answer box */}
            <div className="surface-card p-6 space-y-5">
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                  Searching…
                </div>
              )}
              {error && <p className="text-destructive text-sm">{error}</p>}
              {!loading && !error && answerText && (
                <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                  {answerText}
                </p>
              )}
              {!loading && !error && !answerText && !token && (
                <p className="text-muted-foreground text-sm">Sign in to get answers.</p>
              )}

              <div className="flex items-center gap-1 pt-2 border-t border-border">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                  <ThumbsDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => answerText && navigator.clipboard.writeText(answerText)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
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
                selectedModelId={selectedModelId}
                onModelChange={(id) => {
                  setSelectedModelId(id);
                  localStorage.setItem("askly_selected_model_id", id);
                }}
                onSubmit={(nextQuery) => {
                  if (!token) { navigate("/sign-in"); return; }
                  const next = new URLSearchParams();
                  next.set("q", nextQuery);
                  if (result?.threadId) next.set("threadId", result.threadId);
                  setParams(next);
                }}
              />
            </div>
          </article>

          {/* Right rail */}
          {sources.length > 0 && (
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
                        <span className="h-5 w-5 grid place-items-center rounded-md bg-secondary text-foreground text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={getFavicon(s.url)}
                          alt=""
                          className="h-3 w-3 rounded-sm"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                        <span className="truncate">{getDomain(s.url)}</span>
                      </div>
                      <div className="text-sm font-medium line-clamp-2">{s.title}</div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.snippet}</p>
                    </a>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      )}

      {/* ── IMAGES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "images" && (
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
              Loading images…
            </div>
          )}
          {!loading && images.length === 0 && (
            <div className="surface-card p-10 text-center text-muted-foreground text-sm">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No images found for this query.
            </div>
          )}
          {images.length > 0 && (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {images.map((src, idx) => (
                <a
                  key={`${src}-${idx}`}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-inside-avoid group relative overflow-hidden rounded-xl border border-border hover:border-primary/50 transition-all"
                >
                  <img
                    src={src}
                    alt={`Result ${idx + 1}`}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget.closest("a") as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ExternalLink className="h-5 w-5 text-white drop-shadow" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SOURCES TAB ────────────────────────────────────────────────────── */}
      {activeTab === "sources" && (
        <div className="space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
              Searching…
            </div>
          )}
          {!loading && sources.length === 0 && (
            <div className="surface-card p-10 text-center text-muted-foreground text-sm">
              <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No sources found for this query.
            </div>
          )}
          {sources.map((s, idx) => (
            <a
              key={`${s.url}-${idx}`}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-4 surface-card p-4 hover:border-primary/40 transition-colors group"
            >
              <span className="h-8 w-8 flex-shrink-0 grid place-items-center rounded-lg bg-secondary text-foreground text-sm font-medium">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <img
                    src={getFavicon(s.url)}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <span className="truncate">{getDomain(s.url)}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors mb-1">
                  {s.title}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {s.snippet}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

    </div>
  );
}
