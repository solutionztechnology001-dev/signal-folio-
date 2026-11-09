export const MAX_TITLE = 200;
export const MAX_BODY = 200_000;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
export const MAX_IMPORT_FILE_BYTES = 512_000; // 500 KB text file import
export const MAX_JSON_IMPORT_BYTES = 5_000_000; // JSON backup import

export interface ContentInput {
  title: string;
  body: string;
  tags: string[];
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const tag = t.trim().toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

export function validateContentInput(input: {
  title: string;
  body: string;
  tags?: string[];
}): ValidationResult<ContentInput> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Content is required." };
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `Title must be ${MAX_TITLE} characters or fewer.` };
  }
  if (body.length > MAX_BODY) {
    return { ok: false, error: `Content must be ${MAX_BODY.toLocaleString("en-US")} characters or fewer.` };
  }
  if (body.includes("\u0000") || title.includes("\u0000")) {
    return { ok: false, error: "Content contains invalid characters." };
  }
  const tags = normalizeTags(input.tags ?? []);
  if (tags.length > MAX_TAGS) {
    return { ok: false, error: `Use at most ${MAX_TAGS} tags.` };
  }
  if (tags.some((t) => t.length > MAX_TAG_LENGTH)) {
    return { ok: false, error: `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.` };
  }
  return { ok: true, value: { title, body, tags } };
}

// Checks a text file chosen for import. Files are only ever read as text.
// They are never executed or rendered as HTML.
export function validateImportFile(file: {
  name: string;
  size: number;
}): ValidationResult<{ suggestedTitle: string }> {
  const lower = file.name.toLowerCase();
  const isTxt = lower.endsWith(".txt");
  const isMd = lower.endsWith(".md");
  if (!isTxt && !isMd) {
    return { ok: false, error: "Only .txt and .md files can be imported." };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, error: "That file is larger than 500 KB. Split it or paste the text instead." };
  }
  return {
    ok: true,
    value: { suggestedTitle: file.name.replace(/\.(txt|md)$/i, "") },
  };
}

export function validateImportText(text: string): ValidationResult<string> {
  if (text.includes("\u0000")) {
    return { ok: false, error: "That file does not look like plain text." };
  }
  if (text.length > MAX_BODY) {
    return { ok: false, error: `That file has more than ${MAX_BODY.toLocaleString("en-US")} characters.` };
  }
  if (!text.trim()) return { ok: false, error: "That file is empty." };
  return { ok: true, value: text };
}
