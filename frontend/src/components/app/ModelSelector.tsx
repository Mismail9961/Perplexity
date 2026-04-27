import { useEffect, useRef, useState } from "react";
import { ChevronDown, Cpu, Lock, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getLocalLlmKeys,
  saveLocalLlmKey,
  deleteLocalLlmKey,
  type LocalLlmKey,
} from "@/lib/localLlmKeys";

// ── Preset catalogue ──────────────────────────────────────────────
export type PresetModel = {
  id: string;       // unique key used as selectedModelId
  label: string;
  provider: string;
  model: string;
  badge?: string;   // e.g. "New", "Max"
  icon: string;     // emoji / letter avatar
};

export const PRESET_MODELS: PresetModel[] = [
  { id: "groq::llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq", model: "llama-3.3-70b-versatile", icon: "🦙" },
  { id: "groq::llama-3.1-8b-instant",   label: "Llama 3.1 8B",  provider: "groq", model: "llama-3.1-8b-instant",   icon: "🦙", badge: "Fast" },
  { id: "groq::mixtral-8x7b-32768",     label: "Mixtral 8×7B",  provider: "groq", model: "mixtral-8x7b-32768",     icon: "〽️" },
  { id: "openai::gpt-4o",               label: "GPT-4o",         provider: "openai", model: "gpt-4o",               icon: "✦", badge: "Max" },
  { id: "openai::gpt-4o-mini",          label: "GPT-4o mini",    provider: "openai", model: "gpt-4o-mini",          icon: "✦" },
  { id: "anthropic::claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "anthropic", model: "claude-3-5-sonnet-20241022", icon: "✳" },
  { id: "anthropic::claude-3-haiku-20240307",    label: "Claude 3 Haiku",    provider: "anthropic", model: "claude-3-haiku-20240307",    icon: "✳", badge: "Fast" },
  { id: "google::gemini-1.5-pro",       label: "Gemini 1.5 Pro", provider: "google", model: "gemini-1.5-pro",       icon: "◆" },
  { id: "google::gemini-1.5-flash",     label: "Gemini 1.5 Flash", provider: "google", model: "gemini-1.5-flash",   icon: "◆", badge: "Fast" },
];

// Groq models are free-tier by default (backend already has GROQ_API_KEY)
const FREE_PROVIDERS = new Set(["groq"]);

// ── Props ─────────────────────────────────────────────────────────
interface ModelSelectorProps {
  selectedId: string;
  onChange: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────
export default function ModelSelector({ selectedId, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [localKeys, setLocalKeys] = useState<LocalLlmKey[]>([]);
  const [pendingPreset, setPendingPreset] = useState<PresetModel | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [customProvider, setCustomProvider] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [keyError, setKeyError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved keys
  function reloadKeys() {
    setLocalKeys(getLocalLlmKeys());
  }
  useEffect(reloadKeys, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingPreset(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resolve display label for current selection
  const selected =
    PRESET_MODELS.find((m) => m.id === selectedId) ??
    localKeys.find((k) => k.id === selectedId);

  const displayLabel = selected
    ? "label" in selected
      ? selected.label
      : `${selected.provider}/${selected.model}`
    : "Default model";

  function selectModel(preset: PresetModel) {
    // Free providers: just select directly
    if (FREE_PROVIDERS.has(preset.provider)) {
      onChange(preset.id);
      setOpen(false);
      return;
    }
    // Check if user already saved a key for this preset
    const existing = localKeys.find((k) => k.id === preset.id);
    if (existing) {
      onChange(preset.id);
      setOpen(false);
      return;
    }
    // Prompt for API key
    setPendingPreset(preset);
    setApiKeyInput("");
    setKeyError("");
  }

  function saveKey() {
    if (!pendingPreset) return;
    const isCustom = pendingPreset.provider === "";
    const provider = isCustom ? customProvider.trim() : pendingPreset.provider;
    const model = isCustom ? customModel.trim() : pendingPreset.model;

    if (!apiKeyInput.trim()) { setKeyError("API key cannot be empty."); return; }
    if (isCustom && !provider) { setKeyError("Provider is required."); return; }
    if (isCustom && !model) { setKeyError("Model is required."); return; }

    const id = isCustom
      ? `custom_${provider}_${model}_${Date.now()}`
      : pendingPreset.id;

    saveLocalLlmKey({
      id,
      provider,
      model,
      apiKey: apiKeyInput.trim(),
      name: isCustom ? `${provider}/${model}` : pendingPreset.label,
    });
    reloadKeys();
    onChange(id);
    setPendingPreset(null);
    setCustomProvider("");
    setCustomModel("");
    setApiKeyInput("");
    setOpen(false);
  }

  function removeKey(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteLocalLlmKey(id);
    reloadKeys();
    if (selectedId === id) onChange("");
  }

  // Custom local keys (not matching any preset)
  const customKeys = localKeys.filter(
    (k) => !PRESET_MODELS.some((p) => p.id === k.id),
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setPendingPreset(null); }}
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs transition-all",
          "bg-secondary/60 border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
          open && "border-primary/50 bg-secondary text-foreground",
        )}
      >
        <Cpu className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-xl border border-border bg-surface shadow-card backdrop-blur-sm overflow-hidden animate-fade-up">

          {/* API key modal (shown inline when a locked model is clicked) */}
          {pendingPreset ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {pendingPreset.icon} {pendingPreset.label || "Custom model"}
                </p>
                <button
                  type="button"
                  onClick={() => setPendingPreset(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {pendingPreset.provider === "" ? (
                // Custom key — collect provider + model too
                <>
                  <p className="text-xs text-muted-foreground">
                    Add any OpenAI-compatible provider. Keys are stored locally only.
                  </p>
                  <Input
                    placeholder="Provider (e.g. openai, groq, anthropic)"
                    value={customProvider}
                    onChange={(e) => { setCustomProvider(e.target.value); setKeyError(""); }}
                    className="bg-background border-border text-sm h-9"
                  />
                  <Input
                    placeholder="Model (e.g. gpt-4o, llama-3.3-70b)"
                    value={customModel}
                    onChange={(e) => { setCustomModel(e.target.value); setKeyError(""); }}
                    className="bg-background border-border text-sm h-9"
                  />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enter your <span className="text-foreground font-medium">{pendingPreset.provider}</span> API key.
                  It's stored locally in your browser only.
                </p>
              )}

              <Input
                autoFocus
                type="password"
                placeholder={pendingPreset.provider ? `${pendingPreset.provider.toUpperCase()}_API_KEY` : "sk-..."}
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setKeyError(""); }}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                className="bg-background border-border text-sm h-9"
              />
              {keyError && <p className="text-xs text-destructive">{keyError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveKey} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  Save &amp; select
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingPreset(null)} className="border-border">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select model</p>
              </div>

              {/* Default */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                    selectedId === ""
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-surface-elevated text-foreground",
                  )}
                >
                  <span className="text-base">⚡</span>
                  <span className="flex-1">Default (Groq Llama)</span>
                </button>
              </div>

              {/* Preset models */}
              <div className="px-3 py-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Models</p>
              </div>
              <div className="p-1 max-h-60 overflow-y-auto space-y-0.5">
                {PRESET_MODELS.map((preset) => {
                  const isFree = FREE_PROVIDERS.has(preset.provider);
                  const hasKey = localKeys.some((k) => k.id === preset.id);
                  const isSelected = selectedId === preset.id;
                  const locked = !isFree && !hasKey;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectModel(preset)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left group",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-surface-elevated text-foreground",
                      )}
                    >
                      <span className="text-base w-5 text-center shrink-0">{preset.icon}</span>
                      <span className="flex-1 truncate">{preset.label}</span>
                      {preset.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          {preset.badge}
                        </span>
                      )}
                      {locked ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      ) : hasKey ? (
                        <Trash2
                          className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          onClick={(e) => removeKey(preset.id, e)}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Custom saved keys */}
              {customKeys.length > 0 && (
                <>
                  <div className="px-3 py-1 border-t border-border mt-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Custom keys</p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {customKeys.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => { onChange(k.id); setOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left group",
                          selectedId === k.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-surface-elevated text-foreground",
                        )}
                      >
                        <Cpu className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{k.name ?? `${k.provider}/${k.model}`}</span>
                        <Trash2
                          className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          onClick={(e) => removeKey(k.id, e)}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Add custom key shortcut */}
              <div className="p-1 pt-0 border-t border-border mt-1">
                <button
                  type="button"
                  onClick={() => setPendingPreset({
                    id: `custom_${Date.now()}`,
                    label: "Custom model",
                    provider: "",
                    model: "",
                    icon: "🔑",
                  })}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add custom API key
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
