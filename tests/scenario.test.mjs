import { test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateScenarios, compareScenarios, formatScenarios, runScenarios } from "../skills/ui-ux-glowup/scripts/scenario.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));
const doc = JSON.parse(readFileSync(fixture("journey.json"), "utf8"));

test("validateScenarios rejects malformed files with a precise message", () => {
  assert.equal(validateScenarios(doc).length, 0);
  assert.match(validateScenarios({})[0], /scenarios/);
  const bad = { scenarios: [{ name: "x", steps: [{ click: "a", fill: ["b", "c"] }, { fill: ["only"] }, { expect: { nope: 1 } }, {}] }] };
  assert.equal(validateScenarios(bad).length, 4);
});

test("compareScenarios and formatScenarios list only real regressions", () => {
  const r = (a) => ({ errors: [], results: a.map(([name, passed]) => ({ name, passed, actions: 2, failedStep: 2, step: 'click "x"', message: "m" })) });
  const reg = compareScenarios(r([["a", true], ["b", false], ["c", true]]), r([["a", false], ["b", false], ["c", true]]));
  assert.deepEqual(reg, ["a"]);
  assert.match(formatScenarios(r([["a", false], ["c", true]]), reg), /1\/2 passed[\s\S]*✗ a \[2 actions\] — step 2[\s\S]*REGRESSIONS.*a/);
});

test("scenarios pass on the working page and catch the broken redesign", { skip }, async () => {
  const ok = await runScenarios(fixture("journey.html"), doc);
  assert.deepEqual(ok.results.map((r) => r.passed), [true, true, true], JSON.stringify(ok.results));
  const bad = await runScenarios(fixture("journey-broken.html"), doc);
  const failed = bad.results.filter((r) => !r.passed).map((r) => r.name);
  assert.deepEqual(failed, ["Form validates then saves"]);
  assert.deepEqual(compareScenarios(ok, bad), ["Form validates then saves"]);
});

test("goals need a final check, budgets and profiles are validated", async () => {
  const { validateScenarios } = await import("../skills/ui-ux-glowup/scripts/lib/scenario.mjs");
  const ok = { scenarios: [{ name: "Find", goal: "A visitor finds the price", maxActions: 4, profile: "keyboard", steps: [{ click: "a" }, { expect: { visible: "#p" } }] }] };
  assert.deepEqual(validateScenarios(ok), []);
  const bad = { scenarios: [{ name: "x", goal: "Reach it", maxActions: 0, profile: "touch", steps: [{ click: "a" }] }] };
  const e = validateScenarios(bad).join("|");
  assert.match(e, /must end with an expect/); assert.match(e, /maxActions/); assert.match(e, /profile must be mouse or keyboard/);
});

test("journey hints: consecutive repeats and long forms, not a deliberate toggle", async () => {
  const { journeyHints } = await import("../skills/ui-ux-glowup/scripts/lib/scenario.mjs");
  assert.deepEqual(journeyHints([{ click: "a" }, { click: "a" }, { fill: ["#x", "1"] }, { fill: ["#x", "2"] }]).map((h) => h.rule), ["repeated-click", "repeated-fill"]);
  assert.deepEqual(journeyHints([{ click: "#all" }, { expect: { visible: "#bulk" } }, { click: "#all" }]), []);
  const many = Array.from({ length: 6 }, (_, i) => ({ fill: [`#f${i}`, "x"] }));
  assert.deepEqual(journeyHints(many).map((h) => h.rule), ["many-fields"]);
});

const journeyPage = fileURLToPath(new URL("./fixtures/goal.html", import.meta.url));
test("keyboard profile: a control that Tab cannot reach fails the journey, a budget is enforced", { skip }, async () => {
  const doc = { scenarios: [
    { name: "Real button", steps: [{ click: "#real" }, { expect: { visible: "#done" } }] },
    { name: "Clickable span", steps: [{ click: "#fake" }, { expect: { visible: "#done" } }] },
    { name: "Over budget", goal: "Reach the end", maxActions: 1, steps: [{ click: "#real" }, { click: "#real" }, { expect: { visible: "#done" } }] },
  ] };
  const mouse = await runScenarios(journeyPage, doc);
  assert.deepEqual(mouse.results.map((r) => r.passed), [true, true, false]);
  assert.match(mouse.results[2].message, /budget is 1/);
  const kb = await runScenarios(journeyPage, doc, { profile: "keyboard" });
  assert.deepEqual(kb.results.map((r) => r.passed), [true, false, false]);
  assert.match(kb.results[1].message, /cannot be reached with the keyboard/);
  assert.ok(kb.results[0].tabs >= 1 && kb.results[0].profile === "keyboard");
});
