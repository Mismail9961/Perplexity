import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { mockAnswer } from "@/data/mock";
import SearchBox from "@/components/app/SearchBox";
import { BookOpen, Globe, Image as ImageIcon, ListTree, Share2, ThumbsDown, ThumbsUp, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const answer = useMemo(() => mockAnswer(q || "your question"), [q]);

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 animate-fade-up">
      <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-6">
        {q || "Ask a question"}
      </h1>

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
              {answer.sources.slice(0, 3).map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="surface-card p-3 hover:border-primary/40 transition-colors group"
                >
                  <div className="text-xs text-muted-foreground mb-1 truncate">{s.domain}</div>
                  <div className="text-sm font-medium line-clamp-2 group-hover:text-primary">{s.title}</div>
                </a>
              ))}
            </div>
          </div>

          {/* Answer */}
          <div className="surface-card p-6 space-y-5">
            <p className="text-foreground leading-relaxed">{answer.summary}</p>
            {answer.sections.map((sec) => (
              <div key={sec.heading}>
                <h3 className="font-serif text-xl mb-2">{sec.heading}</h3>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{sec.body}</p>
              </div>
            ))}

            <div className="flex items-center gap-1 pt-2 border-t border-border">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><ThumbsUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><ThumbsDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><Share2 className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Related */}
          <div>
            <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Related
            </h2>
            <div className="surface-card divide-y divide-border">
              {answer.related.map((r) => (
                <Link
                  key={r}
                  to={`/search?q=${encodeURIComponent(r)}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-elevated/50 text-sm"
                >
                  <span className="truncate">{r}</span>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <SearchBox />
          </div>
        </article>

        {/* Right rail: all sources */}
        <aside className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All sources</h3>
          <ol className="space-y-2">
            {answer.sources.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block surface-card p-3 hover:border-primary/40"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="h-5 w-5 grid place-items-center rounded-md bg-secondary text-foreground text-[10px]">{s.id}</span>
                    <span className="truncate">{s.domain}</span>
                  </div>
                  <div className="text-sm font-medium line-clamp-2">{s.title}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.snippet}</p>
                </a>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}