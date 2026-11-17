#!/usr/bin/env node
// WCAG 2.2 AA behaviour audit: presses Tab through the page (keyboard trap, focus covered by a sticky
// header, focus order), checks ARIA validity, skip link, landmarks, accessible authentication, and
// reflow at 320px. Complements audit.mjs (contrast, alt, labels, names, focus ring, tap targets).
// Read-only: it never clicks or submits.
//
// Usage:
//   node a11y.mjs <page | url> [--json out.json] [--storage-state state.json] [--wait-for "<css>"]

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectA11y, describeFocus, a11yFindings, formatA11y, MAX_TABS } from "./lib/a11y.mjs";

export { a11yFindings, formatA11y };

export async function a11y(target, { route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const url = resolveTarget(target).url;
  try {
    const { page, close } = await openPage(browser, url, VIEWPORTS.desktop, { route, ...options, scroll: false });
    const statics = await page.evaluate(collectA11y);
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    const stops = [];
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(40);
      const s = await page.evaluate(describeFocus);
      stops.push(s);
      if (s === null && i > 0) break;
      if (s && stops.length > 2 && stops[0] && s.sel === stops[0].sel && s.top === stops[0].top && s.left === stops[0].left) { stops.pop(); break; }
    }
    await close();
    const narrow = await openPage(browser, url, { width: 320, height: 256, isMobile: false, deviceScaleFactor: 1 }, { route, ...options, scroll: false });
    const reflow = await narrow.page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const overflow = document.documentElement.scrollWidth - w;
      const items = overflow > 2
        ? [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > w + 2 && e.getBoundingClientRect().width > 0 && !(() => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== "visible") return true; return false; })()).slice(0, 4).map((e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : e.classList[0] ? "." + e.classList[0] : ""))
        : [];
      return { overflow, items };
    });
    await narrow.close();
    return { findings: a11yFindings({ statics, stops, reflow }), tabs: stops.filter(Boolean).length };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node a11y.mjs <page | url> [--json out.json]");
    process.exit(1);
  }
  try {
    const r = await a11y(target, commonOptions(flags));
    console.log(formatA11y(r.findings) + `\n(${r.tabs} focus stops visited by keyboard)`);
    if (flags.json) writeFileSync(flags.json === true ? "a11y.json" : flags.json, JSON.stringify(r, null, 2));
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
