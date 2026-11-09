import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_KEY,
  LEGACY_KEY,
  STORAGE_KEY,
  applyImport,
  emptyData,
  exportJson,
  loadStore,
  migrateLegacy,
  parseImport,
  saveStore,
  validateStoreData,
} from "../store-core.ts";
import { addContent, addDistribution, addOutcome, markPublished } from "../ops.ts";
import { MemStorage, NOW } from "./helpers.ts";

function legacyPayload(): string {
  return JSON.stringify([
    { id: "sample-1", title: "Sample", body: "fake", status: "High Performing", clicks: 1240, conversions: 47, commissions: 890, createdAt: NOW },
    { id: "u1", title: "My real article", body: "Real text", status: "Distributed", clicks: 321, conversions: 9, commissions: 120, createdAt: "2026-09-01T00:00:00.000Z", distributedTo: ["medium"] },
    { id: "u2", title: "Another", body: "More text", status: "Draft", clicks: 0, conversions: 0, commissions: 0, createdAt: NOW },
    { id: "bad", title: "", body: "" },
    "garbage",
  ]);
}

function seeded() {
  let d = emptyData();
  const a = addContent(d, { title: "Post", body: "Body" }, NOW);
  assert.ok(a.ok);
  d = a.ok ? a.data : d;
  const cid = d.content[0].id;
  const dist = addDistribution(d, { contentId: cid, platform: "devto", destinationUrl: "https://a.com", utm: { source: "devto", medium: "article", campaign: "c" } }, NOW);
  assert.ok(dist.ok);
  d = dist.ok ? dist.data : d;
  const pub = markPublished(d, d.distributions[0].id, { publishedUrl: "https://dev.to/x" }, NOW);
  assert.ok(pub.ok);
  d = pub.ok ? pub.data : d;
  const out = addOutcome(d, { distributionId: d.distributions[0].id, metric: "clicks", value: 12, sourceKind: "user-entered", sourceDetail: "Dev.to dashboard" }, NOW);
  assert.ok(out.ok);
  return out.ok ? out.data : d;
}

// ----- envelope -----

test("empty data validates and round-trips through save and load", () => {
  const s = new MemStorage();
  assert.equal(validateStoreData(emptyData()).ok, true);
  const data = seeded();
  assert.deepEqual(saveStore(s, data), { ok: true });
  const r = loadStore(s, NOW);
  assert.equal(r.status, "ok");
  assert.deepEqual(r.data, data);
});

test("fresh browser loads as empty and writes nothing", () => {
  const s = new MemStorage();
  const r = loadStore(s, NOW);
  assert.equal(r.status, "empty");
  assert.equal(s.map.size, 0);
});

test("validate rejects wrong version, bad shapes, duplicates and orphans", () => {
  assert.equal(validateStoreData(null).ok, false);
  assert.equal(validateStoreData({ ...emptyData(), version: 1 }).ok, false);
  assert.equal(validateStoreData({ ...emptyData(), content: "x" }).ok, false);
  const d = seeded();
  const dupe = { ...d, content: [d.content[0], d.content[0]] };
  assert.equal(validateStoreData(dupe).ok, false);
  const orphanDist = { ...d, content: [] };
  assert.equal(validateStoreData(orphanDist).ok, false);
  const orphanOut = { ...d, distributions: [] };
  assert.equal(validateStoreData(orphanOut).ok, false);
  const badMetric = { ...d, outcomes: [{ ...d.outcomes[0], metric: "magic" }] };
  assert.equal(validateStoreData(badMetric).ok, false);
  const negative = { ...d, outcomes: [{ ...d.outcomes[0], value: -1 }] };
  assert.equal(validateStoreData(negative).ok, false);
});

test("validate keeps long legacy content (no truncation or rejection)", () => {
  const d = emptyData();
  d.content.push({ id: "big", title: "t".repeat(500), body: "b".repeat(300000), tags: [], status: "draft", isDemo: false, createdAt: NOW, updatedAt: NOW });
  const r = validateStoreData(d);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.content[0].body.length, 300000);
});

test("corrupt saved data is NOT overwritten and the load is read-only", () => {
  const s = new MemStorage();
  s.setItem(STORAGE_KEY, "{not json");
  const r = loadStore(s, NOW);
  assert.equal(r.status, "corrupt");
  assert.equal(r.raw, "{not json");
  assert.equal(s.getItem(STORAGE_KEY), "{not json");
  s.setItem(STORAGE_KEY, JSON.stringify({ version: 2, content: "nope" }));
  assert.equal(loadStore(s, NOW).status, "corrupt");
});

test("unavailable storage is reported, not crashed", () => {
  const s = new MemStorage();
  s.failGet = true;
  assert.equal(loadStore(s, NOW).status, "blocked");
});

// ----- quota -----

test("saveStore reports a quota error instead of throwing", () => {
  const s = new MemStorage(50);
  const r = saveStore(s, seeded());
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reason, "quota");
    assert.match(r.message, /NOT saved/);
  }
});

// ----- legacy migration -----

test("migrateLegacy keeps real content and never carries simulated metrics", () => {
  const { data, stats } = migrateLegacy(JSON.parse(legacyPayload()), NOW);
  assert.equal(stats.total, 5);
  assert.equal(stats.migrated, 2);
  assert.equal(stats.droppedSamples, 1);
  assert.equal(stats.droppedInvalid, 2);
  assert.equal(stats.itemsWithSimulatedMetrics, 1);
  assert.deepEqual(data.content.map((c) => c.title), ["My real article", "Another"]);
  assert.equal(data.outcomes.length, 0);
  assert.equal(data.distributions.length, 0);
  // "Distributed" in the old app is not proof of publication.
  assert.ok(data.content.every((c) => c.status === "draft"));
  assert.equal(data.content[0].createdAt, "2026-09-01T00:00:00.000Z");
  assert.ok(!JSON.stringify(data).includes("commissions"));
});

test("migrateLegacy re-ids duplicate ids instead of dropping content", () => {
  const { data } = migrateLegacy([
    { id: "a", title: "One", body: "1" },
    { id: "a", title: "Two", body: "2" },
  ], NOW);
  assert.equal(data.content.length, 2);
  assert.notEqual(data.content[0].id, data.content[1].id);
});

test("loadStore migrates legacy data: backup written, new format saved, original kept", () => {
  const s = new MemStorage();
  const legacy = legacyPayload();
  s.setItem(LEGACY_KEY, legacy);
  const r = loadStore(s, NOW);
  assert.equal(r.status, "migrated");
  assert.equal(s.getItem(BACKUP_KEY), legacy);
  assert.equal(s.getItem(LEGACY_KEY), legacy);
  assert.ok(s.getItem(STORAGE_KEY));
  assert.match(r.message ?? "", /NOT carried over/);
  assert.match(r.message ?? "", /sample/);
  // next load reads the new format directly
  const again = loadStore(s, NOW);
  assert.equal(again.status, "ok");
  assert.equal(again.data.content.length, 2);
});

test("migration fails closed when the backup cannot be written", () => {
  const legacy = legacyPayload();
  const s = new MemStorage(legacy.length + LEGACY_KEY.length + 10); // no room for a backup copy
  s.setItem(LEGACY_KEY, legacy);
  const r = loadStore(s, NOW);
  assert.equal(r.status, "blocked");
  assert.match(r.message ?? "", /back up/);
  assert.equal(s.getItem(LEGACY_KEY), legacy);
  assert.equal(s.getItem(STORAGE_KEY), null);
  assert.equal(s.getItem(BACKUP_KEY), null);
});

test("migration fails closed when the new data cannot be saved, and removes the backup", () => {
  const legacy = JSON.stringify([{ id: "u1", title: "T", body: "B".repeat(200) }]);
  // room for legacy + backup, but not for the new format on top
  const s = new MemStorage(LEGACY_KEY.length + legacy.length + BACKUP_KEY.length + legacy.length + 20);
  s.setItem(LEGACY_KEY, legacy);
  const r = loadStore(s, NOW);
  assert.equal(r.status, "blocked");
  assert.equal(s.getItem(LEGACY_KEY), legacy);
  assert.equal(s.getItem(STORAGE_KEY), null);
  assert.equal(s.getItem(BACKUP_KEY), null);
});

test("corrupt legacy data is left untouched", () => {
  const s = new MemStorage();
  s.setItem(LEGACY_KEY, "oops");
  const r = loadStore(s, NOW);
  assert.equal(r.status, "corrupt");
  assert.equal(s.getItem(LEGACY_KEY), "oops");
  assert.equal(s.getItem(STORAGE_KEY), null);
  s.setItem(LEGACY_KEY, JSON.stringify({ not: "an array" }));
  assert.equal(loadStore(s, NOW).status, "corrupt");
});

test("legacy data that only contained samples migrates to an empty, honest state", () => {
  const s = new MemStorage();
  s.setItem(LEGACY_KEY, JSON.stringify([{ id: "sample-1", title: "S", body: "x", clicks: 5 }]));
  const r = loadStore(s, NOW);
  assert.equal(r.status, "migrated");
  assert.equal(r.data.content.length, 0);
});

// ----- export / import -----

test("export then import round-trips exactly", () => {
  const data = seeded();
  const text = exportJson(data, NOW);
  const parsed = parseImport(text);
  assert.ok(parsed.ok);
  if (parsed.ok) assert.deepEqual(parsed.data, data);
});

test("import rejects empty, oversized, non-JSON, foreign JSON and invalid data", () => {
  assert.equal(parseImport("").ok, false);
  assert.equal(parseImport("{}", 1).ok, false);
  assert.equal(parseImport("nope").ok, false);
  assert.equal(parseImport(JSON.stringify({ hello: "world" })).ok, false);
  assert.equal(parseImport(JSON.stringify({ app: "signal-folio", data: { version: 2, content: "x" } })).ok, false);
  assert.equal(parseImport(JSON.stringify([1, 2, 3])).ok, false);
});

test("merge adds new records, never overwrites existing ones, and reports skips", () => {
  const current = seeded();
  const incoming = seeded(); // different random ids
  const same = applyImport(current, current, "merge");
  assert.equal(same.summary.contentAdded, 0);
  assert.equal(same.summary.contentSkipped, 1);
  assert.deepEqual(same.data.content, current.content);
  const merged = applyImport(current, incoming, "merge");
  assert.equal(merged.data.content.length, 2);
  assert.equal(merged.summary.contentAdded, 1);
  assert.equal(merged.summary.distributionsAdded, 1);
  assert.equal(merged.summary.outcomesAdded, 1);
  assert.equal(validateStoreData(merged.data).ok, true);
});

test("merge skips records whose references cannot be resolved", () => {
  const current = emptyData();
  const incoming = seeded();
  const broken = { ...incoming, content: [] }; // distributions now point nowhere
  const r = applyImport(current, broken, "merge");
  assert.equal(r.summary.distributionsSkipped, 1);
  assert.equal(r.summary.outcomesSkipped, 1);
  assert.equal(validateStoreData(r.data).ok, true);
});

test("replace swaps the whole data set", () => {
  const current = seeded();
  const incoming = emptyData();
  const r = applyImport(current, incoming, "replace");
  assert.equal(r.data.content.length, 0);
});
