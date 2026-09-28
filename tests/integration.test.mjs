// Runs the real scripts in a headless browser. Skipped when Playwright isn't installed.
// The examples suite needs network (Tailwind CDN, fonts, Unsplash) and only runs in CI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";
import { audit } from "../skills/ui-ux-glowup/scripts/audit.mjs";
import { capture } from "../skills/ui-ux-glowup/scripts/screenshot.mjs";
import { compare } from "../skills/ui-ux-glowup/scripts/compare.mjs";

let hasPlaywright = true;
try {
  await loadPlaywright();
} catch {
  hasPlaywright = false;
}
const EXAMPLES = new URL("../skills/ui-ux-glowup/assets/examples/", import.meta.url).pathname;
const FIXTURE = new URL("./fixtures/before.html", import.meta.url).pathname;

test("audit flags a bad page", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const r = await audit(FIXTURE);
  const rules = new Set(r.findings.map((f) => f.rule));
  for (const rule of ["lorem", "viewport-meta", "img-alt", "form-labels", "clickable-div", "spacing-grid", "contrast"]) {
    assert.ok(rules.has(rule), `expected ${rule}`);
  }
  assert.ok(r.total <= 30, `bad page scored ${r.total}`);
});

test("screenshot + compare produce files", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "glowup-"));
  const shots = await capture(FIXTURE, dir);
  assert.equal(shots.length, 2);
  for (const s of shots) assert.ok(existsSync(s.file));
  assert.ok(shots.find((s) => s.label === "mobile").overflow > 0, "fixture overflows on mobile");
  const file = await compare(FIXTURE, FIXTURE, join(dir, "compare.png"));
  assert.ok(existsSync(file));
});

test("every example scores at least 38/40 with no overflow", { skip: (!hasPlaywright || !process.env.CI) && "needs playwright + network (CI)" }, async () => {
  for (const f of readdirSync(EXAMPLES).filter((f) => f.endsWith(".html"))) {
    const r = await audit(join(EXAMPLES, f));
    const errors = r.findings.filter((x) => x.severity === "error" && !["h1-missing", "broken-images"].includes(x.rule));
    assert.deepEqual(errors.map((e) => e.rule), [], `${f} has errors`);
    assert.ok(r.total >= 38, `${f} scored ${r.total}`);
  }
});
