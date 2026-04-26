import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe, Paperclip, Mic, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  initial?: string;
  large?: boolean;
  onSubmit?: (q: string) => void;
  modelOptions?: Array<{ id: string; label: string }>;
  selectedModelId?: string;
  onModelChange?: (id: string) => void;
}

export default function SearchBox({
  initial = "",
  large = false,
  onSubmit,
  modelOptions = [],
  selectedModelId = "",
  onModelChange,
}: SearchBoxProps) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (onSubmit) onSubmit(q);
    else navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={cn(
          "group rounded-2xl border border-border bg-surface shadow-card transition-all",
          "focus-within:border-primary/60 focus-within:shadow-glow"
        )}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={large ? 2 : 1}
          placeholder="Ask anything…"
          className={cn(
            "w-full resize-none bg-transparent outline-none px-5 pt-4 pb-2 text-foreground placeholder:text-muted-foreground/70",
            large ? "text-lg" : "text-base"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as FormEvent);
            }
          }}
        />
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            {modelOptions.length > 0 ? (
              <div className="h-8 px-2 rounded-md border border-border bg-secondary/40 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <select
                  className="bg-transparent text-xs outline-none"
                  value={selectedModelId}
                  onChange={(e) => onModelChange?.(e.target.value)}
                >
                  <option value="">Default model</option>
                  {modelOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
                <Cpu className="h-3.5 w-3.5" /> Default model
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Web
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            disabled={!value.trim()}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}