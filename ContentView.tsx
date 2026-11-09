"use client";

import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import type { Folio } from "@/lib/useFolio";
import { archiveContent, contentProtection, deleteContent, restoreContent } from "@/lib/ops";
import { Badge, SmallButton, formatDate } from "../ui";

interface Props {
  folio: Folio;
  search: string;
  onAdd: () => void;
  onEdit: (item: ContentItem) => void;
  onPlan: (contentId: string) => void;
  notify: (message: string) => void;
}

export function ContentView({ folio, search, onAdd, onEdit, onPlan, notify }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const q = search.trim().toLowerCase();

  const items = folio.data.content.filter((c) => {
    if ((c.status === "archived") !== showArchived) return false;
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.tags.some((t) => t.includes(q));
  });

  const report = (r: { ok: boolean; error?: string }) => {
    if (!r.ok && r.error) notify(r.error);
  };

  const remove = (item: ContentItem) => {
    if (!window.confirm(`Delete "${item.title}"? This also removes its planned distributions. This cannot be undone.`)) return;
    report(folio.run((d) => deleteContent(d, item.id)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1.5 ${!showArchived ? "bg-sky-600 text-white" : "bg-white text-slate-600"}`}
          >
            Active
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1.5 ${showArchived ? "bg-sky-600 text-white" : "bg-white text-slate-600"}`}
          >
            Archived
          </button>
        </div>
        <span className="text-sm text-slate-500">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-700 mb-1">
            {showArchived ? "Nothing archived" : q ? "No matches" : "No content yet"}
          </h3>
          {!showArchived && !q && (
            <>
              <p className="text-sm text-slate-500 mb-4">Add your first article or review</p>
              <button onClick={onAdd} className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg">
                <Plus className="w-4 h-4" />
                Add content
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const dists = folio.data.distributions.filter((d) => d.contentId === item.id);
            const published = dists.filter((d) => d.status === "published").length;
            const planned = dists.filter((d) => d.status === "planned").length;
            const protection = contentProtection(folio.data, item.id);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2 line-clamp-2">{item.title}</h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.isDemo && <Badge tone="amber">DEMO</Badge>}
                  <Badge tone={item.status === "ready" ? "green" : item.status === "archived" ? "slate" : "blue"}>
                    {item.status === "ready" ? "Ready" : item.status === "archived" ? "Archived" : "Draft"}
                  </Badge>
                  {item.tags.map((t) => (
                    <Badge key={t} tone="violet">
                      {t}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {published} published · {planned} planned · updated {formatDate(item.updatedAt)}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {item.status !== "archived" ? (
                    <>
                      <SmallButton tone="primary" onClick={() => onPlan(item.id)}>
                        Plan distribution
                      </SmallButton>
                      <SmallButton onClick={() => onEdit(item)}>Edit</SmallButton>
                      <SmallButton onClick={() => report(folio.run((d) => archiveContent(d, item.id)))}>Archive</SmallButton>
                    </>
                  ) : (
                    <SmallButton onClick={() => report(folio.run((d) => restoreContent(d, item.id)))}>Restore</SmallButton>
                  )}
                  <SmallButton
                    tone="danger"
                    disabled={!protection.deletable}
                    title={protection.deletable ? "Delete" : protection.reason}
                    onClick={() => remove(item)}
                  >
                    Delete
                  </SmallButton>
                </div>
                {!protection.deletable && <p className="text-xs text-slate-400 mt-2">{protection.reason}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
