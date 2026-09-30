#!/usr/bin/env node
// Captures a page (local file or URL) at desktop + mobile widths for visual review.
//
// Usage:
//   node screenshot.mjs <file.html | url> [output-dir] [--fold] [--selector ".pricing"]
//                       [--only desktop|mobile] [--max-height 2400] [--storage-state state.json]
//
//   --fold        capture only the visible viewport (useful for long reference sites)
//   --selector    capture one element only (re-checking the section you changed costs far fewer tokens)
//   --only        one width instead of both
//   --max-height  cut very long pages (px) — each image costs tokens when you look at it
//
// Outputs: <name>-desktop.png (1440px) and <name>-mobile.png (390px), full page by default.
// Requires: npm i -D playwright && npx playwright install chromium

import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";

/** Capture desktop + mobile screenshots. Returns [{ label, file, overflow }]. */
export async function capture(target, outDir = "screenshots", { fold = false, selector, only, maxHeight, route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const { url, name } = resolveTarget(target);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile].filter((v) => !only || v.label === only)) {
      const { page, close } = await openPage(browser, url, vp, { route, scroll: !fold, ...options });
      // Horizontal overflow = a common responsive bug
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      const suffix = selector ? `-${selector.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}` : "";
      const file = resolve(outDir, `${name}${suffix}-${vp.label}.png`);
      if (selector) {
        const el = page.locator(selector).first();
        if (!(await el.count())) throw new Error(`No element matches ${selector}`);
        await el.screenshot({ path: file });
      } else {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        const clip = !fold && maxHeight && height > maxHeight ? { x: 0, y: 0, width: vp.width, height: Number(maxHeight) } : undefined;
        await page.screenshot({ path: file, fullPage: !fold, ...(clip ? { clip } : {}) });
      }
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
    console.error("Usage: node screenshot.mjs <file.html | url> [output-dir] [--fold] [--selector css] [--only desktop|mobile] [--max-height px]");
    process.exit(1);
  }
  try {
    for (const r of await capture(target, outDir, { fold: Boolean(flags.fold), selector: flags.selector, only: flags.only, maxHeight: flags["max-height"], ...commonOptions(flags) })) {
      if (r.overflow > 1) console.warn(`⚠ ${r.label}: horizontal overflow of ${r.overflow}px`);
      console.log(r.file);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
