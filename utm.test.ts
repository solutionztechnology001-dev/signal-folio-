import test from "node:test";
import assert from "node:assert/strict";
import { buildUtmUrl, isHttpUrl, slugify } from "../utm.ts";

test("slugify makes safe lowercase slugs", () => {
  assert.equal(slugify("  Hello World! "), "hello-world");
  assert.equal(slugify("Café Menu"), "cafe-menu");
  assert.equal(slugify("***"), "");
});

test("isHttpUrl accepts http(s) only", () => {
  assert.equal(isHttpUrl("https://a.com"), true);
  assert.equal(isHttpUrl("http://a.com/x?y=1"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("ftp://a.com"), false);
  assert.equal(isHttpUrl("a.com"), false);
});

test("buildUtmUrl adds parameters and keeps existing query and hash", () => {
  const r = buildUtmUrl("https://shop.com/p?ref=abc#top", {
    source: "Dev.to",
    medium: "article",
    campaign: "Spring Sale",
  });
  assert.ok(r.ok);
  if (r.ok) {
    const u = new URL(r.url);
    assert.equal(u.searchParams.get("ref"), "abc");
    assert.equal(u.searchParams.get("utm_source"), "dev-to");
    assert.equal(u.searchParams.get("utm_medium"), "article");
    assert.equal(u.searchParams.get("utm_campaign"), "spring-sale");
    assert.equal(u.hash, "#top");
  }
});

test("buildUtmUrl includes optional content and term only when given", () => {
  const a = buildUtmUrl("https://a.com", { source: "x", medium: "social", campaign: "c" });
  const b = buildUtmUrl("https://a.com", { source: "x", medium: "social", campaign: "c", content: "v1", term: "kw" });
  assert.ok(a.ok && b.ok);
  if (a.ok && b.ok) {
    assert.equal(new URL(a.url).searchParams.has("utm_content"), false);
    assert.equal(new URL(b.url).searchParams.get("utm_content"), "v1");
    assert.equal(new URL(b.url).searchParams.get("utm_term"), "kw");
  }
});

test("buildUtmUrl overwrites an existing utm_source instead of duplicating it", () => {
  const r = buildUtmUrl("https://a.com/?utm_source=old", { source: "new", medium: "m", campaign: "c" });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(new URL(r.url).searchParams.getAll("utm_source"), ["new"]);
});

test("buildUtmUrl rejects bad links and missing required fields", () => {
  assert.equal(buildUtmUrl("not a url", { source: "a", medium: "b", campaign: "c" }).ok, false);
  assert.equal(buildUtmUrl("javascript:alert(1)", { source: "a", medium: "b", campaign: "c" }).ok, false);
  assert.equal(buildUtmUrl("https://a.com", { source: "", medium: "b", campaign: "c" }).ok, false);
  assert.equal(buildUtmUrl("https://a.com", { source: "a", medium: "***", campaign: "c" }).ok, false);
});
