import { test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { regionsFromCells, unstableCells, judge, formatVisualDiff } from "../skills/ui-ux-glowup/scripts/lib/visualdiff.mjs";
import { visualDiff } from "../skills/ui-ux-glowup/scripts/visual-diff.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fx = (n) => fileURLToPath(new URL(`./fixtures/vd/${n}`, import.meta.url));

test("regions: changed cells that touch form one box; far-apart ones are separate; noise below 1% is ignored", () => {
  const cols = 6, rows = 4, cells = new Array(cols * rows).fill(0);
  [[0, 0], [1, 0], [1, 1]].forEach(([x, y]) => (cells[y * cols + x] = 400));
  cells[3 * cols + 5] = 900;
  cells[2 * cols + 3] = 5;
  const r = regionsFromCells(cells, cols, rows, 40);
  assert.deepEqual(r.map((g) => [g.x, g.y, g.w, g.h]), [[0, 0, 80, 80], [200, 120, 40, 40]]);
  assert.deepEqual(unstableCells([0, 3, 0, 1]), [1, 3]);
});

test("judge: tolerance on changed pixels, separate threshold for layout shift", () => {
  const base = { w: 1000, h: 1000, heightA: 2000, heightB: 2000 };
  assert.equal(judge({ ...base, changed: 5000 }, { tolerance: 1 }).verdict, "same");
  const c = judge({ ...base, changed: 30000 }, { tolerance: 1 });
  assert.equal(c.verdict, "changed"); assert.equal(c.percent, 3); assert.match(c.reasons[0], /3% of the pixels/);
  const l = judge({ ...base, changed: 0, heightB: 2400 }, { layoutShift: 5 });
  assert.equal(l.verdict, "changed"); assert.match(l.reasons[0], /20% taller/);
  assert.match(formatVisualDiff([{ size: 390, ...c, regions: [{ y: 80, w: 360, h: 80, element: 'div#plan "Starter"' }], maskedCells: 4, diffFile: "d.png" }], { tolerance: 1, layoutShift: 5, autoMask: true }), /✗ 390px: 3% changed[\s\S]*div#plan/);
});

test("a page that only differs by a live clock is the same; a recolored and shifted page is not, with the element named", { skip }, async () => {
  const out = mkdtempSync(join(tmpdir(), "glowup-vd-"));
  const same = await visualDiff(fx("before.html"), fx("same.html"), { sizes: [390], out });
  assert.equal(same[0].verdict, "same"); assert.ok(same[0].maskedCells > 0 && existsSync(same[0].diffFile));
  const changed = await visualDiff(fx("before.html"), fx("changed.html"), { sizes: [390], out });
  assert.equal(changed[0].verdict, "changed"); assert.ok(changed[0].percent > 1);
  assert.ok(changed[0].regions.some((g) => /#plan/.test(g.element || "")), JSON.stringify(changed[0].regions));
  const tolerant = await visualDiff(fx("before.html"), fx("changed.html"), { sizes: [390], tolerance: 50, layoutShift: 100 });
  assert.equal(tolerant[0].verdict, "same");
});

test("--mask hides a region by selector when auto-masking is off", { skip }, async () => {
  const masked = await visualDiff(fx("before.html"), fx("same.html"), { sizes: [390], autoMask: false, mask: ["#clock"] });
  assert.equal(masked[0].percent, 0);
});
