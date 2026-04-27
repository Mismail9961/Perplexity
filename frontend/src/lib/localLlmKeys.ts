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

/** Save a key. If `key.id` is provided it is used as-is (for preset models),
 *  otherwise a random id is generated. */
export function saveLocalLlmKey(key: Omit<LocalLlmKey, "id"> & { id?: string }) {
  const existing = getLocalLlmKeys().filter((k) => k.id !== key.id);
  const id = key.id ?? `localkey_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: LocalLlmKey[] = [{ id, ...key }, ...existing].slice(0, 30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return id;
}

export function deleteLocalLlmKey(id: string) {
  const next = getLocalLlmKeys().filter((k) => k.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
