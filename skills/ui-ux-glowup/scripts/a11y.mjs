#!/usr/bin/env node
// WCAG 2.2 AA behaviour audit: presses Tab through the page (keyboard trap, focus covered by a sticky
// header, focus order), checks ARIA validity, skip link, landmarks, accessible authentication, and
// reflow at 320px. Complements audit.mjs (contrast, alt, labels, names, focus ring, tap targets).
// It also operates custom widgets with the keyboard alone (tabs, disclosure buttons, dialogs, menus) and tests 200% and
// 400% zoom. It reloads the page between widgets and never submits a form.
//
// Usage:
//   node a11y.mjs <page | url> [--json out.json] [--storage-state state.json] [--wait-for "<css>"]

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { collectA11y, describeFocus, a11yFindings, formatA11y, MAX_TABS } from "./lib/a11y.mjs";
import { collectResponsive } from "./lib/responsive.mjs";

export { a11yFindings, formatA11y };


/** Operates the custom widgets with the keyboard alone and reports what does not respond. */
export async function componentChecks(page) {
  const out = [];
  const add = (rule, severity, message, items, fix) => out.push({ rule, severity, message, items, fix });
  const fresh = () => page.reload({ waitUntil: "load" }).then(() => page.waitForTimeout(150));
  const visible = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none"; }, sel);

  const tabLists = Math.min(await page.locator('[role="tablist"]').count(), 3);
  for (let i = 0; i < tabLists; i++) {
    await fresh();
    const tabs = page.locator('[role="tablist"]').nth(i).locator('[role="tab"]');
    if ((await tabs.count()) < 2) continue;
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    if (!(await tabs.nth(1).evaluate((el) => el === document.activeElement || el.getAttribute("aria-selected") === "true"))) add("tabs-no-arrow-keys", "error", "Tabs do not respond to the arrow keys (WAI-ARIA tabs pattern).", [`tablist ${i + 1}`], "On ArrowRight / ArrowLeft move focus (and selection) to the next / previous tab; give inactive tabs tabindex=\"-1\".");
  }

  const disclosure = 'button[aria-expanded][aria-controls]:not([role="tab"]):not([aria-haspopup])';
  const nD = Math.min(await page.locator(disclosure).count(), 5);
  for (let i = 0; i < nD; i++) {
    await fresh();
    const b = page.locator(disclosure).nth(i);
    const label = ((await b.textContent()) || "").trim().slice(0, 30);
    await b.focus();
    const before = await b.getAttribute("aria-expanded");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
    if ((await b.getAttribute("aria-expanded")) === before) add("disclosure-not-toggling", "error", `"${label}" has aria-expanded but it does not change when activated with Enter.`, [label], "Update aria-expanded in the click handler (true when the panel is open), so assistive technology knows the state.");
  }

  const markTriggers = () => page.evaluate(() => {
    let n = 0;
    for (const e of document.querySelectorAll('[aria-haspopup="dialog"], [aria-controls]')) {
      const t = e.getAttribute("aria-controls") && document.getElementById(e.getAttribute("aria-controls"));
      if (e.getAttribute("aria-haspopup") === "dialog" || (t && t.matches('dialog, [role="dialog"], [role="alertdialog"]'))) { e.setAttribute("data-gl-dialog-trigger", String(n++)); }
    }
    return n;
  });
  await fresh();
  const nDlg = Math.min(await markTriggers(), 3);
  for (let i = 0; i < nDlg; i++) {
    await fresh(); await markTriggers();
    const trig = page.locator(`[data-gl-dialog-trigger="${i}"]`);
    const label = ((await trig.textContent()) || "dialog trigger").trim().slice(0, 30);
    await trig.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    const dlgSel = 'dialog[open], [role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden]), [aria-modal="true"]:not([hidden])';
    if (!(await visible(dlgSel))) continue;
    const inside = await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]'));
    if (!inside) add("modal-focus-not-moved", "error", `Opening "${label}" does not move keyboard focus into the dialog.`, [label], "On open, focus the dialog or its first control (autofocus or .focus()), and keep Tab inside until it closes.");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    if (await visible(dlgSel)) { add("modal-no-escape", "error", `The dialog opened by "${label}" does not close with Escape.`, [label], "Close the dialog on Escape (a native <dialog> does this for you)."); continue; }
    if (!(await trig.evaluate((el) => el === document.activeElement))) add("modal-focus-not-returned", "warning", `Closing the dialog opened by "${label}" does not return focus to its trigger.`, [label], "On close, call .focus() on the control that opened it (a native <dialog> does this for you).");
  }

  const menus = Math.min(await page.locator('[aria-haspopup="menu"], [aria-haspopup="true"]').count(), 3);
  for (let i = 0; i < menus; i++) {
    await fresh();
    const b = page.locator('[aria-haspopup="menu"], [aria-haspopup="true"]').nth(i);
    const label = ((await b.textContent()) || "menu").trim().slice(0, 30);
    await b.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    if ((await b.getAttribute("aria-expanded")) !== "true") continue;
    const hasItems = (await page.locator('[role="menuitem"]').count()) > 0;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    if ((await b.getAttribute("aria-expanded")) === "true") add("menu-no-escape", "warning", `The menu "${label}" does not close with Escape.`, [label], "Close the menu on Escape and return focus to its button.");
    else if (hasItems) {
      await b.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(100); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(100);
      if (!(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("role") === "menuitem"))) add("menu-no-arrow-keys", "warning", `The menu "${label}" does not move focus into its items with the arrow keys.`, [label], "On ArrowDown focus the first menuitem; ArrowUp / ArrowDown move between items.");
    }
  }
  return out;
}

export async function a11y(target, { route, ...options } = {}) {
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  try {
    const { page, close } = await openPage(browser, url, VIEWPORTS.desktop, { route, ...options, scroll: false });
    const statics = await page.evaluate(collectA11y);
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    const stops = [];
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(40);
      const s = await page.evaluate(describeFocus);
      stops.push(s);
      if (s === null && i > 0) break;
      if (s && stops.length > 2 && stops[0] && s.sel === stops[0].sel && s.top === stops[0].top && s.left === stops[0].left) { stops.pop(); break; }
    }
    await close();
    const sample = async (width, height) => {
      const n = await openPage(browser, url, { width, height, isMobile: false, deviceScaleFactor: 1 }, { route, ...options, scroll: false });
      const d = await n.page.evaluate(collectResponsive);
      await n.close();
      return d;
    };
    const z200 = await sample(640, 512);
    const z400 = await sample(320, 256);
    const reflow = { overflow: z400.overflow, items: z400.offenders };
    const comp = await openPage(browser, url, VIEWPORTS.desktop, { route, ...options, scroll: false });
    const components = await componentChecks(comp.page);
    await comp.close();
    return { findings: a11yFindings({ statics, stops, reflow, zoom200: z200, zoom400: z400, components }), tabs: stops.filter(Boolean).length };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node a11y.mjs <page | url> [--json out.json]");
    process.exit(1);
  }
  try {
    const r = await a11y(target, commonOptions(flags));
    console.log(formatA11y(r.findings) + `\n(${r.tabs} focus stops visited by keyboard)`);
    if (flags.json) saveJson(flags.json === true ? "a11y.json" : flags.json, r);
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
