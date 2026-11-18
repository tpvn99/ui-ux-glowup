import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectStack, detectFramework, formatStack } from "../skills/ui-ux-glowup/scripts/lib/stack.mjs";

const proj = (files) => {
  const d = mkdtempSync(join(tmpdir(), "glowup-stack-"));
  for (const [p, c] of Object.entries(files)) { mkdirSync(join(d, p, ".."), { recursive: true }); writeFileSync(join(d, p), typeof c === "string" ? c : JSON.stringify(c)); }
  return d;
};

test("detectFramework picks the most specific framework", () => {
  assert.equal(detectFramework({ next: "15", react: "19" }), "next");
  assert.equal(detectFramework({ "@sveltejs/kit": "2", svelte: "5" }), "sveltekit");
  assert.equal(detectFramework({ vue: "3", nuxt: "3" }), "nuxt");
  assert.equal(detectFramework({ react: "19", vite: "6" }), "react-vite");
  assert.equal(detectFramework({ "@angular/core": "19" }), "angular");
  assert.equal(detectFramework({}), null);
});

test("Next.js + Tailwind v4 + shadcn: framework, router, tokens, scripts", () => {
  const d = proj({
    "package.json": { dependencies: { next: "15", react: "19", tailwindcss: "^4.0.0", "@tailwindcss/postcss": "4" }, devDependencies: { vitest: "2" }, scripts: { dev: "next dev", build: "next build" } },
    "pnpm-lock.yaml": "", "tsconfig.json": "{}", "components.json": "{}", "app/page.tsx": "export default function P(){return null}",
    "app/globals.css": '@import "tailwindcss";\n@theme { --color-accent: #123456; }',
  });
  const s = detectStack(d);
  assert.equal(s.kind, "next"); assert.equal(s.app, "app-router"); assert.equal(s.language, "ts"); assert.equal(s.packageManager, "pnpm");
  assert.deepEqual(s.styling.sort(), ["shadcn", "tailwind-v4"]);
  assert.ok(s.tokens.some((t) => t.kind === "tailwind-theme" && t.file === "app/globals.css"));
  assert.deepEqual(s.tests, ["vitest"]);
  assert.match(formatStack(s), /Keep the existing stack/);
});

test("Tailwind v3 vs v4, MUI and Bootstrap are told apart", () => {
  assert.deepEqual(detectStack(proj({ "package.json": { dependencies: { react: "18", tailwindcss: "^3.4.0" } }, "tailwind.config.js": "module.exports={}" })).styling, ["tailwind-v3"]);
  assert.ok(detectStack(proj({ "package.json": { dependencies: { react: "18", "@mui/material": "6" } }, "src/theme.ts": "export const t = createTheme({})" })).tokens.some((t) => t.kind === "ui-theme"));
  assert.ok(detectStack(proj({ "package.json": { dependencies: { vue: "3", bootstrap: "5" } } })).styling.includes("bootstrap"));
});

test("WordPress classic theme with Elementor, and a block theme", () => {
  const d = proj({ "style.css": "/*\nTheme Name: Demo\n*/", "functions.php": "<?php", "wp-content/plugins/elementor/elementor.php": "<?php" });
  const s = detectStack(d);
  assert.equal(s.kind, "wordpress"); assert.deepEqual(s.wordpress.builders, ["elementor"]);
  assert.equal(detectStack(proj({ "style.css": "/* Theme Name: B */", "theme.json": "{}" })).wordpress.blockTheme, true);
});

test("plain HTML, Svelte, Angular and an empty folder", () => {
  assert.equal(detectStack(proj({ "index.html": "<html></html>", "style.css": "a{}" })).kind, "plain-html");
  assert.equal(detectStack(proj({ "package.json": { dependencies: { svelte: "5" } } })).kind, "svelte");
  assert.equal(detectStack(proj({ "package.json": { dependencies: { "@angular/core": "19", "@angular/material": "19" } } })).styling[0], "angular-material");
  assert.match(formatStack(detectStack(proj({ "notes.txt": "x" }))), /nothing detected/);
});

test("major versions and what they change", async () => {
  const { versionInfo } = await import("../skills/ui-ux-glowup/scripts/lib/stack.mjs");
  const v2 = versionInfo("vue", { vue: "^2.7.16", bootstrap: "^4.6.0" });
  assert.equal(v2.versions.vue, 2); assert.equal(v2.versions.bootstrap, 4);
  assert.ok(v2.notes.some((n) => /Vue 2 \(end of life\)/.test(n)) && v2.notes.some((n) => /jQuery/.test(n)));
  assert.ok(versionInfo("angular", { "@angular/core": "^15.2.0" }).notes[0].includes("standalone"));
  assert.ok(versionInfo("angular", { "@angular/core": "^18.0.0" }).notes[0].includes("@if"));
  assert.ok(versionInfo("svelte", { svelte: "^5.1.0" }).notes[0].includes("runes"));
  assert.ok(versionInfo("next", { next: "12.3.4", react: "17" }).notes.some((n) => /pages router only/.test(n)));
  assert.deepEqual(versionInfo("react-vite", { react: "^19.0.0", tailwindcss: "^4.0.0" }).notes, []);
  const d = proj({ "package.json": { dependencies: { vue: "^2.7.0", nuxt: "^2.17.0" } } });
  const s = detectStack(d);
  assert.match(formatStack(s), /Versions: nuxt 2 · vue 2[\s\S]*Vue 2 \(end of life\)/);
});
