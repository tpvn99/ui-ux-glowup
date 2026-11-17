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
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync, chmodSync, unlinkSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
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
const SKIP = new Set(["node_modules", ".git", ".glowup-backup", ".glowup", "dist", "build", ".next", ".nuxt", ".svelte-kit"]);

export function backup(dir, label = "") {
  let id = stamp();
  for (let n = 2; list(dir).some((b) => b.id === id); n++) id = `${id.replace(/-\d+$/, (m) => (/^-\d{9}$/.test(m) ? m : ""))}-${n}`;
  if (isGit(dir)) {
    const root = git(dir, ["rev-parse", "--show-toplevel"]);
    let skipped = 0;
    const tmp = mkdtempSync(join(tmpdir(), "glowup-idx-"));
    const env = { GIT_INDEX_FILE: join(tmp, "index") };
    try {
      let parent = [];
      try { parent = ["-p", git(root, ["rev-parse", "HEAD"])]; } catch {}
      try { git(root, ["read-tree", "HEAD"], env); } catch {}
      git(root, ["add", "-A"], env);
      const leaked = git(root, ["ls-files", "-z"], env).split("\0").filter((f) => f && isSensitivePath(f));
      if (leaked.length) git(root, ["rm", "--cached", "-q", "--ignore-unmatch", "--", ...leaked], env);
      skipped = leaked.length;
      const tree = git(root, ["write-tree"], env);
      const commit = git(root, ["commit-tree", tree, ...parent, "-m", `glowup backup ${id}${label ? ": " + label : ""}`]);
      git(root, ["update-ref", `refs/glowup/${id}`, commit]);
      return { id, kind: "git", ref: `refs/glowup/${id}`, files: git(root, ["ls-tree", "-r", "--name-only", commit]).split("\n").filter(Boolean).length, skippedSecrets: skipped };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  const dest = join(dir, ".glowup-backup", id);
  mkdirSync(dest, { recursive: true, mode: 0o700 });
  try { chmodSync(join(dir, ".glowup-backup"), 0o700); chmodSync(dest, 0o700); } catch {}
  let skippedSecrets = 0;
  const keep = (src) => { const rel = relative(dir, src).split(sep).join("/"); if (rel && isSensitivePath(rel)) { skippedSecrets++; return false; } return true; };
  for (const n of entries(dir)) cpSync(join(dir, n), join(dest, n), { recursive: true, filter: keep });
  return { id, kind: "copy", ref: dest, files: countFiles(dest), skippedSecrets };
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

const HOOK_MARK = "# glowup-safeguard-hook";

/** Paths (prefixes, one per line in .glowup-safeguard-ignore) whose CONTENT is not scanned for secrets, e.g. tests with fake keys. Sensitive file names are always reported. */
export function scanIgnore(root) {
  const f = resolve(root, ".glowup-safeguard-ignore");
  if (!existsSync(f)) return () => false;
  const prefixes = readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  return (path) => prefixes.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : p + "/") || path.startsWith(p));
}

/** Secrets and sensitive files in what is about to be committed (git index). */
export function stagedCheck(dir) {
  const root = git(dir, ["rev-parse", "--show-toplevel"]).trim();
  const names = git(root, ["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"]).split("\0").filter(Boolean);
  const skipScan = scanIgnore(root);
  const findings = [];
  for (const f of names) {
    if (isSensitivePath(f)) { findings.push({ rule: "sensitive-staged", file: f, message: "Sensitive file staged for commit.", fix: `git restore --staged "${f}" and add it to .gitignore.` }); continue; }
    if (/\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|lock|svg)$/i.test(f) || skipScan(f)) continue;
    let text = "";
    try { text = git(root, ["show", `:${f}`]); } catch { continue; }
    if (text.length > 1_000_000) continue;
    for (const s of scanSecrets(text)) findings.push({ rule: "secret-staged", file: `${f}:${s.line}`, message: `${s.kind} in a staged file (${s.preview}).`, fix: "Move it to an environment variable and rotate it before committing." });
  }
  return { findings, files: names.length };
}

export function hook(dir, action) {
  const root = git(dir, ["rev-parse", "--show-toplevel"]).trim();
  const file = resolve(root, git(root, ["rev-parse", "--git-path", "hooks/pre-commit"]).trim());
  const ours = existsSync(file) && readFileSync(file, "utf8").includes(HOOK_MARK);
  if (action === "remove") { if (ours) { unlinkSync(file); return { file, changed: true }; } return { file, changed: false, reason: existsSync(file) ? "a pre-commit hook exists that this tool did not install; left untouched" : "no hook installed" }; }
  if (existsSync(file) && !ours) return { file, changed: false, reason: "a pre-commit hook already exists; not overwritten. Add this line to it: node " + resolve(process.argv[1]) + " staged" };
  mkdirSync(resolve(file, ".."), { recursive: true });
  const script = resolve(process.argv[1]);
  writeFileSync(file, `#!/bin/sh\n${HOOK_MARK}\nS="${script}"\n[ -f "$S" ] || exit 0\nexec node "$S" staged\n`);
  chmodSync(file, 0o755);
  return { file, changed: true };
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
  const skipScan = scanIgnore(root);
  for (const f of scan) {
    if (skipScan(f)) continue;
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
      if (b.skippedSecrets) console.log(`${b.skippedSecrets} sensitive file(s) (.env, sessions, keys) were left out of the backup: they are never copied.`);
    } else if (cmd === "list") {
      const l = list(dir);
      console.log(l.length ? l.map((b) => `${b.id}  ${b.msg}`).join("\n") : "No backup yet.");
    } else if (cmd === "restore") {
      if (!flags.yes) { console.error("Restore overwrites current files. Re-run with --yes (a new backup is taken first)."); process.exit(1); }
      const r = restore(dir, idArg, { clean: !!flags.clean });
      console.log(`Restored ${r.id}. Previous state saved as ${r.safety}.`);
      if (r.left.length) console.log(`${r.cleaned ? "Deleted" : "Created since the backup and left in place"} (${r.left.length}): ${r.left.slice(0, 10).join(", ")}${r.left.length > 10 ? " …" : ""}${r.cleaned ? "" : "\n  --clean deletes them"}`);
    } else if (cmd === "staged") {
      const r = stagedCheck(dir);
      if (!r.findings.length) { console.log(`Safeguard: ${r.files} staged file(s), no secret or session file.`); process.exit(0); }
      for (const f of r.findings) console.error(`✗ ${f.rule} ${f.file}\n    ${f.message}\n    → ${f.fix}`);
      console.error("Commit blocked by the safeguard hook. Fix the above, or bypass once with: git commit --no-verify");
      process.exit(1);
    } else if (cmd === "hook") {
      if (!["install", "remove"].includes(idArg)) { console.error("Usage: node safeguard.mjs hook install|remove [dir]"); process.exit(1); }
      const r = hook(dir, idArg);
      console.log(r.changed ? `Pre-commit hook ${idArg === "install" ? "installed" : "removed"}: ${r.file}` : `Nothing changed: ${r.reason}`);
    } else if (cmd === "check") {
      const r = check(dir);
      if (flags.fix && r.missing?.length) { appendFileSync(join(r.root, ".gitignore"), (readFileSync(join(r.root, ".gitignore"), "utf8").endsWith("\n") ? "" : "\n") + r.missing.join("\n") + "\n"); r.findings = r.findings.filter((f) => f.rule !== "gitignore-gaps"); console.log(`.gitignore: added ${r.missing.join(", ")}`); }
      if (!r.findings.length) console.log("Safeguard check: no secret, no session file at risk.");
      else for (const f of r.findings) console.log(`${f.severity === "error" ? "✗" : "!"} ${f.rule} ${f.file}\n    ${f.message}\n    → ${f.fix}`);
      process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
    } else {
      console.error("Usage: node safeguard.mjs backup|list|restore|check|staged|hook [dir] [id] [--label x] [--yes] [--clean] [--fix]   (hook install|remove: block commits that contain secrets)");
      process.exit(1);
    }
  } catch (e) {
    console.error(String(e.message).split("\n")[0]);
    process.exit(1);
  }
}
