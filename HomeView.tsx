"use client";

import { FileText, Send, CheckCircle2, ClipboardList, Plus } from "lucide-react";
import type { Folio } from "@/lib/useFolio";
import { summarize } from "@/lib/analytics";
import { MetricCard, Badge, formatDate } from "../ui";

export type ViewId = "home" | "content" | "distribute" | "performance" | "settings";

interface Props {
  folio: Folio;
  goto: (v: ViewId) => void;
  onAdd: () => void;
  onPlan: () => void;
}

export function HomeView({ folio, goto, onAdd, onPlan }: Props) {
  const s = summarize(folio.data);
  const recent = folio.data.content.filter((c) => !c.isDemo && c.status !== "archived").slice(0, 4);
  const planCount = s.plannedCount + s.publishedCount + s.failedCount;

  const steps = [
    { done: s.contentCount > 0, label: "Add a piece of content", action: onAdd, cta: "Add content" },
    { done: planCount > 0, label: "Plan where you will publish it", action: onPlan, cta: "Plan distribution" },
    { done: s.publishedCount > 0, label: "Publish it by hand and paste the live link", action: () => goto("distribute"), cta: "Open Distribute" },
    { done: s.outcomeCount > 0, label: "Record a real result (clicks, sales, commission)", action: () => goto("distribute"), cta: "Open Distribute" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5 mb-6 lg:mb-8">
        <MetricCard label="Content pieces" value={String(s.contentCount)} icon={FileText} />
        <MetricCard label="Planned" value={String(s.plannedCount)} hint="Not published yet" icon={ClipboardList} />
        <MetricCard label="Published" value={String(s.publishedCount)} hint="Reported by you" icon={Send} />
        <MetricCard
          label="Posts with results"
          value={s.outcomeCoverage === null ? "—" : `${Math.round(s.outcomeCoverage * 100)}%`}
          hint={s.outcomeCoverage === null ? "Nothing published yet" : "Of published posts"}
          icon={CheckCircle2}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-1">How it works</h2>
        <p className="text-sm text-slate-500 mb-4">
          Prepare content, publish it yourself, then record what really happened. Every number in Signal Folio is one you
          entered. It does not track clicks or sales on its own yet.
        </p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
                  step.done ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className={`flex-1 text-sm ${step.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{step.label}</span>
              {!step.done && (
                <button onClick={step.action} className="text-sm font-medium text-sky-600 hover:text-sky-700 shrink-0">
                  {step.cta}
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base lg:text-lg font-semibold text-slate-900">Recent content</h2>
        <button onClick={() => goto("content")} className="text-sm text-sky-600 hover:text-sky-700">
          See all
        </button>
      </div>
      {recent.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-700 mb-1">No content yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add your first article or review to get started.</p>
          <button onClick={onAdd} className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg">
            <Plus className="w-4 h-4" />
            Add content
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{c.title}</div>
                <div className="text-xs text-slate-500">{formatDate(c.updatedAt)}</div>
              </div>
              <Badge tone={c.status === "ready" ? "green" : "slate"}>{c.status === "ready" ? "Ready" : "Draft"}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
