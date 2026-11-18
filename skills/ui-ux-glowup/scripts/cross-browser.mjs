#!/usr/bin/env node
// Opens the page in Chromium, Firefox and WebKit (Safari's engine) at desktop and phone width, and
// reports what differs: JavaScript errors, horizontal scroll, page height, heading wrapping, broken
// images, CSS the engine doesn't support. Saves one screenshot per engine and width.
// Chromium is the reference; engines that are not installed are listed, not failed.
//
// Usage:
//   node cross-browser.mjs <page | url> [--browsers chromium,firefox,webkit] [--out shots] [--json out.json]
//   Install the engines once: npx playwright install firefox webkit

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VIEWPORTS, ENGINES, loadPlaywright, launchBrowser, trackPageErrors, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { collectLayout, crossFindings, formatCross } from "./lib/crossbrowser.mjs";

export { crossFindings, formatCross };

export async function crossBrowser(target, { engines = ENGINES, out = "shots", route, ...options } = {}) {
  const pw = await loadPlaywright();
  const { url, name } = resolveTarget(target);
  mkdirSync(out, { recursive: true });
  const results = {};
  const missing = [];
  const files = [];
  for (const engine of engines) {
    let browser;
    try {
      browser = await launchBrowser(pw, engine);
    } catch (e) {
      if (/not installed/.test(e.message)) { missing.push(engine); continue; }
      throw e;
    }
    results[engine] = {};
    try {
      for (const vp of ["desktop", "mobile"]) {
        const errors = [];
        const { page, close } = await openPage(browser, url, VIEWPORTS[vp], { route, ...options, onPage: (p) => trackPageErrors(p, url, (m) => errors.push(m)) });
        const layout = await page.evaluate(collectLayout);
        const file = join(out, `${name}-${engine}-${vp}.png`);
        await page.screenshot({ path: file, fullPage: true }).catch(() => {});
        files.push(file);
        results[engine][vp] = { errors, layout };
        await close();
      }
    } finally {
      await browser.close();
    }
  }
  return { results, missing, files, findings: crossFindings(results) };
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node cross-browser.mjs <page | url> [--browsers chromium,firefox,webkit] [--out shots] [--json out.json]");
    process.exit(1);
  }
  try {
    const engines = typeof flags.browsers === "string" ? flags.browsers.split(",").map((s) => s.trim()) : ENGINES;
    const r = await crossBrowser(target, { ...commonOptions(flags), engines, out: typeof flags.out === "string" ? flags.out : "shots" });
    console.log(formatCross(r.findings, Object.keys(r.results), r.missing, r.files));
    if (flags.json) saveJson(flags.json === true ? "cross-browser.json" : flags.json, r);
    process.exit(r.findings.some((f) => f.severity === "error") || !Object.keys(r.results).length ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
