import { spaces } from "@/data/mock";
import { Link } from "react-router-dom";
import { Layers, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Spaces() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 animate-fade-up">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Spaces</h1>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="h-4 w-4" /> New Space
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        Organize your research into focused collections of threads and files.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spaces.map((s) => (
          <Link
            key={s.id}
            to="/library"
            className={`relative surface-card p-5 overflow-hidden hover:border-primary/40 transition-all group`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-60 pointer-events-none`} />
            <div className="relative">
              <h3 className="font-serif text-xl mb-1">{s.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{s.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {s.threads} threads
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}