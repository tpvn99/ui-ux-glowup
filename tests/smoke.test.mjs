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

test("a renamed link with the same target is a warning, not a missing control", () => {
  const link = (label, href) => ({ key: `a||${label.toLowerCase()}|${href}`, label, tag: "a", href, effect: "navigates" });
  const d = diffSmoke({ results: [link("Click here", "/pricing")], forms: [], errors: [] }, { results: [link("See pricing", "/pricing")], forms: [], errors: [] });
  assert.deepEqual(rules(d), ["control-renamed"]);
  assert.equal(d[0].severity, "warning");
  const gone = diffSmoke({ results: [link("Click here", "/pricing")], forms: [], errors: [] }, { results: [link("See pricing", "/plans")], forms: [], errors: [] });
  assert.deepEqual(rules(gone), ["control-missing"]);
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

test("errors thrown by another page (a clicked link leads to the browser's directory listing) are not the tested page's", { skip }, async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs"); const { join } = await import("node:path"); const { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "glowup-nav-"));
  writeFileSync(join(d, "page.html"), `<!doctype html><html lang="en"><head><title>t</title></head><body><a href="file://${d}/">Browse the folder</a><a href="gone.html">Missing</a><button onclick="void 0">Fine</button></body></html>`);
  const s = await smoke(join(d, "page.html"));
  assert.deepEqual(s.errors, [], "a directory listing's own script errors must not be blamed on the page");
  assert.ok(s.results.some((c) => c.label === "Browse the folder"));
});

test("a skip link parked off-screen is skipped, not reported as a dead control", { skip }, async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs"); const { join } = await import("node:path"); const { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "glowup-skip-"));
  writeFileSync(join(d, "p.html"), '<!doctype html><html lang="en"><head><title>t</title><style>.skip{position:absolute;left:-999px}.skip:focus{left:8px}</style></head><body><a class="skip" href="#m">Skip to content</a><main id="m"><button onclick="document.body.append(document.createElement(&quot;hr&quot;))">Real</button></main></body></html>');
  const s = await smoke(join(d, "p.html"));
  assert.equal(s.results.find((c) => c.label === "Skip to content").skipped, true);
  assert.deepEqual(s.results.filter((c) => c.effect === "none" && !c.skipped && !c.disabled), []);
});

test("an already-active toggle (aria-pressed, aria-selected, aria-current) that does nothing when clicked again is not dead", async () => {
  const { smokeFindings } = await import("../skills/ui-ux-glowup/scripts/lib/smoke.mjs");
  const snap = (active) => ({ results: [{ key: "k", label: "All", tag: "button", effect: "none", active }], forms: [], errors: [], failedRequests: [] });
  assert.deepEqual(smokeFindings(snap(true)).map((f) => f.rule), []);
  assert.deepEqual(smokeFindings(snap(false)).map((f) => f.rule), ["dead-control"]);
});
