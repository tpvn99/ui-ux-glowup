import { test } from "node:test";
import assert from "node:assert/strict";
import { diffSmoke, smokeFindings, classifyEffect, unsafeLabel } from "../skills/ui-ux-glowup/scripts/lib/smoke.mjs";
import { smoke } from "../skills/ui-ux-glowup/scripts/smoke.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
const rules = (l) => l.map((f) => f.rule).sort();

test("classifyEffect tells navigation, toggle, UI change and nothing apart", () => {
  const b = { url: "http://x/", html: 1, text: 1, expanded: 0, dialogs: 0, selected: 0 };
  assert.equal(classifyEffect(b, { ...b, url: "http://x/a" }), "navigates");
  assert.equal(classifyEffect(b, { ...b, url: "http://x/#a" }), "scrolls");
  assert.equal(classifyEffect(b, { ...b, expanded: 1 }), "toggles");
  assert.equal(classifyEffect(b, { ...b, html: 9 }), "changes-ui");
  assert.equal(classifyEffect(b, b), "none");
});

test("unsafeLabel catches destructive and payment controls in English and French", () => {
  for (const l of ["Delete account", "Supprimer", "Log out", "Se déconnecter", "Payer maintenant"]) assert.ok(unsafeLabel(l), l);
  assert.equal(unsafeLabel("Add item"), false);
});

test("diffSmoke reports missing, broken controls, lost validation and new errors", () => {
  const c = (key, effect, extra = {}) => ({ key, label: key, tag: "button", effect, ...extra });
  const form = (req, blocks) => ({ key: "f", fields: [{ name: "email", type: "email", required: req, labelled: true }], blocksEmptySubmit: blocks });
  const before = { results: [c("a", "toggles"), c("b", "changes-ui"), c("c", "navigates")], forms: [form(true, true)], errors: [] };
  const after = { results: [c("a", "none"), c("b", "changes-ui")], forms: [form(false, false)], errors: ["boom"] };
  assert.deepEqual(rules(diffSmoke(before, after)), ["control-broken", "control-missing", "new-js-error", "validation-lost", "validation-lost"]);
  assert.deepEqual(diffSmoke(before, before), []);
});

test("smokeFindings flags dead controls, empty links and unlabelled fields", () => {
  const snap = {
    results: [{ key: "x", label: "Go", tag: "button", effect: "none" }, { key: "y", label: "Docs", tag: "a", href: "#", effect: "scrolls" }],
    forms: [{ key: "f", fields: [{ name: "q", type: "text", required: false, labelled: false }] }],
    errors: [], failedRequests: [],
  };
  assert.deepEqual(rules(smokeFindings(snap)), ["dead-control", "empty-link", "field-unlabelled"]);
});

test("smoke on a real page detects a redesign that broke the menu, the form and removed a link", { skip }, async () => {
  const before = await smoke(fixture("smoke-before.html"));
  const after = await smoke(fixture("smoke-after.html"));
  assert.equal(before.results.find((c) => c.label === "Delete account").skipped, true);
  assert.equal(before.results.find((c) => c.label === "Menu").effect, "toggles");
  assert.equal(before.results.find((c) => c.label === "Add item").effect, "changes-ui");
  const r = rules(diffSmoke(before, after));
  for (const x of ["control-missing", "control-broken", "validation-lost", "new-js-error"]) assert.ok(r.includes(x), x);
  assert.deepEqual(diffSmoke(before, before), []);
});
