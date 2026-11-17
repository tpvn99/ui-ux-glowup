import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, resolveTarget, loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }

test("parseArgs handles positionals, --flag value, --flag=value and booleans", () => {
  const a = parseArgs(["page.html", "out", "--json", "r.json", "--fail-under=30", "--fold"]);
  assert.deepEqual(a._, ["page.html", "out"]);
  assert.deepEqual(a.flags, { json: "r.json", "fail-under": "30", fold: true });
});

test("resolveTarget: URLs keep their URL and get a file-safe name", () => {
  assert.deepEqual(resolveTarget("https://www.linear.app/features"), { url: "https://www.linear.app/features", name: "linear-app-features" });
});

test("resolveTarget: files become file:// URLs named after the file", () => {
  const r = resolveTarget("some/dir/landing.html");
  assert.ok(r.url.startsWith("file://") && r.url.endsWith("/some/dir/landing.html"));
  assert.equal(r.name, "landing");
});

test("--device emulates a named phone (viewport, pixel ratio, touch, user agent) and rejects unknown names helpfully", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const { loadPlaywright, launchBrowser, openPage, VIEWPORTS, resolveDevice } = await import("../skills/ui-ux-glowup/scripts/lib/browser.mjs");
  const pw = await loadPlaywright();
  assert.throws(() => resolveDevice(pw, "Nokia 3310"), /Unknown device "Nokia 3310"/);
  assert.throws(() => resolveDevice(pw, "iPhone 99"), /Closest: iPhone/);
  assert.ok(resolveDevice(pw, "iphone 15").viewport.width > 300);
  const browser = await launchBrowser(pw, "chromium");
  try {
    const { page, close } = await openPage(browser, new URL("./fixtures/device.html", import.meta.url).href, VIEWPORTS.desktop, { device: "iPhone 15", scroll: false });
    const [w, dpr, touch, ua] = (await page.locator("#info").innerText()).split(",");
    assert.equal(Number(w), resolveDevice(pw, "iPhone 15").viewport.width);
    assert.equal(Number(dpr), resolveDevice(pw, "iPhone 15").deviceScaleFactor);
    assert.equal(touch, "true"); assert.equal(ua, "true");
    await close();
  } finally { await browser.close(); }
});
