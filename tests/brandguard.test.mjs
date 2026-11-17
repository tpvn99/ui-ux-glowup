import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractColors, extractFonts, isNeutral, compareBrand, dependencyChanges } from "../skills/ui-ux-glowup/scripts/lib/brandguard.mjs";
import { brandGuard } from "../skills/ui-ux-glowup/scripts/brand-guard.mjs";
import { backup } from "../skills/ui-ux-glowup/scripts/safeguard.mjs";

const g = (d, ...a) => execFileSync("git", a, { cwd: d, encoding: "utf8" }).trim();
const rules = (l) => l.map((f) => f.rule).sort();

test("extractColors normalises hex, rgb, hsl and keeps oklch", () => {
  assert.deepEqual(extractColors("a{color:#FFF;b:#1D4ED8;c:rgb(29, 78, 216);d:hsl(0 100% 50%);e:oklch(0.6 0.2 250)}"), ["#ffffff", "#1d4ed8", "#1d4ed8", "#ff0000", "oklch(0.6 0.2 250)"]);
  assert.ok(isNeutral("#f4f4f5") && isNeutral("#111111") && !isNeutral("#1d4ed8"));
});

test("extractFonts ignores generic families and reads Google Fonts urls", () => {
  assert.deepEqual(extractFonts('body{font-family:"Inter", system-ui, sans-serif} h1{font-family: Fraunces, serif} --font-body: "DM Sans", sans-serif'), ["inter", "fraunces", "dm sans"]);
  assert.deepEqual(extractFonts('<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500&family=Inter">'), ["space grotesk", "inter"]);
});

test("a changed brand color, dropped font and added UI library are errors; --allow silences them", () => {
  const before = "a{color:#1d4ed8;background:#1d4ed8;border-color:#1d4ed8} body{font-family:Inter,sans-serif;color:#111}";
  const after = "a{color:#2563eb;background:#2563eb;border-color:#2563eb} body{font-family:Poppins,sans-serif;color:#111}";
  const pkg = (d) => JSON.stringify({ dependencies: d });
  const f = compareBrand({ before, after, oldPkg: pkg({ react: "19" }), newPkg: pkg({ react: "19", "@mui/material": "6", "framer-motion": "11", lodash: "4" }) });
  assert.deepEqual(rules(f), ["brand-color-changed", "font-changed", "ui-dependency-added"]);
  assert.deepEqual(compareBrand({ before, after }, { allow: ["color", "font"] }), []);
  assert.deepEqual(dependencyChanges(pkg({ bootstrap: "5" }), pkg({})).removed, ["bootstrap"]);
});

test("same brand, different layout: no finding; palette growth and new font are warnings", () => {
  const css = "a{color:#1d4ed8} body{font-family:Inter,sans-serif}";
  assert.deepEqual(compareBrand({ before: css, after: css + " .x{padding:8px;color:#111}" }), []);
  const f = compareBrand({ before: css, after: css + " .a{color:#e11d48}.b{color:#16a34a}.c{color:#f59e0b} h1{font-family:Fraunces}" });
  assert.deepEqual(rules(f), ["font-added", "palette-growth"]);
  assert.ok(f.every((x) => x.severity === "warning"));
});

test("brandGuard compares the working tree, untracked files included, with the latest backup", () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-bg-"));
  g(d, "init", "-q"); g(d, "config", "user.email", "t@t.t"); g(d, "config", "user.name", "t");
  writeFileSync(join(d, "style.css"), "a{color:#1d4ed8;background:#1d4ed8} body{font-family:Inter,sans-serif}");
  g(d, "add", "."); g(d, "commit", "-qm", "init");
  backup(d, "before");
  writeFileSync(join(d, "style.css"), "a{color:#1d4ed8;background:#1d4ed8;padding:16px} body{font-family:Inter,sans-serif;line-height:1.6}");
  assert.deepEqual(brandGuard(d).findings, []);
  writeFileSync(join(d, "style.css"), "a{color:#dc2626;background:#dc2626} body{font-family:Georgia,serif}");
  writeFileSync(join(d, "extra.css"), "h1{font-family:Poppins}");
  const r = brandGuard(d);
  assert.deepEqual(rules(r.findings), ["brand-color-changed", "font-changed"]);
  assert.match(r.ref, /backup /);
  assert.deepEqual(brandGuard(d, { allow: ["color", "font"] }).findings, []);
});
