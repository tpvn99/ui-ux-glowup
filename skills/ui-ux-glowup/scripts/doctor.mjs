#!/usr/bin/env node
// Checks the environment the scripts need and says exactly what to run to fix each gap:
// Node, Playwright, the three browser engines, git, optional tools, network access to the hosts the
// examples use, and (with --online) whether a newer release of the skill exists.
// Sends no project data: --online only asks GitHub for the latest release number.
//
// Usage:  node doctor.mjs [--online] [--offline] [--json]

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENGINES, loadPlaywright, launchBrowser, parseArgs, isMain } from "./lib/browser.mjs";
import { checkNode, checkSkillVersion, formatDoctor } from "./lib/doctor.mjs";

export { formatDoctor };

const here = dirname(fileURLToPath(import.meta.url));

function skillVersion() {
  try { return readFileSync(join(here, "..", "SKILL.md"), "utf8").match(/^\s+version:\s*"?([\d.]+)/m)?.[1] || null; } catch { return null; }
}
const has = (cmd, args = ["--version"]) => { try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; } };

async function reach(url, ms = 4000) {
  try { const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(ms) }); return r.status < 500; } catch { return false; }
}

export async function doctor({ online = false, offline = false } = {}) {
  const checks = [checkNode(process.version)];
  let pw = null;
  try {
    pw = await loadPlaywright();
    checks.push({ name: "Playwright", status: "ok", detail: "found" });
  } catch {
    checks.push({ name: "Playwright", status: "error", detail: "not found from this folder", fix: "npm i -D playwright && npx playwright install chromium" });
  }
  for (const e of ENGINES) {
    if (!pw) { checks.push({ name: `Browser ${e}`, status: e === "chromium" ? "error" : "warning", detail: "needs Playwright first" }); continue; }
    try { const b = await launchBrowser(pw, e); await b.close(); checks.push({ name: `Browser ${e}`, status: "ok", detail: "installed" }); }
    catch { checks.push({ name: `Browser ${e}`, status: e === "chromium" ? "error" : "warning", detail: e === "chromium" ? "not installed (every check needs it)" : "not installed (only cross-browser.mjs and --browser use it)", fix: `npx playwright install ${e}` }); }
  }
  checks.push(has("git") ? { name: "git", status: "ok", detail: "found" } : { name: "git", status: "warning", detail: "not found (safeguard backups fall back to copies; brand-guard needs git)", fix: "Install git: https://git-scm.com" });
  checks.push(has("pdftoppm", ["-v"]) ? { name: "poppler (pdftoppm)", status: "ok", detail: "found" } : { name: "poppler (pdftoppm)", status: "warning", detail: "not found (only the PDF page sheet of pdf.mjs needs it)", fix: "macOS: brew install poppler · Debian/Ubuntu: apt install poppler-utils" });
  if (!offline) {
    for (const host of ["https://cdn.jsdelivr.net", "https://fonts.googleapis.com"]) {
      checks.push((await reach(host)) ? { name: `Network ${new URL(host).host}`, status: "ok", detail: "reachable" } : { name: `Network ${new URL(host).host}`, status: "warning", detail: "not reachable (the examples load Tailwind and fonts from it; pages render unstyled offline)", fix: "Check the connection or proxy; use --offline to skip this check" });
    }
  }
  const local = skillVersion();
  let latest = null;
  if (online && local) {
    try { const r = await fetch("https://api.github.com/repos/tpvn99/ui-ux-glowup/releases/latest", { headers: { "User-Agent": "ui-ux-glowup-doctor" }, signal: AbortSignal.timeout(5000) }); latest = (await r.json()).tag_name?.replace(/^v/, "") || null; } catch {}
  }
  checks.push(local ? checkSkillVersion(local, latest) : { name: "Skill version", status: "warning", detail: "SKILL.md not found next to the scripts" });
  return checks;
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const checks = await doctor({ online: !!flags.online, offline: !!flags.offline });
  console.log(flags.json ? JSON.stringify(checks, null, 2) : formatDoctor(checks));
  process.exit(checks.some((c) => c.status === "error") ? 1 : 0);
}
