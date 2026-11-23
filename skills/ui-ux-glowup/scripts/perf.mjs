#!/usr/bin/env node
// Performance audit on real Chromium: LCP, CLS, blocking time, weight by type, then the causes
// (oversized or lazy-loaded LCP image, blocking scripts, fonts, heavy libraries, third parties).
// Default profile imitates a modest phone: 390px, CPU 4× slower, 1.6 Mbps / 150 ms latency.
// Numbers are lab measurements on this machine: use them to compare before and after, not as field data.
//
// Usage:
//   node perf.mjs <page | url> [--profile phone|desktop|fast|slow|flaky] [--json out.json] [--baseline before.json] [--interact]
//   phone (default) throttled mobile · desktop 1440px, light throttle · fast: no throttling (CI, local files)
//   slow: 400 kbps, 400 ms, CPU 6× · flaky: phone + 8% of requests lost (same ones every run): does the page degrade or break?

import { readFileSync, writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, trackPageErrors, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { initPerf, readPerf, collectImages, collectPage, perfFindings, formatPerf } from "./lib/perf.mjs";

export { perfFindings, formatPerf };

const PROFILES = {
  phone: { viewport: "mobile", cpu: 4, net: { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 } },
  desktop: { viewport: "desktop", cpu: 2, net: { latency: 40, down: (10 * 1024 * 1024) / 8, up: (5 * 1024 * 1024) / 8 } },
  fast: { viewport: "desktop", cpu: 1, net: null },
  slow: { viewport: "mobile", cpu: 6, net: { latency: 400, down: (400 * 1024) / 8, up: (200 * 1024) / 8 } },
  flaky: { viewport: "mobile", cpu: 4, net: { latency: 300, down: (1.0 * 1024 * 1024) / 8, up: (500 * 1024) / 8 }, lose: 0.08 },
};

/** Deterministic pseudo-random numbers, so a flaky run can be repeated exactly. */
function prng(seed = 42) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export async function perf(target, { route, profile = "phone", ...options } = {}) {
  const prof = PROFILES[profile] || PROFILES.phone;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const url = resolveTarget(target).url;
  const origin = new URL(url).origin;
  const requests = [];
  const rnd = prng();
  let lost = 0, errors = 0;
  const flakyRoute = prof.lose ? async (r) => { if (r.request().resourceType() !== "document" && rnd() < prof.lose) { lost++; return r.abort("failed"); } return route ? route(r) : r.continue(); } : route;
  try {
    const { page, close, blocked } = await openPage(browser, url, VIEWPORTS[prof.viewport], {
      route: flakyRoute, reducedMotion: "no-preference", ...options, scroll: false, dismiss: false,
      onPage: async (p) => {
        await p.context().addInitScript(initPerf);
        p.on("requestfinished", (req) => requests.push(req));
        trackPageErrors(p, url, () => errors++);
        if (prof.net || prof.cpu > 1) {
          const cdp = await p.context().newCDPSession(p);
          if (prof.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
          if (prof.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: prof.net.latency, downloadThroughput: prof.net.down, uploadThroughput: prof.net.up });
        }
      },
    });
    await page.waitForTimeout(500);
    const first = await page.evaluate(readPerf);
    await page.evaluate(async () => {
      const step = innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const after = await page.evaluate(readPerf);
    let inter = { inp: null, interactions: 0 };
    if (options.interact) {
      const SKIP = /delete|remove|supprim|pay|buy|purchase|checkout|order|submit|send|log ?out|sign ?out|d[ée]connex|unsubscribe|cancel/i;
      const cand = page.locator('button:not([disabled]):not([type=submit]), [role=button], summary, input[type=checkbox], input[type=radio], [role=tab]');
      const n = Math.min(await cand.count(), 40);
      let done = 0;
      for (let i = 0; i < n && done < 8; i++) {
        const el = cand.nth(i);
        const label = ((await el.innerText().catch(() => "")) + " " + ((await el.getAttribute("aria-label").catch(() => "")) || "")).trim();
        if (SKIP.test(label) || !(await el.isVisible().catch(() => false))) continue;
        await el.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
        if (await el.click({ timeout: 1500 }).then(() => true, () => false)) { done++; await page.waitForTimeout(250); }
      }
      const r = await page.evaluate(readPerf);
      inter = { inp: r.inp, interactions: r.interactions };
    }
    const metrics = { ...first, cls: after.cls, tbt: after.tbt, longTasks: after.longTasks, ...inter };
    const images = await page.evaluate(collectImages);
    const pageInfo = await page.evaluate(collectPage);
    const resources = [];
    for (const req of requests) {
      const u = req.url();
      if (u.startsWith("data:") || u.startsWith("file:")) continue;
      let bytes = 0;
      try { const s = await req.sizes(); bytes = s.responseBodySize || 0; } catch {}
      let thirdParty = false;
      try { thirdParty = new URL(u).origin !== origin; } catch {}
      resources.push({ url: u, type: req.resourceType(), bytes, thirdParty });
    }
    const trackingBlocked = blocked();
    await close();
    const weight = resources.reduce((a, x) => a + x.bytes, 0);
    const data = { metrics, resources, images, page: pageInfo, resilience: prof.lose ? { failed: lost, errors, bodyText: pageInfo.bodyText, hasH1: pageInfo.hasH1 } : null };
    const findings = perfFindings(data);
    const f1 = (n) => (n == null ? "n/a" : (n / 1000).toFixed(1) + "s");
    return { profile, trackingBlocked, findings, summary: { profile, lcp: f1(metrics.lcp), cls: metrics.cls, tbt: metrics.tbt, inp: metrics.inp, interactions: metrics.interactions, requests: resources.length, weight: weight >= 1048576 ? (weight / 1048576).toFixed(1) + " MB" : Math.round(weight / 1024) + " KB" }, metrics, weightBytes: weight, requests: resources.length };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node perf.mjs <page | url> [--profile phone|desktop|fast] [--json out.json] [--baseline before.json] [--interact]");
    process.exit(1);
  }
  try {
    const profile = typeof flags.profile === "string" ? flags.profile : /^https?:/.test(target) ? "phone" : "fast";
    const r = await perf(target, { ...commonOptions(flags), profile, interact: !!flags.interact });
    console.log(formatPerf(r.findings, r.summary));
    if (r.trackingBlocked) console.log(`  (${r.trackingBlocked} analytics request(s) were blocked so this audit does not count as a visit: they are not in the weight above; --allow-tracking to include them)`);
    if (typeof flags.baseline === "string") {
      const b = JSON.parse(readFileSync(flags.baseline, "utf8"));
      const d = (k, f = (x) => x) => `${f(b.metrics[k])} → ${f(r.metrics[k])}`;
      console.log(`Baseline: LCP ${d("lcp", (x) => (x == null ? "n/a" : (x / 1000).toFixed(1) + "s"))} · CLS ${d("cls")} · TBT ${d("tbt")} ms · weight ${Math.round(b.weightBytes / 1024)} → ${Math.round(r.weightBytes / 1024)} KB · requests ${b.requests} → ${r.requests}`);
    }
    if (flags.json) saveJson(flags.json === true ? "perf.json" : flags.json, r);
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
