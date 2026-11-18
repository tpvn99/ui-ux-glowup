import { test } from "node:test";
import assert from "node:assert/strict";
import { crossFindings } from "../skills/ui-ux-glowup/scripts/lib/crossbrowser.mjs";
import { crossBrowser } from "../skills/ui-ux-glowup/scripts/cross-browser.mjs";
import { ux } from "../skills/ui-ux-glowup/scripts/ux.mjs";
import { loadPlaywright, launchBrowser } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pw = null;
try { pw = await loadPlaywright(); } catch {}
const installed = {};
for (const e of ["chromium", "firefox", "webkit"]) {
  try { installed[e] = !!pw && !!(await (await launchBrowser(pw, e)).close().then(() => true)); } catch { installed[e] = false; }
}
const skip = !pw && "playwright not installed";
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
const L = (o = {}) => ({ errors: [], layout: { overflow: 0, height: 2000, h1: { lines: 2, width: 600 }, brokenImages: 0, unsupported: [], fontsLoaded: 2, ...o } });

test("crossFindings compares each engine with the first one", () => {
  const same = { chromium: { desktop: L() }, webkit: { desktop: L() } };
  assert.deepEqual(crossFindings(same), []);
  const f = crossFindings({
    chromium: { mobile: L() },
    firefox: { mobile: { errors: ["boom"], layout: L({ overflow: 40, height: 2400, h1: { lines: 5, width: 300 }, brokenImages: 2, unsupported: [":has()"] }).layout } },
  });
  assert.deepEqual(f.map((x) => x.rule).sort(), ["engine-broken-images", "engine-h1-wraps", "engine-height-differs", "engine-js-error", "engine-overflow", "engine-unsupported-css"]);
  assert.ok(f.every((x) => x.fix.length > 15 && x.engine === "firefox"));
  assert.deepEqual(crossFindings({}), []);
});

test("an unknown or missing engine gives a clear message", { skip }, async () => {
  await assert.rejects(launchBrowser(pw, "netscape"), /Unknown browser/);
});

test("cross-browser.mjs finds a Firefox-only error and reports missing engines instead of failing", { skip }, async () => {
  const r = await crossBrowser(fixture("engine-diff.html"), { out: mkdtempSync(join(tmpdir(), "glowup-cb-")) });
  assert.deepEqual(Object.keys(r.results).concat(r.missing).sort(), ["chromium", "firefox", "webkit"]);
  if (installed.firefox) assert.ok(r.findings.some((f) => f.rule === "engine-js-error" && f.engine === "firefox"), JSON.stringify(r.findings));
  if (installed.webkit && !installed.firefox) assert.deepEqual(r.findings.filter((f) => f.engine === "webkit" && f.severity === "error"), []);
  assert.ok(r.files.length >= 2);
});

test("--browser works on the other scripts (firefox and webkit)", { skip }, async () => {
  for (const browser of ["firefox", "webkit"]) {
    if (!installed[browser]) continue;
    const r = await ux(fixture("ux-good.html"), { browser });
    assert.equal(r.findings.length, 0, browser);
  }
});
