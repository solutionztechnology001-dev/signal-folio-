// Signal Folio data model (schema v2).
// Every number in this model is entered by the user. Nothing here is measured
// by the app, and nothing is generated randomly.

export const SCHEMA_VERSION = 2;

export type ContentStatus = "draft" | "ready" | "archived";

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  tags: string[];
  status: ContentStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

// "planned"   = the user intends to publish it there
// "published" = the user says they published it, and gave the live URL
// "failed"    = the user tried and it did not work (note explains why)
export type DistributionStatus = "planned" | "published" | "failed";

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

export interface Distribution {
  id: string;
  contentId: string;
  platform: string;
  destinationUrl: string; // the link placed inside the post (may be empty)
  utm: UtmParams | null;
  taggedUrl: string; // destinationUrl plus UTM parameters (may be empty)
  status: DistributionStatus;
  publishedUrl: string; // where the post actually lives (empty until published)
  publishedAt: string | null;
  notes: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MetricName =
  | "impressions"
  | "clicks"
  | "conversions"
  | "revenue"
  | "cost";

// "measured" is reserved for a future verified integration. The app cannot
// create it today. Users can only enter "user-entered" or "estimated".
export type SourceKind = "measured" | "user-entered" | "estimated";

export interface OutcomeLog {
  id: string;
  distributionId: string;
  metric: MetricName;
  value: number;
  currency: string; // only meaningful for revenue and cost, otherwise ""
  sourceKind: SourceKind;
  sourceDetail: string; // where the number came from, e.g. "Dev.to dashboard"
  uncertaintyNote: string;
  recordedAt: string;
  isDemo: boolean;
  createdAt: string;
}

export interface Settings {
  currency: string;
}

export interface StoreData {
  version: number;
  content: ContentItem[];
  distributions: Distribution[];
  outcomes: OutcomeLog[];
  settings: Settings;
}

export const METRICS: MetricName[] = [
  "impressions",
  "clicks",
  "conversions",
  "revenue",
  "cost",
];
