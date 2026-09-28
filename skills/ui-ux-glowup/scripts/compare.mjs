#!/usr/bin/env node
// Builds a before/after comparison image to show the user what changed.
//
// Usage:
//   node compare.mjs <before> <after> [out.png] [--mobile] [--full] [--storage-state state.json]
//
// <before> and <after> can each be an HTML file, a URL, or an existing screenshot
// (.png / .jpg / .jpeg / .webp) — handy when the "before" only exists as a capture.
// Pages are rendered at the same viewport; default is desktop, top 1.5 screens (--full for all).

import { resolve, extname } from "node:path";
import { readFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";

const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** True when the target is an image file rather than a page. */
export function isImage(target) {
  return !/^https?:\/\//.test(target) && Boolean(IMAGE_TYPES[extname(target).toLowerCase()]);
}

async function toDataUrl(browser, target, vp, { full, ...options }) {
  if (isImage(target)) {
    return `data:${IMAGE_TYPES[extname(target).toLowerCase()]};base64,${readFileSync(target).toString("base64")}`;
  }
  const { page, close } = await openPage(browser, resolveTarget(target).url, vp, options);
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const buf = await page.screenshot(
    full ? { fullPage: true } : { clip: { x: 0, y: 0, width: vp.width, height: Math.min(Math.round(vp.height * 1.5), pageHeight) } }
  );
  await close();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Render before/after side by side into outFile. Returns the absolute path. */
export async function compare(before, after, outFile = "compare.png", { mobile = false, full = false, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const vp = mobile ? VIEWPORTS.mobile : VIEWPORTS.desktop;
  const browser = await chromium.launch();
  try {
    const a = await toDataUrl(browser, before, vp, { full, ...options });
    const b = await toDataUrl(browser, after, vp, { full, ...options });
    const colWidth = mobile ? 390 : 720;
    const figure = (label, src) => `<figure style="margin:0;width:${colWidth}px">
        <figcaption style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span style="width:8px;height:8px;border-radius:9px;background:${label === "After" ? "#16a34a" : "#a1a1aa"}"></span>${label}
        </figcaption>
        <img src="${src}" style="width:100%;display:block;border-radius:10px;box-shadow:0 1px 2px rgb(0 0 0/.06),0 8px 24px -8px rgb(0 0 0/.18)">
      </figure>`;
    const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font:500 15px system-ui,sans-serif;color:#18181b">
      <div style="display:flex;gap:32px;padding:32px;align-items:flex-start">${figure("Before", a)}${figure("After", b)}</div></body></html>`;
    const page = await browser.newPage({ viewport: { width: colWidth * 2 + 96, height: 400 } });
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
    console.error("Usage: node compare.mjs <before> <after> [out.png] [--mobile] [--full] (pages, URLs or .png/.jpg)");
    process.exit(1);
  }
  try {
    console.log(await compare(before, after, out, { mobile: Boolean(flags.mobile), full: Boolean(flags.full), ...commonOptions(flags) }));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
