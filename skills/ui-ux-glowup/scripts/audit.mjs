#!/usr/bin/env node
// Automated UI audit: measures what can be measured objectively, at desktop and mobile widths.
//
// Usage:
//   node audit.mjs <file.html | url> [--json report.json] [--fail-under 32]
//
// Checks contrast (WCAG AA), touch targets, type scale, line length and height, 4px spacing grid,
// radii/shadow/color sprawl, heading structure, alt text, form labels, clickable divs,
// broken/distorted images, lorem ipsum, horizontal overflow, viewport meta.
// Scores the 8 criteria of references/audit.md (1–5 each, /40). Visuals and Content are only
// partly measurable: always complete them with your own visual review of the screenshots.

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain } from "./lib/browser.mjs";
import { collectPageData } from "./lib/probe.mjs";
import { analyze, score, summarizeTokens, CRITERIA } from "./lib/analyze.mjs";

/** Run the audit and return { target, findings, scores, total, max, tokens }. */
export async function audit(target, { route } = {}) {
  const { chromium } = await loadPlaywright();
  const { url } = resolveTarget(target);
  const browser = await chromium.launch();
  try {
    const data = {};
    for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
      const { page, close } = await openPage(browser, url, vp, { route });
      data[vp.label] = await page.evaluate(collectPageData);
      await close();
    }
    const findings = analyze(data.desktop, data.mobile);
    return { target, ...score(findings), findings, tokens: summarizeTokens(data.desktop) };
  } finally {
    await browser.close();
  }
}

const ICON = { error: "✗", warn: "!", info: "·" };

/** Human-readable report, formatted like references/audit.md. */
export function formatReport(result) {
  const lines = [];
  const short = { Hierarchy: "Hierarchy", Typography: "Typography", Spacing: "Spacing", Components: "Components", Visuals: "Visuals*", Content: "Content*", Responsive: "Responsive", Accessibility: "A11y" };
  lines.push(`Automated audit — ${result.target}`);
  lines.push(
    "Audit: " + CRITERIA.map((c) => `${short[c]} ${result.scores[c]}`).join(" · ") + ` → ${result.total}/${result.max}`
  );
  lines.push("(* partly measurable — confirm with a visual review of the screenshots)");
  lines.push("");
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity]);
  if (!sorted.length) lines.push("No automated findings.");
  for (const f of sorted) {
    lines.push(`${ICON[f.severity]} [${f.criterion}] ${f.message}${f.count > f.items.length ? ` (${f.count} total)` : ""}`);
    for (const item of f.items) lines.push(`    ${item}`);
  }
  const t = result.tokens;
  lines.push("");
  lines.push("Measured tokens");
  lines.push(`  Fonts: ${t.fonts.map((f) => `${f.family} ${f.share}%`).join(", ")}`);
  lines.push(`  Type scale (px): ${t.typeScale.join(" / ")}`);
  lines.push(`  Spacing on 4px grid: ${t.gridConformity}% · most used: ${t.spacing.slice(0, 8).map((s) => s.px).join(", ")}`);
  lines.push(`  Radii (px): ${t.radii.map((r) => r.px).join(", ") || "none"}`);
  return lines.join("\n");
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node audit.mjs <file.html | url> [--json report.json] [--fail-under 32]");
    process.exit(1);
  }
  try {
    const result = await audit(target);
    console.log(formatReport(result));
    if (flags.json) writeFileSync(flags.json === true ? "audit.json" : flags.json, JSON.stringify(result, null, 2));
    if (flags["fail-under"] && result.total < Number(flags["fail-under"])) process.exit(2);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
