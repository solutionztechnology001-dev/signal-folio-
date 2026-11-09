import test from "node:test";
import assert from "node:assert/strict";
import { emptyData } from "../store-core.ts";
import type { StoreData } from "../types.ts";
import {
  addContent,
  addDistribution,
  addOutcome,
  archiveContent,
  contentProtection,
  deleteContent,
  deleteDistribution,
  deleteOutcome,
  eraseAll,
  loadDemo,
  markFailed,
  markPublished,
  removeDemo,
  restoreContent,
  revertToPlanned,
  setCurrency,
  updateContent,
} from "../ops.ts";
import { validateStoreData } from "../store-core.ts";
import { NOW } from "./helpers.ts";

function must(r: { ok: boolean; data?: StoreData; error?: string }): StoreData {
  assert.ok(r.ok, r.ok ? "" : r.error);
  return (r as { data: StoreData }).data;
}

function withContent(): StoreData {
  return must(addContent(emptyData(), { title: "Post", body: "Body", tags: ["A"] }, NOW));
}

function withPlanned(): StoreData {
  const d = withContent();
  return must(addDistribution(d, { contentId: d.content[0].id, platform: "devto", destinationUrl: "https://a.com/x", utm: { source: "devto", medium: "article", campaign: "c" } }, NOW));
}

function withPublished(): StoreData {
  const d = withPlanned();
  return must(markPublished(d, d.distributions[0].id, { publishedUrl: "https://dev.to/post" }, NOW));
}

// ----- content -----

test("addContent creates a draft, non-demo item and validates input", () => {
  const d = withContent();
  assert.equal(d.content.length, 1);
  assert.equal(d.content[0].status, "draft");
  assert.equal(d.content[0].isDemo, false);
  assert.deepEqual(d.content[0].tags, ["a"]);
  assert.equal(addContent(emptyData(), { title: "", body: "x" }).ok, false);
});

test("updateContent edits fields and can mark ready, but keeps archived archived", () => {
  const d = withContent();
  const id = d.content[0].id;
  const u = must(updateContent(d, id, { title: "New", body: "B2", tags: [], status: "ready" }, NOW));
  assert.equal(u.content[0].title, "New");
  assert.equal(u.content[0].status, "ready");
  const arch = must(archiveContent(u, id, NOW));
  const u2 = must(updateContent(arch, id, { title: "New2", body: "B2", status: "ready" }, NOW));
  assert.equal(u2.content[0].status, "archived");
  assert.equal(updateContent(d, "missing", { title: "t", body: "b" }).ok, false);
});

test("archive and restore", () => {
  const d = withContent();
  const id = d.content[0].id;
  const a = must(archiveContent(d, id, NOW));
  assert.equal(a.content[0].status, "archived");
  const r = must(restoreContent(a, id, NOW));
  assert.equal(r.content[0].status, "draft");
  assert.equal(restoreContent(r, id).ok, false);
});

test("unpublished content can be deleted, taking its planned distributions with it (no orphans)", () => {
  const d = withPlanned();
  const id = d.content[0].id;
  assert.equal(contentProtection(d, id).deletable, true);
  const after = must(deleteContent(d, id));
  assert.equal(after.content.length, 0);
  assert.equal(after.distributions.length, 0);
  assert.equal(validateStoreData(after).ok, true);
});

test("content with a published distribution can be archived but NOT deleted", () => {
  const d = withPublished();
  const id = d.content[0].id;
  const p = contentProtection(d, id);
  assert.equal(p.deletable, false);
  assert.match(p.reason, /Archive/);
  const r = deleteContent(d, id);
  assert.equal(r.ok, false);
  assert.equal(archiveContent(d, id, NOW).ok, true);
});

test("deleting content never leaves orphaned outcomes", () => {
  // demo content is exempt from the published-protection rule
  let d = must(loadDemo(emptyData(), NOW));
  d = must(deleteContent(d, "demo-content-1"));
  assert.equal(d.distributions.length, 0);
  assert.equal(d.outcomes.length, 0);
  assert.equal(validateStoreData(d).ok, true);
});

// ----- distributions -----

test("addDistribution builds a UTM-tagged link and starts as planned", () => {
  const d = withPlanned();
  const dist = d.distributions[0];
  assert.equal(dist.status, "planned");
  assert.equal(dist.publishedUrl, "");
  assert.equal(dist.publishedAt, null);
  assert.match(dist.taggedUrl, /utm_source=devto/);
  assert.equal(dist.isDemo, false);
});

test("addDistribution rules: content, platform, url, archived", () => {
  const d = withContent();
  const id = d.content[0].id;
  assert.equal(addDistribution(d, { contentId: "nope", platform: "devto", destinationUrl: "", utm: null }).ok, false);
  assert.equal(addDistribution(d, { contentId: id, platform: "bogus", destinationUrl: "", utm: null }).ok, false);
  assert.equal(addDistribution(d, { contentId: id, platform: "devto", destinationUrl: "not a url", utm: null }).ok, false);
  assert.equal(addDistribution(d, { contentId: id, platform: "devto", destinationUrl: "javascript:alert(1)", utm: null }).ok, false);
  assert.equal(addDistribution(d, { contentId: id, platform: "devto", destinationUrl: "", utm: null }).ok, true);
  const arch = must(archiveContent(d, id, NOW));
  assert.equal(addDistribution(arch, { contentId: id, platform: "devto", destinationUrl: "", utm: null }).ok, false);
});

test("markPublished needs a live URL; it is a user report, not verified", () => {
  const d = withPlanned();
  const id = d.distributions[0].id;
  assert.equal(markPublished(d, id, { publishedUrl: "" }).ok, false);
  assert.equal(markPublished(d, id, { publishedUrl: "dev.to/x" }).ok, false);
  assert.equal(markPublished(d, id, { publishedUrl: "https://dev.to/x", publishedAt: "not a date" }).ok, false);
  const p = must(markPublished(d, id, { publishedUrl: "https://dev.to/x", publishedAt: "2026-10-01" }, NOW));
  assert.equal(p.distributions[0].status, "published");
  assert.equal(p.distributions[0].publishedAt, "2026-10-01T00:00:00.000Z");
  assert.equal(markPublished(p, id, { publishedUrl: "https://dev.to/y" }).ok, false);
});

test("markFailed works on planned, not on published; can be retried", () => {
  const d = withPlanned();
  const id = d.distributions[0].id;
  const f = must(markFailed(d, id, "API refused", NOW));
  assert.equal(f.distributions[0].status, "failed");
  assert.equal(f.distributions[0].notes, "API refused");
  const published = must(markPublished(f, id, { publishedUrl: "https://dev.to/x" }, NOW));
  assert.equal(published.distributions[0].status, "published");
  assert.equal(markFailed(published, id, "x").ok, false);
});

test("revertToPlanned only works when no outcomes are recorded", () => {
  const p = withPublished();
  const id = p.distributions[0].id;
  const r = must(revertToPlanned(p, id, NOW));
  assert.equal(r.distributions[0].status, "planned");
  assert.equal(r.distributions[0].publishedUrl, "");
  const withOutcome = must(addOutcome(p, { distributionId: id, metric: "clicks", value: 5, sourceKind: "user-entered", sourceDetail: "dashboard" }, NOW));
  assert.equal(revertToPlanned(withOutcome, id).ok, false);
});

test("published distributions cannot be deleted; others can, with their outcomes", () => {
  const p = withPublished();
  assert.equal(deleteDistribution(p, p.distributions[0].id).ok, false);
  const planned = withPlanned();
  const after = must(deleteDistribution(planned, planned.distributions[0].id));
  assert.equal(after.distributions.length, 0);
});

// ----- outcomes -----

const base = { metric: "clicks" as const, value: 10, sourceKind: "user-entered" as const, sourceDetail: "Dev.to dashboard" };

test("addOutcome only for published distributions", () => {
  const planned = withPlanned();
  assert.equal(addOutcome(planned, { ...base, distributionId: planned.distributions[0].id }).ok, false);
  const p = withPublished();
  const d = must(addOutcome(p, { ...base, distributionId: p.distributions[0].id }, NOW));
  assert.equal(d.outcomes.length, 1);
  assert.equal(d.outcomes[0].sourceKind, "user-entered");
  assert.equal(d.outcomes[0].currency, "");
});

test("addOutcome requires a source description and rejects 'measured'", () => {
  const p = withPublished();
  const distributionId = p.distributions[0].id;
  assert.equal(addOutcome(p, { ...base, distributionId, sourceDetail: "  " }).ok, false);
  const r = addOutcome(p, { ...base, distributionId, sourceKind: "measured" });
  assert.equal(r.ok, false);
  assert.equal(addOutcome(p, { ...base, distributionId, sourceKind: "estimated" }).ok, true);
});

test("addOutcome validates numbers and currency for money metrics", () => {
  const p = withPublished();
  const distributionId = p.distributions[0].id;
  for (const value of [-1, NaN, Infinity]) {
    assert.equal(addOutcome(p, { ...base, distributionId, value }).ok, false);
  }
  assert.equal(addOutcome(p, { ...base, distributionId, value: 0 }).ok, true);
  assert.equal(addOutcome(p, { ...base, distributionId, metric: "revenue", value: 5 }).ok, false);
  assert.equal(addOutcome(p, { ...base, distributionId, metric: "revenue", value: 5, currency: "dollars" }).ok, false);
  const ok = must(addOutcome(p, { ...base, distributionId, metric: "revenue", value: 5, currency: "ngn" }, NOW));
  assert.equal(ok.outcomes[0].currency, "NGN");
  assert.equal(addOutcome(p, { ...base, distributionId, metric: "magic" as never }).ok, false);
});

test("deleteOutcome", () => {
  const p = withPublished();
  const d = must(addOutcome(p, { ...base, distributionId: p.distributions[0].id }, NOW));
  const after = must(deleteOutcome(d, d.outcomes[0].id));
  assert.equal(after.outcomes.length, 0);
  assert.equal(deleteOutcome(after, "nope").ok, false);
});

// ----- demo / settings / reset -----

test("demo data is flagged, labelled [DEMO], valid, and removable without touching real data", () => {
  const real = withPublished();
  const d = must(loadDemo(real, NOW));
  assert.equal(validateStoreData(d).ok, true);
  const demoItems = d.content.filter((c) => c.isDemo);
  assert.ok(demoItems.length > 0);
  assert.ok(demoItems.every((c) => c.title.startsWith("[DEMO]")));
  assert.ok(d.outcomes.filter((o) => o.isDemo).every((o) => o.sourceKind === "estimated" && /Demo/.test(o.sourceDetail)));
  assert.equal(loadDemo(d, NOW).ok, false);
  const cleaned = must(removeDemo(d));
  assert.deepEqual(cleaned, real);
});

test("distributions and outcomes added to demo content are flagged as demo", () => {
  const d = must(loadDemo(emptyData(), NOW));
  const withDist = must(addDistribution(d, { contentId: "demo-content-2", platform: "x", destinationUrl: "", utm: null }, NOW));
  assert.equal(withDist.distributions[0].isDemo, true);
});

test("setCurrency and eraseAll", () => {
  const d = withPublished();
  assert.equal(setCurrency(d, "usd1").ok, false);
  const c = must(setCurrency(d, "ngn"));
  assert.equal(c.settings.currency, "NGN");
  const erased = must(eraseAll(c));
  assert.equal(erased.content.length, 0);
  assert.equal(erased.settings.currency, "NGN");
});
