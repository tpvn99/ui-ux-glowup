#!/usr/bin/env node
// UX audit beyond looks: main action, forms (labels, types, autocomplete, errors), empty states,
// navigation. Each finding comes with a concrete fix. Read-only: it never clicks or submits.
// Journey length (steps to reach a goal) is measured by scenario.mjs.
//
// --context saas|ecommerce|showcase|dashboard|content|app (default: inferred from the page) adds the checks that matter
// for that kind of site; --links also tests every internal link. Findings are sorted by impact.
//
// Usage:
//   node ux.mjs <page | url> [--only mobile] [--context ecommerce] [--links] [--ignore rule,rule] [--json out.json] [--storage-state state.json] [--wait-for "<css>"]

import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { collectUx, uxFindings, formatUx, uxLegend } from "./lib/ux.mjs";

export { uxFindings, formatUx };

export async function ux(target, { route, viewport = "desktop", context = "auto", links = false, ignore = [], ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  try {
    const { page, close } = await openPage(browser, resolveTarget(target).url, VIEWPORTS[viewport], { route, ...options });
    const data = await page.evaluate(collectUx);
    let hrefs = [];
    if (links) hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href.split("#")[0]).filter((h) => h && !/^(mailto|tel|javascript):/i.test(h) && (h.startsWith(location.origin) || h.startsWith("file:"))))].slice(0, 60));
    let broken = [];
    if (links) {
      for (const h of hrefs) {
        if (h.startsWith("file:")) { const f = fileURLToPath(h.split("?")[0]); if (!existsSync(f)) broken.push(`${h.split("/").pop()} (file not found)`); continue; }
        try { const r = await page.request.get(h, { timeout: 8000, maxRedirects: 5 }); if (r.status() >= 400) broken.push(`${new URL(h).pathname} (${r.status()})`); } catch { broken.push(`${new URL(h).pathname} (no response)`); }
      }
    }
    await close();
    const findings = uxFindings(data, { context, ignore });
    const ctx = findings.context;
    const ignored = findings.ignored;
    if (broken.length) findings.unshift({ rule: "broken-internal-link", severity: "error", message: `${broken.length} internal link(s) lead nowhere.`, fix: "Fix the target, redirect the old address, or remove the link.", items: broken.slice(0, 4), impact: "high", kind: "usability" });
    findings.context = ctx;
    findings.ignored = ignored;
    return { viewport, context: ctx, findings };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node ux.mjs <page | url> [--only mobile] [--context auto|saas|ecommerce|showcase|dashboard|content|app] [--links] [--json out.json]");
    process.exit(1);
  }
  try {
    const viewport = flags.only === "mobile" ? "mobile" : "desktop";
    const r = await ux(target, { ...commonOptions(flags), viewport, context: typeof flags.context === "string" ? flags.context : "auto", links: !!flags.links, ignore: typeof flags.ignore === "string" ? flags.ignore.split(",").map((x) => x.trim()) : [] });
    console.log(formatUx(r.findings, viewport));
    if (uxLegend(r.findings)) console.log(uxLegend(r.findings));
    if (flags.json) saveJson(flags.json === true ? "ux.json" : flags.json, r);
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
