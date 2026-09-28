#!/usr/bin/env node
// Maps audit findings to the source files that produce them, so fixes land in the real codebase.
//
// Usage:
//   node locate.mjs <audit.json> [src-dir]          # from a saved audit (audit.mjs --json audit.json)
//   node locate.mjs --url <page-or-url> [src-dir]    # audit now, then locate (e.g. http://localhost:5173)
//
// Matches each flagged element by its visible text and its class names (Tailwind-friendly) and
// prints file:line candidates. For the root-font-size finding it points at the global CSS rule.
// Default src-dir: ./src if it exists, else the current directory.

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { locate, formatLocations } from "./lib/locate.mjs";

export { locate, formatLocations };

if (isMain(import.meta.url)) {
  const { _: args, flags } = parseArgs(process.argv.slice(2));
  const [first, second] = args;
  const srcDir = (flags.url ? first : second) || (existsSync("src") ? "src" : ".");
  try {
    let result;
    if (flags.url) {
      const { audit } = await import("./audit.mjs");
      result = await audit(flags.url, commonOptions(flags));
      if (flags.json) writeFileSync(flags.json === true ? "audit.json" : flags.json, JSON.stringify(result, null, 2));
    } else if (first) {
      result = JSON.parse(readFileSync(first, "utf8"));
    } else {
      console.error("Usage: node locate.mjs <audit.json> [src-dir]  |  node locate.mjs --url <page> [src-dir]");
      process.exit(1);
    }
    const located = locate(result, srcDir);
    console.log(located.length ? formatLocations(located) : "No findings to locate.");
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
