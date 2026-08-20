const STORAGE_KEY = "checkmate.chesscom.usernames";

export interface RememberedUsername {
  username: string;
  lastUsed: string;
}

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = "__checkmate_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readStore(): RememberedUsername[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RememberedUsername[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.username === "string" &&
        typeof item.lastUsed === "string",
    );
  } catch {
    return [];
  }
}

function writeStore(entries: RememberedUsername[]): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function getRememberedUsernames(): RememberedUsername[] {
  return readStore().sort(
    (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime(),
  );
}

export function addUsername(username: string): void {
  const cleaned = username.trim();
  if (!cleaned) return;

  const existing = readStore().filter(
    (entry) => entry.username.toLowerCase() !== cleaned.toLowerCase(),
  );
  writeStore([
    { username: cleaned, lastUsed: new Date().toISOString() },
    ...existing,
  ]);
}

export function removeUsername(username: string): void {
  const cleaned = username.trim().toLowerCase();
  writeStore(
    readStore().filter((entry) => entry.username.toLowerCase() !== cleaned),
  );
}

export function formatLastUsed(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Recently";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function isStorageEnabled(): boolean {
  return isStorageAvailable();
}
