// Shared browser helpers for the ui-ux-glowup scripts.
import { resolve, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

export const VIEWPORTS = {
  desktop: { label: "desktop", width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
  mobile: { label: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
};

/**
 * Load Playwright from the user's project first (the scripts live inside the skill folder,
 * which usually has no node_modules), then next to the script, then from the global prefix.
 */
export async function loadPlaywright() {
  const bases = [resolve(process.cwd(), "package.json"), import.meta.url];
  try {
    bases.push(resolve(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), "..", "package.json"));
  } catch {}
  for (const base of bases) {
    try {
      const path = createRequire(base).resolve("playwright");
      const mod = await import(pathToFileURL(path).href);
      return mod.chromium ? mod : mod.default;
    } catch {}
  }
  throw new Error(
    "Playwright not found. Install it in your project: npm i -D playwright && npx playwright install chromium"
  );
}

/** Turn a file path or URL into { url, name } where name is safe for file names. */
export function resolveTarget(target) {
  if (/^https?:\/\//.test(target)) {
    const u = new URL(target);
    const path = u.pathname.replace(/\/+$/, "").replace(/[^a-z0-9]+/gi, "-");
    return { url: target, name: (u.hostname.replace(/^www\./, "") + path).replace(/\./g, "-").replace(/-+$/, "") };
  }
  return { url: pathToFileURL(resolve(target)).href, name: basename(target, extname(target)) };
}

/**
 * Open a page at a viewport and wait until it is visually settled.
 * options.route: optional (route) => void handler, used by tests to serve assets offline.
 * options.scroll: scroll through the page to trigger lazy content (default true).
 */
export async function openPage(browser, url, viewport, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: viewport.deviceScaleFactor,
    reducedMotion: "reduce",
  });
  if (options.route) await context.route("**/*", options.route);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  if (options.scroll !== false) {
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
  }
  return { page, close: () => context.close() };
}

/** Minimal flag parser: returns { _: positional[], flags: { name: value|true } }. */
export function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) out.flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out.flags[k] = argv[++i];
      else out.flags[k] = true;
    } else out._.push(a);
  }
  return out;
}

/** True when the module is executed directly (node script.mjs), not imported. */
export function isMain(importMetaUrl) {
  return process.argv[1] && importMetaUrl === pathToFileURL(resolve(process.argv[1])).href;
}
