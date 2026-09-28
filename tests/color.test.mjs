import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, composite, flattenBackground, requiredRatio, isLargeText, toHex } from "../skills/ui-ux-glowup/scripts/lib/color.mjs";

const WHITE = [255, 255, 255, 1];
const BLACK = [0, 0, 0, 1];

test("contrast: black on white is 21:1", () => {
  assert.equal(contrastRatio(BLACK, WHITE), 21);
});

test("contrast: identical colors are 1:1", () => {
  assert.equal(contrastRatio([120, 120, 120, 1], [120, 120, 120, 1]), 1);
});

test("contrast: #767676 on white just passes AA (4.54)", () => {
  assert.equal(contrastRatio([118, 118, 118, 1], WHITE), 4.54);
});

test("composite: 50% black over white is mid gray", () => {
  assert.deepEqual(composite([0, 0, 0, 0.5], WHITE), [128, 128, 128, 1]);
});

test("flattenBackground: stacks translucent layers over the first opaque one", () => {
  // element: 10% black, parent: opaque white
  assert.deepEqual(flattenBackground([[0, 0, 0, 0.1], WHITE]), [230, 230, 230, 1]);
});

test("flattenBackground: falls back to white when nothing is painted", () => {
  assert.deepEqual(flattenBackground([]), WHITE);
});

test("requiredRatio: large or bold text needs 3:1, body text 4.5:1", () => {
  assert.equal(requiredRatio(16, 400), 4.5);
  assert.equal(requiredRatio(24, 400), 3);
  assert.equal(requiredRatio(19, 700), 3);
  assert.equal(isLargeText(18, 700), false);
});

test("toHex", () => {
  assert.equal(toHex([10, 114, 239, 1]), "#0a72ef");
});
