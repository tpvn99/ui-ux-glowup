#!/usr/bin/env node
// Captures a page (local file or URL) at desktop + mobile widths for visual review.
//
// Usage:
//   node screenshot.mjs <file.html | url> [output-dir] [--fold] [--storage-state state.json]
//
//   --fold   capture only the visible viewport (useful for long reference sites)
//
// Outputs: <name>-desktop.png (1440px) and <name>-mobile.png (390px), full page by default.
// Requires: npm i -D playwright && npx playwright install chromium

import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";

/** Capture desktop + mobile screenshots. Returns [{ label, file, overflow }]. */
export async function capture(target, outDir = "screenshots", { fold = false, route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const { url, name } = resolveTarget(target);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
      const { page, close } = await openPage(browser, url, vp, { route, scroll: !fold, ...options });
      // Horizontal overflow = a common responsive bug
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      const file = resolve(outDir, `${name}-${vp.label}.png`);
      await page.screenshot({ path: file, fullPage: !fold });
      results.push({ label: vp.label, file, overflow: Math.max(0, overflow) });
      await close();
    }
  } finally {
    await browser.close();
  }
  return results;
}

if (isMain(import.meta.url)) {
  const { _: [target, outDir = "screenshots"], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node screenshot.mjs <file.html | url> [output-dir] [--fold]");
    process.exit(1);
  }
  try {
    for (const r of await capture(target, outDir, { fold: Boolean(flags.fold), ...commonOptions(flags) })) {
      if (r.overflow > 1) console.warn(`⚠ ${r.label}: horizontal overflow of ${r.overflow}px`);
      console.log(r.file);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
