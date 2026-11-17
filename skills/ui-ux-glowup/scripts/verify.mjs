#!/usr/bin/env node
// One command for "did the change help, and did it break anything?". It runs every check
// (audit, smoke, UX, accessibility, performance, size sweep, inventory, scenarios), saves a
// snapshot before the change, compares after it, and writes a classified report (Markdown or HTML).
// Read-only on the product: nothing is changed, clicked into a submit, or deleted.
//
//   node verify.mjs snapshot <page|url> [--dir .glowup/before] [--scenarios journeys.json] [--fast]
//   node verify.mjs check    <page|url> [--dir .glowup/before] [--scenarios journeys.json] [--out report.md|report.html] [--fast]
//   node verify.mjs report   <page|url> [--out report.md|report.html] [--fast]        # audit only, no before/after
//
// --fast skips performance and the size sweep. Exit 1 when the verdict is FAIL.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { audit } from "./audit.mjs";
import { smoke } from "./smoke.mjs";
import { smokeFindings } from "./lib/smoke.mjs";
import { ux } from "./ux.mjs";
import { a11y } from "./a11y.mjs";
import { perf } from "./perf.mjs";
import { responsive } from "./responsive.mjs";
import { inventory } from "./inventory.mjs";
import { runScenarios } from "./scenario.mjs";
import { buildReport, toMarkdown, toHtml, summaryLine } from "./lib/verify.mjs";
import { redactDeep, redactText } from "./lib/redact.mjs";

export const SNAPSHOT_SCHEMA = 1;

export { buildReport, toMarkdown, toHtml };

export async function collect(target, { scenarios = null, fast = false, ...options } = {}) {
  const snap = { schema: SNAPSHOT_SCHEMA, target, date: new Date().toISOString().slice(0, 10) };
  const a = await audit(target, { ...options, noJs: true });
  snap.audit = { scores: a.scores, total: a.total, max: a.max, findings: a.findings };
  snap.smoke = await smoke(target, options);
  snap.smokeFindings = smokeFindings(snap.smoke);
  snap.ux = await ux(target, options);
  snap.a11y = await a11y(target, options);
  snap.inventory = await inventory(target, options);
  if (scenarios) snap.scenarios = await runScenarios(target, scenarios, options);
  if (!fast) {
    const p = await perf(target, { ...options, profile: /^https?:/.test(target) ? "phone" : "fast" });
    snap.perf = { findings: p.findings, metrics: p.metrics, weightBytes: p.weightBytes, requests: p.requests, profile: p.profile };
    const r = await responsive(target, { ...options, widths: [320, 390, 768, 1440] });
    snap.responsive = { findings: r.findings };
  }
  return snap;
}

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));

export function save(report, out) {
  const file = resolve(out);
  writeFileSync(file, redactText(extname(file) === ".html" ? toHtml(report) : toMarkdown(report)));
  return file;
}

if (isMain(import.meta.url)) {
  const { _: [cmd, target], flags } = parseArgs(process.argv.slice(2));
  if (!["snapshot", "check", "report"].includes(cmd) || !target) {
    console.error("Usage: node verify.mjs snapshot|check|report <page|url> [--dir .glowup/before] [--scenarios file.json] [--out report.md|report.html] [--fast]");
    process.exit(1);
  }
  try {
    const dir = typeof flags.dir === "string" ? flags.dir : ".glowup/before";
    const scenarios = typeof flags.scenarios === "string" ? readJson(flags.scenarios) : null;
    const options = { ...commonOptions(flags), scenarios, fast: !!flags.fast };
    let before = null;
    if (cmd === "check") {
      const f = join(dir, "snapshot.json");
      if (!existsSync(f)) throw new Error(`No snapshot in ${dir}. Run first: node verify.mjs snapshot ${target} --dir ${dir}`);
      before = readJson(f);
      if (before.schema !== SNAPSHOT_SCHEMA) throw new Error(`The snapshot in ${dir} was made by another version of verify.mjs (schema ${before.schema ?? "none"}, expected ${SNAPSHOT_SCHEMA}). Take a new one: node verify.mjs snapshot ${target} --dir ${dir}`);
    }
    const snap = redactDeep(await collect(target, options));
    if (cmd === "snapshot") {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "snapshot.json"), JSON.stringify(snap));
      console.log(`Snapshot saved in ${dir}/snapshot.json (${snap.audit.total}/${snap.audit.max} audit, ${snap.smoke.results.length} controls, ${snap.inventory.navigation.length} nav links${snap.scenarios ? `, ${snap.scenarios.results.length} scenarios` : ""}). Make the change, then: node verify.mjs check ${target} --dir ${dir}${scenarios ? " --scenarios " + flags.scenarios : ""} --out report.md`);
      process.exit(0);
    }
    const report = buildReport({ target, date: snap.date, before, after: snap });
    console.log(summaryLine(report));
    if (typeof flags.out === "string") console.log(`Report written to ${save(report, flags.out)}`);
    else console.log("\n" + toMarkdown(report).split("\n").slice(0, 60).join("\n") + "\n(add --out report.md or report.html for the full report)");
    process.exit(report.verdict === "FAIL" ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
