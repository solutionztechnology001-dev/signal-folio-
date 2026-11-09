import type {
  ContentItem,
  ContentStatus,
  Distribution,
  DistributionStatus,
  MetricName,
  OutcomeLog,
  Settings,
  SourceKind,
  StoreData,
  UtmParams,
} from "./types";
import { SCHEMA_VERSION } from "./types.ts";
import { createId } from "./id.ts";
import { MAX_JSON_IMPORT_BYTES } from "./validation.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = "signal-folio:v2";
export const LEGACY_KEY = "signal-folio-content";
export const BACKUP_KEY = "signal-folio:legacy-backup";
export const EXPORT_APP = "signal-folio";

export function emptyData(): StoreData {
  return {
    version: SCHEMA_VERSION,
    content: [],
    distributions: [],
    outcomes: [],
    settings: { currency: "USD" },
  };
}

// ---------- helpers ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isDateString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && !Number.isNaN(Date.parse(v));
}

function isQuotaError(e: unknown): boolean {
  if (!isRecord(e) && !(e instanceof Error)) return false;
  const err = e as { name?: unknown; code?: unknown };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    err.code === 1014
  );
}

// ---------- validation ----------

export type ValidateResult =
  | { ok: true; data: StoreData }
  | { ok: false; errors: string[] };

const CONTENT_STATUSES: ContentStatus[] = ["draft", "ready", "archived"];
const DIST_STATUSES: DistributionStatus[] = ["planned", "published", "failed"];
const METRIC_NAMES: MetricName[] = ["impressions", "clicks", "conversions", "revenue", "cost"];
const SOURCE_KINDS: SourceKind[] = ["measured", "user-entered", "estimated"];

function readUtm(v: unknown): UtmParams | null {
  if (!isRecord(v)) return null;
  if (typeof v.source !== "string" || typeof v.medium !== "string" || typeof v.campaign !== "string") {
    return null;
  }
  const utm: UtmParams = { source: v.source, medium: v.medium, campaign: v.campaign };
  if (typeof v.content === "string") utm.content = v.content;
  if (typeof v.term === "string") utm.term = v.term;
  return utm;
}

// Structural validation. Lengths are not limited here, so existing user
// content is never rejected or truncated. Length limits apply to new input.
export function validateStoreData(input: unknown): ValidateResult {
  const errors: string[] = [];
  const fail = (m: string) => {
    if (errors.length < 10) errors.push(m);
  };

  if (!isRecord(input)) return { ok: false, errors: ["Data is not an object."] };
  if (input.version !== SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported data version (expected ${SCHEMA_VERSION}).`] };
  }
  if (!Array.isArray(input.content)) fail("content must be a list.");
  if (!Array.isArray(input.distributions)) fail("distributions must be a list.");
  if (!Array.isArray(input.outcomes)) fail("outcomes must be a list.");
  if (errors.length > 0) return { ok: false, errors };

  const content: ContentItem[] = [];
  const contentIds = new Set<string>();
  (input.content as unknown[]).forEach((raw, i) => {
    if (!isRecord(raw)) return fail(`content[${i}] is not an object.`);
    if (typeof raw.id !== "string" || !raw.id) return fail(`content[${i}] has no id.`);
    if (contentIds.has(raw.id)) return fail(`content[${i}] has a duplicate id.`);
    if (typeof raw.title !== "string" || typeof raw.body !== "string") {
      return fail(`content[${i}] needs a text title and body.`);
    }
    if (!CONTENT_STATUSES.includes(raw.status as ContentStatus)) {
      return fail(`content[${i}] has an invalid status.`);
    }
    if (!isDateString(raw.createdAt) || !isDateString(raw.updatedAt)) {
      return fail(`content[${i}] has an invalid date.`);
    }
    const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [];
    contentIds.add(raw.id);
    content.push({
      id: raw.id,
      title: raw.title,
      body: raw.body,
      tags,
      status: raw.status as ContentStatus,
      isDemo: raw.isDemo === true,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  });

  const distributions: Distribution[] = [];
  const distIds = new Set<string>();
  (input.distributions as unknown[]).forEach((raw, i) => {
    if (!isRecord(raw)) return fail(`distributions[${i}] is not an object.`);
    if (typeof raw.id !== "string" || !raw.id) return fail(`distributions[${i}] has no id.`);
    if (distIds.has(raw.id)) return fail(`distributions[${i}] has a duplicate id.`);
    if (typeof raw.contentId !== "string" || !contentIds.has(raw.contentId)) {
      return fail(`distributions[${i}] points to missing content.`);
    }
    if (typeof raw.platform !== "string" || !raw.platform) {
      return fail(`distributions[${i}] has no platform.`);
    }
    if (!DIST_STATUSES.includes(raw.status as DistributionStatus)) {
      return fail(`distributions[${i}] has an invalid status.`);
    }
    if (!isDateString(raw.createdAt) || !isDateString(raw.updatedAt)) {
      return fail(`distributions[${i}] has an invalid date.`);
    }
    if (raw.publishedAt !== null && raw.publishedAt !== undefined && !isDateString(raw.publishedAt)) {
      return fail(`distributions[${i}] has an invalid published date.`);
    }
    distIds.add(raw.id);
    distributions.push({
      id: raw.id,
      contentId: raw.contentId,
      platform: raw.platform,
      destinationUrl: typeof raw.destinationUrl === "string" ? raw.destinationUrl : "",
      utm: readUtm(raw.utm),
      taggedUrl: typeof raw.taggedUrl === "string" ? raw.taggedUrl : "",
      status: raw.status as DistributionStatus,
      publishedUrl: typeof raw.publishedUrl === "string" ? raw.publishedUrl : "",
      publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
      notes: typeof raw.notes === "string" ? raw.notes : "",
      isDemo: raw.isDemo === true,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  });

  const outcomes: OutcomeLog[] = [];
  const outcomeIds = new Set<string>();
  (input.outcomes as unknown[]).forEach((raw, i) => {
    if (!isRecord(raw)) return fail(`outcomes[${i}] is not an object.`);
    if (typeof raw.id !== "string" || !raw.id) return fail(`outcomes[${i}] has no id.`);
    if (outcomeIds.has(raw.id)) return fail(`outcomes[${i}] has a duplicate id.`);
    if (typeof raw.distributionId !== "string" || !distIds.has(raw.distributionId)) {
      return fail(`outcomes[${i}] points to a missing distribution.`);
    }
    if (!METRIC_NAMES.includes(raw.metric as MetricName)) {
      return fail(`outcomes[${i}] has an invalid metric.`);
    }
    if (typeof raw.value !== "number" || !Number.isFinite(raw.value) || raw.value < 0) {
      return fail(`outcomes[${i}] has an invalid value.`);
    }
    if (!SOURCE_KINDS.includes(raw.sourceKind as SourceKind)) {
      return fail(`outcomes[${i}] has an invalid source kind.`);
    }
    if (!isDateString(raw.recordedAt) || !isDateString(raw.createdAt)) {
      return fail(`outcomes[${i}] has an invalid date.`);
    }
    outcomeIds.add(raw.id);
    outcomes.push({
      id: raw.id,
      distributionId: raw.distributionId,
      metric: raw.metric as MetricName,
      value: raw.value,
      currency: typeof raw.currency === "string" ? raw.currency : "",
      sourceKind: raw.sourceKind as SourceKind,
      sourceDetail: typeof raw.sourceDetail === "string" ? raw.sourceDetail : "",
      uncertaintyNote: typeof raw.uncertaintyNote === "string" ? raw.uncertaintyNote : "",
      recordedAt: raw.recordedAt,
      isDemo: raw.isDemo === true,
      createdAt: raw.createdAt,
    });
  });

  if (errors.length > 0) return { ok: false, errors };

  const settings: Settings = { currency: "USD" };
  if (isRecord(input.settings) && typeof input.settings.currency === "string" && /^[A-Z]{3}$/.test(input.settings.currency)) {
    settings.currency = input.settings.currency;
  }

  return { ok: true, data: { version: SCHEMA_VERSION, content, distributions, outcomes, settings } };
}

// ---------- legacy migration ----------

export interface MigrationStats {
  total: number;
  migrated: number;
  droppedSamples: number;
  droppedInvalid: number;
  itemsWithSimulatedMetrics: number;
}

// The old app stored a flat list with clicks, conversions, commissions and a
// "Distributed" status. Those numbers were generated by Math.random() or came
// from hard-coded samples, so they are NEVER carried over as outcomes. The
// content itself (title and body) is preserved.
export function migrateLegacy(parsed: unknown, now: string = new Date().toISOString()): {
  data: StoreData;
  stats: MigrationStats;
} {
  const data = emptyData();
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    droppedSamples: 0,
    droppedInvalid: 0,
    itemsWithSimulatedMetrics: 0,
  };
  if (!Array.isArray(parsed)) return { data, stats };

  const seen = new Set<string>();
  for (const raw of parsed as unknown[]) {
    stats.total += 1;
    if (!isRecord(raw)) {
      stats.droppedInvalid += 1;
      continue;
    }
    const id = typeof raw.id === "string" ? raw.id : "";
    if (id.startsWith("sample-")) {
      stats.droppedSamples += 1;
      continue;
    }
    if (typeof raw.title !== "string" || typeof raw.body !== "string" || !raw.title.trim() || !raw.body.trim()) {
      stats.droppedInvalid += 1;
      continue;
    }
    const hasMetrics = ["clicks", "conversions", "commissions"].some(
      (k) => typeof raw[k] === "number" && (raw[k] as number) > 0
    );
    if (hasMetrics) stats.itemsWithSimulatedMetrics += 1;

    let newId = id || createId();
    if (seen.has(newId)) newId = createId();
    seen.add(newId);
    const created = isDateString(raw.createdAt) ? raw.createdAt : now;
    data.content.push({
      id: newId,
      title: raw.title,
      body: raw.body,
      tags: [],
      status: "draft", // "Distributed" in the old app proved nothing
      isDemo: false,
      createdAt: created,
      updatedAt: created,
    });
    stats.migrated += 1;
  }
  return { data, stats };
}

// ---------- save / load ----------

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unknown"; message: string };

export function saveStore(storage: StorageLike, data: StoreData): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    if (isQuotaError(e)) {
      return {
        ok: false,
        reason: "quota",
        message:
          "Your browser storage is full, so your latest changes are NOT saved. Download a backup from Settings now, then free up space.",
      };
    }
    return {
      ok: false,
      reason: "unknown",
      message: "Could not save to browser storage. Your latest changes are NOT saved. Download a backup from Settings.",
    };
  }
}

export type LoadStatus = "ok" | "empty" | "migrated" | "corrupt" | "blocked";

export interface LoadResult {
  status: LoadStatus;
  data: StoreData;
  message: string | null;
  raw: string | null; // raw stored text, for recovery when status is corrupt/blocked
  stats?: MigrationStats;
}

function blocked(message: string, raw: string | null, status: "corrupt" | "blocked" = "blocked"): LoadResult {
  return { status, data: emptyData(), message, raw };
}

// Fails closed: if anything goes wrong, the stored data is left untouched and
// the result is read-only (corrupt or blocked) instead of overwriting it.
export function loadStore(storage: StorageLike, now: string = new Date().toISOString()): LoadResult {
  let rawV2: string | null;
  try {
    rawV2 = storage.getItem(STORAGE_KEY);
  } catch {
    return blocked("Browser storage is unavailable (private mode or blocked). Nothing can be saved.", null);
  }

  if (rawV2 !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawV2);
    } catch {
      return blocked(
        "Your saved data could not be read (it may be damaged). It has not been changed. Download the raw data below before doing anything else.",
        rawV2,
        "corrupt"
      );
    }
    const v = validateStoreData(parsed);
    if (!v.ok) {
      return blocked(
        "Your saved data does not match the expected format. It has not been changed. Download the raw data below before doing anything else.",
        rawV2,
        "corrupt"
      );
    }
    return { status: "ok", data: v.data, message: null, raw: null };
  }

  let rawLegacy: string | null;
  try {
    rawLegacy = storage.getItem(LEGACY_KEY);
  } catch {
    return blocked("Browser storage is unavailable (private mode or blocked). Nothing can be saved.", null);
  }
  if (rawLegacy === null) {
    return { status: "empty", data: emptyData(), message: null, raw: null };
  }

  let parsedLegacy: unknown;
  try {
    parsedLegacy = JSON.parse(rawLegacy);
  } catch {
    return blocked(
      "Data from the older version could not be read. It has not been changed. Download the raw data below.",
      rawLegacy,
      "corrupt"
    );
  }
  if (!Array.isArray(parsedLegacy)) {
    return blocked(
      "Data from the older version has an unexpected format. It has not been changed. Download the raw data below.",
      rawLegacy,
      "corrupt"
    );
  }

  const { data, stats } = migrateLegacy(parsedLegacy, now);

  // 1. Back up the original BEFORE writing anything new, and check it landed.
  try {
    storage.setItem(BACKUP_KEY, rawLegacy);
    if (storage.getItem(BACKUP_KEY) !== rawLegacy) throw new Error("backup mismatch");
  } catch {
    try {
      storage.removeItem(BACKUP_KEY);
    } catch {
      /* ignore */
    }
    return blocked(
      "There is not enough browser storage to back up your existing data before upgrading, so nothing was changed. Free up space and reload.",
      rawLegacy
    );
  }

  // 2. Write the new format. If this fails, the original data is still intact.
  const saved = saveStore(storage, data);
  if (!saved.ok) {
    try {
      storage.removeItem(BACKUP_KEY);
    } catch {
      /* ignore */
    }
    return blocked(
      "Could not save the upgraded data, so nothing was changed. Your original data is untouched. " + saved.message,
      rawLegacy
    );
  }

  const parts: string[] = [];
  parts.push(`Upgraded your data: ${stats.migrated} content item${stats.migrated === 1 ? "" : "s"} kept.`);
  if (stats.droppedSamples > 0) {
    parts.push(`${stats.droppedSamples} built-in sample item${stats.droppedSamples === 1 ? "" : "s"} (with made-up numbers) removed.`);
  }
  if (stats.itemsWithSimulatedMetrics > 0) {
    parts.push("Old clicks, conversions and commissions were simulated, so they were NOT carried over.");
  }
  if (stats.droppedInvalid > 0) {
    parts.push(`${stats.droppedInvalid} unreadable item${stats.droppedInvalid === 1 ? "" : "s"} could not be converted; they remain in the old-data backup.`);
  }
  parts.push("A copy of your old data is kept in this browser (see Settings).");
  return { status: "migrated", data, message: parts.join(" "), raw: null, stats };
}

export function discardLegacyBackup(storage: StorageLike): void {
  try {
    storage.removeItem(BACKUP_KEY);
    storage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- export / import ----------

export function exportJson(data: StoreData, now: string = new Date().toISOString()): string {
  return JSON.stringify({ app: EXPORT_APP, exportVersion: 1, exportedAt: now, data }, null, 2);
}

export type ImportParse = { ok: true; data: StoreData } | { ok: false; errors: string[] };

export function parseImport(text: string, maxBytes: number = MAX_JSON_IMPORT_BYTES): ImportParse {
  const size = new TextEncoder().encode(text).length;
  if (size === 0) return { ok: false, errors: ["The file is empty."] };
  if (size > maxBytes) return { ok: false, errors: ["The file is too large to import."] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["The file is not valid JSON."] };
  }
  if (!isRecord(parsed)) return { ok: false, errors: ["The file is not a Signal Folio backup."] };
  let inner: unknown;
  if (parsed.app === EXPORT_APP && "data" in parsed) inner = parsed.data;
  else if (parsed.version === SCHEMA_VERSION) inner = parsed;
  else return { ok: false, errors: ["The file is not a Signal Folio backup."] };
  const v = validateStoreData(inner);
  if (!v.ok) return { ok: false, errors: v.errors };
  return { ok: true, data: v.data };
}

export interface ImportSummary {
  contentAdded: number;
  contentSkipped: number;
  distributionsAdded: number;
  distributionsSkipped: number;
  outcomesAdded: number;
  outcomesSkipped: number;
}

// merge: keeps everything already here; adds records whose ids are new and
// whose references resolve. Existing records are never overwritten.
// replace: the backup becomes the whole data set.
export function applyImport(
  current: StoreData,
  incoming: StoreData,
  mode: "merge" | "replace"
): { data: StoreData; summary: ImportSummary } {
  const summary: ImportSummary = {
    contentAdded: 0,
    contentSkipped: 0,
    distributionsAdded: 0,
    distributionsSkipped: 0,
    outcomesAdded: 0,
    outcomesSkipped: 0,
  };
  if (mode === "replace") {
    summary.contentAdded = incoming.content.length;
    summary.distributionsAdded = incoming.distributions.length;
    summary.outcomesAdded = incoming.outcomes.length;
    return { data: incoming, summary };
  }

  const content = [...current.content];
  const distributions = [...current.distributions];
  const outcomes = [...current.outcomes];
  const contentIds = new Set(content.map((c) => c.id));
  const distIds = new Set(distributions.map((d) => d.id));
  const outcomeIds = new Set(outcomes.map((o) => o.id));

  for (const c of incoming.content) {
    if (contentIds.has(c.id)) summary.contentSkipped += 1;
    else {
      content.push(c);
      contentIds.add(c.id);
      summary.contentAdded += 1;
    }
  }
  for (const d of incoming.distributions) {
    if (distIds.has(d.id) || !contentIds.has(d.contentId)) summary.distributionsSkipped += 1;
    else {
      distributions.push(d);
      distIds.add(d.id);
      summary.distributionsAdded += 1;
    }
  }
  for (const o of incoming.outcomes) {
    if (outcomeIds.has(o.id) || !distIds.has(o.distributionId)) summary.outcomesSkipped += 1;
    else {
      outcomes.push(o);
      outcomeIds.add(o.id);
      summary.outcomesAdded += 1;
    }
  }
  return {
    data: { version: SCHEMA_VERSION, content, distributions, outcomes, settings: current.settings },
    summary,
  };
}
