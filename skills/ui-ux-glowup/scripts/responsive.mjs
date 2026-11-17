#!/usr/bin/env node
// Sweeps the page across 14 sizes (320 to 1920 wide, tablets, phone and tablet landscape) and reports
// horizontal scroll, clipped or tiny text, runaway headings and line lengths, bars that eat short
// screens, and small targets. --stress long adds a long word and doubles texts (other languages are
// longer); --stress rtl flips the page right-to-left. Read-only.
//
// Usage:
//   node responsive.mjs <page | url> [--stress long|rtl] [--widths 320,768,1440] [--json out.json]

import { writeFileSync } from "node:fs";
import { loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { SIZES, applyStress, collectResponsive, responsiveFindings, formatResponsive } from "./lib/responsive.mjs";

export { responsiveFindings, formatResponsive };

export async function responsive(target, { route, stress = null, widths = null, ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  const sizes = widths ? SIZES.filter((s) => widths.includes(s.width) && !/×/.test(s.name)) : SIZES;
  const perSize = [];
  try {
    for (const size of sizes) {
      const { page, close } = await openPage(browser, url, { ...size, isMobile: size.width <= 600, deviceScaleFactor: 1 }, { route, ...options, scroll: false });
      if (stress) { await page.evaluate(applyStress, stress); await page.waitForTimeout(150); }
      perSize.push({ size, data: await page.evaluate(collectResponsive) });
      await close();
    }
  } finally {
    await browser.close();
  }
  return { stress, perSize, findings: responsiveFindings(perSize, { stress }) };
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node responsive.mjs <page | url> [--stress long|rtl] [--widths 320,768,1440] [--json out.json]");
    process.exit(1);
  }
  try {
    const widths = typeof flags.widths === "string" ? flags.widths.split(",").map(Number).filter(Boolean) : null;
    const stress = flags.stress === "long" || flags.stress === "rtl" ? flags.stress : null;
    const r = await responsive(target, { ...commonOptions(flags), stress, widths });
    console.log(formatResponsive(r.findings, r.perSize, stress));
    if (flags.json) writeFileSync(flags.json === true ? "responsive.json" : flags.json, JSON.stringify(r, null, 2));
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
