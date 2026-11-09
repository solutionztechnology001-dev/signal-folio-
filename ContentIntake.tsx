"use client";

import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Upload, FileText } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import type { OpResult } from "@/lib/ops";
import { validateImportFile, validateImportText } from "@/lib/validation";
import { Modal, inputCls, labelCls } from "./ui";

interface Values {
  title: string;
  body: string;
  tags: string[];
  status?: "draft" | "ready";
}

interface ContentIntakeProps {
  initial?: ContentItem;
  onSubmit: (values: Values) => OpResult;
  onClose: () => void;
}

export function ContentIntake({ initial, onSubmit, onClose }: ContentIntakeProps) {
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<"draft" | "ready">(initial?.status === "ready" ? "ready" : "draft");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    setError("");
    const check = validateImportFile({ name: file.name, size: file.size });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read that file.");
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const textCheck = validateImportText(text);
      if (!textCheck.ok) {
        setError(textCheck.error);
        return;
      }
      setBody(textCheck.value);
      if (!title.trim()) setTitle(check.value.suggestedTitle);
    };
    reader.readAsText(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const submit = () => {
    const result = onSubmit({
      title,
      body,
      tags: tags.split(",").map((t) => t.trim()),
      status: editing ? status : undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <Modal title={editing ? "Edit content" : "Add content"} onClose={onClose}>
      <div
        onDragOver={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          isDragging ? "border-sky-500 bg-sky-50" : "border-slate-300"
        }`}
      >
        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
        <p className="text-sm text-slate-700">
          Import a .txt or .md file (up to 500 KB){" "}
          <span className="hidden sm:inline">or drop it here</span>
        </p>
        <label className="inline-block mt-2 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg cursor-pointer">
          Choose file
          <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onPick} className="hidden" />
        </label>
      </div>

      <div>
        <label className={labelCls}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="e.g. Best budget headphones 2026"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Content</label>
        <textarea
          value={body}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
          rows={8}
          placeholder="Paste your full article or review here..."
          className={`${inputCls} resize-y`}
        />
      </div>

      <div>
        <label className={labelCls}>Tags (optional, comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
          placeholder="headphones, review"
          className={inputCls}
        />
      </div>

      {editing && initial?.status !== "archived" && (
        <div>
          <label className={labelCls}>Status</label>
          <select
            value={status}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value === "ready" ? "ready" : "draft")}
            className={inputCls}
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready to publish</option>
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1 pb-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
          Cancel
        </button>
        <button
          onClick={submit}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {editing ? "Save changes" : "Add to Folio"}
        </button>
      </div>
    </Modal>
  );
}
