"use client";

import { Send, ExternalLink } from "lucide-react";
import type { Distribution } from "@/lib/types";
import type { Folio } from "@/lib/useFolio";
import { deleteDistribution, markFailed, revertToPlanned } from "@/lib/ops";
import { platformName } from "@/lib/platforms";
import { copyText } from "@/lib/browser";
import { Badge, SmallButton, formatDate } from "../ui";

interface Props {
  folio: Folio;
  onPlan: () => void;
  onPublish: (distributionId: string) => void;
  onOutcome: (distributionId: string) => void;
  notify: (message: string) => void;
}

export function DistributeView({ folio, onPlan, onPublish, onOutcome, notify }: Props) {
  const { data } = folio;
  const titleOf = (id: string) => data.content.find((c) => c.id === id)?.title ?? "(deleted content)";
  const bodyOf = (id: string) => data.content.find((c) => c.id === id)?.body ?? "";

  const report = (r: { ok: boolean; error?: string }) => {
    if (!r.ok && r.error) notify(r.error);
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyText(text);
    notify(ok ? `${label} copied.` : "Could not copy. Select the text and copy it by hand.");
  };

  const groups: { key: Distribution["status"]; title: string; note: string }[] = [
    { key: "planned", title: "Planned", note: "Not published yet. Publish it yourself, then mark it." },
    { key: "published", title: "Published (reported by you)", note: "Add the real results when you have them." },
    { key: "failed", title: "Didn't work out", note: "Try again or delete." },
  ];

  const hasAny = data.distributions.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-slate-500">
          Signal Folio does not post for you. Copy your content, publish it on the platform, then come back and mark it published.
        </p>
        <button onClick={onPlan} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg">
          <Send className="w-4 h-4" />
          <span>Plan</span>
        </button>
      </div>

      {!hasAny && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-700 mb-1">Nothing planned yet</h3>
          <p className="text-sm text-slate-500">Plan where you will publish a piece of content, and get a tagged link for it.</p>
        </div>
      )}

      {groups.map((g) => {
        const list = data.distributions.filter((d) => d.status === g.key);
        if (list.length === 0) return null;
        return (
          <section key={g.key} className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">{g.title}</h2>
            <p className="text-xs text-slate-500 mb-3">{g.note}</p>
            <div className="space-y-3">
              {list.map((d) => {
                const outcomeCount = data.outcomes.filter((o) => o.distributionId === d.id).length;
                return (
                  <div key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{titleOf(d.contentId)}</div>
                        <div className="text-xs text-slate-500">{platformName(d.platform)}</div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {d.isDemo && <Badge tone="amber">DEMO</Badge>}
                        <Badge tone={d.status === "published" ? "green" : d.status === "failed" ? "red" : "blue"}>
                          {d.status === "published" ? "Published" : d.status === "failed" ? "Failed" : "Planned"}
                        </Badge>
                      </div>
                    </div>

                    {d.taggedUrl && <p className="text-xs text-slate-600 break-all mt-2">Link for the post: {d.taggedUrl}</p>}
                    {d.status === "published" && d.publishedUrl && (
                      <p className="text-xs mt-2">
                        <a
                          href={d.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 break-all"
                        >
                          {d.publishedUrl}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <span className="text-slate-500"> · {formatDate(d.publishedAt)} · {outcomeCount} result{outcomeCount === 1 ? "" : "s"}</span>
                      </p>
                    )}
                    {d.notes && <p className="text-xs text-slate-500 mt-1">Note: {d.notes}</p>}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {d.status === "planned" && (
                        <>
                          <SmallButton onClick={() => copy(bodyOf(d.contentId), "Post text")}>Copy post text</SmallButton>
                          {d.taggedUrl && <SmallButton onClick={() => copy(d.taggedUrl, "Link")}>Copy link</SmallButton>}
                          <SmallButton tone="primary" onClick={() => onPublish(d.id)}>
                            I published it
                          </SmallButton>
                          <SmallButton
                            onClick={() => {
                              const note = window.prompt("What went wrong? (optional)") ?? "";
                              report(folio.run((x) => markFailed(x, d.id, note)));
                            }}
                          >
                            It failed
                          </SmallButton>
                        </>
                      )}
                      {d.status === "published" && (
                        <>
                          <SmallButton tone="primary" onClick={() => onOutcome(d.id)}>
                            Record a result
                          </SmallButton>
                          <SmallButton onClick={() => report(folio.run((x) => revertToPlanned(x, d.id)))}>Change back to planned</SmallButton>
                        </>
                      )}
                      {d.status === "failed" && (
                        <SmallButton onClick={() => report(folio.run((x) => revertToPlanned(x, d.id)))}>Try again</SmallButton>
                      )}
                      {d.status !== "published" && (
                        <SmallButton
                          tone="danger"
                          onClick={() => {
                            if (window.confirm("Delete this distribution?")) report(folio.run((x) => deleteDistribution(x, d.id)));
                          }}
                        >
                          Delete
                        </SmallButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
