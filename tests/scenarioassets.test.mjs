import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { validateScenarios } from "../skills/ui-ux-glowup/scripts/lib/scenario.mjs";
import { runScenarios } from "../skills/ui-ux-glowup/scripts/scenario.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const dir = new URL("../skills/ui-ux-glowup/assets/scenarios/", import.meta.url);
const ex = (n) => new URL(`../skills/ui-ux-glowup/assets/examples/${n}`, import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));

test("every shipped scenario file is valid, and every template says what to replace", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 8);
  for (const f of files) {
    const doc = load(f);
    assert.deepEqual(validateScenarios(doc), [], f);
    assert.ok(doc.scenarios.every((s) => s.goal && s.maxActions), `${f} states a goal and a budget`);
    if (f.endsWith(".template.json")) assert.match(JSON.stringify(doc), /REPLACE:/, f);
  }
});

test("the working journeys reach their goal within budget, with a mouse and with the keyboard alone", { skip }, async () => {
  for (const [page, file] of [["pricing.html", "pricing-understand-offer.json"], ["settings.html", "settings-change.json"], ["product-page.html", "product-choose-size.json"]]) {
    for (const profile of ["mouse", "keyboard"]) {
      const r = await runScenarios(ex(page), load(file), { profile });
      assert.deepEqual(r.results.filter((x) => !x.passed), [], `${page} (${profile}): ${JSON.stringify(r.results)}`);
      if (profile === "keyboard") assert.ok(r.results.every((x) => x.tabs >= 1));
    }
  }
});
