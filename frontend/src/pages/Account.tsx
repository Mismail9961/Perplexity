import { Settings, User, Bell, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { addLlmKey, clearHistory, getTokenStatus, listLlmKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { saveLocalLlmKey } from "@/lib/localLlmKeys";
import { clearLocalThreads } from "@/lib/localHistory";

export default function Account() {
  const { token, email, clearSession } = useAuth();
  const [tier, setTier] = useState("free");
  const [tokenLabel, setTokenLabel] = useState("0 / 0");
  const [llmKeys, setLlmKeys] = useState<Array<{ id: string; provider: string; model: string; key_hint: string }>>([]);
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState("llama-3.1-8b-instant");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refreshAccountState(authToken: string) {
    const [status, keys] = await Promise.all([getTokenStatus(authToken), listLlmKeys(authToken)]);
    setTier(status.tier);
    setTokenLabel(status.unlimited ? `${status.tokensUsed} used / unlimited` : `${status.tokensUsed} / ${status.tokenLimit}`);
    setLlmKeys(keys.keys.map((k) => ({ id: k.id, provider: k.provider, model: k.model, key_hint: k.key_hint })));
  }

  useEffect(() => {
    if (!token) return;
    refreshAccountState(token).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load account")
    );
  }, [token]);

  async function onAddKey() {
    if (!token || !apiKey.trim() || !provider.trim() || !model.trim()) return;
    setError(null);
    try {
      await addLlmKey(token, { provider, model, apiKey: apiKey.trim(), isDefault: false });
      setApiKey("");
      await refreshAccountState(token);
    } catch (err) {
      saveLocalLlmKey({
        provider,
        model,
        apiKey: apiKey.trim(),
        name: `${provider}-${model}`,
      });
      setApiKey("");
      setError("Saved locally in browser (DB key storage unavailable right now).");
    }
  }

  async function onClearHistory() {
    setError(null);
    try {
      clearLocalThreads();
      if (token) {
        await clearHistory(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8 animate-fade-up">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Account</h1>
      </div>

      <section className="surface-card p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-2xl font-serif">
            A
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium">{email ?? "Anonymous"}</h2>
            <p className="text-sm text-muted-foreground">{tier} plan</p>
          </div>
          {token ? (
            <Button variant="outline" onClick={clearSession}>
              Sign out
            </Button>
          ) : (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Upgrade to Pro</Button>
          )}
        </div>
      </section>

      <section className="surface-card p-6 mb-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><User className="h-4 w-4 text-primary" /> Profile</h3>
        <Row label="Display name" value={email?.split("@")[0] ?? "Anonymous"} />
        <Separator className="bg-border" />
        <Row label="Email" value={email ?? "not signed in"} />
        <Separator className="bg-border" />
        <Row label="Language" value="English (US)" />
      </section>

      <section className="surface-card p-6 mb-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><Bell className="h-4 w-4 text-primary" /> Preferences</h3>
        <ToggleRow label="Auto-suggest follow-ups" defaultChecked />
        <Separator className="bg-border" />
        <ToggleRow label="Save search history" defaultChecked={false} />
        <Separator className="bg-border" />
        <ToggleRow label="Show source previews" defaultChecked />
        <Separator className="bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-sm">Remove all chat history</span>
          <Button type="button" variant="destructive" size="sm" onClick={onClearHistory}>
            Clear history
          </Button>
        </div>
      </section>

      <section className="surface-card p-6 mb-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><Shield className="h-4 w-4 text-primary" /> Privacy</h3>
        <ToggleRow label="Allow anonymous analytics" defaultChecked />
        <Separator className="bg-border" />
        <Row label="Data export" value="Download" />
      </section>

      <section className="surface-card p-6 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4 text-primary" /> Billing</h3>
        <Row label="Plan" value={tier} />
        <Separator className="bg-border" />
        <Row label="Token usage (monthly)" value={tokenLabel} />
        <Separator className="bg-border" />
        <Row label="Payment method" value="None" />
      </section>

      <section className="surface-card p-6 mt-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium">LLM API Keys</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" />
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" />
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key" />
        </div>
        <Button onClick={onAddKey} disabled={!token}>Save default key</Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          {llmKeys.map((key) => (
            <div key={key.id} className="text-sm text-muted-foreground">
              {key.provider} - {key.model} ({key.key_hint})
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}