#!/usr/bin/env node
// Automated UI audit: measures what can be measured objectively, at desktop and mobile widths.
//
// Usage:
//   node audit.mjs <file.html | url> [--json report.json] [--fail-under 36]
//                  [--baseline before.json] [--brief] [--max-items 4]
//                  [--storage-state state.json] [--wait-for "css selector"] [--no-dismiss]
//
//   --json       save the full result (use it as the baseline for later runs)
//   --baseline   compact delta vs a saved result: scores before → after, fixed rules, what's still open or new
//   --brief      one line per finding, no explanations (re-audits)
//
// Pages behind a login: save a session once with login.mjs, then pass --storage-state.
// Or paste scripts/audit.browser.js into the DevTools console of the logged-in tab.
//
// Scores the 9 criteria of references/audit.md (1–5 each, /45): design, mobile, spacing between blocks,
// readability, SEO, AI-look tells and accessibility, at desktop and mobile widths. Visuals and Content are
// only partly measurable: complete them with your own visual review of the screenshots.

import { writeFileSync, readFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectPageData } from "./lib/probe.mjs";
import { analyze, score, summarizeTokens } from "./lib/analyze.mjs";
import { formatReport, formatDelta } from "./lib/report.mjs";

export { formatReport, formatDelta };

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
    console.error("Usage: node audit.mjs <file.html | url> [--json report.json] [--baseline before.json] [--brief] [--fail-under 36]");
    process.exit(1);
  }
  try {
    const result = await audit(target, commonOptions(flags));
    const maxItems = flags["max-items"] ? Number(flags["max-items"]) : undefined;
    if (flags.baseline) console.log(formatDelta(JSON.parse(readFileSync(flags.baseline, "utf8")), result, maxItems ? { maxItems } : {}));
    else console.log(formatReport(result, { brief: Boolean(flags.brief), ...(maxItems ? { maxItems } : {}) }));
    if (flags.json) writeFileSync(flags.json === true ? "audit.json" : flags.json, JSON.stringify(result, null, 2));
    if (flags["fail-under"] && result.total < Number(flags["fail-under"])) process.exit(2);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
