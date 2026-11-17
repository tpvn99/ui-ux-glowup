#!/usr/bin/env node
// Checks that a change kept the brand: colors, fonts, UI dependencies. Compares the project folder as it is
// now (untracked files included) with a reference: the latest safeguard backup, a backup id, or any git ref.
// A removed brand color, a dropped font or an added UI library are errors unless the user asked for them.
//
// Usage:
//   node brand-guard.mjs [dir] [--since latest|<backup-id>|<git-ref>] [--allow color,font,dependency] [--json]
//   Take the backup first:  node safeguard.mjs backup

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs, isMain } from "./lib/browser.mjs";
import { list } from "./safeguard.mjs";
import { compareBrand, formatBrand } from "./lib/brandguard.mjs";

export { compareBrand, formatBrand };

const git = (cwd, args, env = {}) => execFileSync("git", args, { cwd, env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 });
const STYLE_FILE = /\.(css|scss|sass|less|html?|jsx?|tsx?|vue|svelte|astro|php|json|mjs|cjs)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|\.nuxt|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.glowup-backup)(\/|$)/;

function snapshotTree(root) {
  const tmp = mkdtempSync(join(tmpdir(), "glowup-bg-"));
  const env = { GIT_INDEX_FILE: join(tmp, "index") };
  try {
    try { git(root, ["read-tree", "HEAD"], env); } catch {}
    git(root, ["add", "-A"], env);
    return git(root, ["write-tree"], env).trim();
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export function brandGuard(dir, { since = "latest", allow = [] } = {}) {
  const root = git(dir, ["rev-parse", "--show-toplevel"]).trim();
  let ref = since;
  if (since === "latest") {
    const all = list(root);
    ref = all.length ? `refs/glowup/${all.at(-1).id}` : "HEAD";
  } else if (list(root).some((b) => b.id === since)) ref = `refs/glowup/${since}`;
  const now = snapshotTree(root);
  const changed = git(root, ["diff", "--name-only", ref, now]).split("\n").filter((f) => f && STYLE_FILE.test(f) && !SKIP.test(f));
  const show = (r, f) => { try { return git(root, ["show", `${r}:${f}`]); } catch { return ""; } };
  const css = changed.filter((f) => !/package\.json$/.test(f));
  const before = css.map((f) => show(ref, f)).join("\n");
  const after = css.map((f) => show(now, f)).join("\n");
  const pkgChanged = changed.find((f) => f === "package.json");
  const findings = compareBrand({ before, after, oldPkg: pkgChanged ? show(ref, "package.json") : "", newPkg: pkgChanged ? show(now, "package.json") : "" }, { allow });
  return { ref: since === "latest" ? ref.replace("refs/glowup/", "backup ") : since, files: changed.length, findings };
}

if (isMain(import.meta.url)) {
  const { _: [dir = "."], flags } = parseArgs(process.argv.slice(2));
  try {
    const allow = typeof flags.allow === "string" ? flags.allow.split(",").map((s) => s.trim()) : [];
    const r = brandGuard(resolve(dir), { since: typeof flags.since === "string" ? flags.since : "latest", allow });
    console.log(flags.json ? JSON.stringify(r, null, 2) : formatBrand(r.findings, r));
    process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
  } catch (e) {
    console.error(String(e.message).split("\n")[0].includes("not a git") ? "brand-guard needs a git project (git init, then safeguard.mjs backup)." : String(e.message).split("\n")[0]);
    process.exit(1);
  }
}
