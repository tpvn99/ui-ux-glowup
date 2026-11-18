import { test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { compareSignatures, formatConsistency } from "../skills/ui-ux-glowup/scripts/lib/consistency.mjs";
import { consistency } from "../skills/ui-ux-glowup/scripts/consistency.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => fileURLToPath(new URL(`./fixtures/site-pages/${n}`, import.meta.url));
const sig = (o = {}) => ({ lang: "en", titleSuffix: "acme", favicon: true, bodyFont: "inter", bodySize: 16, bodyBg: "#ffffff", h1: { size: 40, weight: 600, font: "inter" }, nav: ["home", "pricing"], footerNav: ["privacy"], hasFooter: true, headerHeight: 64, button: { bg: "#1d4ed8", color: "#ffffff", radius: 8, height: 44, weight: 500 }, container: 960, radius: 12, palette: ["#111111", "#ffffff", "#1d4ed8"], ...o });
const P = (label, o) => ({ label, sig: sig(o) });
const rules = (l) => l.map((f) => f.rule).sort();

test("identical signatures: nothing to report", () => assert.deepEqual(compareSignatures([P("a"), P("b"), P("c")]), []));

test("each kind of inconsistency is named with the values and the pages", () => {
  const f = compareSignatures([P("home"), P("pricing"), P("about", {
    bodyFont: "arial", h1: { size: 64, weight: 700, font: "arial" }, nav: ["home", "team"], footerNav: [], bodyBg: "#faf5ee", headerHeight: 90,
    button: { bg: "#dc2626", color: "#ffffff", radius: 0, height: 28, weight: 700 }, container: 720, radius: 0, lang: "fr", favicon: false, titleSuffix: "other", palette: ["#faf5ee", "#dc2626", "#000000"],
  })]);
  assert.deepEqual(rules(f), ["background-differs", "button-color-differs", "button-height-differs", "button-radius-differs", "card-radius-differs", "container-differs", "favicon-missing", "font-differs", "footer-differs", "h1-size-differs", "header-height-differs", "heading-font-differs", "lang-differs", "nav-differs", "palette-differs", "title-pattern-differs"]);
  const font = f.find((x) => x.rule === "font-differs");
  assert.match(font.message, /inter \(home, pricing\) vs arial \(about\)/);
  assert.ok(f.every((x) => x.fix.length > 15));
  assert.match(formatConsistency(f, ["home", "pricing", "about"]), /error\(s\)/);
});

test("tolerances: small differences are not reported, one page alone cannot be inconsistent", () => {
  assert.deepEqual(compareSignatures([P("a"), P("b", { h1: { size: 42, weight: 600, font: "inter" }, headerHeight: 66, container: 980 })]), []);
  assert.deepEqual(compareSignatures([P("only")]), []);
});

test("consistency.mjs compares real pages of a site and catches the one that drifted", { skip }, async () => {
  const ok = await consistency([fixture("index.html"), fixture("pricing.html")]);
  assert.deepEqual(ok.findings, [], JSON.stringify(ok.findings));
  const r = await consistency([fixture("index.html"), fixture("pricing.html"), fixture("about.html")]);
  const got = rules(r.findings);
  for (const x of ["font-differs", "button-color-differs", "button-radius-differs", "h1-size-differs", "background-differs", "nav-differs"]) assert.ok(got.includes(x), `${x} in ${got}`);
});
