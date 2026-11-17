// Shared browser helpers for the ui-ux-glowup scripts.
import { resolve, basename, extname } from "node:path";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { warnIfOpen } from "./session.mjs";

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

export const ENGINES = ["chromium", "firefox", "webkit"];

/** Playwright's device descriptor by name ("iPhone 15", "Pixel 7"), with the closest names when it is unknown. */
export function resolveDevice(pw, name) {
  const devices = pw.devices || {};
  if (devices[name]) return devices[name];
  const key = Object.keys(devices).find((k) => k.toLowerCase() === String(name).toLowerCase());
  if (key) return devices[key];
  const close = Object.keys(devices).filter((k) => !/landscape/.test(k) && k.toLowerCase().includes(String(name).toLowerCase().split(" ")[0])).slice(0, 6);
  throw new Error(`Unknown device "${name}".${close.length ? ` Closest: ${close.join(", ")}.` : ""} Examples: "iPhone 15", "Pixel 7", "iPad Pro 11", "Galaxy S9+".`);
}

/** Launch chromium (default), firefox or webkit, with a clear message when the engine is not installed. */
export async function launchBrowser(pw, name = "chromium", launchOptions = {}) {
  if (!ENGINES.includes(name)) throw new Error(`Unknown browser "${name}". Use ${ENGINES.join(", ")}.`);
  try {
    return await pw[name].launch(launchOptions);
  } catch (e) {
    if (/Executable doesn't exist|install/i.test(e.message)) throw new Error(`${name} is not installed. Run: npx playwright install ${name}`);
    throw e;
  }
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
 * options.reducedMotion: "reduce" (default: stable captures) or "no-preference" (measure the motion people really see).
 * options.onPage: (page) => void, called before navigation, awaited (listen for errors, set throttling).
 * options.javaScript: false loads the page with JavaScript disabled (what many crawlers see).
 * options.browser is read by the scripts that launch the browser (chromium, firefox, webkit).
 * options.device: a Playwright device name ("iPhone 15", "Pixel 7"): that device's viewport, pixel ratio, touch and user agent. It is an EMULATION of the screen and the engine, not a real phone.
 * options.storageState: path to a Playwright storage state (cookies + localStorage) saved by
 *   login.mjs, to audit pages behind a login. Defaults to $GLOWUP_STORAGE_STATE when set.
 */
export async function openPage(browser, url, viewport, options = {}) {
  const storageState = options.storageState ?? process.env.GLOWUP_STORAGE_STATE ?? undefined;
  warnIfOpen(storageState);
  let device = {};
  if (options.device) {
    const { defaultBrowserType, ...d } = resolveDevice(await loadPlaywright(), options.device);
    device = browser.browserType().name() === "firefox" ? (({ isMobile, ...rest }) => rest)(d) : d;
  }
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ...(viewport.isMobile && browser.browserType().name() !== "firefox" ? { isMobile: true } : {}),
    deviceScaleFactor: viewport.deviceScaleFactor,
    ...device,
    reducedMotion: options.reducedMotion || "reduce",
    javaScriptEnabled: options.javaScript !== false,
    ...(storageState ? { storageState } : {}),
  });
  if (options.route) await context.route("**/*", options.route);
  await context.addInitScript(() => {
    window.__glowupShifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__glowupShifts.push({ v: e.value, t: e.startTime, nodes: (e.sources || []).map((s) => s.node) });
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  const page = await context.newPage();
  if (options.onPage) await options.onPage(page);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  if (options.waitFor) await page.waitForSelector(options.waitFor, { timeout: 15000 }).catch(() => {});
  if (options.javaScript === false) return { page, close: () => context.close() };
  if (options.dismiss !== false) await dismissOverlays(page);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  if (options.scroll !== false) {
    await page.evaluate(async () => {
      window.__glowupScrollStart = performance.now();
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

/**
 * Close what usually hides the page on first load: cookie banners and "welcome back" modals.
 * Only clicks explicit close/decline/dismiss controls — never "accept" or anything that submits data.
 */
export async function dismissOverlays(page) {
  await page
    .evaluate(() => {
      const labels = /^(close|fermer|dismiss|no thanks|non merci|plus tard|later|decline|refuser|tout refuser|reject all|×|✕)$/i;
      const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]');
      for (const d of dialogs) {
        const btn = [...d.querySelectorAll("button, [role=button]")].find(
          (b) => labels.test((b.getAttribute("aria-label") || b.textContent || "").trim())
        );
        if (btn) btn.click();
      }
    })
    .catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
}

/**
 * Script errors of the page under test only. A click can navigate to another page (or to the browser's own
 * error and directory pages, whose scripts throw): those errors are not the page's.
 */
export function trackPageErrors(page, url, add) {
  const base = (u) => { try { return decodeURI(u).split("#")[0].split("?")[0]; } catch { return u; } };
  page.on("pageerror", (e) => {
    const now = base(page.url());
    if (now === "" || now === "about:blank" || now === base(url)) add(String(e.message).slice(0, 120));
  });
}

/** Options shared by every CLI: --storage-state, --wait-for, --no-dismiss. */
export function commonOptions(flags) {
  return {
    storageState: typeof flags["storage-state"] === "string" ? flags["storage-state"] : undefined,
    waitFor: typeof flags["wait-for"] === "string" ? flags["wait-for"] : undefined,
    dismiss: !flags["no-dismiss"],
    browser: typeof flags.browser === "string" ? flags.browser : undefined,
    device: typeof flags.device === "string" ? flags.device : undefined,
  };
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
  if (!process.argv[1]) return false;
  try {
    return importMetaUrl === pathToFileURL(realpathSync(resolve(process.argv[1]))).href;
  } catch {
    return importMetaUrl === pathToFileURL(resolve(process.argv[1])).href;
  }
}
