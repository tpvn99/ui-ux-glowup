#!/usr/bin/env node
// Human review of the findings the tools report on the CLEAN pages. The labels in labels.json were assigned by an
// AI agent; this turns them into a sheet a person can tick, and applies the answers back.
//
//   node benchmark/review-sheet.mjs                 write benchmark/REVIEW.md from results.json and labels.json
//   node benchmark/review-sheet.mjs --apply         read the ticks in REVIEW.md, update labels.json and the results

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const SAYS = {
  "a11y:no-skip-link": "There are several links before the main content and no skip link to jump past them.",
  "perf:heavy-library": "A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).",
  "perf:render-blocking-script": "A script in <head> blocks rendering (in the examples: the Tailwind browser script).",
  "perf:third-party-heavy": "Many requests go to other hosts (placeholder photos and web fonts).",
  "responsive:text-too-small": "Some text is under 12px at certain screen sizes.",
  "smoke:empty-link": "A link points nowhere (href=\"#\") when clicked.",
  "smoke:dead-control": "A button does nothing when clicked.",
  "audit:no-js-content-missing": "Most of the page's text is absent when JavaScript is off.",
  "audit:tap-target": "Touch targets are under 36px tall (the comfortable size is 44px).",
  "ux:competing-primary-actions": "Several filled buttons above the fold compete for attention.",
};
const LABELS = { valid: "a real problem or a true statement about the page", "by-design": "true, but intended in this example", "false-positive": "the tool was wrong" };

export function buildSheet(results, labels) {
  const items = [];
  for (const r of results) for (const c of r.clean || []) items.push({ project: r.id, key: c.key, severity: c.severity, count: c.count || 1, label: c.label, note: c.note || "" });
  const L = ["# Review of the findings on the clean pages", "",
    `${items.length} findings were reported on pages where nothing was seeded. Each was labelled by an AI agent, which is not a review. **Your job: for each one, say whether you agree.**`, "",
    "- **I agree**: the label is right (the tool said something true, or something intended; or it was wrong and the label says so).",
    "- **I disagree**: the label is wrong. A `valid` or `by-design` finding that you think is NOT a real issue becomes a `false-positive`; a `false-positive` that you think is real becomes `valid`.",
    "- Tick one box. Leave both empty to skip. Add a comment if you like.", "",
    "When you are done: `node benchmark/review-sheet.mjs --apply` (it updates `labels.json` and the published results). Labels with a tick become *reviewed by a human*.", "",
    `Label meaning: ${Object.entries(LABELS).map(([k, v]) => `**${k}**: ${v}`).join(" · ")}.`, ""];
  items.forEach((it, i) => {
    L.push(`### ${i + 1}. ${it.project} · \`${it.key}\` (${it.severity}${it.count > 1 ? `, ×${it.count}` : ""})`, "",
      `**The tool says:** ${SAYS[it.key] || it.key}`, "", `**Label:** ${it.label}${it.note ? ` — ${it.note}` : ""}`, "",
      "- [ ] I agree", "- [ ] I disagree", "- Comment: ", "");
  });
  return L.join("\n");
}

const flip = (label) => (label === "false-positive" ? "valid" : "false-positive");

/** Reads the ticks of a filled sheet. Returns [{ index, project, key, verdict: "agree"|"disagree", comment }]. */
export function readSheet(text) {
  const out = [];
  for (const block of text.split(/\n(?=### \d+\. )/).slice(1)) {
    const head = block.match(/^### (\d+)\. (\S+) · `([^`]+)`/);
    if (!head) continue;
    const agree = /- \[[xX]\] I agree/.test(block), disagree = /- \[[xX]\] I disagree/.test(block);
    if (agree === disagree) continue;
    out.push({ index: Number(head[1]), project: head[2], key: head[3], verdict: agree ? "agree" : "disagree", comment: (block.match(/- Comment: (.*)/) || [, ""])[1].trim() });
  }
  return out;
}

export function applyReview(answers, labels) {
  const next = { ...labels };
  for (const a of answers) {
    const k = `${a.project}:${a.key}`;
    const cur = typeof next[k] === "string" ? { label: next[k] } : { ...(next[k] || { label: "valid" }) };
    if (a.verdict === "disagree") cur.label = flip(cur.label);
    cur.reviewedBy = "human";
    if (a.comment) cur.humanComment = a.comment;
    next[k] = cur;
  }
  return next;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const results = JSON.parse(readFileSync(join(here, "results.json"), "utf8")).results;
  const labelsFile = join(here, "labels.json");
  const labels = existsSync(labelsFile) ? JSON.parse(readFileSync(labelsFile, "utf8")) : {};
  if (process.argv.includes("--apply")) {
    const answers = readSheet(readFileSync(join(here, "REVIEW.md"), "utf8"));
    writeFileSync(labelsFile, JSON.stringify(applyReview(answers, labels), null, 2) + "\n");
    console.log(`${answers.length} answer(s) applied (${answers.filter((a) => a.verdict === "disagree").length} disagreement(s)). Now: node benchmark/run.mjs --relabel`);
  } else {
    writeFileSync(join(here, "REVIEW.md"), buildSheet(results, labels));
    console.log(`benchmark/REVIEW.md written (${results.reduce((n, r) => n + (r.clean || []).length, 0)} findings to review)`);
  }
}
