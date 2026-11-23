import { test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { uxFindings } from "../skills/ui-ux-glowup/scripts/lib/ux.mjs";
import { effort, LONG_JOURNEY, formatScenarios } from "../skills/ui-ux-glowup/scripts/lib/scenario.mjs";
import { ux } from "../skills/ui-ux-glowup/scripts/ux.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));
const data = (o = {}) => ({ url: "https://x.test/p", web: true, isHome: false, filled: [{ sel: "a.btn", label: "Start" }], fields: [], forms: [], emptyLists: [], navs: [], homeLink: true, ...o });
const rules = (d) => uxFindings(d, { context: "saas" }).map((f) => f.rule).sort();
const field = (o) => ({ sel: "input", type: "text", id: "", placeholder: false, labelled: true, autocomplete: "off", ...o });

test("a clean page has no UX finding", () => assert.deepEqual(rules(data()), []));

test("primary action: none, or four competing", () => {
  assert.deepEqual(rules(data({ filled: [] })), ["no-primary-action"]);
  const four = ["A", "B", "C", "D"].map((l) => ({ sel: "a", label: l }));
  assert.deepEqual(rules(data({ filled: four })), ["competing-primary-actions"]);
});

test("fields: placeholder-only label, missing autocomplete, wrong type", () => {
  const r = rules(data({ fields: [field({ id: "email your email", placeholder: true, labelled: false, autocomplete: null }), field({ type: "password", autocomplete: null })] }));
  assert.deepEqual(r, ["missing-autocomplete", "placeholder-as-label", "wrong-input-type"]);
  assert.deepEqual(rules(data({ fields: [field({ type: "email", id: "email", autocomplete: "email" })] })), []);
});

test("forms: long form and unsupported errors; states; navigation", () => {
  const f = { sel: "form#a", fields: 9, novalidate: true, hasRequired: true, announces: false };
  assert.deepEqual(rules(data({ forms: [f] })), ["errors-unsupported", "long-form"]);
  assert.deepEqual(rules(data({ emptyLists: [{ sel: "table", kind: "table" }] })), ["empty-state-missing"]);
  const nav = { sel: "nav", links: 9, anchorsOnly: false, hasCurrent: false, inHeader: true };
  assert.deepEqual(rules(data({ navs: [nav] })), ["nav-no-current", "nav-too-many"]);
  assert.deepEqual(rules(data({ navs: [{ ...nav, anchorsOnly: true, links: 4 }] })), []);
  assert.deepEqual(rules(data({ homeLink: false })), ["no-home-link"]);
  assert.deepEqual(rules(data({ homeLink: false, isHome: true })), []);
});

test("every finding carries a concrete fix", () => {
  const all = uxFindings(data({ filled: [], emptyLists: [{ sel: "ul", kind: "list" }], homeLink: false }), { context: "saas" });
  assert.ok(all.length >= 3 && all.every((f) => f.fix.length > 20));
});

test("effort counts only what a person does; long journeys are flagged", () => {
  assert.equal(effort([{ click: "a" }, { fill: ["a", "b"] }, { expect: { visible: "a" } }, { wait: 100 }, { press: "Tab" }]), 3);
  const r = { errors: [], results: [{ name: "Checkout", passed: true, actions: LONG_JOURNEY + 1 }] };
  assert.match(formatScenarios(r), /7 actions — long journey/);
});

test("ux.mjs finds the problems of a bad page and none on the corrected one", { skip }, async () => {
  const bad = await ux(fixture("ux-bad.html"));
  const got = bad.findings.map((f) => f.rule);
  for (const x of ["placeholder-as-label", "missing-autocomplete", "wrong-input-type", "errors-unsupported", "empty-state-missing", "nav-no-current", "competing-primary-actions"]) assert.ok(got.includes(x), x + " in " + got);
  const good = await ux(fixture("ux-good.html"));
  assert.deepEqual(good.findings.map((f) => f.rule), [], JSON.stringify(good.findings));
});

test("every UX finding says whether it was measured or is a judgement, and a judgement can be ignored", async () => {
  const { formatUx, uxLegend } = await import("../skills/ui-ux-glowup/scripts/lib/ux.mjs");
  const d = data({ filled: [], fields: [field({ placeholder: true, labelled: false })] });
  const all = uxFindings(d, { context: "saas" });
  const by = Object.fromEntries(all.map((f) => [f.rule, f.basis]));
  assert.equal(by["no-primary-action"], "judgement");
  assert.equal(by["placeholder-as-label"], "measured");
  assert.ok(all.every((f) => f.basis === "judgement" || f.basis === "measured"));
  assert.match(formatUx(all, "desktop"), /\[high · judgement\] no-primary-action/);
  assert.match(formatUx(all, "desktop"), /\[high\] placeholder-as-label/);
  assert.match(uxLegend(all), /ignore it with --ignore/);
  const kept = uxFindings(d, { context: "saas", ignore: ["no-primary-action"] });
  assert.ok(!kept.some((f) => f.rule === "no-primary-action"));
  assert.equal(kept.ignored, 1);
  assert.match(formatUx(kept, "desktop"), /1 ignored on request/);
  assert.equal(uxLegend(uxFindings(data(), { context: "saas" })), "");
});
