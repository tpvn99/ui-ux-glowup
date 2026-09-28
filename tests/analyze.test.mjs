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

test("a clean page has no errors and scores the maximum (5 per criterion)", () => {
  const findings = analyze(page(), page({ viewport: { width: 390, height: 844 } }));
  assert.deepEqual(findings.filter((f) => f.severity !== "info"), []);
  const s = score(findings);
  assert.equal(s.total, CRITERIA.length * 5);
  assert.equal(CRITERIA.length, 9);
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
  assert.ok(score(analyze(bad, bad)).total < CRITERIA.length * 5 - 8);
});

test("inline text links are exempt from target size", () => {
  const p = page({ interactive: [{ sel: "p > a", tag: "a", width: 40, height: 18, inline: true, hasName: true, clickableNonInteractive: false, text: "terms" }] });
  assert.equal(analyze(p, p).filter((f) => f.rule.startsWith("tap-target")).length, 0);
});

test("wrapped numbers, wrapped buttons and clipped content are reported (v1.2 rules)", () => {
  const mobile = page({
    viewport: { width: 390, height: 844 },
    texts: [text(), text({ sel: "div > p", text: "+1 314 €", chars: 8, isNumber: true, lines: 2 })],
    interactive: [{ sel: "button.pill", tag: "button", width: 70, height: 48, inline: false, hasName: true, clickableNonInteractive: false, text: "1 en cours", lines: 2 }],
    clipped: [
      { sel: "div.scroll", hiddenPx: 262, scrollable: true, examples: ["Profit"], hiddenCount: 3 },
      { sel: "div.clip", hiddenPx: 300, scrollable: false, examples: ["Statut"], hiddenCount: 1 },
    ],
  });
  const rules = new Set(analyze(page(), mobile).map((f) => f.rule));
  for (const r of ["wrapped-number", "wrapped-control", "hidden-scroll-content", "clipped-content"]) assert.ok(rules.has(r), r);
});

test("a single-line amount is not a wrap", () => {
  const p = page({ texts: [text({ text: "+1 314 €", chars: 8, isNumber: true, lines: 1 })] });
  assert.equal(analyze(p, p).filter((f) => f.rule === "wrapped-number").length, 0);
});

test("root font-size ≠ 16px is reported as the root cause instead of a generic grid warning", () => {
  const p = page({ rootFontSize: 15, spacing: [7.5, 11.25, 15, 22.5, 3.75, 30] });
  const f = analyze(p, p);
  const root = f.find((x) => x.rule === "root-font-size");
  assert.ok(root, "root-font-size finding");
  assert.equal(root.severity, "error");
  assert.match(root.message, /15px/);
  assert.equal(f.filter((x) => x.rule === "spacing-grid").length, 0);
});

test("mobile interaction rules: zoom, input zoom, crowded taps, overlays, carousels (v1.3)", () => {
  const mobile = page({
    viewport: { width: 390, height: 844 },
    mobile: {
      zoomBlocked: true,
      smallInputs: [{ sel: "input#email", fontSize: 14 }],
      crowded: [{ sel: "button.prev", text: "‹", other: "button.next", gap: 2 }],
      overlays: [{ sel: "div.cookie", coverage: 45, position: "fixed" }],
      touchBlockers: ["div.map"],
      carousels: [{ sel: "div.track", kind: "native", snap: false, items: 4, controls: 2, namedControls: 0, smallControls: 2, indicators: 0 }],
    },
  });
  const rules = new Set(analyze(page(), mobile).map((f) => f.rule));
  for (const r of ["zoom-blocked", "input-zoom", "tap-crowded", "fixed-overlay", "touch-blocked", "carousel-snap", "carousel-controls", "carousel-small-controls"]) assert.ok(rules.has(r), r);
  const ok = page({ viewport: { width: 390, height: 844 }, mobile: { zoomBlocked: false, smallInputs: [], crowded: [], overlays: [{ sel: "nav.cta", coverage: 9, position: "fixed" }], touchBlockers: [], carousels: [{ sel: "ul.snap", kind: "native", snap: true, items: 5, controls: 2, namedControls: 2, smallControls: 0, indicators: 5 }] } });
  assert.deepEqual(analyze(page(), ok).filter((f) => f.severity !== "info"), []);
});

test("section spacing: tight gaps and uneven rhythm are reported (v1.3)", () => {
  const d = page({ sectionGaps: [{ between: ["section.hero", "section.features"], gap: 8 }, { between: ["section.features", "section.pricing"], gap: 40 }, { between: ["section.pricing", "section.faq"], gap: 48 }, { between: ["section.faq", "footer"], gap: 160 }] });
  const rules = new Set(analyze(d, page({ viewport: { width: 390, height: 844 } })).map((f) => f.rule));
  assert.ok(rules.has("section-gap-desktop"));
  assert.ok(rules.has("section-rhythm"));
});

test("SEO rules: missing title/description, noindex, OG, favicon, heavy images (v1.3)", () => {
  const d = page({
    seo: { title: "", description: "", robots: "noindex", ogTitle: "", ogImage: "", favicon: false, canonical: "", jsonLd: false, words: 400 },
    images: [
      { sel: "img", src: "a.jpg", format: "jpg", naturalWidth: 3000, renderedWidth: 600, hasAlt: true, hasDimensions: true, broken: false, naturalRatio: 1.5, renderedRatio: 1.5, objectFit: "cover", lazy: false, belowFold: true },
      { sel: "img", src: "b.png", format: "png", naturalWidth: 1600, renderedWidth: 800, hasAlt: true, hasDimensions: true, broken: false, naturalRatio: 1.5, renderedRatio: 1.5, objectFit: "cover", lazy: false, belowFold: true },
    ],
  });
  const findings = analyze(d, page({ viewport: { width: 390, height: 844 } }));
  const rules = new Set(findings.map((f) => f.rule));
  for (const r of ["seo-title", "seo-description", "seo-noindex", "seo-open-graph", "seo-favicon", "image-format", "image-oversized", "image-lazy"]) assert.ok(rules.has(r), r);
  assert.ok(score(findings).scores.SEO <= 2);
  const good = page({ seo: { title: "Emergency plumber in Leeds, 24/7 — Hollis", description: "Same-day boiler and leak repairs across Leeds. Fixed prices, 12-month guarantee and 4.9/5 from 127 reviews. Call or book online in two minutes.", robots: "", ogTitle: "x", ogImage: "x", favicon: true, canonical: "x", jsonLd: true, words: 600 } });
  assert.deepEqual(analyze(good, page({ viewport: { width: 390, height: 844 } })).filter((f) => f.category === "SEO"), []);
});

test("readability rules: long paragraphs, long sentences, justified and uppercase text (v1.3)", () => {
  const d = page({ readability: [
    { sel: "p.intro", words: 140, avgSentence: 35, justified: true, uppercase: false, text: "We are" },
    { sel: "p.legal", words: 20, avgSentence: 10, justified: false, uppercase: true, text: "TERMS" },
  ] });
  const rules = new Set(analyze(d, page({ viewport: { width: 390, height: 844 } })).map((f) => f.rule));
  for (const r of ["long-paragraphs", "long-sentences", "justified-text", "uppercase-text"]) assert.ok(rules.has(r), r);
});

test("AI-look rules: gradients, glass, radii, identical cards, emoji, clichés (v1.3)", () => {
  const d = page({ aiLook: { gradients: ["section.hero"], glass: 5, bigRadius: 8, radiusElements: 10, bigRadiusSample: ["div.card 32px"], identicalCards: ["div.features (3 cards)"], emoji: ["h2 \"Why us 🚀\""], cliches: ["Transform your workflow"], centeredShare: 90 } });
  const rules = new Set(analyze(d, page({ viewport: { width: 390, height: 844 } })).map((f) => f.rule));
  for (const r of ["ai-gradient", "ai-glass", "ai-radius", "ai-identical-cards", "ai-emoji", "ai-cliche", "ai-centered"]) assert.ok(rules.has(r), r);
  const clean = page({ aiLook: { gradients: [], glass: 1, bigRadius: 1, radiusElements: 10, bigRadiusSample: [], identicalCards: [], emoji: [], cliches: [], centeredShare: 30 } });
  assert.equal(analyze(clean, page({ viewport: { width: 390, height: 844 } })).filter((f) => f.rule.startsWith("ai-")).length, 0);
});
