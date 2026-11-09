import test from "node:test";
import assert from "node:assert/strict";
import { emptyData } from "../store-core.ts";
import type { StoreData } from "../types.ts";
import { addContent, addDistribution, addOutcome, loadDemo, markPublished } from "../ops.ts";
import { summarize } from "../analytics.ts";
import { NOW } from "./helpers.ts";

function must(r: { ok: boolean; data?: StoreData; error?: string }): StoreData {
  assert.ok(r.ok, r.ok ? "" : r.error);
  return (r as { data: StoreData }).data;
}

function publishedPost(d: StoreData, title: string, platform: string): { data: StoreData; distId: string } {
  let data = must(addContent(d, { title, body: "Body" }, NOW));
  const contentId = data.content[0].id;
  data = must(addDistribution(data, { contentId, platform, destinationUrl: "", utm: null }, NOW));
  const distId = data.distributions[0].id;
  data = must(markPublished(data, distId, { publishedUrl: "https://example.org/" + title }, NOW));
  return { data, distId };
}

const src = { sourceKind: "user-entered" as const, sourceDetail: "dashboard" };

test("empty data produces zeros and null coverage, never NaN or a fake percentage", () => {
  const s = summarize(emptyData());
  assert.equal(s.contentCount, 0);
  assert.equal(s.publishedCount, 0);
  assert.equal(s.outcomeCoverage, null);
  assert.deepEqual(s.totals, { impressions: 0, clicks: 0, conversions: 0 });
  assert.deepEqual(s.revenueByCurrency, {});
  assert.equal(s.rows.length, 0);
});

test("content with no published distribution shows no performance at all", () => {
  const data = must(addContent(emptyData(), { title: "T", body: "B" }, NOW));
  const s = summarize(data);
  assert.equal(s.contentCount, 1);
  assert.equal(s.outcomeCount, 0);
  assert.equal(s.totals.clicks, 0);
});

test("totals are sums of user-entered numbers; currencies are never mixed", () => {
  const a = publishedPost(emptyData(), "A", "devto");
  let data = a.data;
  data = must(addOutcome(data, { ...src, distributionId: a.distId, metric: "clicks", value: 100 }, NOW));
  data = must(addOutcome(data, { ...src, distributionId: a.distId, metric: "conversions", value: 4 }, NOW));
  data = must(addOutcome(data, { ...src, distributionId: a.distId, metric: "revenue", value: 50, currency: "USD" }, NOW));
  data = must(addOutcome(data, { ...src, distributionId: a.distId, metric: "revenue", value: 7000, currency: "NGN" }, NOW));
  data = must(addOutcome(data, { ...src, distributionId: a.distId, metric: "cost", value: 10, currency: "USD" }, NOW));
  const s = summarize(data);
  assert.equal(s.totals.clicks, 100);
  assert.equal(s.totals.conversions, 4);
  assert.deepEqual(s.revenueByCurrency, { USD: 50, NGN: 7000 });
  assert.deepEqual(s.costByCurrency, { USD: 10 });
  assert.equal(s.rows[0].conversionRate, 0.04);
  assert.deepEqual(s.rows[0].sourceKinds, ["user-entered"]);
});

test("conversion rate is null unless both clicks and conversions were entered, and clicks > 0", () => {
  const a = publishedPost(emptyData(), "A", "devto");
  let data = must(addOutcome(a.data, { ...src, distributionId: a.distId, metric: "conversions", value: 3 }, NOW));
  assert.equal(summarize(data).rows[0].conversionRate, null);
  data = must(addOutcome(data, { ...src, distributionId: a.distId, metric: "clicks", value: 0 }, NOW));
  assert.equal(summarize(data).rows[0].conversionRate, null);
});

test("outcome coverage is the share of published posts with at least one result", () => {
  const a = publishedPost(emptyData(), "A", "devto");
  const b = publishedPost(a.data, "B", "medium");
  const c = publishedPost(b.data, "C", "x");
  const d = publishedPost(c.data, "D", "linkedin");
  let data = must(addOutcome(d.data, { ...src, distributionId: a.distId, metric: "clicks", value: 1 }, NOW));
  data = must(addOutcome(data, { ...src, distributionId: b.distId, metric: "clicks", value: 2 }, NOW));
  const s = summarize(data);
  assert.equal(s.publishedCount, 4);
  assert.equal(s.outcomeCoverage, 0.5);
});

test("source kinds are counted so estimates are never hidden inside totals", () => {
  const a = publishedPost(emptyData(), "A", "devto");
  let data = must(addOutcome(a.data, { ...src, distributionId: a.distId, metric: "clicks", value: 10 }, NOW));
  data = must(addOutcome(data, { distributionId: a.distId, metric: "impressions", value: 500, sourceKind: "estimated", sourceDetail: "guess" }, NOW));
  const s = summarize(data);
  assert.equal(s.sourceKindCounts["user-entered"], 1);
  assert.equal(s.sourceKindCounts.estimated, 1);
  assert.equal(s.sourceKindCounts.measured, 0);
  assert.deepEqual(s.rows[0].sourceKinds.sort(), ["estimated", "user-entered"]);
});

test("demo data is excluded from analytics by default and included only on request", () => {
  const real = publishedPost(emptyData(), "Real", "devto");
  const data = must(loadDemo(real.data, NOW));
  const hidden = summarize(data);
  assert.equal(hidden.outcomeCount, 0);
  assert.equal(hidden.publishedCount, 1);
  assert.equal(hidden.totals.clicks, 0);
  assert.deepEqual(hidden.revenueByCurrency, {});
  const shown = summarize(data, { includeDemo: true });
  assert.equal(shown.totals.clicks, 120);
  assert.deepEqual(shown.revenueByCurrency, { USD: 45 });
  assert.ok(shown.outcomeCount > 0);
});

test("archived content is counted separately", () => {
  const data = must(addContent(emptyData(), { title: "T", body: "B" }, NOW));
  const archived = { ...data, content: data.content.map((c) => ({ ...c, status: "archived" as const })) };
  const s = summarize(archived);
  assert.equal(s.contentCount, 0);
  assert.equal(s.archivedCount, 1);
});
