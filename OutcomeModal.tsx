"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { MetricName } from "@/lib/types";
import type { OpResult, OutcomeInput } from "@/lib/ops";
import { dateStamp } from "@/lib/browser";
import { Modal, inputCls, labelCls } from "./ui";

interface Props {
  distributionId: string;
  title: string;
  platformLabel: string;
  defaultCurrency: string;
  onSubmit: (input: OutcomeInput) => OpResult;
  onClose: () => void;
}

const METRIC_OPTIONS: { id: MetricName; label: string }[] = [
  { id: "impressions", label: "Impressions / views" },
  { id: "clicks", label: "Clicks to your link" },
  { id: "conversions", label: "Conversions / sales" },
  { id: "revenue", label: "Revenue / commission" },
  { id: "cost", label: "Cost (ads, tools, time paid for)" },
];

export function OutcomeModal({ distributionId, title, platformLabel, defaultCurrency, onSubmit, onClose }: Props) {
  const [metric, setMetric] = useState<MetricName>("clicks");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [sourceKind, setSourceKind] = useState<"user-entered" | "estimated">("user-entered");
  const [sourceDetail, setSourceDetail] = useState(`${platformLabel} dashboard`);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(dateStamp());
  const [error, setError] = useState("");

  const isMoney = metric === "revenue" || metric === "cost";

  const submit = () => {
    const trimmed = value.trim();
    const num = trimmed === "" ? NaN : Number(trimmed);
    const result = onSubmit({
      distributionId,
      metric,
      value: num,
      currency: isMoney ? currency : undefined,
      sourceKind,
      sourceDetail,
      uncertaintyNote: note,
      recordedAt: date,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <Modal title="Record a result" subtitle={`${title} on ${platformLabel}`} onClose={onClose}>
      <p className="text-sm text-slate-600">
        Enter a number you got from somewhere real, like a platform dashboard or an affiliate report. Say where it came from.
      </p>
      <div>
        <label className={labelCls}>What are you recording?</label>
        <select value={metric} onChange={(e: ChangeEvent<HTMLSelectElement>) => setMetric(e.target.value as MetricName)} className={inputCls}>
          {METRIC_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={isMoney ? "col-span-2" : "col-span-3"}>
          <label className={labelCls}>Number</label>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            className={inputCls}
          />
        </div>
        {isMoney && (
          <div>
            <label className={labelCls}>Currency</label>
            <input
              value={currency}
              maxLength={3}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrency(e.target.value.toUpperCase())}
              className={inputCls}
            />
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>How sure is this number?</label>
        <select
          value={sourceKind}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourceKind(e.target.value === "estimated" ? "estimated" : "user-entered")}
          className={inputCls}
        >
          <option value="user-entered">I copied it from a report or dashboard</option>
          <option value="estimated">It&apos;s my estimate</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Where did it come from? (required)</label>
        <input
          value={sourceDetail}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSourceDetail(e.target.value)}
          placeholder="e.g. Dev.to dashboard, Amazon Associates report"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Note about accuracy (optional)</label>
        <input value={note} onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Date of the number</label>
        <input type="date" value={date} onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1 pb-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
          Cancel
        </button>
        <button onClick={submit} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg">
          Save result
        </button>
      </div>
    </Modal>
  );
}
