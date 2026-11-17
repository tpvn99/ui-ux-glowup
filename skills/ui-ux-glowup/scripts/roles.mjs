#!/usr/bin/env node
// Opens a page as several roles (one saved session each) and compares what each is shown, and optionally
// that a role does NOT see a control (--forbid) or does see one (--require). Read-only: nothing is clicked.
// The interface is only half of access control: also test the endpoints with each role.
//
// Usage:
//   node roles.mjs <url> --as admin=admin.json --as user=user.json --as guest=none [--forbid user:#delete-account] [--require admin:#export]
//   Sessions come from login.mjs (one per account). `none` opens the page signed out. Values are never printed.

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, isMain } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { collectControls } from "./lib/smoke.mjs";
import { compareRoles, formatRoles } from "./lib/roles.mjs";

export { compareRoles, formatRoles };

export async function roles(target, roleStates, { forbid = [], require = [], route, ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  const selectors = [...new Set([...forbid, ...require].map((x) => x.selector))];
  const byRole = {};
  try {
    for (const [name, state] of Object.entries(roleStates)) {
      const { page, close } = await openPage(browser, url, VIEWPORTS.desktop, { route, ...options, scroll: false, storageState: state === "none" ? false : state });
      const base = collectControls ? await page.evaluate(collectControls) : { controls: [] };
      const visible = {};
      for (const s of selectors) visible[s] = await page.locator(s).first().isVisible().catch(() => false);
      const path = (u) => { try { const x = new URL(u); return x.pathname; } catch { return u; } };
      byRole[name] = { controls: base.controls.map((c) => ({ key: c.key, label: c.label, tag: c.tag })), finalPath: path(page.url()), requestedPath: path(url), visible };
      await close();
    }
  } finally {
    await browser.close();
  }
  return { byRole, ...compareRoles(byRole, { forbid, require }) };
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const target = argv.find((a) => !a.startsWith("--") && !/^(admin|user|guest)?\w*=/.test(a) && !argv[argv.indexOf(a) - 1]?.startsWith("--"));
  const all = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] ? [argv[i + 1]] : []));
  const roleStates = Object.fromEntries(all("--as").map((x) => { const i = x.indexOf("="); return [x.slice(0, i), x.slice(i + 1)]; }).filter(([n, f]) => n && f));
  const pair = (x) => { const i = x.indexOf(":"); return { role: x.slice(0, i), selector: x.slice(i + 1) }; };
  const json = argv.indexOf("--json") >= 0 ? argv[argv.indexOf("--json") + 1] : null;
  if (!target || Object.keys(roleStates).length < 2) {
    console.error("Usage: node roles.mjs <url> --as admin=admin.json --as user=user.json [--as guest=none] [--forbid user:<css>] [--require admin:<css>] [--json out.json]");
    process.exit(1);
  }
  try {
    const r = await roles(target, roleStates, { forbid: all("--forbid").map(pair), require: all("--require").map(pair) });
    console.log(formatRoles(r, r.byRole));
    if (json) saveJson(json, r);
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
