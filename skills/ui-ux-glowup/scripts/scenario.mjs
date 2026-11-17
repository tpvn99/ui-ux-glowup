#!/usr/bin/env node
// Runs user journeys described in a JSON file against a page and reports what passes and fails.
// Write the scenarios on the ORIGINAL page, run them, redesign, run them again: each scenario
// that passed before and fails now is a regression. Each scenario starts on a fresh page.
// Never put real credentials in a scenario file: log in with login.mjs and --storage-state.
//
// Usage:
//   node scenario.mjs <page | url> <scenarios.json> [--json out.json] [--baseline before.json]
//   Options: --only mobile · --storage-state state.json · --wait-for "<css>"

import { readFileSync, writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, launchBrowser, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { validateScenarios, describeStep, effort, compareScenarios, formatScenarios } from "./lib/scenario.mjs";

export { validateScenarios, compareScenarios, formatScenarios };

const T = 3000;

async function runStep(page, st, baseUrl) {
  if ("goto" in st) return page.goto(/^https?:|^file:/.test(st.goto) ? st.goto : new URL(st.goto, baseUrl).href, { waitUntil: "load", timeout: 15000 });
  if ("click" in st) return page.locator(st.click).first().click({ timeout: T });
  if ("fill" in st) return page.locator(st.fill[0]).first().fill(String(st.fill[1]), { timeout: T });
  if ("select" in st) return page.locator(st.select[0]).first().selectOption(String(st.select[1]), { timeout: T });
  if ("check" in st) return page.locator(st.check).first().check({ timeout: T });
  if ("uncheck" in st) return page.locator(st.uncheck).first().uncheck({ timeout: T });
  if ("hover" in st) return page.locator(st.hover).first().hover({ timeout: T });
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
  if ("enabled" in e) return poll(() => L(e.enabled).isEnabled(), `${e.enabled} is disabled`);
  if ("disabled" in e) return poll(() => L(e.disabled).isDisabled(), `${e.disabled} is enabled`);
  if ("valid" in e) return poll(() => L(e.valid).evaluate((el) => el.checkValidity()), `${e.valid} is invalid`);
  if ("invalid" in e) return poll(async () => !(await L(e.invalid).evaluate((el) => el.checkValidity())), `${e.invalid} is valid`);
  if ("attr" in e) return poll(async () => (await L(e.attr[0]).getAttribute(e.attr[1])) === String(e.attr[2]), `${e.attr[0]} [${e.attr[1]}] is not "${e.attr[2]}"`);
  if ("focusWithin" in e) return poll(() => page.evaluate((s) => !!document.activeElement && !!document.activeElement.closest(s), e.focusWithin), `focus is not inside ${e.focusWithin}`);
  if ("focusOutside" in e) return poll(() => page.evaluate((s) => !document.activeElement || !document.activeElement.closest(s), e.focusOutside), `focus is still inside ${e.focusOutside}`);
}

export async function runScenarios(target, doc, { route, viewport = "desktop", ...options } = {}) {
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
        onPage: (p) => p.on("pageerror", (e) => errors.add(String(e.message).slice(0, 120))),
      });
      const r = { name: sc.name, passed: true, actions: effort(sc.steps) };
      for (let i = 0; i < sc.steps.length; i++) {
        try {
          await runStep(page, sc.steps[i], url);
        } catch (e) {
          Object.assign(r, { passed: false, failedStep: i + 1, step: describeStep(sc.steps[i]), message: String(e.message).split("\n")[0].slice(0, 160) });
          break;
        }
      }
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
    console.error("Usage: node scenario.mjs <page | url> <scenarios.json> [--json out.json] [--baseline before.json] [--only mobile]");
    process.exit(1);
  }
  try {
    const report = await runScenarios(target, JSON.parse(readFileSync(file, "utf8")), { ...commonOptions(flags), viewport: flags.only === "mobile" ? "mobile" : "desktop" });
    const reg = typeof flags.baseline === "string" ? compareScenarios(JSON.parse(readFileSync(flags.baseline, "utf8")), report) : [];
    console.log(formatScenarios(report, reg));
    if (flags.json) saveJson(flags.json === true ? "scenarios-result.json" : flags.json, report);
    process.exit(report.results.some((r) => !r.passed) || reg.length ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
