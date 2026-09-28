import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, score, gridConformity, onGrid, bodyFontSize, contrastIssues, CRITERIA } from "../skills/ui-ux-glowup/scripts/lib/analyze.mjs";

const text = (over = {}) => ({
  sel: "p", tag: "p", text: "Hello", chars: 120, fontSize: 16, fontWeight: 400, lineHeight: 26,
  letterSpacing: 0, fontFamily: "Inter", color: [24, 24, 27, 1], opacity: 1, bgLayers: [[255, 255, 255, 1]], bgImage: false, width: 600, ...over,
});

const page = (over = {}) => ({
  url: "file:///x.html", viewport: { width: 1440, height: 900 }, title: "Page", lang: "en",
  hasViewportMeta: true, hasDescription: true, overflowX: 0, pageHeight: 2000, lorem: false, vagueLinks: 0,
  texts: [text(), text({ sel: "h1", tag: "h1", fontSize: 56, chars: 30, fontWeight: 600 })],
  interactive: [{ sel: "a.btn", tag: "a", width: 160, height: 44, inline: false, hasName: true, clickableNonInteractive: false, text: "Get a quote" }],
  images: [], fields: [],
  headings: [{ level: 1, text: "Title", fontSize: 56, letterSpacing: -1.5, lineHeight: 60 }],
  paragraphs: [{ sel: "p", fontSize: 16, lineHeight: 26, measure: 64 }],
  spacing: [8, 16, 24, 32, 64, 96, 12, 6], radii: [8, 8, 12], shadows: [],
  ...over,
});

test("grid: 4px multiples and 2px half-steps under 16px are on-grid", () => {
  assert.ok(onGrid(24));
  assert.ok(onGrid(6));
  assert.ok(!onGrid(18));
  assert.ok(!onGrid(13));
  assert.equal(gridConformity([8, 16, 13, 6]), 0.75);
});

test("bodyFontSize prefers paragraphs", () => {
  assert.equal(bodyFontSize(page()), 16);
});

test("a clean page has no errors and scores 40/40", () => {
  const findings = analyze(page(), page({ viewport: { width: 390, height: 844 } }));
  assert.deepEqual(findings.filter((f) => f.severity !== "info"), []);
  const s = score(findings);
  assert.equal(s.total, 40);
  assert.deepEqual(Object.keys(s.scores), CRITERIA);
});

test("contrast failures are detected, text over images is skipped", () => {
  const texts = [text({ color: [187, 187, 187, 1] }), text({ color: [187, 187, 187, 1], bgImage: true, sel: "hero p" })];
  const issues = contrastIssues(texts);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].sel, "p");
  assert.ok(issues[0].ratio < 4.5);
});

test("detects the classic problems", () => {
  const bad = page({
    lang: "",
    lorem: true,
    hasViewportMeta: false,
    overflowX: 120,
    headings: [{ level: 2, text: "Transform your X", fontSize: 26, letterSpacing: 0, lineHeight: 30 }],
    images: [{ sel: "img", src: "a.png", hasAlt: false, hasDimensions: false, broken: false, naturalRatio: 2, renderedRatio: 1, objectFit: "fill" }],
    fields: [{ sel: "input", labelled: false }],
    interactive: [{ sel: "div.btn", tag: "div", width: 20, height: 18, inline: false, hasName: true, clickableNonInteractive: true, text: "Go" }],
    spacing: [11, 13, 21, 37, 5, 7],
  });
  const rules = new Set(analyze(bad, bad).map((f) => f.rule));
  for (const r of ["h1-missing", "lorem", "viewport-meta", "overflow", "img-alt", "form-labels", "clickable-div", "tap-target-min", "spacing-grid", "distorted-images", "lang"]) {
    assert.ok(rules.has(r), `expected rule ${r}`);
  }
  assert.ok(score(analyze(bad, bad)).total < 32);
});

test("inline text links are exempt from target size", () => {
  const p = page({ interactive: [{ sel: "p > a", tag: "a", width: 40, height: 18, inline: true, hasName: true, clickableNonInteractive: false, text: "terms" }] });
  assert.equal(analyze(p, p).filter((f) => f.rule.startsWith("tap-target")).length, 0);
});
