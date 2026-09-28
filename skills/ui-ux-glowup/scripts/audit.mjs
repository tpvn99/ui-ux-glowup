#!/usr/bin/env node
// Automated UI audit: measures what can be measured objectively, at desktop and mobile widths.
//
// Usage:
//   node audit.mjs <file.html | url> [--json report.json] [--fail-under 32]
//                  [--storage-state state.json] [--wait-for "css selector"] [--no-dismiss]
//
// Pages behind a login: save a session once with login.mjs, then pass --storage-state.
// Or paste scripts/audit.browser.js into the DevTools console of the logged-in tab.
//
// Checks contrast (WCAG AA), touch targets, type scale, line length and height, 4px spacing grid,
// radii/shadow/color sprawl, heading structure, alt text, form labels, clickable divs,
// broken/distorted images, lorem ipsum, horizontal overflow, viewport meta, numbers and button
// labels that wrap, content hidden in scroll/clip containers, and a non-16px root font-size.
// Scores the 8 criteria of references/audit.md (1–5 each, /40). Visuals and Content are only
// partly measurable: always complete them with your own visual review of the screenshots.

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectPageData } from "./lib/probe.mjs";
import { analyze, score, summarizeTokens } from "./lib/analyze.mjs";
import { formatReport } from "./lib/report.mjs";

export { formatReport };

/** Audit one URL with an already-launched browser (desktop + mobile). */
export async function auditPage(browser, url, { route, target = url, ...options } = {}) {
  const data = {};
  for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
    const { page, close } = await openPage(browser, url, vp, { route, ...options });
    data[vp.label] = await page.evaluate(collectPageData);
    await close();
  }
  const findings = analyze(data.desktop, data.mobile);
  return { target, ...score(findings), findings, tokens: summarizeTokens(data.desktop) };
}

/** Run the audit and return { target, findings, scores, total, max, tokens }. */
export async function audit(target, options = {}) {
  const { chromium } = await loadPlaywright();
  const { url } = resolveTarget(target);
  const browser = await chromium.launch();
  try {
    return await auditPage(browser, url, { ...options, target });
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node audit.mjs <file.html | url> [--json report.json] [--fail-under 32]");
    process.exit(1);
  }
  try {
    const result = await audit(target, commonOptions(flags));
    console.log(formatReport(result));
    if (flags.json) writeFileSync(flags.json === true ? "audit.json" : flags.json, JSON.stringify(result, null, 2));
    if (flags["fail-under"] && result.total < Number(flags["fail-under"])) process.exit(2);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
