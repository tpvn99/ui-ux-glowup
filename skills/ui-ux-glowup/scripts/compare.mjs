#!/usr/bin/env node
// Builds a before/after comparison image to show the user what changed.
//
// Usage:
//   node compare.mjs <before.html | url> <after.html | url> [out.png] [--mobile] [--full]
//
// Renders both pages at the same viewport and places them side by side with labels.
// Default: desktop, top of page (first 1.5 screens) — pass --full for full pages.

import { resolve } from "node:path";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain } from "./lib/browser.mjs";

async function shoot(browser, target, vp, { full, route }) {
  const { page, close } = await openPage(browser, resolveTarget(target).url, vp, { route });
  const height = full ? undefined : Math.round(vp.height * 1.5);
  const buf = await page.screenshot(
    full ? { fullPage: true } : { clip: { x: 0, y: 0, width: vp.width, height: Math.min(height, await page.evaluate(() => document.documentElement.scrollHeight)) } }
  );
  await close();
  return buf.toString("base64");
}

/** Render before/after side by side into outFile. Returns the absolute path. */
export async function compare(before, after, outFile = "compare.png", { mobile = false, full = false, route } = {}) {
  const { chromium } = await loadPlaywright();
  const vp = mobile ? VIEWPORTS.mobile : VIEWPORTS.desktop;
  const browser = await chromium.launch();
  try {
    const [a, b] = [await shoot(browser, before, vp, { full, route }), await shoot(browser, after, vp, { full, route })];
    const colWidth = mobile ? 390 : 720;
    const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font:500 15px system-ui,sans-serif;color:#18181b">
      <div style="display:flex;gap:32px;padding:32px;align-items:flex-start">
        ${[["Before", a], ["After", b]]
          .map(
            ([label, img]) => `<figure style="margin:0;width:${colWidth}px">
              <figcaption style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
                <span style="width:8px;height:8px;border-radius:9px;background:${label === "After" ? "#16a34a" : "#a1a1aa"}"></span>${label}
              </figcaption>
              <img src="data:image/png;base64,${img}" style="width:100%;display:block;border-radius:10px;box-shadow:0 1px 2px rgb(0 0 0/.06),0 8px 24px -8px rgb(0 0 0/.18)">
            </figure>`
          )
          .join("")}
      </div></body></html>`;
    const page = await browser.newPage({ viewport: { width: colWidth * 2 + 96, height: 800 } });
    await page.setContent(html, { waitUntil: "load" });
    const file = resolve(outFile);
    await page.screenshot({ path: file, fullPage: true });
    await page.close();
    return file;
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [before, after, out = "compare.png"], flags } = parseArgs(process.argv.slice(2));
  if (!before || !after) {
    console.error("Usage: node compare.mjs <before> <after> [out.png] [--mobile] [--full]");
    process.exit(1);
  }
  try {
    console.log(await compare(before, after, out, { mobile: Boolean(flags.mobile), full: Boolean(flags.full) }));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
