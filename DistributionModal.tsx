"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { ContentItem, UtmParams } from "@/lib/types";
import type { OpResult } from "@/lib/ops";
import { PLATFORMS, platformInfo } from "@/lib/platforms";
import { buildUtmUrl, slugify } from "@/lib/utm";
import { Modal, inputCls, labelCls } from "./ui";

interface Props {
  contents: ContentItem[];
  initialContentId?: string;
  onSubmit: (input: {
    contentId: string;
    platform: string;
    destinationUrl: string;
    utm: UtmParams | null;
    notes: string;
  }) => OpResult;
  onClose: () => void;
}

export function DistributionModal({ contents, initialContentId, onSubmit, onClose }: Props) {
  const [contentId, setContentId] = useState(initialContentId ?? contents[0]?.id ?? "");
  const [platform, setPlatform] = useState("devto");
  const [destination, setDestination] = useState("");
  const [useUtm, setUseUtm] = useState(true);
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [touched, setTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selected = contents.find((c) => c.id === contentId);

  // Sensible defaults for the UTM fields, until the user edits them.
  useEffect(() => {
    if (touched) return;
    const info = platformInfo(platform);
    setSource(platform);
    setMedium(info?.utmMedium ?? "referral");
    setCampaign(selected ? slugify(selected.title) : "");
  }, [platform, contentId, touched, selected]);

  const utm: UtmParams = {
    source,
    medium,
    campaign,
    content: utmContent || undefined,
    term: utmTerm || undefined,
  };
  const preview = destination.trim() && useUtm ? buildUtmUrl(destination, utm) : null;

  const submit = () => {
    setError("");
    const result = onSubmit({
      contentId,
      platform,
      destinationUrl: destination,
      utm: destination.trim() && useUtm ? utm : null,
      notes,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  if (contents.length === 0) {
    return (
      <Modal title="Plan a distribution" onClose={onClose}>
        <p className="text-sm text-slate-600">Add some content first, then you can plan where to publish it.</p>
      </Modal>
    );
  }

  return (
    <Modal title="Plan a distribution" subtitle="You publish by hand. Signal Folio does not post anything." onClose={onClose}>
      <div>
        <label className={labelCls}>Content</label>
        <select value={contentId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setContentId(e.target.value)} className={inputCls}>
          {contents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Where will you publish it?</label>
        <select value={platform} onChange={(e: ChangeEvent<HTMLSelectElement>) => setPlatform(e.target.value)} className={inputCls}>
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.desc})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Link to put inside the post (optional)</label>
        <input
          type="url"
          value={destination}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDestination(e.target.value)}
          placeholder="https://yoursite.com/product-page"
          className={inputCls}
        />
      </div>

      {destination.trim() && (
        <div className="space-y-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={useUtm} onChange={(e: ChangeEvent<HTMLInputElement>) => setUseUtm(e.target.checked)} className="w-4 h-4" />
            Add UTM tags to this link
          </label>
          {useUtm && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Source</label>
                  <input
                    value={source}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setTouched(true);
                      setSource(e.target.value);
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Medium</label>
                  <input
                    value={medium}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setTouched(true);
                      setMedium(e.target.value);
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Campaign</label>
                  <input
                    value={campaign}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setTouched(true);
                      setCampaign(e.target.value);
                    }}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Content (optional)</label>
                  <input value={utmContent} onChange={(e: ChangeEvent<HTMLInputElement>) => setUtmContent(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Term (optional)</label>
                  <input value={utmTerm} onChange={(e: ChangeEvent<HTMLInputElement>) => setUtmTerm(e.target.value)} className={inputCls} />
                </div>
              </div>
              {preview && preview.ok && <p className="text-xs text-slate-600 break-all">Tagged link: {preview.url}</p>}
              {preview && !preview.ok && <p className="text-xs text-red-600">{preview.error}</p>}
              <p className="text-xs text-slate-500">
                UTM tags only label the link. You see the clicks in analytics on the page it points to. Links from affiliate
                networks may ignore or strip these tags, so check before relying on them.
              </p>
            </>
          )}
        </div>
      )}

      <div>
        <label className={labelCls}>Notes (optional)</label>
        <input value={notes} onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)} className={inputCls} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1 pb-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
          Cancel
        </button>
        <button onClick={submit} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg">
          Save plan
        </button>
      </div>
    </Modal>
  );
}
