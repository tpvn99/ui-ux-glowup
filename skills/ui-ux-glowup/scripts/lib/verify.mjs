// Report model for verify.mjs: merges every check into one classified, comparable report.
// Pure: input is the snapshots, output is a structured report and its Markdown / HTML renderings.
import { diffSmoke } from "./smoke.mjs";
import { diffInventories } from "./inventory.mjs";
import { compareScenarios } from "./scenario.mjs";

export const CATEGORIES = ["Functionality", "UX", "Accessibility", "Performance", "Visual quality", "Responsive", "SEO"];
const VISUAL = new Set(["Hierarchy", "Typography", "Spacing", "Components", "Visuals", "Content"]);
const RANK = { error: 0, warning: 1, info: 2 };
const IMPACT_RANK = { high: 0, medium: 1, low: 2 };
const STYLE_RULES = new Set(["shadows", "radii", "type-scale", "font-families", "text-colors", "spacing-grid", "section-rhythm", "heading-tracking", "uppercase-text", "justified-text", "long-sentences", "long-paragraphs", "carousel-affordance"]);

/** A usability or technical problem, or a matter of taste: taste never outranks a problem people will hit. */
export function kindOf(source, rule, given) {
  if (given) return given;
  if (source === "audit" && (rule.startsWith("ai-") || STYLE_RULES.has(rule))) return "style";
  return "problem";
}
const order = (a, b) => RANK[a.severity] - RANK[b.severity] || (a.kind === "style") - (b.kind === "style") || IMPACT_RANK[a.impact || "medium"] - IMPACT_RANK[b.impact || "medium"] || (a.state === "regression" ? -1 : 0) - (b.state === "regression" ? -1 : 0);
const sev = (s) => (s === "warn" ? "warning" : s === "error" ? "error" : s === "info" ? "info" : "warning");

function categoryOfAudit(criterion) {
  if (VISUAL.has(criterion)) return "Visual quality";
  if (criterion === "Responsive") return "Responsive";
  if (criterion === "Accessibility") return "Accessibility";
  if (criterion === "SEO") return "SEO";
  return "Visual quality";
}

/** All findings of one snapshot, in one shape. Accepted brand choices are left out (not issues). */
export function normalize(snap, smokeFindings = []) {
  const out = [];
  const push = (source, category, f) => { const severity = sev(f.severity); out.push({ source, category, severity, rule: f.rule, message: f.message, items: (f.items || []).map(String).slice(0, 4), fix: f.fix || "", key: `${source}:${f.rule}`, impact: f.impact || (severity === "error" ? "high" : "medium"), kind: kindOf(source, f.rule, f.kind === "usability" ? "problem" : f.kind) }); };
  for (const f of snap.audit?.findings || []) if (!f.accepted) push("audit", categoryOfAudit(f.criterion), f);
  for (const f of snap.ux?.findings || []) push("ux", "UX", f);
  for (const f of snap.a11y?.findings || []) push("a11y", "Accessibility", f);
  for (const f of snap.perf?.findings || []) push("perf", "Performance", f);
  for (const f of snap.responsive?.findings || []) push("responsive", "Responsive", { ...f, items: f.items });
  for (const f of smokeFindings) push("smoke", "Functionality", f);
  for (const r of snap.scenarios?.results || []) if (!r.passed) push("scenario", "Functionality", { rule: "scenario-failed", severity: "error", message: `Scenario "${r.name}" fails at step ${r.failedStep}: ${r.step} — ${r.message}`, items: [] });
  return out;
}

const ERROR_ITEMS = new Set(["form field", "phone", "email", "postal address", "legal link"]);

export function regressions(before, after) {
  const out = [];
  if (before.smoke && after.smoke) for (const d of diffSmoke(before.smoke, after.smoke)) out.push({ source: "smoke", category: "Functionality", severity: sev(d.severity), rule: d.rule, message: d.message, items: [], fix: "Restore the behaviour, or confirm the change was intended.", key: `reg:${d.rule}:${d.key}` });
  if (before.inventory && after.inventory) for (const m of diffInventories(before.inventory, after.inventory).missing) out.push({ source: "inventory", category: "Functionality", severity: ERROR_ITEMS.has(m.category) ? "error" : "warning", rule: "element-missing", message: `${m.category} no longer on the page: ${m.item}`, items: [], fix: "Put it back, or list its removal under Product decisions to confirm.", key: `reg:inv:${m.category}:${m.item}` });
  if (before.scenarios && after.scenarios) for (const name of compareScenarios(before.scenarios, after.scenarios)) out.push({ source: "scenario", category: "Functionality", severity: "error", rule: "scenario-regressed", message: `Scenario "${name}" passed before and fails now.`, items: [], fix: "This journey was working: find what the change broke.", key: `reg:sc:${name}` });
  return out;
}

export function buildReport({ target, date, before = null, after }) {
  const mode = before ? "compare" : "audit";
  const now = normalize(after, after.smokeFindings);
  const was = before ? normalize(before, before.smokeFindings) : [];
  const wasKeys = new Set(was.filter((f) => f.severity !== "info").map((f) => f.key));
  const nowKeys = new Set(now.map((f) => f.key));
  const regs = before ? regressions(before, after) : [];
  const tagged = now.map((f) => ({ ...f, state: before ? (wasKeys.has(f.key) ? "open" : "new") : "open" }));
  const fixed = was.filter((f) => f.severity !== "info" && !nowKeys.has(f.key));
  const categories = CATEGORIES.map((name) => {
    const list = [...tagged, ...regs.map((r) => ({ ...r, state: "regression" }))].filter((f) => f.category === name).sort(order);
    const errors = list.filter((f) => f.severity === "error").length;
    const warnings = list.filter((f) => f.severity === "warning").length;
    return { name, status: errors ? "error" : warnings ? "warning" : "ok", errors, warnings, fixed: fixed.filter((f) => f.category === name).length, new: list.filter((f) => f.state === "new" || f.state === "regression").length, findings: list };
  });
  const all = categories.flatMap((c) => c.findings);
  const newErrors = all.filter((f) => f.severity === "error" && (f.state === "new" || f.state === "regression"));
  const errors = all.filter((f) => f.severity === "error");
  const verdict = mode === "compare" ? (regs.some((r) => r.severity === "error") || newErrors.length ? "FAIL" : errors.length || all.some((f) => f.state === "new" || f.state === "regression") ? "REVIEW" : "PASS") : errors.length ? "FAIL" : all.length ? "REVIEW" : "PASS";
  const m = (s) => (s?.perf?.metrics ? { lcp: s.perf.metrics.lcp, cls: s.perf.metrics.cls, tbt: s.perf.metrics.tbt, weight: s.perf.weightBytes, requests: s.perf.requests, profile: s.perf.profile } : null);
  const notTested = [
    after.scenarios ? null : "User journeys: no scenario file given (`--scenarios`), so only per-control smoke tests ran.",
    "Real devices and field data (the performance numbers are lab measurements on this machine).",
    "Screen reader behaviour, zoom to 200%, and anything that needs a human eye on the screenshots.",
    "Other browsers (run `cross-browser.mjs`) and other languages (`responsive.mjs --stress long`).",
    "Requests to known analytics and tag-manager hosts are blocked, so the audit does not count as a visit; their weight is not in the numbers (`--allow-tracking` loads them; `--block host` adds your own experiment or stats endpoint).",
    after.perf ? null : "Performance was skipped.",
    after.responsive ? null : "The size sweep was skipped (`--fast`).",
  ].filter(Boolean);
  const top = all.filter((f) => f.severity !== "info" && (f.kind !== "style" || f.severity === "error")).sort(order).slice(0, 5);
  return {
    mode, target, date, verdict,
    score: { before: before?.audit ? { total: before.audit.total, max: before.audit.max, scores: before.audit.scores } : null, after: after.audit ? { total: after.audit.total, max: after.audit.max, scores: after.audit.scores } : null },
    context: after.ux?.context || null,
    visual: after.visual || null,
    metrics: { before: m(before), after: m(after) }, categories, fixed, regressions: regs, top, notTested,
  };
}

const ICON = { error: "✗", warning: "!", ok: "✓", info: "·" };
const f1 = (n) => (n == null ? "n/a" : (n / 1000).toFixed(1) + " s");
const kb = (b) => (b == null ? "n/a" : b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB");

export function toMarkdown(r) {
  const L = [];
  L.push(`# UI/UX report: ${r.target}`, "", `${r.date} · ${r.mode === "compare" ? "before / after" : "audit only, nothing was changed"} · **Verdict: ${r.verdict}**`, "");
  L.push(r.verdict === "PASS" ? "Nothing new broke and no error remains." : r.verdict === "FAIL" ? (r.mode === "compare" ? "Something that worked before is broken, or the change introduced an error." : "Errors were found.") : "No new error, but issues remain or changed: review them below.", "");
  if (r.context) L.push(`UX was checked as a **${r.context}** site. Findings are ordered by severity, then impact; matters of style come after problems people will hit.`, "");
  L.push("## Summary by category", "", "A status per category, not one blended score: a high number in one area never hides a problem in another.", "", "| Category | Status | Errors | Warnings | New | Fixed |", "|---|---|---|---|---|---|");
  for (const c of r.categories) L.push(`| ${c.name} | ${ICON[c.status]} ${c.status === "ok" ? "ok" : c.status} | ${c.errors} | ${c.warnings} | ${r.mode === "compare" ? c.new : "–"} | ${r.mode === "compare" ? c.fixed : "–"} |`);
  if (r.top.length) { L.push("", "## Fix first", ""); r.top.forEach((f, i) => L.push(`${i + 1}. **${f.category}**: ${f.message}${f.state === "regression" || f.state === "new" ? ` _(${f.state})_` : ""}`)); }
  if (r.score.after) {
    L.push("", "## Visual audit score", "");
    L.push(`${r.score.before ? `${r.score.before.total} → ` : ""}**${r.score.after.total} / ${r.score.after.max}**. Nine criteria scored 0–5 by \`audit.mjs\`; ${Object.keys(r.score.after.scores).length} of them partly rely on a human check. It measures what an automatic audit can see.`, "");
    L.push("| Criterion | " + (r.score.before ? "Before | " : "") + "After |", "|---|" + (r.score.before ? "---|" : "") + "---|");
    for (const [k, v] of Object.entries(r.score.after.scores)) L.push(`| ${k} | ${r.score.before ? `${r.score.before.scores[k] ?? "–"} | ` : ""}${v} |`);
  }
  if (r.visual && r.visual.length) {
    L.push("", "## Visual change, before → after", "", "Pixels that differ between the screenshot taken before and one taken now (content that moves by itself is ignored). After a redesign most of the page changes; after a refactor nothing should.", "", "| Width | Changed | Page height | Where |", "|---|---|---|---|");
    for (const v of r.visual) L.push(`| ${v.size}px | ${v.percent}% | ${v.heightBefore} → ${v.heightAfter}px (${v.heightDelta > 0 ? "+" : ""}${v.heightDelta}%) | ${v.regions.slice(0, 3).map((g) => `y=${g.y}px ${g.w}×${g.h}`).join("; ") || "–"} |`);
  }
  if (r.metrics.after) {
    const a = r.metrics.after, b = r.metrics.before;
    L.push("", `## Performance (${a.profile} profile, lab measurement)`, "", "| Metric | " + (b ? "Before | " : "") + "After |", "|---|" + (b ? "---|" : "") + "---|");
    const row = (name, get) => L.push(`| ${name} | ${b ? `${get(b)} | ` : ""}${get(a)} |`);
    row("LCP", (x) => f1(x.lcp)); row("CLS", (x) => x.cls ?? "n/a"); row("Blocking time", (x) => `${x.tbt ?? "n/a"} ms`); row("Weight", (x) => kb(x.weight)); row("Requests", (x) => x.requests ?? "n/a");
  }
  for (const c of r.categories) {
    if (!c.findings.length) continue;
    L.push("", `## ${c.name}`, "");
    for (const f of c.findings) {
      L.push(`- ${ICON[f.severity]} \`${f.rule}\`${f.impact === "high" && f.severity !== "error" ? " **high impact**" : ""}${f.kind === "style" ? " _(style, optional)_" : ""}${f.state && r.mode === "compare" ? ` _(${f.state})_` : ""}: ${f.message}`);
      if (f.items.length) L.push(`  - ${f.items.join(" · ")}`);
      if (f.fix) L.push(`  - Fix: ${f.fix}`);
    }
  }
  if (r.fixed.length) { L.push("", "## Fixed since before", ""); for (const f of r.fixed.slice(0, 40)) L.push(`- ✓ ${f.category}: \`${f.rule}\``); }
  L.push("", "## What was not tested", ""); for (const n of r.notTested) L.push(`- ${n}`);
  L.push("", "## Reading this report", "", "A clean report means these automatic checks found nothing. It does not prove the interface is accessible, fast for everyone, or pleasant to use: those need real users and real devices.");
  return L.join("\n") + "\n";
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function toHtml(r) {
  const badge = (s) => `<span class="b ${s}">${ICON[s] || ""} ${s}</span>`;
  const rows = r.categories.map((c) => `<tr><td>${esc(c.name)}</td><td>${badge(c.status)}</td><td>${c.errors}</td><td>${c.warnings}</td><td>${r.mode === "compare" ? c.new : "–"}</td><td>${r.mode === "compare" ? c.fixed : "–"}</td></tr>`).join("");
  const sections = r.categories.filter((c) => c.findings.length).map((c) => `<h2>${esc(c.name)}</h2><ul>${c.findings.map((f) => `<li>${badge(f.severity)} <code>${esc(f.rule)}</code>${r.mode === "compare" && f.state ? ` <em>${esc(f.state)}</em>` : ""}: ${esc(f.message)}${f.items.length ? `<div class="m">${f.items.map(esc).join(" · ")}</div>` : ""}${f.fix ? `<div class="m">Fix: ${esc(f.fix)}</div>` : ""}</li>`).join("")}</ul>`).join("");
  const score = r.score.after ? `<h2>Visual audit score</h2><p>${r.score.before ? `${r.score.before.total} → ` : ""}<strong>${r.score.after.total} / ${r.score.after.max}</strong>. It measures what an automatic audit can see.</p>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI/UX report: ${esc(r.target)}</title>
<style>:root{--bg:#fff;--fg:#14181f;--mu:#566170;--ln:#d9dee5}@media(prefers-color-scheme:dark){:root{--bg:#0f1318;--fg:#e8ecf1;--mu:#9aa6b4;--ln:#2a313b}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif}main{max-width:52rem;margin:0 auto;padding:2rem 1rem}h1{font-size:1.7rem}h2{margin-top:2rem;font-size:1.2rem}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--ln);padding:.5rem .4rem;text-align:left}ul{padding-left:1.1rem}li{margin:.6rem 0}.m{color:var(--mu);font-size:.9rem}code{font-size:.9em}
.b{display:inline-block;padding:0 .45rem;border-radius:.3rem;font-size:.8rem;font-weight:600;border:1px solid var(--ln)}.b.error{color:#b42318}.b.warning{color:#8a5a00}.b.ok{color:#18794e}@media(prefers-color-scheme:dark){.b.error{color:#ff8a80}.b.warning{color:#f5c26b}.b.ok{color:#6fd3a0}}
.v{font-size:1.2rem;font-weight:700}</style></head><body><main>
<h1>UI/UX report: ${esc(r.target)}</h1><p class="m">${esc(r.date)} · ${r.mode === "compare" ? "before / after" : "audit only, nothing was changed"}</p><p class="v">Verdict: ${esc(r.verdict)}</p>
<h2>Summary by category</h2><table><thead><tr><th>Category</th><th>Status</th><th>Errors</th><th>Warnings</th><th>New</th><th>Fixed</th></tr></thead><tbody>${rows}</tbody></table>
${r.top.length ? `<h2>Fix first</h2><ol>${r.top.map((f) => `<li><strong>${esc(f.category)}</strong>: ${esc(f.message)}</li>`).join("")}</ol>` : ""}${score}${sections}
<h2>What was not tested</h2><ul>${r.notTested.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
<p class="m">A clean report means these automatic checks found nothing. It does not prove the interface is accessible, fast for everyone, or pleasant to use.</p></main></body></html>`;
}

export function summaryLine(r) {
  const e = r.categories.reduce((a, c) => a + c.errors, 0), w = r.categories.reduce((a, c) => a + c.warnings, 0);
  return `Verdict: ${r.verdict} · ${e} error(s), ${w} warning(s)${r.mode === "compare" ? ` · ${r.regressions.length} regression(s) · ${r.fixed.length} fixed` : ""}`;
}
