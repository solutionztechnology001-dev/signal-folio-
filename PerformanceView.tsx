"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { BarChart3, MousePointerClick, ShoppingCart, Wallet } from "lucide-react";
import type { Folio } from "@/lib/useFolio";
import { deleteOutcome } from "@/lib/ops";
import { summarize } from "@/lib/analytics";
import { platformName } from "@/lib/platforms";
import { Badge, Banner, MetricCard, SmallButton, formatDate, formatMoney } from "../ui";

interface Props {
  folio: Folio;
  notify: (message: string) => void;
}

function kindLabel(kind: string): string {
  if (kind === "user-entered") return "User-entered";
  if (kind === "estimated") return "Estimated";
  return "Measured";
}

export function PerformanceView({ folio, notify }: Props) {
  const [includeDemo, setIncludeDemo] = useState(false);
  const hasDemo = folio.data.content.some((c) => c.isDemo);
  const s = summarize(folio.data, { includeDemo });
  const entered = s.sourceKindCounts["user-entered"];
  const estimated = s.sourceKindCounts.estimated;

  const distIds = new Set(s.rows.map((r) => r.distribution.id));
  const outcomes = folio.data.outcomes.filter((o) => distIds.has(o.distributionId));

  return (
    <div>
      <div className="mb-4">
        <Banner tone="info">
          These totals add up numbers <strong>you entered</strong>. Signal Folio does not track clicks or sales itself, and it
          cannot verify them.
        </Banner>
      </div>

      {hasDemo && (
        <label className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <input
            type="checkbox"
            checked={includeDemo}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIncludeDemo(e.target.checked)}
            className="w-4 h-4"
          />
          Include DEMO data (made-up numbers)
        </label>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6">
        <MetricCard label="Clicks (entered)" value={s.rows.some((r) => r.totals.clicks !== undefined) ? s.totals.clicks.toLocaleString("en-US") : "—"} icon={MousePointerClick} hint={`${s.totals.impressions.toLocaleString("en-US")} views entered`} />
        <MetricCard label="Conversions (entered)" value={s.rows.some((r) => r.totals.conversions !== undefined) ? s.totals.conversions.toLocaleString("en-US") : "—"} icon={ShoppingCart} />
        <MetricCard label="Revenue (entered)" value={formatMoney(s.revenueByCurrency)} icon={Wallet} hint={Object.keys(s.costByCurrency).length > 0 ? `Costs: ${formatMoney(s.costByCurrency)}` : undefined} />
        <MetricCard
          label="Posts with results"
          value={s.outcomeCoverage === null ? "—" : `${Math.round(s.outcomeCoverage * 100)}%`}
          icon={BarChart3}
          hint={`${entered} entered · ${estimated} estimated`}
        />
      </div>

      <h2 className="text-base font-semibold text-slate-900 mb-3">Published posts</h2>
      {s.rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-700 mb-1">No results yet</h3>
          <p className="text-sm text-slate-500">Publish a post, mark it as published, then record a result. Nothing is shown until you do.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {s.rows.map((r) => (
            <div key={r.distribution.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{r.contentTitle}</div>
                  <div className="text-xs text-slate-500">
                    {platformName(r.distribution.platform)} · {formatDate(r.distribution.publishedAt)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                  {r.distribution.isDemo && <Badge tone="amber">DEMO</Badge>}
                  {r.sourceKinds.map((k) => (
                    <Badge key={k} tone={k === "estimated" ? "amber" : "blue"}>
                      {kindLabel(k)}
                    </Badge>
                  ))}
                </div>
              </div>
              {r.outcomeCount === 0 ? (
                <p className="text-sm text-slate-500 mt-3">No results recorded for this post yet.</p>
              ) : (
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Views</dt>
                    <dd className="font-medium text-slate-900">{r.totals.impressions !== undefined ? r.totals.impressions.toLocaleString("en-US") : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Clicks</dt>
                    <dd className="font-medium text-slate-900">{r.totals.clicks !== undefined ? r.totals.clicks.toLocaleString("en-US") : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Conversions</dt>
                    <dd className="font-medium text-slate-900">
                      {r.totals.conversions !== undefined ? r.totals.conversions.toLocaleString("en-US") : "—"}
                      {r.conversionRate !== null && (
                        <span className="text-xs text-slate-500 font-normal"> ({(r.conversionRate * 100).toFixed(1)}% of your clicks)</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Revenue</dt>
                    <dd className="font-medium text-slate-900">{formatMoney(r.revenueByCurrency)}</dd>
                  </div>
                </dl>
              )}
            </div>
          ))}
        </div>
      )}

      {outcomes.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Every result you entered</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {outcomes.map((o) => (
              <div key={o.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <div className="text-slate-900">
                    <span className="font-medium">{o.metric}</span>: {o.value.toLocaleString("en-US")}
                    {o.currency ? ` ${o.currency}` : ""}
                    <span className="ml-2 inline-block align-middle">
                      <Badge tone={o.sourceKind === "estimated" ? "amber" : "blue"}>{kindLabel(o.sourceKind)}</Badge>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Source: {o.sourceDetail} · {formatDate(o.recordedAt)}
                    {o.uncertaintyNote ? ` · ${o.uncertaintyNote}` : ""}
                  </div>
                </div>
                <SmallButton
                  tone="danger"
                  onClick={() => {
                    if (window.confirm("Delete this result?")) {
                      const r = folio.run((d) => deleteOutcome(d, o.id));
                      if (!r.ok) notify(r.error);
                    }
                  }}
                >
                  Delete
                </SmallButton>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
