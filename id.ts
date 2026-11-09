export function createId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Fallback for very old browsers. IDs only need to be unique, not secret.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
