import type { StorageLike } from "../store-core.ts";

// In-memory stand-in for localStorage, with an optional size limit that throws
// a QuotaExceededError like a real browser does.
export class MemStorage implements StorageLike {
  map: Map<string, string> = new Map();
  limit: number;
  failGet: boolean;

  constructor(limit: number = Infinity) {
    this.limit = limit;
    this.failGet = false;
  }

  private used(excludeKey?: string): number {
    let n = 0;
    for (const [k, v] of this.map) if (k !== excludeKey) n += k.length + v.length;
    return n;
  }

  getItem(key: string): string | null {
    if (this.failGet) throw new Error("storage unavailable");
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    if (this.used(key) + key.length + value.length > this.limit) {
      const err = new Error("The quota has been exceeded.");
      err.name = "QuotaExceededError";
      throw err;
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export const NOW = "2026-10-21T10:00:00.000Z";
