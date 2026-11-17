#!/usr/bin/env node
// Compares several pages of one site: fonts, heading scale, header and footer links, primary button,
// colors, content width, radius, title pattern. Pages that look or behave differently are listed with the
// values and the pages concerned. Read-only. Reading pages (article) may legitimately differ in width.
//
// Usage:
//   node consistency.mjs <page-or-url> <page-or-url> [...] [--json out.json]
//   node consistency.mjs --site <url> [--max 6]       # the home page + pages linked from its header

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectSignature, compareSignatures, formatConsistency } from "./lib/consistency.mjs";

export { compareSignatures, formatConsistency };

export async function consistency(targets, { route, site = null, max = 6, ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  try {
    let urls = targets.map((t) => ({ label: t, url: resolveTarget(t).url }));
    if (site) {
      const { page, close } = await openPage(browser, site, VIEWPORTS.desktop, { route, ...options, scroll: false });
      const links = await page.evaluate(() => [...new Set([...document.querySelectorAll("header a[href], nav a[href]")].map((a) => a.href.split("#")[0]).filter((h) => h.startsWith(location.origin)))]);
      await close();
      const home = new URL(site).href;
      urls = [home, ...links.filter((l) => l !== home)].slice(0, max).map((u) => ({ label: new URL(u).pathname || "/", url: u }));
    }
    const pages = [];
    for (const u of urls) {
      const { page, close } = await openPage(browser, u.url, VIEWPORTS.desktop, { route, ...options, scroll: false });
      pages.push({ label: u.label.split("/").pop() || u.label || "/", sig: await page.evaluate(collectSignature) });
      await close();
    }
    const labels = pages.map((p, i) => (pages.findIndex((q) => q.label === p.label) === i ? p.label : `${p.label}#${i + 1}`));
    labels.forEach((l, i) => (pages[i].label = l));
    return { pages, findings: compareSignatures(pages) };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: targets, flags } = parseArgs(process.argv.slice(2));
  const site = typeof flags.site === "string" ? flags.site : null;
  if (!site && targets.length < 2) {
    console.error("Usage: node consistency.mjs <page> <page> [...]   |   node consistency.mjs --site <url> [--max 6]");
    process.exit(1);
  }
  try {
    const r = await consistency(targets, { ...commonOptions(flags), site, max: Number(flags.max) || 6 });
    console.log(formatConsistency(r.findings, r.pages.map((p) => p.label)));
    if (flags.json) writeFileSync(flags.json === true ? "consistency.json" : flags.json, JSON.stringify(r, null, 2));
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
