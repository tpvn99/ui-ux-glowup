#!/usr/bin/env node
// Detects the framework, styling approach, UI library, token files and WordPress builders of a project.
//
// Usage:  node stack.mjs [dir] [--json]
import { resolve } from "node:path";
import { parseArgs, isMain } from "./lib/browser.mjs";
import { detectStack, formatStack } from "./lib/stack.mjs";

export { detectStack, formatStack };

if (isMain(import.meta.url)) {
  const { _: [dir = "."], flags } = parseArgs(process.argv.slice(2));
  const s = detectStack(resolve(dir));
  console.log(flags.json ? JSON.stringify(s, null, 2) : formatStack(s));
}
