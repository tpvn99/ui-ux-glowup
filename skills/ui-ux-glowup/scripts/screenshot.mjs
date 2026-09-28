#!/usr/bin/env node
// Captures a page (local file or URL) at desktop + mobile widths for visual review.
//
// Usage:
//   node screenshot.mjs <file.html | url> [output-dir] [--fold]
//
//   --fold   capture only the visible viewport (useful for long reference sites)
//
// Outputs: <name>-desktop.png (1440px) and <name>-mobile.png (390px), full page by default.
// Requires: npm i -D playwright && npx playwright install chromium

import { resolve, basename, extname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const fold = args.includes("--fold");
const [target, outDir = "screenshots"] = args.filter((a) => !a.startsWith("--"));

if (!target) {
  console.error("Usage: node screenshot.mjs <file.html | url> [output-dir] [--fold]");
  process.exit(1);
}

// The script lives in the skill folder: look for Playwright in the current project first,
// then next to the script, then globally.
async function loadPlaywright() {
  const { createRequire } = await import("node:module");
  const { execSync } = await import("node:child_process");
  const bases = [resolve(process.cwd(), "package.json"), import.meta.url];
  try { bases.push(resolve(execSync("npm root -g").toString().trim(), "..", "package.json")); } catch {}
  for (const base of bases) {
    try {
      const path = createRequire(base).resolve("playwright");
      return await import(pathToFileURL(path).href);
    } catch {}
  }
  return null;
}

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright not found. Install it in your project: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}
const chromium = pw.chromium ?? pw.default?.chromium;

const isUrl = /^https?:\/\//.test(target);
const url = isUrl ? target : pathToFileURL(resolve(target)).href;
const name = isUrl
  ? new URL(target).hostname.replace(/^www\./, "").replace(/\./g, "-")
  : basename(target, extname(target));

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
];

const browser = await chromium.launch();
try {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile ?? false,
      deviceScaleFactor: vp.deviceScaleFactor ?? 1,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);

    if (!fold) {
      // Scroll through the page to trigger lazy-loading and reveal animations
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);
    }

    // Horizontal overflow = a common responsive bug
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 1) console.warn(`⚠ ${vp.label}: horizontal overflow of ${overflow}px`);

    const file = resolve(outDir, `${name}-${vp.label}.png`);
    await page.screenshot({ path: file, fullPage: !fold });
    console.log(file);
    await page.close();
  }
} finally {
  await browser.close();
}
