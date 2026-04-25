import { recentThreads } from "@/data/mock";
import { Link } from "react-router-dom";
import { Library as LibraryIcon, Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function LibraryPage() {
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
          className="pl-9 bg-surface border-border"
        />
      </div>

      <div className="surface-card divide-y divide-border">
        {recentThreads.map((t) => (
          <Link
            key={t.id}
            to={`/search?q=${encodeURIComponent(t.title)}`}
            className="flex items-center justify-between px-4 py-4 hover:bg-surface-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-secondary grid place-items-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.time}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}