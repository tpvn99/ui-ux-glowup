#!/usr/bin/env node
// Lists every element that matters on a page — navigation, CTAs, forms and fields, headings,
// media, carousels, accordions, tables, contact details, social and legal links, tracking scripts,
// structured data — so a redesign doesn't forget any of them. With --compare it checks that
// nothing from the original is missing in the new version.
//
// Usage:
//   node inventory.mjs <page | url> [--json inv.json] [--storage-state state.json]
//   node inventory.mjs <original> --compare <redesign>        # pages, URLs or saved inv.json files

import { readFileSync, writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectInventory, diffInventories, formatInventory, formatDiff } from "./lib/inventory.mjs";

export { diffInventories, formatInventory, formatDiff };

/** Inventory one page (or load a saved inventory .json). */
export async function inventory(target, { route, ...options } = {}) {
  if (target.endsWith(".json")) return JSON.parse(readFileSync(target, "utf8"));
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  try {
    const { page, close } = await openPage(browser, resolveTarget(target).url, VIEWPORTS.desktop, { route, ...options });
    const inv = await page.evaluate(collectInventory);
    await close();
    return inv;
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node inventory.mjs <page | url | inv.json> [--json inv.json] [--compare <redesign>]");
    process.exit(1);
  }
  try {
    const opts = commonOptions(flags);
    const before = await inventory(target, opts);
    if (typeof flags.compare === "string") {
      const after = await inventory(flags.compare, opts);
      console.log(formatDiff(diffInventories(before, after)));
    } else {
      console.log(formatInventory(before));
    }
    if (flags.json) writeFileSync(flags.json === true ? "inventory.json" : flags.json, JSON.stringify(before, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
