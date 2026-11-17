#!/usr/bin/env node
// UX audit beyond looks: main action, forms (labels, types, autocomplete, errors), empty states,
// navigation. Each finding comes with a concrete fix. Read-only: it never clicks or submits.
// Journey length (steps to reach a goal) is measured by scenario.mjs.
//
// Usage:
//   node ux.mjs <page | url> [--only mobile] [--json out.json] [--storage-state state.json] [--wait-for "<css>"]

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectUx, uxFindings, formatUx } from "./lib/ux.mjs";

export { uxFindings, formatUx };

export async function ux(target, { route, viewport = "desktop", ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  try {
    const { page, close } = await openPage(browser, resolveTarget(target).url, VIEWPORTS[viewport], { route, ...options });
    const data = await page.evaluate(collectUx);
    await close();
    return { viewport, findings: uxFindings(data) };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node ux.mjs <page | url> [--only mobile] [--json out.json]");
    process.exit(1);
  }
  try {
    const viewport = flags.only === "mobile" ? "mobile" : "desktop";
    const r = await ux(target, { ...commonOptions(flags), viewport });
    console.log(formatUx(r.findings, viewport));
    if (flags.json) writeFileSync(flags.json === true ? "ux.json" : flags.json, JSON.stringify(r, null, 2));
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
