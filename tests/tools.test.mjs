import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseItem, findInSources, findRootFontSize, listSourceFiles, locate } from "../skills/ui-ux-glowup/scripts/lib/locate.mjs";
import { isImage } from "../skills/ui-ux-glowup/scripts/compare.mjs";
import { normalizeUrl, sameSite } from "../skills/ui-ux-glowup/scripts/audit-site.mjs";
import { needsAttribution, usageHints, svgFromCollection, RECOMMENDED_SETS } from "../skills/ui-ux-glowup/scripts/find-icons.mjs";
import { buildIco, monogramSvg } from "../skills/ui-ux-glowup/scripts/make-favicon.mjs";
import { buildBrowserAudit, stripModule } from "../skills/ui-ux-glowup/scripts/build-browser-audit.mjs";

const fakeApp = () => {
  const dir = mkdtempSync(join(tmpdir(), "glowup-src-"));
  mkdirSync(join(dir, "components"));
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "index.css"), '@import "tailwindcss";\nhtml {\n  font-size: 15px;\n}\n');
  writeFileSync(join(dir, "components", "Header.jsx"), 'export const H = () => (\n  <button className="pill flex items-center">1 en cours</button>\n);\n');
  writeFileSync(join(dir, "node_modules", "junk.js"), "1 en cours");
  return dir;
};

test("parseItem extracts tag, classes and quoted text", () => {
  assert.deepEqual(parseItem('div > button.flex.items-center 54×19 "Définir"'), { tag: "button", classes: ["flex", "items-center"], text: "Définir" });
  assert.deepEqual(parseItem("main > p (~188ch)"), { tag: "p", classes: [], text: undefined });
});

test("locate finds components by text and the root font-size rule, skipping node_modules", () => {
  const dir = fakeApp();
  const files = listSourceFiles(dir);
  assert.equal(files.some((f) => f.includes("node_modules")), false);
  const hits = findInSources(files, 'div > button.pill "1 en cours" (mobile)');
  assert.equal(hits.length, 1);
  assert.match(hits[0].file, /Header\.jsx$/);
  assert.equal(hits[0].line, 2);
  const root = findRootFontSize(files);
  assert.ok(root.some((h) => h.file.endsWith("index.css")));
  const located = locate({ findings: [{ rule: "root-font-size", severity: "error", message: "m", items: [] }] }, dir);
  assert.ok(located[0].locations.length >= 1);
});

test("compare accepts screenshots as inputs", () => {
  assert.ok(isImage("before.png") && isImage("shot.JPG") && isImage("a.webp"));
  assert.ok(!isImage("page.html") && !isImage("https://x.com/a.png"));
});

test("site crawler URL helpers", () => {
  assert.equal(normalizeUrl("https://a.com/pricing/#faq"), "https://a.com/pricing");
  assert.equal(normalizeUrl("https://a.com/"), "https://a.com/");
  assert.ok(sameSite("https://a.com/", "https://a.com/blog"));
  assert.ok(!sameSite("https://a.com/", "https://b.com/"));
  assert.ok(sameSite("file:///site/index.html", "file:///site/about.html"));
  assert.ok(!sameSite("file:///site/index.html", "file:///other/x.html"));
});

test("audit.browser.js is up to date with lib/ (run build-browser-audit.mjs)", () => {
  const committed = readFileSync(new URL("../skills/ui-ux-glowup/scripts/audit.browser.js", import.meta.url), "utf8");
  assert.equal(committed, buildBrowserAudit());
  assert.doesNotMatch(stripModule('import { a } from "./a.mjs";\nexport function f() {}\nexport { g };\n'), /import|export/);
});

test("find-icons: licenses, import hints and SVG building", () => {
  assert.ok(needsAttribution({ title: "CC BY 4.0", spdx: "CC-BY-4.0" }));
  assert.ok(!needsAttribution({ title: "MIT", spdx: "MIT" }));
  assert.ok(!needsAttribution({ title: "CC0 1.0", spdx: "CC0-1.0" }));
  assert.match(usageHints("lucide:arrow-right")[0], /import \{ ArrowRight \} from "lucide-react"/);
  assert.match(usageHints("tabler:truck-delivery")[0], /IconTruckDelivery/);
  const svg = svgFromCollection({ width: 24, height: 24, icons: { leaf: { body: "<path d='M1 1'/>" } }, aliases: { plant: { parent: "leaf" } } }, "plant", 32);
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /width="32"/);
  assert.ok(Object.keys(RECOMMENDED_SETS).includes("ph"));
});

test("make-favicon: monogram SVG and a valid multi-size ICO", () => {
  const svg = monogramSvg("A", { bg: "#1f4d3a" });
  assert.match(svg, /#1f4d3a/);
  assert.match(svg, />A</);
  const png = (n) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(n)]);
  const ico = buildIco([{ size: 16, data: png(10) }, { size: 32, data: png(20) }]);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2);
  assert.equal(ico[6], 16);
  assert.equal(ico.readUInt32LE(6 + 12), 6 + 16 * 2);
});

test("brief and delta reports stay short and keep what matters", async () => {
  const { formatReport, formatDelta } = await import("../skills/ui-ux-glowup/scripts/lib/report.mjs");
  const { CRITERIA } = await import("../skills/ui-ux-glowup/scripts/lib/analyze.mjs");
  const scores = Object.fromEntries(CRITERIA.map((c) => [c, 5]));
  const f = (rule, severity, items = []) => ({ criterion: "Responsive", severity, rule, message: "A long explanation of the rule that brief mode should drop.", items: items.slice(0, 8), count: items.length || undefined });
  const before = { target: "x", scores: { ...scores, Responsive: 2 }, total: 42, max: 45, findings: [f("overflow", "error", ["body 120px"]), f("tap-target", "warn", ["a 1", "a 2", "a 3", "a 4", "a 5"]), f("seo-canonical", "info")] };
  const full = formatReport(before);
  const brief = formatReport(before, { brief: true });
  assert.ok(brief.length < full.length / 2, "brief is much shorter");
  assert.match(brief, /! tap-target: a 1 \| a 2 \(\+3 more\)/);
  assert.match(brief, /· info: seo-canonical/);
  assert.doesNotMatch(brief, /long explanation/);
  const after = { target: "x", scores: { ...scores, Responsive: 4 }, total: 44, max: 45, findings: [f("tap-target", "warn", ["a 1"]), f("contrast", "warn", ["p 3.1:1"])] };
  const delta = formatDelta(before, after);
  assert.match(delta, /Responsive 2→4/);
  assert.match(delta, /42→44\/45/);
  assert.match(delta, /✓ fixed: overflow, seo-canonical/);
  assert.match(delta, /! NEW contrast/);
  assert.match(delta, /! tap-target: a 1$/m);
});
