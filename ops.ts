import type {
  ContentItem,
  Distribution,
  MetricName,
  OutcomeLog,
  SourceKind,
  StoreData,
  UtmParams,
} from "./types";
import { METRICS } from "./types.ts";
import { createId } from "./id.ts";
import { buildUtmUrl, isHttpUrl } from "./utm.ts";
import { platformInfo } from "./platforms.ts";
import { validateContentInput } from "./validation.ts";
import { buildDemoData } from "./demo.ts";
import { emptyData } from "./store-core.ts";

export type OpResult =
  | { ok: true; data: StoreData; id?: string }
  | { ok: false; error: string };

const fail = (error: string): OpResult => ({ ok: false, error });

function findContent(data: StoreData, id: string): ContentItem | undefined {
  return data.content.find((c) => c.id === id);
}

// ---------- content ----------

export function addContent(
  data: StoreData,
  input: { title: string; body: string; tags?: string[] },
  now: string = new Date().toISOString()
): OpResult {
  const v = validateContentInput(input);
  if (!v.ok) return fail(v.error);
  const item: ContentItem = {
    id: createId(),
    title: v.value.title,
    body: v.value.body,
    tags: v.value.tags,
    status: "draft",
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, data: { ...data, content: [item, ...data.content] }, id: item.id };
}

export function updateContent(
  data: StoreData,
  id: string,
  input: { title: string; body: string; tags?: string[]; status?: "draft" | "ready" },
  now: string = new Date().toISOString()
): OpResult {
  const existing = findContent(data, id);
  if (!existing) return fail("That content no longer exists.");
  const v = validateContentInput(input);
  if (!v.ok) return fail(v.error);
  const status = existing.status === "archived" ? "archived" : input.status ?? existing.status;
  const updated: ContentItem = { ...existing, ...v.value, status, updatedAt: now };
  return { ok: true, data: { ...data, content: data.content.map((c) => (c.id === id ? updated : c)) } };
}

export function archiveContent(data: StoreData, id: string, now: string = new Date().toISOString()): OpResult {
  const existing = findContent(data, id);
  if (!existing) return fail("That content no longer exists.");
  return {
    ok: true,
    data: { ...data, content: data.content.map((c) => (c.id === id ? { ...c, status: "archived", updatedAt: now } : c)) },
  };
}

export function restoreContent(data: StoreData, id: string, now: string = new Date().toISOString()): OpResult {
  const existing = findContent(data, id);
  if (!existing) return fail("That content no longer exists.");
  if (existing.status !== "archived") return fail("That content is not archived.");
  return {
    ok: true,
    data: { ...data, content: data.content.map((c) => (c.id === id ? { ...c, status: "draft", updatedAt: now } : c)) },
  };
}

// Policy: content that has a published distribution can be archived but not
// deleted, so recorded outcomes are never orphaned. Demo content is exempt.
export function contentProtection(data: StoreData, id: string): { deletable: boolean; reason: string } {
  const item = findContent(data, id);
  if (!item) return { deletable: false, reason: "That content no longer exists." };
  if (item.isDemo) return { deletable: true, reason: "" };
  const published = data.distributions.some((d) => d.contentId === id && d.status === "published");
  if (published) {
    return { deletable: false, reason: "This content has a published distribution. Archive it instead." };
  }
  return { deletable: true, reason: "" };
}

export function deleteContent(data: StoreData, id: string): OpResult {
  const p = contentProtection(data, id);
  if (!p.deletable) return fail(p.reason);
  const distIds = new Set(data.distributions.filter((d) => d.contentId === id).map((d) => d.id));
  return {
    ok: true,
    data: {
      ...data,
      content: data.content.filter((c) => c.id !== id),
      distributions: data.distributions.filter((d) => d.contentId !== id),
      outcomes: data.outcomes.filter((o) => !distIds.has(o.distributionId)),
    },
  };
}

// ---------- distributions ----------

export function addDistribution(
  data: StoreData,
  input: { contentId: string; platform: string; destinationUrl: string; utm: UtmParams | null; notes?: string },
  now: string = new Date().toISOString()
): OpResult {
  const content = findContent(data, input.contentId);
  if (!content) return fail("Choose content to distribute.");
  if (content.status === "archived") return fail("Restore archived content before planning a distribution.");
  if (!platformInfo(input.platform)) return fail("Choose a platform.");
  const destination = input.destinationUrl.trim();
  let taggedUrl = "";
  let utm: UtmParams | null = null;
  if (destination) {
    if (input.utm) {
      const built = buildUtmUrl(destination, input.utm);
      if (!built.ok) return fail(built.error);
      taggedUrl = built.url;
      utm = input.utm;
    } else {
      if (!isHttpUrl(destination)) return fail("Enter a full link starting with https:// or http://");
      taggedUrl = destination;
    }
  }
  const dist: Distribution = {
    id: createId(),
    contentId: input.contentId,
    platform: input.platform,
    destinationUrl: destination,
    utm,
    taggedUrl,
    status: "planned",
    publishedUrl: "",
    publishedAt: null,
    notes: (input.notes ?? "").trim(),
    isDemo: content.isDemo,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, data: { ...data, distributions: [dist, ...data.distributions] }, id: dist.id };
}

function findDist(data: StoreData, id: string): Distribution | undefined {
  return data.distributions.find((d) => d.id === id);
}

function replaceDist(data: StoreData, next: Distribution): StoreData {
  return { ...data, distributions: data.distributions.map((d) => (d.id === next.id ? next : d)) };
}

// "Published" is something the USER reports. The app does not verify it. A
// live URL is required so there is something to check.
export function markPublished(
  data: StoreData,
  id: string,
  input: { publishedUrl: string; publishedAt?: string },
  now: string = new Date().toISOString()
): OpResult {
  const d = findDist(data, id);
  if (!d) return fail("That distribution no longer exists.");
  if (d.status === "published") return fail("Already marked as published.");
  const url = input.publishedUrl.trim();
  if (!isHttpUrl(url)) return fail("Enter the live link of your post (https://...).");
  const at = input.publishedAt && input.publishedAt.trim() ? input.publishedAt : now;
  if (Number.isNaN(Date.parse(at))) return fail("Enter a valid publish date.");
  return {
    ok: true,
    data: replaceDist(data, {
      ...d,
      status: "published",
      publishedUrl: url,
      publishedAt: new Date(at).toISOString(),
      updatedAt: now,
    }),
  };
}

export function markFailed(data: StoreData, id: string, note: string, now: string = new Date().toISOString()): OpResult {
  const d = findDist(data, id);
  if (!d) return fail("That distribution no longer exists.");
  if (d.status === "published") return fail("A published distribution cannot be marked failed.");
  return { ok: true, data: replaceDist(data, { ...d, status: "failed", notes: note.trim() || d.notes, updatedAt: now }) };
}

// Undo a mistaken "published" mark. Not allowed once outcomes are recorded.
export function revertToPlanned(data: StoreData, id: string, now: string = new Date().toISOString()): OpResult {
  const d = findDist(data, id);
  if (!d) return fail("That distribution no longer exists.");
  if (d.status === "planned") return fail("Already planned.");
  if (data.outcomes.some((o) => o.distributionId === id)) {
    return fail("Delete the recorded results first, then you can change this back.");
  }
  return {
    ok: true,
    data: replaceDist(data, { ...d, status: "planned", publishedUrl: "", publishedAt: null, updatedAt: now }),
  };
}

export function deleteDistribution(data: StoreData, id: string): OpResult {
  const d = findDist(data, id);
  if (!d) return fail("That distribution no longer exists.");
  if (d.status === "published" && !d.isDemo) {
    return fail("Published distributions can't be deleted. Change it back to planned first (only possible with no recorded results).");
  }
  return {
    ok: true,
    data: {
      ...data,
      distributions: data.distributions.filter((x) => x.id !== id),
      outcomes: data.outcomes.filter((o) => o.distributionId !== id),
    },
  };
}

// ---------- outcomes ----------

export interface OutcomeInput {
  distributionId: string;
  metric: MetricName;
  value: number;
  currency?: string;
  sourceKind: SourceKind;
  sourceDetail: string;
  uncertaintyNote?: string;
  recordedAt?: string;
}

// Every outcome must say where the number came from. "measured" is reserved
// for a verified integration that does not exist yet.
export function addOutcome(data: StoreData, input: OutcomeInput, now: string = new Date().toISOString()): OpResult {
  const d = findDist(data, input.distributionId);
  if (!d) return fail("That distribution no longer exists.");
  if (d.status !== "published") return fail("Results can only be recorded for published distributions.");
  if (!METRICS.includes(input.metric)) return fail("Choose a metric.");
  if (typeof input.value !== "number" || !Number.isFinite(input.value) || input.value < 0) {
    return fail("Enter a number that is zero or more.");
  }
  if (input.sourceKind === "measured") {
    return fail("Measured results need a verified integration, which Signal Folio does not have yet. Choose user-entered or estimated.");
  }
  if (input.sourceKind !== "user-entered" && input.sourceKind !== "estimated") return fail("Choose a source type.");
  const sourceDetail = input.sourceDetail.trim();
  if (!sourceDetail) return fail("Say where this number came from (for example: Dev.to dashboard).");
  if (sourceDetail.length > 200) return fail("Source description is too long.");
  let currency = "";
  if (input.metric === "revenue" || input.metric === "cost") {
    currency = (input.currency ?? "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return fail("Enter a 3-letter currency code, like USD or NGN.");
  }
  const at = input.recordedAt && input.recordedAt.trim() ? input.recordedAt : now;
  if (Number.isNaN(Date.parse(at))) return fail("Enter a valid date.");
  const outcome: OutcomeLog = {
    id: createId(),
    distributionId: input.distributionId,
    metric: input.metric,
    value: input.value,
    currency,
    sourceKind: input.sourceKind,
    sourceDetail,
    uncertaintyNote: (input.uncertaintyNote ?? "").trim(),
    recordedAt: new Date(at).toISOString(),
    isDemo: d.isDemo,
    createdAt: now,
  };
  return { ok: true, data: { ...data, outcomes: [outcome, ...data.outcomes] }, id: outcome.id };
}

export function deleteOutcome(data: StoreData, id: string): OpResult {
  if (!data.outcomes.some((o) => o.id === id)) return fail("That result no longer exists.");
  return { ok: true, data: { ...data, outcomes: data.outcomes.filter((o) => o.id !== id) } };
}

// ---------- demo, settings, reset ----------

export function loadDemo(data: StoreData, now: string = new Date().toISOString()): OpResult {
  if (data.content.some((c) => c.isDemo)) return fail("Demo data is already loaded.");
  const demo = buildDemoData(now);
  return {
    ok: true,
    data: {
      ...data,
      content: [...demo.content, ...data.content],
      distributions: [...demo.distributions, ...data.distributions],
      outcomes: [...demo.outcomes, ...data.outcomes],
    },
  };
}

export function removeDemo(data: StoreData): OpResult {
  return {
    ok: true,
    data: {
      ...data,
      content: data.content.filter((c) => !c.isDemo),
      distributions: data.distributions.filter((d) => !d.isDemo),
      outcomes: data.outcomes.filter((o) => !o.isDemo),
    },
  };
}

export function setCurrency(data: StoreData, currency: string): OpResult {
  const c = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return fail("Enter a 3-letter currency code, like USD or NGN.");
  return { ok: true, data: { ...data, settings: { ...data.settings, currency: c } } };
}

export function eraseAll(data: StoreData): OpResult {
  const fresh = emptyData();
  return { ok: true, data: { ...fresh, settings: data.settings } };
}
