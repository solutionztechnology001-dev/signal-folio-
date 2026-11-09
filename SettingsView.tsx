"use client";

import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { StoreData } from "@/lib/types";
import type { Folio } from "@/lib/useFolio";
import { applyImport, exportJson, parseImport } from "@/lib/store-core";
import { loadDemo, removeDemo, setCurrency, eraseAll } from "@/lib/ops";
import { downloadText, dateStamp } from "@/lib/browser";
import { Banner, SmallButton, inputCls, labelCls } from "../ui";

interface Props {
  folio: Folio;
  notify: (message: string) => void;
}

interface Pending {
  fileName: string;
  data: StoreData;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-6 mb-5">
      <h2 className="text-base font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SettingsView({ folio, notify }: Props) {
  const { data } = folio;
  const [pending, setPending] = useState<Pending | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [currency, setCurrencyValue] = useState(data.settings.currency);
  const hasDemo = data.content.some((c) => c.isDemo);

  const exportAll = () => {
    downloadText(`signal-folio-backup-${dateStamp()}.json`, exportJson(data));
    notify("Backup downloaded.");
  };

  const onPickBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setPending(null);
    setImportErrors([]);
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setImportErrors(["Could not read that file."]);
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseImport(text);
      if (!parsed.ok) {
        setImportErrors(parsed.errors);
        return;
      }
      setPending({ fileName: file.name, data: parsed.data });
    };
    reader.readAsText(file);
  };

  const applyPending = (mode: "merge" | "replace") => {
    if (!pending) return;
    if (mode === "replace" && !window.confirm("Replace ALL current data with this backup? Download a backup of your current data first if you are not sure.")) {
      return;
    }
    const result = applyImport(data, pending.data, mode);
    const saved = folio.replaceAll(result.data);
    if (!saved.ok) {
      notify(saved.error);
      return;
    }
    const s = result.summary;
    notify(
      mode === "merge"
        ? `Merged: ${s.contentAdded} content, ${s.distributionsAdded} distributions, ${s.outcomesAdded} results added. ${s.contentSkipped + s.distributionsSkipped + s.outcomesSkipped} skipped (already here or incomplete).`
        : "Backup restored."
    );
    setPending(null);
  };

  const run = (fn: Parameters<Folio["run"]>[0], okMessage?: string) => {
    const r = folio.run(fn);
    if (!r.ok) notify(r.error);
    else if (okMessage) notify(okMessage);
  };

  const downloadOldBackup = () => {
    const raw = folio.getBackupRaw();
    if (raw === null) {
      notify("No old data backup found.");
      return;
    }
    downloadText(`signal-folio-old-data-${dateStamp()}.json`, raw);
  };

  return (
    <div className="max-w-2xl">
      <Section title="Your data">
        <p className="text-sm text-slate-600">
          Everything is stored in this browser on this device only. There is no account and no server. Clearing your browser
          data, or switching browser or device, loses it unless you keep a backup.
        </p>
        <div className="flex flex-wrap gap-2">
          <SmallButton tone="primary" onClick={exportAll}>
            Download backup (JSON)
          </SmallButton>
        </div>
      </Section>

      <Section title="Restore from a backup">
        <label className="inline-block px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg cursor-pointer">
          Choose backup file
          <input type="file" accept=".json,application/json" onChange={onPickBackup} className="hidden" />
        </label>
        {importErrors.length > 0 && (
          <Banner tone="error">
            <div className="font-medium mb-1">That file can&apos;t be imported.</div>
            <ul className="list-disc pl-5">
              {importErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Banner>
        )}
        {pending && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="mb-2">
              <strong>{pending.fileName}</strong> contains {pending.data.content.length} content item(s),{" "}
              {pending.data.distributions.length} distribution(s) and {pending.data.outcomes.length} result(s).
            </p>
            <div className="flex flex-wrap gap-2">
              <SmallButton tone="primary" onClick={() => applyPending("merge")}>
                Merge (keep what I have)
              </SmallButton>
              <SmallButton tone="danger" onClick={() => applyPending("replace")}>
                Replace everything
              </SmallButton>
              <SmallButton onClick={() => setPending(null)}>Cancel</SmallButton>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Merge adds new records and never overwrites existing ones. Replace swaps your data for the backup.
            </p>
          </div>
        )}
      </Section>

      <Section title="Currency">
        <div className="flex items-end gap-2">
          <div className="w-28">
            <label className={labelCls}>Default</label>
            <input
              value={currency}
              maxLength={3}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrencyValue(e.target.value.toUpperCase())}
              className={inputCls}
            />
          </div>
          <SmallButton onClick={() => run((d) => setCurrency(d, currency), "Currency saved.")}>Save</SmallButton>
        </div>
        <p className="text-xs text-slate-500">Used as the default when you record revenue or costs. Different currencies are never added together.</p>
      </Section>

      <Section title="Demo data">
        <p className="text-sm text-slate-600">
          Demo data shows what the app looks like with records in it. It is clearly marked DEMO, the numbers are made up, and it
          is left out of your real totals.
        </p>
        <div className="flex flex-wrap gap-2">
          {!hasDemo ? (
            <SmallButton onClick={() => run((d) => loadDemo(d), "Demo data loaded.")}>Load demo data</SmallButton>
          ) : (
            <SmallButton onClick={() => run((d) => removeDemo(d), "Demo data removed.")}>Remove demo data</SmallButton>
          )}
        </div>
      </Section>

      {folio.hasLegacyBackup && (
        <Section title="Data from the older version">
          <p className="text-sm text-slate-600">
            A copy of your data from before the upgrade is kept in this browser. The old clicks, conversions and commissions in it
            were simulated.
          </p>
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={downloadOldBackup}>Download old data</SmallButton>
            <SmallButton
              tone="danger"
              onClick={() => {
                if (window.confirm("Delete the old-data copy from this browser? Download it first if you want to keep it.")) {
                  folio.discardBackup();
                  notify("Old data copy deleted.");
                }
              }}
            >
              Delete old data copy
            </SmallButton>
          </div>
        </Section>
      )}

      <Section title="Erase everything">
        <p className="text-sm text-slate-600">Removes all content, distributions and results from this browser. This cannot be undone.</p>
        <SmallButton
          tone="danger"
          onClick={() => {
            if (window.confirm("Erase ALL data in Signal Folio? Download a backup first if you might want it back.")) {
              run((d) => eraseAll(d), "All data erased.");
            }
          }}
        >
          Erase all data
        </SmallButton>
      </Section>
    </div>
  );
}
