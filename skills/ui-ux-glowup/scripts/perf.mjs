#!/usr/bin/env node
// Performance audit on real Chromium: LCP, CLS, blocking time, weight by type, then the causes
// (oversized or lazy-loaded LCP image, blocking scripts, fonts, heavy libraries, third parties).
// Default profile imitates a modest phone: 390px, CPU 4× slower, 1.6 Mbps / 150 ms latency.
// Numbers are lab measurements on this machine: use them to compare before and after, not as field data.
//
// Usage:
//   node perf.mjs <page | url> [--profile phone|desktop|fast] [--json out.json] [--baseline before.json]
//   phone (default) throttled mobile · desktop 1440px, light throttle · fast: no throttling (CI, local files)

import { readFileSync, writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { initPerf, readPerf, collectImages, collectPage, perfFindings, formatPerf } from "./lib/perf.mjs";

export { perfFindings, formatPerf };

const PROFILES = {
  phone: { viewport: "mobile", cpu: 4, net: { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 } },
  desktop: { viewport: "desktop", cpu: 2, net: { latency: 40, down: (10 * 1024 * 1024) / 8, up: (5 * 1024 * 1024) / 8 } },
  fast: { viewport: "desktop", cpu: 1, net: null },
};

export async function perf(target, { route, profile = "phone", ...options } = {}) {
  const prof = PROFILES[profile] || PROFILES.phone;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const url = resolveTarget(target).url;
  const origin = new URL(url).origin;
  const requests = [];
  try {
    const { page, close } = await openPage(browser, url, VIEWPORTS[prof.viewport], {
      route, ...options, scroll: false, dismiss: false,
      onPage: async (p) => {
        await p.context().addInitScript(initPerf);
        p.on("requestfinished", (req) => requests.push(req));
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
    const metrics = { ...first, cls: after.cls, tbt: after.tbt, longTasks: after.longTasks };
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
    await close();
    const weight = resources.reduce((a, x) => a + x.bytes, 0);
    const data = { metrics, resources, images, page: pageInfo };
    const findings = perfFindings(data);
    const f1 = (n) => (n == null ? "n/a" : (n / 1000).toFixed(1) + "s");
    return { profile, findings, summary: { profile, lcp: f1(metrics.lcp), cls: metrics.cls, tbt: metrics.tbt, requests: resources.length, weight: weight >= 1048576 ? (weight / 1048576).toFixed(1) + " MB" : Math.round(weight / 1024) + " KB" }, metrics, weightBytes: weight, requests: resources.length };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node perf.mjs <page | url> [--profile phone|desktop|fast] [--json out.json] [--baseline before.json]");
    process.exit(1);
  }
  try {
    const profile = typeof flags.profile === "string" ? flags.profile : /^https?:/.test(target) ? "phone" : "fast";
    const r = await perf(target, { ...commonOptions(flags), profile });
    console.log(formatPerf(r.findings, r.summary));
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
