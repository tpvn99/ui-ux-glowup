import { test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { traversalFindings, a11yFindings } from "../skills/ui-ux-glowup/scripts/lib/a11y.mjs";
import { a11y } from "../skills/ui-ux-glowup/scripts/a11y.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));
const stop = (o) => ({ sel: "a", label: "x", top: 0, left: 0, w: 50, h: 20, obscuredBy: null, inDialog: false, ...o });
const rules = (l) => l.map((f) => f.rule).sort();
const S = (o = {}) => ({ invalidRoles: [], brokenRefs: [], hiddenFocusable: [], roleNotFocusable: [], duplicateIds: [], positiveTabindex: [], dialogsUnnamed: [], hasMain: true, hasSkipLink: true, linksBeforeMain: 0, authFields: [], autoplay: [], tables: [], ...o });

test("traversal: keyboard trap, covered focus, jumping order, nothing focusable", () => {
  const same = stop({ sel: "input#q", top: 100 });
  assert.deepEqual(rules(traversalFindings([stop({ top: 0 }), same, same, same])), ["keyboard-trap"]);
  assert.deepEqual(rules(traversalFindings([stop({ obscuredBy: "header.sticky", top: 300 })])), ["focus-obscured"]);
  const back = [stop({ sel: "a1", top: 900 }), stop({ sel: "a2", top: 100 }), stop({ sel: "a3", top: 900 }), stop({ sel: "a4", top: 100 }), stop({ sel: "a5", top: 900 }), stop({ sel: "a6", top: 100 })];
  assert.deepEqual(rules(traversalFindings(back)), ["focus-order-jumps"]);
  assert.deepEqual(rules(traversalFindings([null])), ["no-focusable"]);
  assert.deepEqual(traversalFindings([stop({ top: 0 }), stop({ sel: "b", top: 100 }), stop({ sel: "c", top: 400 })]), []);
});

test("static ARIA and WCAG 2.2 findings", () => {
  assert.deepEqual(rules(a11yFindings({ statics: S(), stops: [stop()] })), []);
  const bad = S({ invalidRoles: ["div role=x"], brokenRefs: ["input"], hiddenFocusable: ["div"], roleNotFocusable: ["div"], duplicateIds: ["#a ×2"], positiveTabindex: ["a"], dialogsUnnamed: ["div"], authFields: ["input"], autoplay: ["video"], tables: ["table"], hasMain: false });
  assert.deepEqual(rules(a11yFindings({ statics: bad, stops: [stop()] })), ["aria-broken-reference", "aria-hidden-focusable", "aria-invalid-role", "auth-paste-blocked", "autoplay-no-pause", "dialog-no-name", "duplicate-id", "no-main-landmark", "positive-tabindex", "role-not-focusable", "table-no-headers"]);
  assert.deepEqual(rules(a11yFindings({ statics: S({ hasSkipLink: false, linksBeforeMain: 9 }), stops: [stop()] })), ["no-skip-link"]);
  assert.deepEqual(rules(a11yFindings({ statics: S(), stops: [stop()], reflow: { overflow: 280, items: ["div.wide"] } })), ["reflow-320"]);
  assert.ok(a11yFindings({ statics: S({ duplicateIds: ["#a ×2"] }), stops: [stop()] })[0].fix.length > 10);
});

test("a11y.mjs catches real keyboard and ARIA problems and passes the corrected page", { skip }, async () => {
  const bad = await a11y(fixture("a11y2-bad.html"));
  const got = rules(bad.findings);
  for (const x of ["keyboard-trap", "aria-invalid-role", "aria-broken-reference", "aria-hidden-focusable", "role-not-focusable", "duplicate-id", "dialog-no-name", "auth-paste-blocked", "autoplay-no-pause", "table-no-headers", "reflow-320", "no-main-landmark"]) assert.ok(got.includes(x), `${x} in ${got}`);
  const good = await a11y(fixture("a11y2-good.html"));
  assert.deepEqual(rules(good.findings), [], JSON.stringify(good.findings));
});

test("custom widgets are operated with the keyboard: tabs, disclosure, dialog, menu", { skip }, async () => {
  const bad = await a11y(fixture("components-bad.html"));
  const got = rules(bad.findings);
  for (const x of ["tabs-no-arrow-keys", "disclosure-not-toggling", "modal-focus-not-moved", "modal-no-escape", "menu-no-escape"]) assert.ok(got.includes(x), `${x} in ${got}`);
  const good = await a11y(fixture("components-good.html"));
  assert.deepEqual(rules(good.findings), [], JSON.stringify(good.findings));
});

test("zoom 200% and 400%: overflow and clipped text are errors, a flexible page passes; fieldset needs a legend", { skip }, async () => {
  const bad = await a11y(fixture("zoom-bad.html"));
  const got = rules(bad.findings);
  for (const x of ["zoom-200-overflow", "zoom-200-clipped", "reflow-320"]) assert.ok(got.includes(x), `${x} in ${got}`);
  assert.deepEqual(rules((await a11y(fixture("zoom-good.html"))).findings), []);
});

test("static rules for zoom and fieldsets", () => {
  const s = { invalidRoles: [], brokenRefs: [], hiddenFocusable: [], roleNotFocusable: [], duplicateIds: [], positiveTabindex: [], dialogsUnnamed: [], hasMain: true, hasSkipLink: true, linksBeforeMain: 0, authFields: [], autoplay: [], tables: [], fieldsetsNoLegend: ["fieldset"] };
  const z = { overflow: 0, clipped: [], fixedShare: 60, offenders: [] };
  assert.deepEqual(rules(a11yFindings({ statics: s, stops: [stop()], zoom200: z, zoom400: z })), ["fieldset-no-legend", "zoom-fixed-covers"]);
});

test("comboboxes, listboxes, trees and drag and drop: operated with the keyboard, missing alternative reported", { skip }, async () => {
  const bad = await a11y(fixture("widgets-bad.html"));
  const got = rules(bad.findings);
  for (const x of ["combobox-no-arrow-down", "listbox-no-arrow-keys", "tree-no-arrow-keys", "drag-without-alternative", "slider-no-arrow-keys", "menubar-no-arrow-keys"]) assert.ok(got.includes(x), `${x} in ${got}`);
  const good = await a11y(fixture("widgets-good.html"));
  assert.deepEqual(rules(good.findings), [], JSON.stringify(good.findings));
});

test("grids and date pickers: arrow keys move between cells; a grid nobody can reach is reported", { skip }, async () => {
  const bad = await a11y(fixture("grid-bad.html"));
  const got = rules(bad.findings);
  for (const x of ["grid-no-arrow-keys", "grid-not-focusable"]) assert.ok(got.includes(x), `${x} in ${got}`);
  const good = await a11y(fixture("grid-good.html"));
  assert.deepEqual(rules(good.findings).filter((r) => r.startsWith("grid-")), [], JSON.stringify(good.findings));
});
