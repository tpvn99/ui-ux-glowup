#!/usr/bin/env node
// Visual regression between two pages (or two builds): renders both at several widths, ignores content that moves
// by itself (it compares the page with a second shot of itself), counts changed pixels against a tolerance,
// groups them into regions and names the elements under each. Writes before / after / diff images.
//
// Use it after a REFACTOR (nothing should change: --tolerance 0.2) or to see exactly where a redesign changed things.
//
// Usage:
//   node visual-diff.mjs <before> <after> [--sizes 390,768,1440] [--tolerance 1] [--layout-shift 5]
//        [--mask ".ad,#clock"] [--no-auto-mask] [--out shots] [--json out.json] [--report-only]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { CELL, diffImages, regionsFromCells, unstableCells, judge, formatVisualDiff } from "./lib/visualdiff.mjs";

export { regionsFromCells, judge, formatVisualDiff };

/** Full-page screenshots at several widths (animations frozen), for a later comparison. */
export async function captureShots(target, sizes = [390, 1440], options = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  const out = {};
  try {
    for (const w of sizes) { const s = await shoot(browser, url, w, [], options); out[w] = { png: s.png, height: s.height }; await s.close(); }
  } finally { await browser.close(); }
  return out;
}

/** Compares saved "before" screenshots with fresh "after" ones; content that moves by itself (a second shot of "after") is ignored. */
export async function compareShots(beforeShots, target, { tolerance = 1, layoutShift = 5, options = {} } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  const results = [];
  try {
    const blank = await browser.newPage();
    await blank.goto("about:blank");
    const cmp = (a, b, ignore = []) => blank.evaluate(diffImages, { a64: a.toString("base64"), b64: b.toString("base64"), threshold: 16, cell: CELL, ignore });
    for (const [w, before] of Object.entries(beforeShots)) {
      const A = await shoot(browser, url, Number(w), [], options);
      const A2 = await shoot(browser, url, Number(w), [], options);
      const ignore = unstableCells((await cmp(A.png, A2.png)).cells);
      const d = await cmp(before.png, A.png, ignore);
      results.push({ size: Number(w), ...judge({ changed: d.changed, w: d.w, h: d.h, heightA: before.height, heightB: A.height }, { tolerance, layoutShift }), heightBefore: before.height, heightAfter: A.height, regions: regionsFromCells(d.cells, d.cols, d.rows).slice(0, 5), maskedCells: ignore.length });
      await A.close(); await A2.close();
    }
  } finally { await browser.close(); }
  return results;
}

const STABILIZE = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}";
const MAX_H = 12000;

async function shoot(browser, url, width, mask, options) {
  const vp = { label: String(width), width, height: 900, isMobile: width < 600, deviceScaleFactor: 1 };
  const { page, close } = await openPage(browser, url, vp, { ...options, reducedMotion: "reduce" });
  await page.addStyleTag({ content: STABILIZE + (mask.length ? `${mask.join(",")}{visibility:hidden!important}` : "") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const png = await page.screenshot({ fullPage: true, clip: undefined, ...(h > MAX_H ? { clip: { x: 0, y: 0, width, height: MAX_H }, fullPage: false } : {}) });
  return { page, close, png, height: h };
}

const describe = (page, x, y) => page.evaluate(([cx, cy]) => {
  window.scrollTo(0, Math.max(0, cy - innerHeight / 2));
  const el = document.elementFromPoint(Math.min(cx, innerWidth - 1), Math.min(Math.max(0, cy - scrollY), innerHeight - 1));
  if (!el) return null;
  if (/^(body|html|main)$/i.test(el.tagName)) return "empty space (something moved)";
  const t = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 28);
  return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : el.classList[0] ? "." + el.classList[0] : ""}${t ? ` "${t}"` : ""}`;
}, [x, y]).catch(() => null);

export async function visualDiff(before, after, { sizes = [390, 1440], tolerance = 1, layoutShift = 5, mask = [], autoMask = true, out = null, route, ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const bUrl = resolveTarget(before).url, aUrl = resolveTarget(after).url;
  if (out) mkdirSync(out, { recursive: true });
  const results = [];
  try {
    const blank = await browser.newPage();
    await blank.goto("about:blank");
    const cmp = (a, b, ignore = []) => blank.evaluate(diffImages, { a64: a.toString("base64"), b64: b.toString("base64"), threshold: 16, cell: CELL, ignore });
    for (const width of sizes) {
      const B = await shoot(browser, bUrl, width, mask, { route, ...options });
      const A = await shoot(browser, aUrl, width, mask, { route, ...options });
      let ignore = [];
      if (autoMask) {
        const [A2, B2] = await Promise.all([shoot(browser, aUrl, width, mask, { route, ...options }), shoot(browser, bUrl, width, mask, { route, ...options })]);
        ignore = [...new Set([...unstableCells((await cmp(A.png, A2.png)).cells), ...unstableCells((await cmp(B.png, B2.png)).cells)])];
        await A2.close(); await B2.close();
      }
      const d = await cmp(B.png, A.png, ignore);
      const j = judge({ changed: d.changed, w: d.w, h: d.h, heightA: B.height, heightB: A.height }, { tolerance, layoutShift });
      const regions = regionsFromCells(d.cells, d.cols, d.rows).slice(0, 8);
      for (const g of regions) {
        const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
        const was = await describe(B.page, cx, cy), now = await describe(A.page, cx, cy);
        g.element = was && now && was !== now ? `${was} → ${now}` : now || was;
      }
      let diffFile = null;
      if (out) {
        writeFileSync(join(out, `before-${width}.png`), B.png); writeFileSync(join(out, `after-${width}.png`), A.png);
        diffFile = join(out, `diff-${width}.png`); writeFileSync(diffFile, Buffer.from(d.png, "base64"));
      }
      results.push({ size: width, ...j, heightBefore: B.height, heightAfter: A.height, regions, maskedCells: ignore.length, diffFile });
      await A.close(); await B.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}

if (isMain(import.meta.url)) {
  const { _: [before, after], flags } = parseArgs(process.argv.slice(2));
  if (!before || !after) {
    console.error("Usage: node visual-diff.mjs <before> <after> [--sizes 390,768,1440] [--tolerance 1] [--layout-shift 5] [--mask css,css] [--no-auto-mask] [--out dir] [--json out.json] [--report-only]");
    process.exit(1);
  }
  try {
    const opts = { sizes: typeof flags.sizes === "string" ? flags.sizes.split(",").map(Number).filter(Boolean) : [390, 1440], tolerance: Number(flags.tolerance ?? 1), layoutShift: Number(flags["layout-shift"] ?? 5), mask: typeof flags.mask === "string" ? flags.mask.split(",") : [], autoMask: !flags["no-auto-mask"], out: typeof flags.out === "string" ? flags.out : "shots" };
    const results = await visualDiff(before, after, { ...commonOptions(flags), ...opts });
    console.log(formatVisualDiff(results, opts));
    if (flags.json) saveJson(flags.json === true ? "visual-diff.json" : flags.json, results);
    process.exit(!flags["report-only"] && results.some((r) => r.verdict !== "same") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
