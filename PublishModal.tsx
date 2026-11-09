"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { OpResult } from "@/lib/ops";
import { dateStamp } from "@/lib/browser";
import { Modal, inputCls, labelCls } from "./ui";

interface Props {
  title: string;
  platformLabel: string;
  onSubmit: (input: { publishedUrl: string; publishedAt: string }) => OpResult;
  onClose: () => void;
}

export function PublishModal({ title, platformLabel, onSubmit, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [date, setDate] = useState(dateStamp());
  const [error, setError] = useState("");

  const submit = () => {
    const result = onSubmit({ publishedUrl: url, publishedAt: date });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <Modal title="I published it" subtitle={`${title} on ${platformLabel}`} onClose={onClose}>
      <p className="text-sm text-slate-600">
        Paste the live link of your post. Signal Folio can&apos;t check it, so this is recorded as what you reported.
      </p>
      <div>
        <label className={labelCls}>Live link of the post</label>
        <input
          type="url"
          value={url}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Date published</label>
        <input type="date" value={date} onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1 pb-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
          Cancel
        </button>
        <button onClick={submit} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg">
          Mark as published
        </button>
      </div>
    </Modal>
  );
}
