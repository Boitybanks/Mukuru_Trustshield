/**
 * localStorage that never throws (private mode, blocked storage, old
 * browsers). Only used for per-device conveniences: language and an
 * anonymous reporter id.
 */
const memory = new Map<string, string>();

export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
};

/** Anonymous random id so one browser cannot inflate a report count by clicking twice. */
export function reporterId(): string {
  const key = 'trustshield.reporter';
  const existing = storage.get(key);
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  storage.set(key, id);
  return id;
}
