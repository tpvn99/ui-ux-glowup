#!/usr/bin/env node
// Runs the audit on REAL open-source projects built with their own bundlers, and writes what was measured.
//
//   node benchmark/real-projects/run.mjs --list              show the projects, run nothing
//   node benchmark/real-projects/run.mjs --only nextjs-blog  one project
//   node benchmark/real-projects/run.mjs                     all of them
//
// SECURITY: this clones third-party repositories and RUNS THEIR install and build commands, which is arbitrary code
// execution. Run it in a throwaway directory or a container, not on a machine holding secrets. Installs use
// --ignore-scripts, but a build still runs the project's own code. Nothing is run by `--list`.
//
// It is read-only on the audited pages: it applies no change and therefore measures no bug introduced by the skill.
// Every number in the output comes from this run. A project that fails to install, build or serve is reported as
// failed with the reason, never skipped silently.

import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, "..", "..", "skills", "ui-ux-glowup", "scripts");
const projects = JSON.parse(readFileSync(join(here, "projects.json"), "utf8"));
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const selected = projects.filter((p) => !only || only.includes(p.id));

if (args.includes("--list")) {
  for (const p of selected) console.log(`${p.id.padEnd(22)} ${p.framework}\n  ${p.repo}\n  install: ${p.install}\n  build:   ${p.build}\n  ${p.dist ? `serves ${p.dist}` : `start: ${p.start}`}`);
  console.log("\nNothing was run. Read the SECURITY note at the top of this file before running without --list.");
  process.exit(0);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain" };
const serveDir = (dir, port) => new Promise((res) => {
  const srv = createServer((req, rsp) => {
    let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let f = join(dir, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
    if (!existsSync(f)) { rsp.writeHead(404); return rsp.end("not found"); }
    rsp.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    rsp.end(readFileSync(f));
  }).listen(port, () => res(srv));
});
const waitFor = async (url, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if ((await fetch(url)).status < 500) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); } return false; };
const sh = (cmd, cwd, label) => { const t = Date.now(); execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"], timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }); return Math.round((Date.now() - t) / 1000); };
const run = (script, argv) => { try { return { ok: true, out: execSync(`node ${JSON.stringify(join(scripts, script))} ${argv}`, { encoding: "utf8", timeout: 10 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }) }; } catch (e) { return { ok: false, out: String(e.stdout || "") + String(e.stderr || e.message) }; } };

const work = join(tmpdir(), `glowup-real-${Date.now()}`);
mkdirSync(work, { recursive: true });
const rows = [];
let port = 4300;

for (const p of selected) {
  const row = { id: p.id, framework: p.framework, repo: p.repo, steps: {} };
  const dir = join(work, p.id);
  let server, child;
  try {
    row.steps.clone = sh(`git clone --depth 1 ${p.repo} ${JSON.stringify(dir)}`, work);
    row.commit = execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf8" }).trim();
    row.steps.install = sh(p.install, dir);
    row.steps.build = sh(p.build, dir);
    const url = `http://localhost:${port}/`;
    if (p.dist) server = await serveDir(join(dir, p.dist), port);
    else { child = spawn("sh", ["-c", p.start.replace("{port}", port)], { cwd: dir, stdio: "ignore", detached: true }); }
    if (!(await waitFor(url))) throw new Error(`the site did not answer on ${url}`);
    const t = Date.now();
    const verify = run("verify.mjs", `report ${url} --out ${JSON.stringify(join(work, p.id + ".report.md"))}`);
    const audit = run("audit.mjs", `${url} --json ${JSON.stringify(join(work, p.id + ".audit.json"))}`);
    row.seconds = Math.round((Date.now() - t) / 1000);
    row.verdict = (verify.out.match(/Verdict: .*/) || [null])[0];
    row.score = (audit.out.match(/→ ([\d.]+)\/45/) || [, null])[1];
    row.report = join(work, p.id + ".report.md");
    row.ok = true;
  } catch (e) {
    row.ok = false; row.error = String(e.message).split("\n")[0].slice(0, 300);
  } finally {
    server?.close();
    if (child) try { process.kill(-child.pid); } catch {}
  }
  port++;
  rows.push(row);
  console.error(`${row.ok ? "ok    " : "FAILED"} ${p.id} ${row.ok ? `${row.verdict} · audit ${row.score}/45 · ${row.seconds}s` : row.error}`);
}

const L = ["# Real projects, measured", "", `Run on ${new Date().toISOString().slice(0, 10)} · ${process.platform} ${process.arch} · Node ${process.version}`, "",
  "Read-only audit of real open-source projects built with their own bundlers. No change was applied, so **no bug introduced by the skill was measured**. Findings are NOT reviewed: until a person has read them, treat each one as unverified.", "",
  "| Project | Framework | Commit | Result | Audit /45 | Time | Report |", "|---|---|---|---|---|---|---|"];
for (const r of rows) L.push(r.ok ? `| ${r.id} | ${r.framework} | ${r.commit.slice(0, 8)} | ${r.verdict} | ${r.score ?? "n/a"} | ${r.seconds} s | ${r.report} |` : `| ${r.id} | ${r.framework} | ${r.commit?.slice(0, 8) || "n/a"} | failed: ${r.error} | | | |`);
const out = join(here, "RESULTS.md");
writeFileSync(out, L.join("\n") + "\n");
console.error(`written ${out}; work directory kept at ${work}`);
