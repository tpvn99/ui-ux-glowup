import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseItem, findInSources, findRootFontSize, listSourceFiles, locate } from "../skills/ui-ux-glowup/scripts/lib/locate.mjs";
import { isImage } from "../skills/ui-ux-glowup/scripts/compare.mjs";
import { normalizeUrl, sameSite } from "../skills/ui-ux-glowup/scripts/audit-site.mjs";
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
