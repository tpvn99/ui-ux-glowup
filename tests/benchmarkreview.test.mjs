import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSheet, readSheet, applyReview } from "../benchmark/review-sheet.mjs";

const results = [
  { id: "shop", clean: [{ key: "perf:heavy-library", severity: "warning", count: 1, label: "by-design", note: "Tailwind from a CDN" }, { key: "smoke:empty-link", severity: "warning", count: 3, label: "valid", note: "href=#" }] },
  { id: "app", clean: [{ key: "smoke:dead-control", severity: "warning", count: 1, label: "false-positive", note: "fixed" }] },
];

test("the sheet lists every clean-page finding with what the tool said and the AI's label", () => {
  const s = buildSheet(results, {});
  assert.equal((s.match(/^### /gm) || []).length, 3);
  assert.match(s, /### 2\. shop · `smoke:empty-link` \(warning, ×3\)/);
  assert.match(s, /A link points nowhere/); assert.match(s, /\*\*Label:\*\* by-design — Tailwind from a CDN/);
  assert.match(s, /labelled by an AI agent, which is not a review/);
});

test("ticks are read; an untouched or doubly ticked item is skipped", () => {
  let s = buildSheet(results, {});
  s = s.replace("### 1. shop · `perf:heavy-library` (warning)\n\n**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).\n\n**Label:** by-design — Tailwind from a CDN\n\n- [ ] I agree", "### 1. shop · `perf:heavy-library` (warning)\n\n**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).\n\n**Label:** by-design — Tailwind from a CDN\n\n- [x] I agree");
  s = s.replace(/(### 2\.[\s\S]*?- \[ \] I disagree[\s\S]*?- Comment: )/, (m) => m.replace("- [ ] I disagree", "- [x] I disagree").replace("- Comment: ", "- Comment: placeholder links are a real defect"));
  s = s.replace(/(### 3\.[\s\S]*?)- \[ \] I agree\n- \[ \] I disagree/, "$1- [x] I agree\n- [x] I disagree");
  const a = readSheet(s);
  assert.deepEqual(a.map((x) => [x.project, x.key, x.verdict]), [["shop", "perf:heavy-library", "agree"], ["shop", "smoke:empty-link", "disagree"]]);
  assert.equal(a[1].comment, "placeholder links are a real defect");
});

test("applying answers: a disagreement flips the label, every answered item becomes human-reviewed", () => {
  const labels = { "shop:perf:heavy-library": { label: "by-design", note: "n" }, "shop:smoke:empty-link": "valid", "app:smoke:dead-control": { label: "false-positive" } };
  const next = applyReview([
    { project: "shop", key: "perf:heavy-library", verdict: "agree", comment: "" },
    { project: "shop", key: "smoke:empty-link", verdict: "disagree", comment: "intended" },
    { project: "app", key: "smoke:dead-control", verdict: "disagree", comment: "" },
  ], labels);
  assert.equal(next["shop:perf:heavy-library"].label, "by-design"); assert.equal(next["shop:perf:heavy-library"].reviewedBy, "human");
  assert.equal(next["shop:smoke:empty-link"].label, "false-positive"); assert.equal(next["shop:smoke:empty-link"].humanComment, "intended");
  assert.equal(next["app:smoke:dead-control"].label, "valid");
  assert.equal(labels["shop:smoke:empty-link"], "valid", "the input is not mutated");
});

const tick = (sheet, n, ...boxes) => sheet.replace(new RegExp(`(### ${n}\\.[\\s\\S]*?)(?=\\n### |$)`), (block) => boxes.reduce((b, box) => b.replace(`[ ] ${box}`, `[x] ${box}`), block));

test("severity and recommendation are optional, at most one tick each, and stored apart from the verdict", () => {
  let s = buildSheet(results, {});
  assert.match(s, /how bad is it\? \(optional\) \[ \] minor  \[ \] major  \[ \] critical/);
  assert.match(s, /\[ \] relevant  \[ \] not relevant/);
  s = tick(s, 1, "I agree", "major", "not relevant");
  s = tick(s, 2, "I disagree", "minor", "major");
  const a = readSheet(s);
  assert.equal(a[0].severity, "major"); assert.equal(a[0].recommendation, "not-relevant");
  assert.equal(a[1].severity, undefined, "two severities ticked: ignored");
  const next = applyReview(a, {});
  assert.equal(next["shop:perf:heavy-library"].humanSeverity, "major");
  assert.equal(next["shop:perf:heavy-library"].recommendation, "not-relevant");
  assert.equal(next["shop:smoke:empty-link"].humanSeverity, undefined);
});
