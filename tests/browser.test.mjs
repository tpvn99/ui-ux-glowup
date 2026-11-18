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

test("analytics and tag managers are blocked by default so an audit is not a visit; --allow-tracking loads them; --block adds hosts", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const { loadPlaywright, launchBrowser, openPage, VIEWPORTS, isTrackingUrl, matchesHost } = await import("../skills/ui-ux-glowup/scripts/lib/browser.mjs");
  assert.equal(isTrackingUrl("https://cloud.umami.is/script.js"), true);
  assert.equal(isTrackingUrl("https://www.googletagmanager.com/gtm.js?id=G-1"), true);
  assert.equal(isTrackingUrl("https://eu.i.posthog.com/e/"), true);
  assert.equal(isTrackingUrl("https://example.com/analytics.js"), false);
  assert.equal(isTrackingUrl("https://notgoogletagmanager.com/x"), false, "a host that only ends with the same letters is not a match");
  assert.equal(isTrackingUrl("https://abc.supabase.co/rest/v1/ab"), false);
  assert.equal(isTrackingUrl("https://abc.supabase.co/rest/v1/ab", ["supabase.co"]), true);
  assert.equal(matchesHost("file:///tmp/p.html", ["umami.is"]), false);
  const { mkdtempSync, writeFileSync } = await import("node:fs"); const { join } = await import("node:path"); const { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "glowup-trk-"));
  writeFileSync(join(d, "p.html"), '<!doctype html><html lang="en"><head><title>t</title><script src="https://cloud.umami.is/script.js"></script></head><body><img src="https://www.googletagmanager.com/ns.gif" alt=""><img src="https://abc.supabase.co/rest/v1/ab" alt=""><p>hi</p></body></html>');
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, "chromium");
  const run = async (opts) => {
    const seen = [];
    const route = (r) => { const u = r.request().url(); if (u.startsWith("file:")) return r.continue(); seen.push(new URL(u).hostname); return r.fulfill({ status: 204, body: "" }); };
    const { close, blocked } = await openPage(browser, new URL(`file://${join(d, "p.html")}`).href, VIEWPORTS.desktop, { route, scroll: false, ...opts });
    const n = blocked(); await close();
    return { n, seen };
  };
  try {
    const dflt = await run({});
    assert.equal(dflt.n, 2); assert.deepEqual(dflt.seen, ["abc.supabase.co"], "only the first-party-looking request got through");
    const plus = await run({ block: ["supabase.co"] });
    assert.equal(plus.n, 3); assert.deepEqual(plus.seen, []);
    const allowed = await run({ allowTracking: true });
    assert.equal(allowed.n, 0); assert.ok(allowed.seen.includes("cloud.umami.is") && allowed.seen.includes("www.googletagmanager.com"));
    const only = await run({ allowTracking: true, block: ["supabase.co"] });
    assert.equal(only.n, 1); assert.ok(only.seen.includes("cloud.umami.is"));
  } finally { await browser.close(); }
});
