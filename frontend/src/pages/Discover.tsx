import { trendingTopics } from "@/data/mock";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

const categories = ["For You", "Top", "Tech & Science", "Finance", "Arts & Culture", "Sports"];

export default function Discover() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <Compass className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Discover</h1>
      </div>
      <p className="text-muted-foreground mb-6">A handpicked feed of stories worth knowing today.</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c, i) => (
          <button
            key={c}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              i === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trendingTopics.map((t, i) => (
          <Link
            key={t.title}
            to={`/search?q=${encodeURIComponent(t.title)}`}
            className="surface-card overflow-hidden group hover:border-primary/40 transition-all"
          >
            <div className="aspect-[16/10] overflow-hidden bg-secondary">
              <img
                src={t.image}
                alt={t.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading={i > 2 ? "lazy" : "eager"}
              />
            </div>
            <div className="p-4">
              <span className="text-xs text-primary font-medium">{t.tag}</span>
              <h3 className="font-serif text-lg mt-1 leading-snug group-hover:text-primary transition-colors">
                {t.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}