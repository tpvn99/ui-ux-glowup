// Human-readable audit report (pure — also bundled into audit.browser.js).
import { CRITERIA } from "./analyze.mjs";

const ICON = { error: "✗", warn: "!", info: "·" };
const SHORT = { Hierarchy: "Hierarchy", Typography: "Typography", Spacing: "Spacing", Components: "Components", Visuals: "Visuals*", Content: "Content*", Responsive: "Responsive", Accessibility: "A11y", SEO: "SEO" };

/**
 * Format an audit result ({ target, scores, total, max, findings, tokens, note? }) like references/audit.md.
 * options.brief: one line per finding (rule id + first items), no explanations or token summary — for re-audits.
 * options.maxItems: offending elements listed per finding (default 4, brief 2).
 */
export function formatReport(result, { brief = false, maxItems = brief ? 2 : 4 } = {}) {
  const lines = [];
  if (!brief) lines.push(`Automated audit — ${result.target}`);
  if (result.note) lines.push(result.note);
  lines.push(scoreLine(result));
  if (!brief) lines.push("(* partly measurable — confirm with a visual review of the screenshots)", "");
  const sorted = sortFindings(result.findings);
  if (!sorted.length) lines.push("No automated findings.");
  for (const f of sorted) {
    const total = f.count || f.items.length;
    const more = total > maxItems ? ` (+${total - Math.min(maxItems, f.items.length)} more)` : "";
    if (brief) {
      if (f.severity !== "info") lines.push(compactLine(f, maxItems));
      continue;
    }
    lines.push(`${ICON[f.severity]} [${f.criterion}] ${f.message}`);
    for (const item of f.items.slice(0, maxItems)) lines.push(`    ${item}`);
    if (more) lines.push(`   ${more}`);
  }
  if (brief) pushInfo(lines, sorted);
  const t = result.tokens;
  if (t && !brief) {
    lines.push("");
    lines.push("Measured tokens");
    lines.push(`  Fonts: ${t.fonts.map((f) => `${f.family} ${f.share}%`).join(", ")}`);
    lines.push(`  Type scale (px): ${t.typeScale.join(" / ")}`);
    lines.push(`  Spacing on 4px grid: ${t.gridConformity}% · most used: ${t.spacing.slice(0, 8).map((s) => s.px).join(", ")}`);
    lines.push(`  Radii (px): ${t.radii.map((r) => r.px).join(", ") || "none"}`);
  }
  return lines.join("\n");
}

/**
 * Compare a new audit with a saved baseline (--baseline before.json): score per criterion before → after,
 * fixed rules, and only what is still open or new. Much shorter than a full report on every iteration.
 */
export function formatDelta(before, after, { maxItems = 2 } = {}) {
  const lines = [];
  const crit = CRITERIA.map((c) => {
    const a = before.scores?.[c];
    const b = after.scores[c];
    return a === undefined || a === b ? `${SHORT[c]} ${b}` : `${SHORT[c]} ${a}→${b}`;
  });
  lines.push(`Audit: ${crit.join(" · ")} → ${before.total}→${after.total}/${after.max}`);
  const beforeRules = new Set(before.findings.map((f) => f.rule));
  const afterRules = new Set(after.findings.map((f) => f.rule));
  const fixed = [...beforeRules].filter((r) => !afterRules.has(r));
  if (fixed.length) lines.push(`✓ fixed: ${fixed.join(", ")}`);
  const open = sortFindings(after.findings);
  if (!open.length) lines.push("No automated findings left.");
  for (const f of open) if (f.severity !== "info") lines.push(compactLine(f, maxItems, beforeRules.has(f.rule) ? "" : " NEW"));
  pushInfo(lines, open);
  return lines.join("\n");
}

function compactLine(f, maxItems, tag = "") {
  const total = f.count || f.items.length;
  const more = total > maxItems ? ` (+${total - Math.min(maxItems, f.items.length)} more)` : "";
  const items = f.items.slice(0, maxItems).join(" | ");
  return `${ICON[f.severity]}${tag} ${f.rule}${items ? `: ${items}${more}` : ""}`;
}

function pushInfo(lines, findings) {
  const info = findings.filter((f) => f.severity === "info").map((f) => f.rule);
  if (info.length) lines.push(`· info: ${info.join(", ")}`);
}

function scoreLine(result) {
  return "Audit: " + CRITERIA.map((c) => `${SHORT[c]} ${result.scores[c]}`).join(" · ") + ` → ${result.total}/${result.max}`;
}

function sortFindings(findings) {
  const order = { error: 0, warn: 1, info: 2 };
  return [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
}
