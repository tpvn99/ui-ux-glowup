// Human-readable audit report (pure — also bundled into audit.browser.js).
import { CRITERIA } from "./analyze.mjs";

const ICON = { error: "✗", warn: "!", info: "·" };
const SHORT = { Hierarchy: "Hierarchy", Typography: "Typography", Spacing: "Spacing", Components: "Components", Visuals: "Visuals*", Content: "Content*", Responsive: "Responsive", Accessibility: "A11y", SEO: "SEO" };

/** Format an audit result ({ target, scores, total, max, findings, tokens, note? }) like references/audit.md. */
export function formatReport(result) {
  const lines = [];
  lines.push(`Automated audit — ${result.target}`);
  if (result.note) lines.push(result.note);
  lines.push("Audit: " + CRITERIA.map((c) => `${SHORT[c]} ${result.scores[c]}`).join(" · ") + ` → ${result.total}/${result.max}`);
  lines.push("(* partly measurable — confirm with a visual review of the screenshots)");
  lines.push("");
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity]);
  if (!sorted.length) lines.push("No automated findings.");
  for (const f of sorted) {
    lines.push(`${ICON[f.severity]} [${f.criterion}] ${f.message}${f.count > f.items.length ? ` (${f.count} total)` : ""}`);
    for (const item of f.items) lines.push(`    ${item}`);
  }
  const t = result.tokens;
  if (t) {
    lines.push("");
    lines.push("Measured tokens");
    lines.push(`  Fonts: ${t.fonts.map((f) => `${f.family} ${f.share}%`).join(", ")}`);
    lines.push(`  Type scale (px): ${t.typeScale.join(" / ")}`);
    lines.push(`  Spacing on 4px grid: ${t.gridConformity}% · most used: ${t.spacing.slice(0, 8).map((s) => s.px).join(", ")}`);
    lines.push(`  Radii (px): ${t.radii.map((r) => r.px).join(", ") || "none"}`);
  }
  return lines.join("\n");
}
