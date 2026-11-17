import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateScenarios, compareScenarios, formatScenarios, runScenarios } from "../skills/ui-ux-glowup/scripts/scenario.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
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
