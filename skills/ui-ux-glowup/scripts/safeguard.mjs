#!/usr/bin/env node
// Protects the project before and while the skill changes it.
//
//   node safeguard.mjs backup  [dir] [--label "before redesign"]   # snapshot, touches nothing
//   node safeguard.mjs list    [dir]
//   node safeguard.mjs restore [dir] <id|latest> --yes [--clean]   # roll back (takes a backup first)
//   node safeguard.mjs check   [dir]                               # secrets and session files
//
// Git project: the snapshot is a commit object under refs/glowup/ (working tree, index, branch and
// stash are untouched; untracked files are included, ignored files are not). No git: a copy in
// .glowup-backup/. `restore` puts tracked and snapshotted files back; files created since are listed,
// and only deleted with --clean. `check` never prints a secret, only its kind, file, line and size.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { rmSync, mkdtempSync } from "node:fs";
import { parseArgs, isMain } from "./lib/browser.mjs";
import { isSensitivePath, scanSecrets, newFilesSince, IGNORE_LINES } from "./lib/safeguard.mjs";

const git = (dir, args, env = {}) =>
  execFileSync("git", args, { cwd: dir, env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).trim();

export function isGit(dir) {
  try { return git(dir, ["rev-parse", "--is-inside-work-tree"]) === "true"; } catch { return false; }
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.(\d+)Z$/, "$1").replace("T", "-");
const entries = (d) => readdirSync(d).filter((n) => !SKIP.has(n));
const SKIP = new Set(["node_modules", ".git", ".glowup-backup", "dist", "build", ".next", ".nuxt", ".svelte-kit"]);

export function backup(dir, label = "") {
  let id = stamp();
  for (let n = 2; list(dir).some((b) => b.id === id); n++) id = `${id.replace(/-\d+$/, (m) => (/^-\d{9}$/.test(m) ? m : ""))}-${n}`;
  if (isGit(dir)) {
    const root = git(dir, ["rev-parse", "--show-toplevel"]);
    const tmp = mkdtempSync(join(tmpdir(), "glowup-idx-"));
    const env = { GIT_INDEX_FILE: join(tmp, "index") };
    try {
      let parent = [];
      try { parent = ["-p", git(root, ["rev-parse", "HEAD"])]; } catch {}
      try { git(root, ["read-tree", "HEAD"], env); } catch {}
      git(root, ["add", "-A"], env);
      const tree = git(root, ["write-tree"], env);
      const commit = git(root, ["commit-tree", tree, ...parent, "-m", `glowup backup ${id}${label ? ": " + label : ""}`]);
      git(root, ["update-ref", `refs/glowup/${id}`, commit]);
      return { id, kind: "git", ref: `refs/glowup/${id}`, files: git(root, ["ls-tree", "-r", "--name-only", commit]).split("\n").filter(Boolean).length };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  const dest = join(dir, ".glowup-backup", id);
  mkdirSync(dest, { recursive: true });
  for (const n of entries(dir)) cpSync(join(dir, n), join(dest, n), { recursive: true });
  return { id, kind: "copy", ref: dest, files: countFiles(dest) };
}

function countFiles(d) {
  return readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? countFiles(join(d, e.name)) : 1), 0);
}

export function list(dir) {
  if (isGit(dir)) {
    const out = git(dir, ["for-each-ref", "--format=%(refname:short)|%(contents:subject)", "refs/glowup/"]);
    return out.split("\n").filter(Boolean).map((l) => { const [ref, msg] = l.split("|"); return { id: ref.replace("glowup/", ""), msg }; });
  }
  const b = join(dir, ".glowup-backup");
  return existsSync(b) ? readdirSync(b).sort().map((id) => ({ id, msg: "copy" })) : [];
}

export function restore(dir, idArg, { clean = false } = {}) {
  const all = list(dir);
  const id = idArg === "latest" || !idArg ? all.at(-1)?.id : idArg;
  if (!id || !all.some((b) => b.id === id)) throw new Error(`No backup "${idArg || "latest"}". Run: node safeguard.mjs list`);
  const safety = backup(dir, `auto, before restoring ${id}`);
  let left = [];
  if (isGit(dir)) {
    const root = git(dir, ["rev-parse", "--show-toplevel"]);
    const ref = `refs/glowup/${id}`;
    git(root, ["restore", `--source=${ref}`, "--worktree", "--", "."]);
    const snap = git(root, ["ls-tree", "-r", "--name-only", ref]).split("\n").filter(Boolean);
    const now = git(root, ["ls-files", "--cached", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
    left = newFilesSince(snap, now).filter((f) => existsSync(join(root, f)));
    if (clean) for (const f of left) rmSync(join(root, f), { force: true });
  } else {
    const src = join(dir, ".glowup-backup", id);
    for (const n of readdirSync(src)) cpSync(join(src, n), join(dir, n), { recursive: true });
    const snap = []; const walk = (d, p = "") => readdirSync(d, { withFileTypes: true }).forEach((e) => e.isDirectory() ? walk(join(d, e.name), p + e.name + "/") : snap.push(p + e.name));
    walk(src);
    const now = []; const walk2 = (d, p = "") => readdirSync(d, { withFileTypes: true }).forEach((e) => { if (SKIP.has(e.name)) return; e.isDirectory() ? walk2(join(d, e.name), p + e.name + "/") : now.push(p + e.name); });
    walk2(dir);
    left = newFilesSince(snap, now);
    if (clean) for (const f of left) rmSync(join(dir, f), { force: true });
  }
  return { id, safety: safety.id, left, cleaned: clean };
}

export function check(dir) {
  const findings = [];
  const add = (severity, rule, file, message, fix) => findings.push({ severity, rule, file, message, fix });
  if (!isGit(dir)) return { git: false, findings: [{ severity: "warning", rule: "not-a-git-repo", file: "", message: "Not a git project: secrets-in-git can't be checked.", fix: "Run `git init` or rely on `backup` (copies to .glowup-backup/)." }] };
  const root = git(dir, ["rev-parse", "--show-toplevel"]);
  const tracked = git(root, ["ls-files"]).split("\n").filter(Boolean);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  const changed = git(root, ["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean);
  for (const f of tracked.filter(isSensitivePath)) add("error", "sensitive-tracked", f, "Sensitive file is committed to git.", `git rm --cached "${f}", add it to .gitignore, and rotate what it contained (history keeps it).`);
  for (const f of untracked.filter(isSensitivePath)) add("error", "sensitive-not-ignored", f, "Sensitive file would be added by `git add .`.", `Add "${f}" to .gitignore.`);
  const scan = [...new Set([...changed, ...untracked, ...tracked.filter((f) => !/\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|lock|svg)$/i.test(f))])].slice(0, 2000);
  for (const f of scan) {
    const p = join(root, f);
    if (!existsSync(p) || statSync(p).size > 1_000_000) continue;
    for (const s of scanSecrets(readFileSync(p, "utf8"))) add("error", "secret-in-code", `${f}:${s.line}`, `${s.kind} in source (${s.preview}).`, "Move it to an environment variable, keep it out of git, and rotate it.");
  }
  const ignore = existsSync(join(root, ".gitignore")) ? readFileSync(join(root, ".gitignore"), "utf8") : "";
  const missing = IGNORE_LINES.filter((l) => !ignore.split("\n").some((x) => x.trim() === l));
  if (missing.length) add("warning", "gitignore-gaps", ".gitignore", `.gitignore lacks: ${missing.join(", ")}`, "Run with --fix to append them.");
  return { git: true, root, findings, missing };
}

if (isMain(import.meta.url)) {
  const { _: [cmd, ...rest], flags } = parseArgs(process.argv.slice(2));
  const dirArg = rest.find((r) => existsSync(r) && statSync(r).isDirectory());
  const dir = resolve(dirArg || ".");
  const idArg = rest.find((r) => r !== dirArg);
  try {
    if (cmd === "backup") {
      const b = backup(dir, typeof flags.label === "string" ? flags.label : "");
      console.log(`Backup ${b.id} saved (${b.kind}, ${b.files} files). Roll back: node safeguard.mjs restore ${b.id} --yes`);
    } else if (cmd === "list") {
      const l = list(dir);
      console.log(l.length ? l.map((b) => `${b.id}  ${b.msg}`).join("\n") : "No backup yet.");
    } else if (cmd === "restore") {
      if (!flags.yes) { console.error("Restore overwrites current files. Re-run with --yes (a new backup is taken first)."); process.exit(1); }
      const r = restore(dir, idArg, { clean: !!flags.clean });
      console.log(`Restored ${r.id}. Previous state saved as ${r.safety}.`);
      if (r.left.length) console.log(`${r.cleaned ? "Deleted" : "Created since the backup and left in place"} (${r.left.length}): ${r.left.slice(0, 10).join(", ")}${r.left.length > 10 ? " …" : ""}${r.cleaned ? "" : "\n  --clean deletes them"}`);
    } else if (cmd === "check") {
      const r = check(dir);
      if (flags.fix && r.missing?.length) { appendFileSync(join(r.root, ".gitignore"), (readFileSync(join(r.root, ".gitignore"), "utf8").endsWith("\n") ? "" : "\n") + r.missing.join("\n") + "\n"); r.findings = r.findings.filter((f) => f.rule !== "gitignore-gaps"); console.log(`.gitignore: added ${r.missing.join(", ")}`); }
      if (!r.findings.length) console.log("Safeguard check: no secret, no session file at risk.");
      else for (const f of r.findings) console.log(`${f.severity === "error" ? "✗" : "!"} ${f.rule} ${f.file}\n    ${f.message}\n    → ${f.fix}`);
      process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
    } else {
      console.error("Usage: node safeguard.mjs backup|list|restore|check [dir] [id] [--label x] [--yes] [--clean] [--fix]");
      process.exit(1);
    }
  } catch (e) {
    console.error(String(e.message).split("\n")[0]);
    process.exit(1);
  }
}
