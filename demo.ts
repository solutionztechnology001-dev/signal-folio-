import type { ContentItem, Distribution, OutcomeLog } from "./types";

export const DEMO_PREFIX = "[DEMO] ";

// Demo data exists so people can see what the app looks like with records in it.
// Every record is flagged isDemo, titled with [DEMO], and excluded from real
// analytics by default. The numbers are made up and say so.
export function buildDemoData(now: string): {
  content: ContentItem[];
  distributions: Distribution[];
  outcomes: OutcomeLog[];
} {
  const content: ContentItem[] = [
    {
      id: "demo-content-1",
      title: DEMO_PREFIX + "Example review article",
      body: "This is demo content. Replace it with your own article or review.",
      tags: ["demo"],
      status: "ready",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo-content-2",
      title: DEMO_PREFIX + "Example comparison post",
      body: "This is demo content. It has no published distribution.",
      tags: ["demo"],
      status: "draft",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const distributions: Distribution[] = [
    {
      id: "demo-dist-1",
      contentId: "demo-content-1",
      platform: "devto",
      destinationUrl: "https://example.com/demo-offer",
      utm: { source: "devto", medium: "article", campaign: "demo" },
      taggedUrl: "https://example.com/demo-offer?utm_source=devto&utm_medium=article&utm_campaign=demo",
      status: "published",
      publishedUrl: "https://example.com/demo-post",
      publishedAt: now,
      notes: "Demo record. Not a real publication.",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const mk = (id: string, metric: OutcomeLog["metric"], value: number, currency: string): OutcomeLog => ({
    id,
    distributionId: "demo-dist-1",
    metric,
    value,
    currency,
    sourceKind: "estimated",
    sourceDetail: "Demo data. Not real.",
    uncertaintyNote: "Made-up example numbers.",
    recordedAt: now,
    isDemo: true,
    createdAt: now,
  });
  const outcomes: OutcomeLog[] = [
    mk("demo-out-1", "clicks", 120, ""),
    mk("demo-out-2", "conversions", 3, ""),
    mk("demo-out-3", "revenue", 45, "USD"),
  ];
  return { content, distributions, outcomes };
}
