export type LocalLlmKey = {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  name?: string;
  isDefault?: boolean;
};

const STORAGE_KEY = "askly_local_llm_keys";

export function getLocalLlmKeys(): LocalLlmKey[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalLlmKey[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalLlmKey(key: Omit<LocalLlmKey, "id">) {
  const existing = getLocalLlmKeys();
  const id = `localkey_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: LocalLlmKey[] = [{ id, ...key }, ...existing].slice(0, 30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return id;
}
