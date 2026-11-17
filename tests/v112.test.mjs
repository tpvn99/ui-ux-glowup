// v1.12: new examples stay healthy, and the tool fixes found while building them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";
import { runScenarios } from "../skills/ui-ux-glowup/scripts/scenario.mjs";
import { a11y } from "../skills/ui-ux-glowup/scripts/a11y.mjs";
import { responsive } from "../skills/ui-ux-glowup/scripts/responsive.mjs";
import { smoke } from "../skills/ui-ux-glowup/scripts/smoke.mjs";
import { audit } from "../skills/ui-ux-glowup/scripts/audit.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
const example = (n) => new URL(`../skills/ui-ux-glowup/assets/examples/${n}`, import.meta.url).pathname;

test("data-table.html: search, empty state, status filter, sorting and bulk selection all work", { skip }, async () => {
  const r = await runScenarios(example("data-table.html"), JSON.parse(readFileSync(fixture("data-table.scenarios.json"), "utf8")));
  assert.deepEqual(r.results.filter((x) => !x.passed), [], JSON.stringify(r.results));
  assert.deepEqual(r.errors, []);
});

test("the new examples have no accessibility or responsive error", { skip }, async () => {
  for (const f of ["clinic.html", "data-table.html"]) {
    const a = await a11y(example(f));
    assert.deepEqual(a.findings.filter((x) => x.severity === "error"), [], f);
    const r = await responsive(example(f), { widths: [320, 390, 768, 1440] });
    assert.deepEqual(r.findings.filter((x) => x.severity === "error"), [], f);
  }
});

test("every example keeps its headings from overflowing on long words", { skip }, async () => {
  const names = readdirSync(new URL("../skills/ui-ux-glowup/assets/examples/", import.meta.url)).filter((n) => n.endsWith(".html"));
  assert.ok(names.length >= 15);
  for (const n of names) assert.match(readFileSync(example(n), "utf8"), /h1, h2, h3 \{ overflow-wrap: anywhere; \}/, n);
});

test("smoke sees a sort that only reorders rows and ignores a visually hidden skip link", { skip }, async () => {
  const s = await smoke(example("data-table.html"));
  const balance = s.results.find((c) => c.label === "Balance");
  assert.notEqual(balance.effect, "none");
  const skipLink = s.results.find((c) => c.label === "Skip to content");
  assert.equal(skipLink.skipped, true);
  assert.deepEqual(s.results.filter((c) => c.effect === "none" && !c.skipped && !c.disabled && c.tag !== "input"), []);
});

test("a visually hidden skip link is not counted as a small touch target, sticky table cells are not 'bars'", { skip }, async () => {
  const a = await audit(fixture("skiplink.html"), { fast: true });
  assert.equal(a.findings.some((f) => f.rule === "tap-target" || f.rule === "tap-target-min"), false, JSON.stringify(a.findings.map((f) => f.rule)));
  const r = await responsive(fixture("skiplink.html"), { widths: [320, 360] });
  assert.equal(r.findings.some((f) => f.rule === "fixed-covers-screen"), false);
});
