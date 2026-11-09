import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BODY,
  MAX_IMPORT_FILE_BYTES,
  MAX_TITLE,
  validateContentInput,
  validateImportFile,
  validateImportText,
} from "../validation.ts";

test("import accepts .txt and .md only", () => {
  assert.equal(validateImportFile({ name: "a.txt", size: 10 }).ok, true);
  assert.equal(validateImportFile({ name: "A.MD", size: 10 }).ok, true);
  for (const name of ["a.exe", "a.html", "a.js", "a.pdf", "a", "a.txt.exe"]) {
    assert.equal(validateImportFile({ name, size: 10 }).ok, false, name);
  }
});

test("import rejects empty and oversized files at the 500 KB limit", () => {
  assert.equal(validateImportFile({ name: "a.txt", size: 0 }).ok, false);
  assert.equal(validateImportFile({ name: "a.txt", size: MAX_IMPORT_FILE_BYTES }).ok, true);
  assert.equal(validateImportFile({ name: "a.txt", size: MAX_IMPORT_FILE_BYTES + 1 }).ok, false);
});

test("import suggests a title from the file name", () => {
  const r = validateImportFile({ name: "My Post.md", size: 5 });
  assert.equal(r.ok && r.value.suggestedTitle, "My Post");
});

test("import text rejects binary-looking, empty and oversized text", () => {
  assert.equal(validateImportText("hello").ok, true);
  assert.equal(validateImportText("a\u0000b").ok, false);
  assert.equal(validateImportText("   \n ").ok, false);
  assert.equal(validateImportText("x".repeat(MAX_BODY + 1)).ok, false);
});

test("content input requires title and body and trims", () => {
  assert.equal(validateContentInput({ title: " ", body: "x" }).ok, false);
  assert.equal(validateContentInput({ title: "t", body: "  " }).ok, false);
  const r = validateContentInput({ title: "  T  ", body: " B ", tags: [" A ", "a", "b"] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.title, "T");
    assert.equal(r.value.body, "B");
    assert.deepEqual(r.value.tags, ["a", "b"]);
  }
});

test("content input enforces length and tag limits", () => {
  assert.equal(validateContentInput({ title: "t".repeat(MAX_TITLE + 1), body: "x" }).ok, false);
  assert.equal(validateContentInput({ title: "t", body: "x".repeat(MAX_BODY + 1) }).ok, false);
  const many = Array.from({ length: 11 }, (_, i) => "tag" + i);
  assert.equal(validateContentInput({ title: "t", body: "x", tags: many }).ok, false);
  assert.equal(validateContentInput({ title: "t", body: "x", tags: ["x".repeat(31)] }).ok, false);
});
