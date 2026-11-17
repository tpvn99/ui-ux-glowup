// Installation and update diagnostics: what is missing, and the exact command that fixes it.
export function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map(Number), pb = String(b).replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}

export const MIN_NODE = 18;
export const BROWSER_NODE = 20;

/** Node 18 runs the scripts that do not open a browser; Playwright itself needs Node 20. */
export function checkNode(version) {
  const v = String(version).replace(/^v/, "");
  const major = Number(v.split(".")[0]);
  if (major >= BROWSER_NODE) return { name: "Node.js", status: "ok", detail: `v${v}` };
  if (major >= MIN_NODE) return { name: "Node.js", status: "warning", detail: `v${v}: the scripts that need no browser work, but Playwright requires Node ${BROWSER_NODE}+, so audits, screenshots and tests will not run`, fix: `Install Node ${BROWSER_NODE} or newer: https://nodejs.org` };
  return { name: "Node.js", status: "error", detail: `v${v} is too old (need ${MIN_NODE}+, ${BROWSER_NODE}+ for browser checks)`, fix: `Install Node ${BROWSER_NODE} or newer: https://nodejs.org` };
}

export function checkSkillVersion(local, latest) {
  if (!latest) return { name: "Skill version", status: "ok", detail: `${local} (run with --online to compare with the latest release)` };
  const c = compareVersions(local, latest);
  if (c === 0) return { name: "Skill version", status: "ok", detail: `${local} is the latest release` };
  if (c < 0) return { name: "Skill version", status: "warning", detail: `${local} installed, ${latest} available`, fix: "Update: npx skills add tpvn99/ui-ux-glowup  (or /plugin marketplace update ui-ux-glowup in Claude Code)" };
  return { name: "Skill version", status: "ok", detail: `${local} (newer than the latest release ${latest})` };
}

export function formatDoctor(checks) {
  const icon = { ok: "✓", warning: "!", error: "✗" };
  const lines = ["UI/UX Glowup — environment check"];
  for (const c of checks) {
    lines.push(`  ${icon[c.status]} ${c.name}: ${c.detail}`);
    if (c.fix) lines.push(`      → ${c.fix}`);
  }
  const errors = checks.filter((c) => c.status === "error").length, warnings = checks.filter((c) => c.status === "warning").length;
  lines.push(errors ? `${errors} problem(s) block the checks; the skill still works as a careful code review.` : warnings ? `Ready. ${warnings} optional item(s) above.` : "Everything is in place.");
  return lines.join("\n");
}
