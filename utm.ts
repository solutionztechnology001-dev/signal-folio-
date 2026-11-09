import type { UtmParams } from "./types";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isHttpUrl(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type UtmResult = { ok: true; url: string } | { ok: false; error: string };

// Adds utm_* parameters to a destination link. This only labels the link.
// It does not measure anything. Clicks are seen in whatever analytics the
// destination site has.
export function buildUtmUrl(destination: string, utm: UtmParams): UtmResult {
  const raw = destination.trim();
  if (!isHttpUrl(raw)) {
    return { ok: false, error: "Enter a full link starting with https:// or http://" };
  }
  const source = slugify(utm.source);
  const medium = slugify(utm.medium);
  const campaign = slugify(utm.campaign);
  if (!source || !medium || !campaign) {
    return { ok: false, error: "UTM source, medium and campaign are required." };
  }
  const url = new URL(raw);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  const content = utm.content ? slugify(utm.content) : "";
  const term = utm.term ? slugify(utm.term) : "";
  if (content) url.searchParams.set("utm_content", content);
  if (term) url.searchParams.set("utm_term", term);
  return { ok: true, url: url.toString() };
}
