#!/usr/bin/env node
// Saves a logged-in session so the other scripts can audit pages behind a login.
//
// Usage:
//   node login.mjs <login-or-app-url> [state.json]
//
// Opens a real browser window. Log in normally (OAuth, 2FA… all work), go to the page you want
// to audit, then press Enter in the terminal. Cookies + localStorage are saved to state.json.
// Then:  node audit.mjs <url> --storage-state state.json   (same flag for screenshot, compare…)
//
// state.json contains live session tokens: keep it out of git (it's in .gitignore) and delete it
// when you're done.

import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { loadPlaywright, parseArgs, isMain } from "./lib/browser.mjs";

export async function login(url, out = "state.json") {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(url).catch(() => {});
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await rl.question("Log in in the browser window, open the page to audit, then press Enter here… ");
    rl.close();
    const file = resolve(out);
    await context.storageState({ path: file });
    return { file, url: page.url() };
  } finally {
    await browser.close();
  }
}

if (isMain(import.meta.url)) {
  const { _: [url, out = "state.json"] } = parseArgs(process.argv.slice(2));
  if (!url) {
    console.error("Usage: node login.mjs <url> [state.json]");
    process.exit(1);
  }
  try {
    const { file, url: last } = await login(url, out);
    console.log(`Session saved to ${file}`);
    console.log(`Next: node audit.mjs ${last} --storage-state ${out}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
