// Declarative user-journey tests. A scenario file is JSON: { "scenarios": [ { "name", "steps": [...] } ] }.
// Steps: { goto } { click } { fill: [sel, value] } { select: [sel, value] } { check } { press }
//        { hover } { wait: ms } { expect: { visible | hidden | text:[sel, substr] | url | count:[sel, n]
//        | focusWithin | focusOutside | enabled | disabled | valid | invalid | attr:[sel, name, value] } }
// A selector is CSS, or "text=Label", or "role=button[name=Save]" (Playwright syntax).

const ACTIONS = ["goto", "click", "fill", "select", "check", "uncheck", "press", "hover", "wait", "expect"];
const EXPECTS = ["visible", "hidden", "text", "url", "count", "focusWithin", "focusOutside", "enabled", "disabled", "valid", "invalid", "attr"];

export function validateScenarios(doc) {
  const errors = [];
  const list = doc && Array.isArray(doc.scenarios) ? doc.scenarios : null;
  if (!list || !list.length) return ['File must be { "scenarios": [ { "name": "...", "steps": [...] } ] }'];
  list.forEach((s, i) => {
    const tag = `scenario ${i + 1}${s && s.name ? ` "${s.name}"` : ""}`;
    if (!s || !s.name) errors.push(`${tag}: missing name`);
    if (!s || !Array.isArray(s.steps) || !s.steps.length) return errors.push(`${tag}: no steps`);
    s.steps.forEach((st, j) => {
      const keys = Object.keys(st || {}).filter((k) => ACTIONS.includes(k));
      if (keys.length !== 1) return errors.push(`${tag} step ${j + 1}: exactly one of ${ACTIONS.join(", ")}`);
      const k = keys[0];
      const need2 = ["fill", "select"].includes(k);
      if (need2 && !(Array.isArray(st[k]) && st[k].length === 2)) errors.push(`${tag} step ${j + 1}: ${k} needs [selector, value]`);
      if (k === "expect") {
        const e = Object.keys(st.expect || {}).filter((x) => EXPECTS.includes(x));
        if (e.length !== 1) errors.push(`${tag} step ${j + 1}: expect needs exactly one of ${EXPECTS.join(", ")}`);
      }
    });
  });
  return errors;
}

const EFFORT = ["click", "fill", "select", "check", "uncheck", "press"];
export const LONG_JOURNEY = 6;

/** Actions a person has to perform (expectations and waits are free). */
export function effort(steps) {
  return steps.filter((st) => EFFORT.some((k) => k in st)).length;
}

export function describeStep(st) {
  const k = Object.keys(st).find((x) => ACTIONS.includes(x));
  const v = st[k];
  if (k === "expect") {
    const e = Object.keys(v)[0];
    return `expect ${e} ${JSON.stringify(v[e])}`;
  }
  return `${k} ${JSON.stringify(v)}`;
}

export function compareScenarios(before, after) {
  const was = new Map(before.results.map((r) => [r.name, r.passed]));
  return after.results.filter((r) => was.get(r.name) === true && !r.passed).map((r) => r.name);
}

export function formatScenarios(report, regressions = []) {
  const failed = report.results.filter((r) => !r.passed);
  const lines = [`Scenarios: ${report.results.length - failed.length}/${report.results.length} passed${report.errors.length ? ` · ${report.errors.length} JS errors` : ""}`];
  for (const r of report.results) {
    lines.push(`  ${r.passed ? "✓" : "✗"} ${r.name} [${r.actions} actions${r.actions > LONG_JOURNEY ? " — long journey: simplify or split" : ""}]${r.passed ? "" : ` — step ${r.failedStep}: ${r.step}\n      ${r.message}`}`);
  }
  for (const e of report.errors.slice(0, 5)) lines.push(`  ! JS error: ${e}`);
  if (regressions.length) lines.push(`REGRESSIONS (passed before, fail now): ${regressions.join(", ")}`);
  return lines.join("\n");
}
