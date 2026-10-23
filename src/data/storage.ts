import type { z } from "zod";

/**
 * Namespaced key/value storage. In the browser/webview this is localStorage; the
 * Tauri build will swap in the SQLite-backed repository (see docs/ARCHITECTURE.md).
 * Every read is schema-validated: corrupted or tampered values are discarded, not trusted.
 * Every access is guarded: storage may be unavailable (private mode, blocked site data).
 */

const PREFIX = "riftcoach:v1:";

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
  keys(): string[];
  readonly available: boolean;
}

export function browserStore(): KeyValueStore {
  let available = false;
  try {
    const probe = `${PREFIX}__probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return {
    available,
    get: (k) => {
      try {
        return window.localStorage.getItem(PREFIX + k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        window.localStorage.setItem(PREFIX + k, v);
        return true;
      } catch {
        return false;
      }
    },
    remove: (k) => {
      try {
        window.localStorage.removeItem(PREFIX + k);
      } catch {
        /* ignore */
      }
    },
    keys: () => {
      try {
        return Object.keys(window.localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .map((k) => k.slice(PREFIX.length));
      } catch {
        return [];
      }
    },
  };
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    available: true,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => (map.set(k, v), true),
    remove: (k) => void map.delete(k),
    keys: () => [...map.keys()],
  };
}

export function readJson<T>(store: KeyValueStore, key: string, schema: z.ZodType<T>): T | null {
  const raw = store.get(key);
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): boolean {
  return store.set(key, JSON.stringify(value));
}
