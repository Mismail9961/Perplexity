export type LocalThread = {
  id: string;
  title: string | null;
  created_at: string;
};

const STORAGE_KEY = "askly_local_threads";

export function getLocalThreads(): LocalThread[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalThread[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveLocalThread(thread: LocalThread) {
  const all = getLocalThreads();
  const incomingTime = new Date(thread.created_at).getTime();

  const duplicateByTitleAndTime = all.find((item) => {
    if ((item.title ?? "").trim().toLowerCase() !== (thread.title ?? "").trim().toLowerCase()) {
      return false;
    }
    const existingTime = new Date(item.created_at).getTime();
    return Math.abs(existingTime - incomingTime) <= 15_000;
  });

  const stableId = duplicateByTitleAndTime?.id ?? thread.id;
  const existing = all.filter((item) => item.id !== stableId);
  const next = [{ ...thread, id: stableId }, ...existing].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearLocalThreads() {
  localStorage.removeItem(STORAGE_KEY);
}
