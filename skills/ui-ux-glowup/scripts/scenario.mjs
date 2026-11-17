#!/usr/bin/env node
// Runs user journeys described in a JSON file against a page and reports what passes and fails.
// Write the scenarios on the ORIGINAL page, run them, redesign, run them again: each scenario
// that passed before and fails now is a regression. Each scenario starts on a fresh page.
// Never put real credentials in a scenario file: log in with login.mjs and --storage-state.
//
// Usage:
//   node scenario.mjs <page | url> <scenarios.json> [--json out.json] [--baseline before.json]
//   Options: --only mobile · --profile keyboard (no mouse: every click and field is reached with Tab) · --storage-state state.json · --wait-for "<css>"
//   A scenario may carry "goal" (a sentence; must end with an expect step), "maxActions" (a budget) and "profile".

import { readFileSync, writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, trackPageErrors, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { validateScenarios, describeStep, effort, journeyHints, compareScenarios, formatScenarios } from "./lib/scenario.mjs";

export { validateScenarios, compareScenarios, formatScenarios };

const T = 3000;

/** A switch or radio hidden visually (sr-only) is operated through its label, as a mouse user would. */
async function viaLabel(page, sel, original) {
  const ok = await page.locator(sel).first().evaluate((el) => { const l = el.labels && el.labels[0]; if (!l) return false; l.click(); return true; }).catch(() => false);
  if (!ok) throw original;
}

const MAX_TABS = 150;

/** Keyboard profile: move focus to the element with Tab, exactly as a keyboard user must. */
async function tabTo(page, sel, ctx) {
  const target = page.locator(sel).first();
  await target.waitFor({ state: "attached", timeout: T });
  const radio = await target.evaluate((el) => (el.matches('input[type="radio"]') && el.name ? { name: el.name, size: document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`).length } : null)).catch(() => null);
  if (radio) {
    const inGroup = () => page.evaluate((n) => !!document.activeElement && document.activeElement.matches(`input[type="radio"][name="${CSS.escape(n)}"]`), radio.name);
    const onTarget = () => target.evaluate((el) => el === document.activeElement).catch(() => false);
    for (let i = 0; i < MAX_TABS && !(await inGroup()); i++) { await page.keyboard.press("Tab"); ctx.tabs++; }
    if (!(await inGroup())) throw new Error(`${sel} cannot be reached with the keyboard (${MAX_TABS} Tab presses)`);
    for (let i = 0; i < radio.size && !(await onTarget()); i++) { await page.keyboard.press("ArrowDown"); ctx.tabs++; }
    if (await onTarget()) return;
    throw new Error(`${sel} is in a radio group but the arrow keys do not reach it`);
  }
  for (let i = 0; i <= MAX_TABS; i++) {
    if (await target.evaluate((el) => el === document.activeElement || el.contains(document.activeElement)).catch(() => false)) return;
    if (i === MAX_TABS) break;
    await page.keyboard.press("Tab");
    ctx.tabs++;
  }
  throw new Error(`${sel} cannot be reached with the keyboard (${MAX_TABS} Tab presses)`);
}

async function runStep(page, st, baseUrl, ctx = { profile: "mouse", tabs: 0 }) {
  const kb = ctx.profile === "keyboard";
  if ("goto" in st) return page.goto(/^https?:|^file:/.test(st.goto) ? st.goto : new URL(st.goto, baseUrl).href, { waitUntil: "load", timeout: 15000 });
  if ("click" in st) {
    if (!kb) return page.locator(st.click).first().click({ timeout: T }).catch((e) => viaLabel(page, st.click, e));
    await tabTo(page, st.click, ctx);
    const space = await page.locator(st.click).first().evaluate((el) => el.matches('input[type="checkbox"], input[type="radio"]'));
    return page.keyboard.press(space ? "Space" : "Enter");
  }
  if ("fill" in st) { if (kb) await tabTo(page, st.fill[0], ctx); return page.locator(st.fill[0]).first().fill(String(st.fill[1]), { timeout: T }); }
  if ("select" in st) { if (kb) await tabTo(page, st.select[0], ctx); return page.locator(st.select[0]).first().selectOption(String(st.select[1]), { timeout: T }); }
  if ("check" in st) { if (kb) { await tabTo(page, st.check, ctx); if (!(await page.locator(st.check).first().isChecked())) await page.keyboard.press("Space"); return; } return page.locator(st.check).first().check({ timeout: T }).catch((e) => viaLabel(page, st.check, e)); }
  if ("uncheck" in st) { if (kb) { await tabTo(page, st.uncheck, ctx); if (await page.locator(st.uncheck).first().isChecked()) await page.keyboard.press("Space"); return; } return page.locator(st.uncheck).first().uncheck({ timeout: T }).catch((e) => viaLabel(page, st.uncheck, e)); }
  if ("hover" in st) { if (kb) return tabTo(page, st.hover, ctx); return page.locator(st.hover).first().hover({ timeout: T }); }
  if ("press" in st) return page.keyboard.press(st.press);
  if ("wait" in st) return page.waitForTimeout(Math.min(Number(st.wait) || 0, 5000));
  const e = st.expect;
  const poll = async (fn, msg) => {
    const end = Date.now() + T;
    let last;
    while (Date.now() < end) {
      last = await fn().catch((x) => String(x.message).split("\n")[0]);
      if (last === true) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`${msg}${typeof last === "string" ? ` (${last})` : ""}`);
  };
  const L = (s) => page.locator(s).first();
  if ("visible" in e) return poll(() => L(e.visible).isVisible(), `${e.visible} is not visible`);
  if ("hidden" in e) return poll(async () => !(await L(e.hidden).isVisible()), `${e.hidden} is still visible`);
  if ("text" in e) return poll(async () => (await L(e.text[0]).innerText()).toLowerCase().includes(String(e.text[1]).toLowerCase()), `${e.text[0]} does not contain "${e.text[1]}"`);
  if ("url" in e) return poll(async () => page.url().includes(e.url), `URL ${page.url()} does not contain "${e.url}"`);
  if ("count" in e) return poll(async () => (await page.locator(e.count[0]).count()) === e.count[1], `${e.count[0]} count is ${await page.locator(e.count[0]).count()}, expected ${e.count[1]}`);
  if ("checked" in e) return poll(() => L(e.checked).isChecked(), `${e.checked} is not checked`);
  if ("unchecked" in e) return poll(async () => !(await L(e.unchecked).isChecked()), `${e.unchecked} is still checked`);
  if ("enabled" in e) return poll(() => L(e.enabled).isEnabled(), `${e.enabled} is disabled`);
  if ("disabled" in e) return poll(() => L(e.disabled).isDisabled(), `${e.disabled} is enabled`);
  if ("valid" in e) return poll(() => L(e.valid).evaluate((el) => el.checkValidity()), `${e.valid} is invalid`);
  if ("invalid" in e) return poll(async () => !(await L(e.invalid).evaluate((el) => el.checkValidity())), `${e.invalid} is valid`);
  if ("attr" in e) return poll(async () => (await L(e.attr[0]).getAttribute(e.attr[1])) === String(e.attr[2]), `${e.attr[0]} [${e.attr[1]}] is not "${e.attr[2]}"`);
  if ("focusWithin" in e) return poll(() => page.evaluate((s) => !!document.activeElement && !!document.activeElement.closest(s), e.focusWithin), `focus is not inside ${e.focusWithin}`);
  if ("focusOutside" in e) return poll(() => page.evaluate((s) => !document.activeElement || !document.activeElement.closest(s), e.focusOutside), `focus is still inside ${e.focusOutside}`);
}

export async function runScenarios(target, doc, { route, viewport = "desktop", profile = "mouse", ...options } = {}) {
  const problems = validateScenarios(doc);
  if (problems.length) throw new Error("Invalid scenario file:\n  " + problems.join("\n  "));
  const pw = await loadPlaywright();
  const browser = await launchBrowser(pw, options.browser);
  const url = resolveTarget(target).url;
  const errors = new Set();
  const results = [];
  try {
    for (const sc of doc.scenarios) {
      const { page, close } = await openPage(browser, url, VIEWPORTS[viewport], {
        route, ...options, scroll: false,
        onPage: (p) => trackPageErrors(p, url, (m) => errors.add(m)),
      });
      const ctx = { profile: sc.profile || profile, tabs: 0 };
      const r = { name: sc.name, passed: true, actions: effort(sc.steps), profile: ctx.profile, tabs: 0, hints: journeyHints(sc.steps) };
      if (sc.goal) r.goal = sc.goal;
      if (sc.maxActions) r.budget = sc.maxActions;
      for (let i = 0; i < sc.steps.length; i++) {
        try {
          await runStep(page, sc.steps[i], url, ctx);
        } catch (e) {
          Object.assign(r, { passed: false, failedStep: i + 1, step: describeStep(sc.steps[i]), message: String(e.message).split("\n")[0].slice(0, 160) });
          break;
        }
      }
      r.tabs = ctx.tabs;
      if (r.passed && sc.maxActions && r.actions > sc.maxActions) Object.assign(r, { passed: false, failedStep: sc.steps.length, step: "budget", message: `the goal is reached in ${r.actions} actions, the budget is ${sc.maxActions}: simplify the journey` });
      if (r.passed && ctx.profile === "keyboard" && ctx.tabs > 40) r.hints.push({ rule: "many-tab-presses", message: `${ctx.tabs} Tab presses to get through: add a skip link or put the main action earlier.` });
      results.push(r);
      await close();
    }
    return { target, viewport, results, errors: [...errors] };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target, file], flags } = parseArgs(process.argv.slice(2));
  if (!target || !file) {
    console.error("Usage: node scenario.mjs <page | url> <scenarios.json> [--json out.json] [--baseline before.json] [--only mobile] [--profile keyboard]");
    process.exit(1);
  }
  try {
    const report = await runScenarios(target, JSON.parse(readFileSync(file, "utf8")), { ...commonOptions(flags), viewport: flags.only === "mobile" ? "mobile" : "desktop", profile: flags.profile === "keyboard" ? "keyboard" : "mouse" });
    const reg = typeof flags.baseline === "string" ? compareScenarios(JSON.parse(readFileSync(flags.baseline, "utf8")), report) : [];
    console.log(formatScenarios(report, reg));
    if (flags.json) saveJson(flags.json === true ? "scenarios-result.json" : flags.json, report);
    process.exit(report.results.some((r) => !r.passed) || reg.length ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
