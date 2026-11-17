#!/usr/bin/env node
// Clicks every safe control on a page and records what happens, then compares with a saved run
// to catch regressions after a redesign. Never submits forms, leaves the site, or clicks
// delete / logout / pay style controls (listed as skipped).
//
// Usage:
//   node smoke.mjs <page | url> --json before-smoke.json
//   node smoke.mjs <page | url> --baseline before-smoke.json     # exit 1 on regressions or errors
//   Options: --max 40 (controls clicked) · --storage-state state.json · --wait-for "<css>"

import { readFileSync, writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, trackPageErrors, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { collectControls, classifyEffect, unsafeLabel, smokeFindings, diffSmoke, formatSmoke } from "./lib/smoke.mjs";

export { diffSmoke, smokeFindings, formatSmoke };

const state = (page) =>
  page.evaluate(() => {
    const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    return {
    url: location.href,
    html: fnv(document.body.innerHTML),
    text: fnv(document.body.innerText),
    sort: [...document.querySelectorAll("[aria-sort]")].map((e) => e.getAttribute("aria-sort")).join(),
    expanded: document.querySelectorAll('[aria-expanded="true"], details[open]').length,
    dialogs: document.querySelectorAll('dialog[open], [role="dialog"], [aria-modal="true"]').length,
    selected: document.querySelectorAll('[aria-selected="true"], [aria-pressed="true"], [aria-current]').length,
    };
  });

export async function smoke(target, { route, max = 40, viewport = "desktop", ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  const errors = new Set();
  const failedRequests = new Set();
  const hook = (page) => {
    trackPageErrors(page, url, (m) => errors.add(m));
    page.on("response", (r) => {
      if (r.status() >= 400 && new URL(r.url()).origin === new URL(url).origin) failedRequests.add(`${r.status()} ${new URL(r.url()).pathname}`);
    });
  };
  try {
    let opened = await openPage(browser, url, VIEWPORTS[viewport], { route, ...options, onPage: hook });
    const base = await opened.page.evaluate(collectControls);
    await opened.close();
    const results = [];
    let clicked = 0;
    for (const c of base.controls) {
      const skip = c.external || c.isSubmit || c.offscreen || unsafeLabel(c.label) || clicked >= max;
      if (skip || c.disabled) {
        results.push({ ...c, effect: "none", skipped: true });
        continue;
      }
      clicked++;
      opened = await openPage(browser, url, VIEWPORTS[viewport], { route, ...options, scroll: false, onPage: hook });
      const { page } = opened;
      const fresh = await page.evaluate(collectControls);
      const idx = fresh.controls.findIndex((x) => x.key === c.key);
      let effect = "none";
      if (idx >= 0) {
        const handles = await page.$$('a[href], button, summary, [role="button"], [role="tab"], [role="menuitem"], input[type="button"], input[type="submit"]');
        const visible = [];
        for (const h of handles) if (await h.isVisible()) visible.push(h);
        const h = visible[idx];
        if (h) {
          const before = await state(page);
          await h.click({ timeout: 3000, noWaitAfter: true }).catch(() => {});
          await page.waitForTimeout(300);
          effect = classifyEffect(before, await state(page).catch(() => ({ ...before, url: "navigated" })));
        }
      }
      results.push({ ...c, effect });
      await opened.close();
    }
    return { target, viewport, results, forms: base.forms, errors: [...errors], failedRequests: [...failedRequests] };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node smoke.mjs <page | url> [--json out.json] [--baseline before.json] [--max 40] [--only mobile]");
    process.exit(1);
  }
  try {
    const snap = await smoke(target, { ...commonOptions(flags), max: Number(flags.max) || 40, viewport: flags.only === "mobile" ? "mobile" : "desktop" });
    const diff = typeof flags.baseline === "string" ? diffSmoke(JSON.parse(readFileSync(flags.baseline, "utf8")), snap) : null;
    const findings = smokeFindings(snap);
    console.log(formatSmoke(snap, findings, diff));
    if (flags.json) saveJson(flags.json === true ? "smoke.json" : flags.json, snap);
    const bad = [...(diff || []), ...findings].some((f) => f.severity === "error");
    process.exit(bad ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
