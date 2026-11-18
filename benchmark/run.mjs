#!/usr/bin/env node
// Benchmark: does the toolchain find what is wrong, stay quiet when nothing is, and catch regressions?
// For each of the ten projects it builds three pages from one clean base:
//   before        the base with seeded defects          -> recall: how many seeded defects are reported
//   after         the clean base                        -> false positives: what is reported although nothing was seeded
//   after-broken  the clean base + injected regressions -> are the regressions caught by verify
// and measures the improvement (before -> after) and the time. Ground truth is known by construction, so the
// numbers are exact for what was seeded; they say nothing about defects nobody thought to seed. Needs network.
//
// Usage:  node benchmark/run.mjs [--only id,id [--merge]] [--fast] [--check] [--write-baseline]
//   --relabel re-applies labels.json to the saved results without running anything.
//   --only with --merge replays those projects and updates the saved results (after fixing one rule).

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { collect } from "../skills/ui-ux-glowup/scripts/verify.mjs";
import { buildReport, normalize } from "../skills/ui-ux-glowup/scripts/lib/verify.mjs";
import { parseArgs } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";
import { DEFECTS, TRAPS } from "./defects.mjs";
import { PROJECTS } from "./projects.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const labels = existsSync(join(here, "labels.json")) ? JSON.parse(readFileSync(join(here, "labels.json"), "utf8")) : {};

const labelOf = (k) => { const l = labels[k]; return typeof l === "string" ? { label: l } : l ? { label: l.label, note: l.humanComment ? `${l.note ? l.note + "; " : ""}reviewer: ${l.humanComment}` : l.note, human: l.reviewedBy === "human" } : { label: "unreviewed" }; };
const keys = (snap) => new Set(normalize(snap, snap.smokeFindings).map((f) => `${f.source}:${f.rule}`));
const sev = (snap, s) => normalize(snap, snap.smokeFindings).filter((f) => f.severity === s);
const ms = async (fn) => { const t = performance.now(); const v = await fn(); return [v, Math.round(performance.now() - t)]; };

/** The three pages of a project, from its clean base. */
export function buildPages(p) {
  const base = readFileSync(join(root, p.base), "utf8");
  let before = base;
  const applied = [];
  for (const id of p.defects) {
    const next = DEFECTS[id].apply(before);
    if (next === before) applied.push({ id, applies: false }); else { applied.push({ id, applies: true }); before = next; }
  }
  let broken = base;
  const trapsApplied = [];
  for (const id of p.traps) {
    const next = TRAPS[id].apply(broken);
    trapsApplied.push({ id, applies: next !== broken }); broken = next;
  }
  return { base, before, broken, applied, trapsApplied };
}

export async function runProject(p, { fast = false } = {}) {
  const work = mkdtempSync(join(tmpdir(), `glowup-bench-${p.id}-`));
  const { base, before, broken, applied, trapsApplied } = buildPages(p);
  const scenarios = p.scenarios ? JSON.parse(readFileSync(join(root, p.scenarios), "utf8")) : null;
  const files = { before: join(work, "before.html"), after: join(work, "after.html"), broken: join(work, "after-broken.html") };
  writeFileSync(files.before, before); writeFileSync(files.after, base); writeFileSync(files.broken, broken);

  const opts = { fast, scenarios };
  const [snapBefore, tBefore] = await ms(() => collect(files.before, opts));
  const [snapAfter, tAfter] = await ms(() => collect(files.after, opts));
  const [snapBroken, tBroken] = await ms(() => collect(files.broken, { ...opts, fast: true }));

  const foundBefore = keys(snapBefore), foundAfter = keys(snapAfter);
  const defects = applied.map((a) => {
    if (!a.applies) return { id: a.id, status: "not-applicable" };
    const exp = DEFECTS[a.id].expect;
    if (fast && exp.every((e) => e.startsWith("perf:") || e.startsWith("responsive:"))) return { id: a.id, status: "not-measured", area: DEFECTS[a.id].area };
    const inBefore = exp.filter((e) => foundBefore.has(e)), inAfter = exp.filter((e) => foundAfter.has(e));
    if (!inBefore.length) return { id: a.id, status: "missed", expected: exp, area: DEFECTS[a.id].area };
    if (inAfter.length === exp.filter((e) => foundBefore.has(e)).length && inAfter.length) return { id: a.id, status: "ambiguous", via: inBefore, area: DEFECTS[a.id].area };
    return { id: a.id, status: "detected", via: inBefore, area: DEFECTS[a.id].area };
  });

  const report = buildReport({ target: files.after, date: "bench", before: snapAfter, after: snapBroken });
  const caught = new Set(report.categories.flatMap((c) => c.findings).filter((f) => f.state === "regression" || f.state === "new").map((f) => f.rule));
  const hasBehaviour = snapAfter.smoke.results.some((c) => c.tag === "button" && !c.skipped && c.effect !== "none");
  const traps = trapsApplied.map((t) => {
    if (!t.applies) return { id: t.id, status: "not-applicable" };
    if (TRAPS[t.id].requiresBehaviour && !hasBehaviour) return { id: t.id, status: "not-applicable", why: "no button had a behaviour to break" };
    const hit = TRAPS[t.id].expect.filter((e) => caught.has(e));
    return { id: t.id, status: hit.length ? "detected" : "missed", via: hit, expected: TRAPS[t.id].expect };
  });

  const cleanAll = normalize(snapAfter, snapAfter.smokeFindings).filter((f) => f.severity !== "info");
  const clean = [...new Map(cleanAll.map((f) => [`${f.source}:${f.rule}`, f])).values()].map((f) => ({ key: `${f.source}:${f.rule}`, severity: f.severity, count: cleanAll.filter((x) => x.source === f.source && x.rule === f.rule).length, label: labelOf(`${p.id}:${f.source}:${f.rule}`).label, note: labelOf(`${p.id}:${f.source}:${f.rule}`).note, human: labelOf(`${p.id}:${f.source}:${f.rule}`).human || false }));
  const m = (s) => (s.perf ? { lcp: s.perf.metrics.lcp, cls: s.perf.metrics.cls, tbt: s.perf.metrics.tbt, weight: s.perf.weightBytes, requests: s.perf.requests } : null);
  return {
    id: p.id, type: p.type, defects, traps, clean,
    audit: { before: snapBefore.audit.total, after: snapAfter.audit.total },
    errors: { before: sev(snapBefore, "error").length, after: sev(snapAfter, "error").length },
    a11yErrors: { before: sev(snapBefore, "error").filter((f) => f.category === "Accessibility").length, after: sev(snapAfter, "error").filter((f) => f.category === "Accessibility").length },
    perf: { before: m(snapBefore), after: m(snapAfter) },
    scenarios: snapAfter.scenarios ? { passedAfter: snapAfter.scenarios.results.filter((r) => r.passed).length, total: snapAfter.scenarios.results.length, passedBroken: snapBroken.scenarios?.results.filter((r) => r.passed).length ?? null } : null,
    ms: { before: tBefore, after: tAfter, broken: tBroken },
  };
}

export function summarize(results) {
  const ok = results.filter((r) => !r.error);
  const all = (k) => ok.flatMap((r) => r[k]);
  const attributable = all("defects").filter((d) => d.status === "detected" || d.status === "missed");
  const detected = attributable.filter((d) => d.status === "detected").length;
  const traps = all("traps").filter((t) => t.status !== "not-applicable");
  const trapsHit = traps.filter((t) => t.status === "detected").length;
  const clean = all("clean");
  const reviewed = clean.filter((c) => c.label !== "unreviewed");
  return {
    projects: ok.length, failedProjects: results.length - ok.length,
    defectsSeeded: all("defects").length, notApplicable: all("defects").filter((d) => d.status === "not-applicable").length, notMeasured: all("defects").filter((d) => d.status === "not-measured").length, ambiguous: all("defects").filter((d) => d.status === "ambiguous").length,
    attributable: attributable.length, detected, recall: attributable.length ? +(detected / attributable.length).toFixed(3) : null,
    traps: traps.length, trapsDetected: trapsHit, trapRecall: traps.length ? +(trapsHit / traps.length).toFixed(3) : null,
    cleanFindings: clean.length, cleanErrors: clean.filter((c) => c.severity === "error").length, cleanWarnings: clean.filter((c) => c.severity === "warning").length,
    reviewed: reviewed.length, humanReviewed: clean.filter((c) => c.human).length, falsePositives: reviewed.filter((c) => c.label === "false-positive").length, valid: reviewed.filter((c) => c.label === "valid" || c.label === "by-design").length, unreviewed: clean.length - reviewed.length,
    precision: reviewed.length ? +(reviewed.filter((c) => c.label !== "false-positive").length / reviewed.length).toFixed(3) : null,
    seconds: Math.round(ok.reduce((a, r) => a + r.ms.before + r.ms.after + r.ms.broken, 0) / 1000),
  };
}

const f1 = (n) => (n == null ? "n/a" : (n / 1000).toFixed(1) + " s");
const kb = (b) => (b == null ? "n/a" : b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB");
const pct = (x) => (x == null ? "n/a" : Math.round(x * 100) + "%");

export function toMarkdown(results, sum, meta) {
  const L = [];
  L.push("# Benchmark results", "", `Run on ${meta.date}${meta.mergedFrom ? ` (${meta.mergedFrom.join(", ")} replayed afterwards)` : ""} · skill ${meta.version} · Node ${meta.node} · ${meta.os} · ${meta.fast ? "fast mode (no performance or size sweep)" : "full checks"}`, "");
  L.push("**How to read this.** Each project is one clean page. A copy gets 12 seeded defects (the *before*), another copy gets injected regressions. Because we broke the pages ourselves, recall is exact **for what was seeded** and says nothing about defects nobody thought to seed. False positives are findings reported on the clean page; each one was reviewed and labelled by the author of this benchmark (an AI agent, not a human): the labels are in `labels.json` and need a human second opinion. Scores are not proof of quality.", "");
  L.push("## Summary", "", "| Indicator | Result |", "|---|---|");
  L.push(`| Projects | ${sum.projects} (${sum.failedProjects} failed to run) |`);
  L.push(`| Seeded defects | ${sum.defectsSeeded} (${sum.notApplicable} did not apply, ${sum.notMeasured} not measured in fast mode, ${sum.ambiguous} ambiguous: the clean page already reports that rule) |`);
  L.push(`| **Recall** on attributable defects | **${pct(sum.recall)}** (${sum.detected} of ${sum.attributable}) |`);
  L.push(`| **Regressions caught** | **${pct(sum.trapRecall)}** (${sum.trapsDetected} of ${sum.traps}) |`);
  L.push(`| Findings on the clean pages | ${sum.cleanFindings} (${sum.cleanErrors} errors, ${sum.cleanWarnings} warnings) |`);
  L.push(`| Reviewed as false positive | ${sum.falsePositives} of ${sum.reviewed} reviewed (${sum.unreviewed} unreviewed) |`);
  L.push(`| **Reviewed by a human** | ${sum.humanReviewed || 0} of ${sum.cleanFindings} (the others were labelled by an AI agent) |`);
  L.push(`| Precision on reviewed findings | ${pct(sum.precision)} |`);
  L.push(`| Total run time | ${sum.seconds} s for ${sum.projects} projects (3 pages each) |`);
  L.push(`| Tokens | not measurable here: the checks are scripts and do not call a model |`, "");
  L.push("## By project", "", "| Project | Detected | Missed | Regressions caught | Audit /45 | Errors | Accessibility errors | Time |", "|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    if (r.error) { L.push(`| ${r.id} | failed: ${r.error} | | | | | | |`); continue; }
    const att = r.defects.filter((d) => d.status === "detected" || d.status === "missed"), det = att.filter((d) => d.status === "detected").length;
    const tr = r.traps.filter((t) => t.status !== "not-applicable");
    L.push(`| ${r.id} | ${det}/${att.length} | ${att.filter((d) => d.status === "missed").map((d) => d.id).join(", ") || "none"} | ${tr.filter((t) => t.status === "detected").length}/${tr.length} | ${r.audit.before} → ${r.audit.after} | ${r.errors.before} → ${r.errors.after} | ${r.a11yErrors.before} → ${r.a11yErrors.after} | ${Math.round((r.ms.before + r.ms.after + r.ms.broken) / 1000)} s |`);
  }
  const perfRows = results.filter((r) => !r.error && r.perf.before);
  if (perfRows.length) {
    L.push("", "## Performance, before → after (lab measurement, fast profile)", "", "| Project | LCP | CLS | Blocking time | Weight |", "|---|---|---|---|---|");
    for (const r of perfRows) L.push(`| ${r.id} | ${f1(r.perf.before.lcp)} → ${f1(r.perf.after.lcp)} | ${r.perf.before.cls} → ${r.perf.after.cls} | ${r.perf.before.tbt} → ${r.perf.after.tbt} ms | ${kb(r.perf.before.weight)} → ${kb(r.perf.after.weight)} |`);
  }
  const missed = results.flatMap((r) => (r.defects || []).filter((d) => d.status === "missed").map((d) => ({ p: r.id, ...d })));
  const missedTraps = results.flatMap((r) => (r.traps || []).filter((d) => d.status === "missed").map((d) => ({ p: r.id, ...d })));
  L.push("", "## What was not detected", "");
  if (!missed.length && !missedTraps.length) L.push("Nothing seeded was missed in this run.");
  for (const d of missed) L.push(`- **${d.p}**: defect \`${d.id}\` (${DEFECTS[d.id].desc}) — expected one of ${d.expected.map((e) => `\`${e}\``).join(", ")}`);
  for (const d of missedTraps) L.push(`- **${d.p}**: regression \`${d.id}\` (${TRAPS[d.id].desc}) not reported — expected one of ${d.expected.map((e) => `\`${e}\``).join(", ")}`);
  const unrev = results.flatMap((r) => (r.clean || []).filter((c) => c.label === "unreviewed").map((c) => ({ p: r.id, ...c })));
  const fps = results.flatMap((r) => (r.clean || []).filter((c) => c.label === "false-positive").map((c) => ({ p: r.id, ...c })));
  L.push("", "## Findings on the clean pages", "", "Each is something the tool reported although no defect was seeded.", "");
  L.push("| Project | Finding | Severity | Review |", "|---|---|---|---|");
  for (const r of results) for (const c of r.clean || []) L.push(`| ${r.id} | \`${c.key}\`${c.count > 1 ? ` ×${c.count}` : ""} | ${c.severity} | ${c.label}${c.note ? `: ${c.note}` : ""} |`);
  if (!results.some((r) => (r.clean || []).length)) L.push("| – | none | | |");
  L.push("", `${fps.length} false positive(s), ${unrev.length} unreviewed.`, "", "## Limits", "",
    "- The defects are ones we thought to seed, picked from the rules that exist: this measures reliability on known problems, not discovery of unknown ones.",
    "- Pages are the repository's examples plus three written for this benchmark; the WordPress project is a static export of a theme's markup, not a running WordPress; the React and Vue apps use CDN builds with no bundler.",
    "- Performance numbers are lab measurements on one machine with network access, not field data.",
    "- Screen readers, real devices and real users are not part of it.",
    "- Labels were assigned by an AI agent: a human review is still outstanding.");
  return L.join("\n") + "\n";
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.relabel) {
    const old = JSON.parse(readFileSync(join(here, "results.json"), "utf8"));
    for (const r of old.results) for (const c of r.clean || []) { const l = labelOf(`${r.id}:${c.key}`); c.label = l.label; c.note = l.note; c.human = l.human || false; }
    const sum = summarize(old.results);
    writeFileSync(join(here, "results.json"), JSON.stringify({ meta: old.meta, summary: sum, results: old.results }, null, 2));
    writeFileSync(join(here, "RESULTS.md"), toMarkdown(old.results, sum, old.meta));
    console.log(JSON.stringify(sum, null, 2));
    return;
  }
  const only = typeof flags.only === "string" ? flags.only.split(",") : null;
  const fast = !!flags.fast;
  const results = [];
  for (const p of PROJECTS.filter((x) => !only || only.includes(x.id))) {
    process.stderr.write(`· ${p.id} …`);
    try { const r = await runProject(p, { fast }); results.push(r); process.stderr.write(` ${Math.round((r.ms.before + r.ms.after + r.ms.broken) / 1000)} s\n`); }
    catch (e) { results.push({ id: p.id, type: p.type, error: String(e.message).split("\n")[0] }); process.stderr.write(` FAILED ${e.message.split("\n")[0]}\n`); }
  }
  const sum = summarize(results);
  const version = readFileSync(join(root, "skills/ui-ux-glowup/SKILL.md"), "utf8").match(/^\s+version:\s*"?([\d.]+)/m)?.[1];
  const meta = { date: new Date().toISOString().slice(0, 10), version, node: process.version, os: `${process.platform} ${process.arch}`, fast };
  if (!only) {
    const hf = join(here, "history.json");
    const hist = existsSync(hf) ? JSON.parse(readFileSync(hf, "utf8")) : [];
    hist.push({ ...meta, recall: sum.recall, trapRecall: sum.trapRecall, attributable: sum.attributable, detected: sum.detected, cleanErrors: sum.cleanErrors, cleanWarnings: sum.cleanWarnings, falsePositives: sum.falsePositives, seconds: sum.seconds });
    writeFileSync(hf, JSON.stringify(hist, null, 2) + "\n");
    writeFileSync(join(here, "results.json"), JSON.stringify({ meta, summary: sum, results }, null, 2));
    writeFileSync(join(here, "RESULTS.md"), toMarkdown(results, sum, meta));
  } else if (flags.merge && existsSync(join(here, "results.json"))) {
    const old = JSON.parse(readFileSync(join(here, "results.json"), "utf8"));
    const byId = new Map(old.results.map((r) => [r.id, r]));
    for (const r of results) byId.set(r.id, r);
    const merged = PROJECTS.map((x) => byId.get(x.id)).filter(Boolean);
    const msum = summarize(merged);
    writeFileSync(join(here, "results.json"), JSON.stringify({ meta: { ...old.meta, mergedFrom: only }, summary: msum, results: merged }, null, 2));
    writeFileSync(join(here, "RESULTS.md"), toMarkdown(merged, msum, { ...old.meta, mergedFrom: only }));
    console.error(`Merged ${only.join(", ")} into the saved results.`);
  }
  console.log(JSON.stringify(sum, null, 2));
  if (flags["write-baseline"] && !only) writeFileSync(join(here, "baseline.json"), JSON.stringify({ meta, recall: sum.recall, trapRecall: sum.trapRecall, cleanErrors: sum.cleanErrors, cleanWarnings: sum.cleanWarnings, falsePositives: sum.falsePositives, projects: sum.projects }, null, 2));
  if (flags.check) {
    const b = JSON.parse(readFileSync(join(here, "baseline.json"), "utf8"));
    const problems = [];
    if (sum.failedProjects) problems.push(`${sum.failedProjects} project(s) failed to run`);
    if (sum.recall < b.recall - 0.03) problems.push(`recall ${pct(sum.recall)} dropped below the baseline ${pct(b.recall)}`);
    if (sum.trapRecall < b.trapRecall) problems.push(`regressions caught ${pct(sum.trapRecall)} below the baseline ${pct(b.trapRecall)}`);
    if (sum.cleanErrors > b.cleanErrors) problems.push(`${sum.cleanErrors} errors on clean pages, baseline ${b.cleanErrors}`);
    if (sum.falsePositives > b.falsePositives) problems.push(`${sum.falsePositives} false positives, baseline ${b.falsePositives}`);
    if (sum.projects < 10) problems.push(`only ${sum.projects} projects ran`);
    if (problems.length) { console.error("Benchmark regression:\n- " + problems.join("\n- ")); process.exit(1); }
    console.error("Benchmark within the baseline.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
