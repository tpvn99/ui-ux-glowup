#!/usr/bin/env node
// Automated UI audit: measures what can be measured objectively, at desktop and mobile widths.
//
// Usage:
//   node audit.mjs <file.html | url> [--json report.json] [--fail-under 36]
//                  [--baseline before.json] [--brief] [--max-items 4]
//                  [--allow ai-hero-pill,ai-accent-word,ai-caps-label] [--fast | --deep]
//                  [--storage-state state.json] [--wait-for "css selector"] [--no-dismiss]
//
//   --json       save the full result (use it as the baseline for later runs)
//   --baseline   compact delta vs a saved result: scores before → after, fixed rules, what's still open or new
//   --brief      one line per finding, no explanations (re-audits)
//   --allow      brand choices the user keeps on purpose: reported as "accepted (brand choice)", no penalty
//   --fast       skip the no-JavaScript render (one page load less)
//   --deep       force it on a --baseline re-check (by default a re-check repeats it only when the
//                first audit found no-JS problems)
//
// Pages behind a login: save a session once with login.mjs, then pass --storage-state.
// Or paste scripts/audit.browser.js into the DevTools console of the logged-in tab.
//
// Scores the 9 criteria of references/audit.md (1–5 each, /45): design, mobile, spacing between blocks,
// readability, SEO, AI-look tells and accessibility, at desktop and mobile widths. Visuals and Content are
// only partly measurable: complete them with your own visual review of the screenshots.

import { writeFileSync, readFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectPageData, collectSnapshot } from "./lib/probe.mjs";
import { analyze, score, summarizeTokens } from "./lib/analyze.mjs";
import { formatReport, formatDelta } from "./lib/report.mjs";

export { formatReport, formatDelta };

/** Audit one URL with an already-launched browser (desktop + mobile). */
export async function auditPage(browser, url, { route, target = url, allow = [], noJs = true, ...options } = {}) {
  const data = {};
  for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
    const { page, close } = await openPage(browser, url, vp, { route, ...options });
    data[vp.label] = await page.evaluate(collectPageData);
    if (vp.label === "desktop") data.desktop.snapshot = await page.evaluate(collectSnapshot);
    await close();
  }
  if (noJs) {
    const { page, close } = await openPage(browser, url, VIEWPORTS.desktop, { route, ...options, javaScript: false, dismiss: false });
    data.desktop.noJs = await page.evaluate(collectSnapshot).catch(() => null);
    await close();
  }
  const findings = analyze(data.desktop, data.mobile, { allow });
  return { target, ...score(findings), findings, tokens: summarizeTokens(data.desktop), noJsChecked: Boolean(data.desktop.noJs), hreflang: data.desktop.seo?.hreflang?.length ? data.desktop.seo.hreflang : undefined };
}

const NO_JS_RULES = ["no-js-content-missing", "hidden-until-animated"];

/** Options of the audit CLIs: --allow, and when to pay for the no-JS render. */
export function auditOptions(flags, baseline) {
  const allow = typeof flags.allow === "string" ? flags.allow.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const repeat = baseline ? Boolean(flags.deep) || baseline.findings.some((f) => NO_JS_RULES.includes(f.rule)) : true;
  return { allow, noJs: !flags.fast && repeat };
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
    const baseline = flags.baseline ? JSON.parse(readFileSync(flags.baseline, "utf8")) : null;
    const result = await audit(target, { ...commonOptions(flags), ...auditOptions(flags, baseline) });
    const maxItems = flags["max-items"] ? Number(flags["max-items"]) : undefined;
    if (baseline) console.log(formatDelta(baseline, result, maxItems ? { maxItems } : {}));
    else console.log(formatReport(result, { brief: Boolean(flags.brief), ...(maxItems ? { maxItems } : {}) }));
    if (flags.json) writeFileSync(flags.json === true ? "audit.json" : flags.json, JSON.stringify(result, null, 2));
    if (flags["fail-under"] && result.total < Number(flags["fail-under"])) process.exit(2);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
