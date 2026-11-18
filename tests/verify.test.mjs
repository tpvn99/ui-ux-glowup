import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildReport, toMarkdown, toHtml, normalize } from "../skills/ui-ux-glowup/scripts/lib/verify.mjs";
import { collect, save } from "../skills/ui-ux-glowup/scripts/verify.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;

const snap = (o = {}) => ({
  audit: { scores: { Hierarchy: 5, Accessibility: 4 }, total: 40, max: 45, findings: [{ criterion: "Accessibility", severity: "warn", rule: "heading-order", message: "Heading levels skip.", items: [] }, { criterion: "Typography", severity: "info", rule: "accepted", accepted: true, message: "brand", items: [] }] },
  smoke: { results: [{ key: "button|save", label: "Save", tag: "button", effect: "toggles" }], forms: [], errors: [], failedRequests: [] }, smokeFindings: [],
  ux: { findings: [] }, a11y: { findings: [] }, inventory: null, ...o,
});

test("normalize maps every source to a category and drops accepted brand choices", () => {
  const f = normalize(snap({ ux: { findings: [{ rule: "long-form", severity: "warning", message: "m", fix: "f", items: [] }] }, perf: { findings: [{ rule: "lcp-slow", severity: "error", message: "m", fix: "f", items: [] }] } }));
  assert.deepEqual(f.map((x) => `${x.category}:${x.rule}:${x.severity}`).sort(), ["Accessibility:heading-order:warning", "Performance:lcp-slow:error", "UX:long-form:warning"]);
});

test("audit-only report: errors give FAIL, warnings REVIEW, nothing PASS; no before/after columns", () => {
  const a = buildReport({ target: "x", date: "d", after: snap({ a11y: { findings: [{ rule: "keyboard-trap", severity: "error", message: "trap", fix: "f", items: [] }] } }) });
  assert.equal(a.mode, "audit"); assert.equal(a.verdict, "FAIL");
  assert.equal(buildReport({ target: "x", date: "d", after: snap() }).verdict, "REVIEW");
  assert.equal(buildReport({ target: "x", date: "d", after: snap({ audit: { scores: {}, total: 45, max: 45, findings: [] } }) }).verdict, "PASS");
  assert.match(toMarkdown(a), /audit only, nothing was changed/);
});

test("compare: new error or broken control is FAIL, old warnings alone are PASS, an old error that remains is REVIEW, fixed ones are listed", () => {
  const before = snap();
  const after = snap({ audit: { scores: { Hierarchy: 5, Accessibility: 5 }, total: 45, max: 45, findings: [] }, smoke: { results: [{ key: "button|save", label: "Save", tag: "button", effect: "none" }], forms: [], errors: [], failedRequests: [] } });
  const r = buildReport({ target: "x", date: "d", before, after });
  assert.equal(r.verdict, "FAIL");
  assert.deepEqual(r.regressions.map((x) => x.rule), ["control-broken"]);
  assert.deepEqual(r.fixed.map((x) => x.rule), ["heading-order"]);
  const same = buildReport({ target: "x", date: "d", before, after: snap() });
  assert.equal(same.verdict, "PASS"); assert.deepEqual(same.regressions, []);
  const oldError = snap({ a11y: { findings: [{ rule: "keyboard-trap", severity: "error", message: "trap", fix: "f", items: [] }] } });
  assert.equal(buildReport({ target: "x", date: "d", before: oldError, after: oldError }).verdict, "REVIEW");
  const md = toMarkdown(r);
  for (const part of ["Verdict: FAIL", "## Summary by category", "## Visual audit score", "40 → **45 / 45**", "## What was not tested", "Fixed since before", "control-broken"]) assert.ok(md.includes(part), part);
});

test("the HTML export escapes content and carries the same facts", () => {
  const r = buildReport({ target: "<b>x</b>", date: "d", after: snap({ ux: { findings: [{ rule: "r", severity: "error", message: '<script>alert("x")</script>', fix: "", items: [] }] } }) });
  const html = toHtml(r);
  assert.ok(!html.includes("<script>alert") && !html.includes("<b>x</b>"));
  assert.match(html, /Verdict: FAIL/); assert.match(html, /prefers-color-scheme: ?dark/);
});

test("verify on real pages: snapshot, change, check lists the loss; report mode needs no before", { skip }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "glowup-vf-"));
  const page = join(dir, "page.html");
  copyFileSync(fixture("smoke-before.html"), page);
  const before = await collect(page, { fast: true });
  copyFileSync(fixture("smoke-after.html"), page);
  const after = await collect(page, { fast: true });
  const r = buildReport({ target: page, date: "d", before, after });
  assert.equal(r.verdict, "FAIL");
  const rules = r.regressions.map((x) => x.rule);
  for (const x of ["control-missing", "control-broken", "validation-lost", "new-js-error"]) assert.ok(rules.includes(x), `${x} in ${rules}`);
  const out = save(r, join(dir, "report.html"));
  assert.ok(existsSync(out) && readFileSync(out, "utf8").includes("<!doctype html>"));
  const solo = buildReport({ target: page, date: "d", after });
  assert.equal(solo.mode, "audit");
  assert.ok(solo.categories.find((c) => c.name === "Functionality").errors >= 1);
});

test("report order: problems before style, high impact first; style never leads 'Fix first'", async () => {
  const { kindOf } = await import("../skills/ui-ux-glowup/scripts/lib/verify.mjs");
  assert.equal(kindOf("audit", "ai-gradient-text"), "style"); assert.equal(kindOf("audit", "shadows"), "style"); assert.equal(kindOf("audit", "contrast"), "problem"); assert.equal(kindOf("ux", "no-buy-action", "usability"), "usability");
  const s = snap({
    audit: { scores: {}, total: 40, max: 45, findings: [{ criterion: "Visuals", severity: "warn", rule: "ai-gradient-text", message: "gradient", items: [] }, { criterion: "Accessibility", severity: "warn", rule: "heading-order", message: "levels skip", items: [] }] },
    ux: { context: "ecommerce", findings: [{ rule: "buy-no-price", severity: "warning", impact: "high", kind: "usability", message: "no price", fix: "show it", items: [] }, { rule: "no-author", severity: "warning", impact: "low", kind: "usability", message: "no author", fix: "name them", items: [] }] },
  });
  const r = buildReport({ target: "x", date: "d", after: s });
  assert.deepEqual(r.top.map((f) => f.rule), ["buy-no-price", "heading-order", "no-author"]);
  assert.ok(!r.top.some((f) => f.rule === "ai-gradient-text"));
  const md = toMarkdown(r);
  assert.match(md, /UX was checked as a \*\*ecommerce\*\* site/); assert.match(md, /high impact/); assert.match(md, /style, optional/);
});

test("the report shows where the page changed visually, when screenshots were kept", () => {
  const visual = [{ size: 390, percent: 7.2, heightDelta: 12.5, heightBefore: 2000, heightAfter: 2250, regions: [{ y: 80, w: 360, h: 80 }], maskedCells: 2 }];
  const r = buildReport({ target: "x", date: "d", before: snap(), after: snap({ visual }) });
  const md = toMarkdown(r);
  assert.match(md, /## Visual change, before → after/); assert.match(md, /\| 390px \| 7.2% \| 2000 → 2250px \(\+12.5%\) \| y=80px 360×80 \|/);
  assert.ok(!toMarkdown(buildReport({ target: "x", date: "d", after: snap() })).includes("Visual change"));
});
