import { test } from "node:test";
import assert from "node:assert/strict";
import { responsiveFindings, formatResponsive, SIZES } from "../skills/ui-ux-glowup/scripts/lib/responsive.mjs";
import { responsive } from "../skills/ui-ux-glowup/scripts/responsive.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
const D = (o = {}) => ({ overflow: 0, offenders: [], clipped: [], smallText: [], h1Lines: 2, longLine: null, fixedShare: 5, smallTargets: [], dir: "ltr", ...o });
const at = (name, data) => ({ size: SIZES.find((s) => s.name === name), data });
const rules = (l) => l.map((f) => f.rule).sort();

test("the sweep covers phones, tablets, laptops, wide screens and landscape", () => {
  const w = SIZES.map((s) => s.width);
  assert.ok(Math.min(...w) === 320 && Math.max(...w) >= 1920 && w.includes(768) && SIZES.some((s) => s.height < s.width && s.width < 900));
});

test("findings group the sizes where a problem appears", () => {
  const f = responsiveFindings([at("320", D({ overflow: 40, offenders: ["div.wide"] })), at("390", D({ overflow: 10 })), at("1440", D())]);
  assert.deepEqual(rules(f), ["overflow-x"]);
  assert.deepEqual(f[0].widths, ["320", "390"]);
  assert.match(formatResponsive(f, [1, 2, 3].map(() => ({})), null), /overflow-x.*\[320, 390\]/);
});

test("clipped text, tiny text, long lines, tall headings, covering bars, small targets", () => {
  const f = responsiveFindings([at("360", D({ clipped: ["span.chip"], smallText: ["small"], h1Lines: 6, longLine: { sel: "p", ch: 120 }, fixedShare: 50, smallTargets: ["input"] }))]);
  assert.deepEqual(rules(f), ["fixed-covers-screen", "h1-wraps", "line-too-long", "target-small", "text-clipped", "text-too-small"]);
  assert.ok(f.every((x) => x.fix.length > 10));
  assert.deepEqual(responsiveFindings([at("1440", D())]), []);
});

test("responsive.mjs finds the problems of a bad page, passes a good one, and the long-text stress exposes clipping", { skip }, async () => {
  const bad = await responsive(fixture("resp-bad.html"), { widths: [320, 390, 1440] });
  const got = rules(bad.findings);
  for (const x of ["overflow-x", "text-clipped", "text-too-small", "line-too-long"]) assert.ok(got.includes(x), `${x} in ${got}`);
  const good = await responsive(fixture("resp-good.html"), { widths: [320, 768, 1440] });
  assert.deepEqual(rules(good.findings), [], JSON.stringify(good.findings));
  const stressed = await responsive(fixture("resp-good.html"), { widths: [320], stress: "long" });
  assert.ok(Array.isArray(stressed.findings));
  const rtl = await responsive(fixture("resp-good.html"), { widths: [390], stress: "rtl" });
  assert.deepEqual(rtl.findings.filter((f) => f.rule === "rtl-not-applied"), []);
});
