// Detects the stack of a project folder so changes follow its conventions instead of imposing a new one.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { listSourceFiles } from "./locate.mjs";

const has = (deps, ...names) => names.some((n) => deps[n] !== undefined);
const major = (v) => { const m = String(v || "").match(/(\d+)/); return m ? Number(m[1]) : null; };
const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const anyFile = (dir, ...names) => names.some((n) => existsSync(join(dir, n)));

export function detectFramework(deps) {
  if (has(deps, "next")) return "next";
  if (has(deps, "nuxt", "nuxt3")) return "nuxt";
  if (has(deps, "@sveltejs/kit")) return "sveltekit";
  if (has(deps, "astro")) return "astro";
  if (has(deps, "@remix-run/react", "@remix-run/node")) return "remix";
  if (has(deps, "@angular/core")) return "angular";
  if (has(deps, "svelte")) return "svelte";
  if (has(deps, "vue")) return "vue";
  if (has(deps, "solid-js")) return "solid";
  if (has(deps, "react")) return has(deps, "vite") ? "react-vite" : "react";
  return null;
}

export function detectStyling(deps, dir, cssSample = "") {
  const out = [];
  if (has(deps, "tailwindcss")) {
    const v = /@import\s+["']tailwindcss["']|@theme\b/.test(cssSample) || has(deps, "@tailwindcss/vite", "@tailwindcss/postcss", "@tailwindcss/browser") || major(deps.tailwindcss) >= 4 ? 4 : 3;
    out.push(`tailwind-v${v}`);
  }
  if (has(deps, "bootstrap", "react-bootstrap", "bootstrap-vue")) out.push("bootstrap");
  if (has(deps, "@mui/material")) out.push("mui");
  if (has(deps, "@chakra-ui/react")) out.push("chakra");
  if (has(deps, "@mantine/core")) out.push("mantine");
  if (has(deps, "antd")) out.push("antd");
  if (has(deps, "vuetify")) out.push("vuetify");
  if (has(deps, "@angular/material")) out.push("angular-material");
  if (has(deps, "styled-components")) out.push("styled-components");
  if (has(deps, "@emotion/react", "@emotion/styled")) out.push("emotion");
  if (has(deps, "@vanilla-extract/css")) out.push("vanilla-extract");
  if (has(deps, "unocss")) out.push("unocss");
  if (has(deps, "sass", "node-sass")) out.push("sass");
  if (has(deps, "bulma")) out.push("bulma");
  return out;
}

export function detectWordPress(dir) {
  if (!anyFile(dir, "wp-content", "wp-config.php", "functions.php") && !/Theme Name:/i.test(read(join(dir, "style.css")))) return null;
  const builders = [];
  const plugins = join(dir, "wp-content", "plugins");
  const themes = join(dir, "wp-content", "themes");
  const list = (d) => { try { return readdirSync(d); } catch { return []; } };
  const names = [...list(plugins), ...list(themes)].join(" ").toLowerCase();
  for (const b of ["elementor", "divi", "bricks", "beaver-builder", "oxygen", "wpbakery", "js_composer"]) if (names.includes(b)) builders.push(b === "js_composer" ? "wpbakery" : b);
  const blockTheme = anyFile(dir, "theme.json") || existsSync(join(dir, "wp-content", "themes")) && list(themes).some((t) => existsSync(join(themes, t, "theme.json")));
  return { builders, blockTheme: !!blockTheme };
}

export function findTokens(dir, styling) {
  const files = listSourceFiles(dir).slice(0, 3000);
  const found = [];
  for (const f of files) {
    if (!/\.(css|scss|ts|js|mjs|json)$/.test(f)) continue;
    const name = f.slice(dir.length + 1);
    if (/tailwind\.config\.(js|ts|mjs|cjs)$/.test(f)) found.push({ file: name, kind: "tailwind-config" });
    else if (/\.css$/.test(f)) { const t = read(f).slice(0, 60000); if (/@theme\b/.test(t)) found.push({ file: name, kind: "tailwind-theme" }); else if (/:root\s*\{[^}]*--[a-z]/i.test(t) && found.filter((x) => x.kind === "css-variables").length < 2) found.push({ file: name, kind: "css-variables" }); }
    else if (/theme\.json$/.test(f) && styling !== undefined) found.push({ file: name, kind: "theme-json" });
    else if (/(^|\/)theme\.(ts|js)$/.test(f) && /createTheme|extendTheme|defineConfig/.test(read(f).slice(0, 20000))) found.push({ file: name, kind: "ui-theme" });
    else if (/_variables\.scss$/.test(f)) found.push({ file: name, kind: "scss-variables" });
  }
  return found.slice(0, 6);
}

const FRAMEWORK_DEP = { next: "next", nuxt: "nuxt", sveltekit: "@sveltejs/kit", svelte: "svelte", astro: "astro", remix: "@remix-run/react", angular: "@angular/core", vue: "vue", solid: "solid-js", react: "react", "react-vite": "react" };

/** Major versions of what was detected, and what a different major changes for the person editing. */
export function versionInfo(framework, deps) {
  const v = {};
  const dep = FRAMEWORK_DEP[framework];
  if (dep && deps[dep]) v[framework] = major(deps[dep]);
  if (deps.react) v.react = major(deps.react);
  if (deps.vue) v.vue = major(deps.vue);
  if (deps.svelte) v.svelte = major(deps.svelte);
  if (deps["@angular/core"]) v.angular = major(deps["@angular/core"]);
  if (deps.tailwindcss) v.tailwind = major(deps.tailwindcss);
  if (deps.bootstrap) v.bootstrap = major(deps.bootstrap);
  if (deps["@mui/material"]) v.mui = major(deps["@mui/material"]);
  const notes = [];
  if (v.vue === 2 || (framework === "nuxt" && v.nuxt && v.nuxt < 3)) notes.push("Vue 2 (end of life): Options API, no <script setup>, no Teleport or Suspense, v-model works differently. Write Vue 2 code, not Vue 3 examples.");
  if (v.angular && v.angular < 14) notes.push("Angular before 14: NgModules only, no standalone components.");
  else if (v.angular && v.angular < 17) notes.push("Angular 14–16: standalone components exist; use *ngIf / *ngFor (the @if / @for control flow arrives in 17).");
  else if (v.angular) notes.push("Angular 17+: @if / @for control flow and standalone components are available; follow what the project already uses.");
  if (v.svelte === 5) notes.push("Svelte 5: runes ($state, $derived, $props); match the project (some components may still use Svelte 4 stores and `export let`).");
  else if (v.svelte && v.svelte < 5) notes.push("Svelte 4 or older: `export let` props and stores, no runes.");
  if (framework === "next" && v.next && v.next < 13) notes.push("Next.js before 13: pages router only (no app directory, no server components).");
  else if (framework === "next" && v.next && v.next < 15) notes.push("Next.js 13–14: check whether the project uses app/ or pages/ and stay in it; caching defaults differ from 15.");
  if (v.react && v.react < 18) notes.push("React before 18: ReactDOM.render, no automatic batching or Suspense for data.");
  if (v.bootstrap && v.bootstrap < 5) notes.push("Bootstrap 4 or older: depends on jQuery; utilities use ml-/mr- (Bootstrap 5 uses ms-/me-).");
  if (v.mui && v.mui < 5) notes.push("MUI 4 or older: styling with makeStyles (JSS); v5+ uses sx and styled (Emotion). Do not mix them.");
  if (v.tailwind === 3) notes.push("Tailwind 3: tokens in tailwind.config.*; v4 moved them to @theme in CSS. Do not use v4-only syntax.");
  return { versions: v, notes };
}

export function detectStack(dir) {
  const pkgPath = join(dir, "package.json");
  let pkg = {};
  try { pkg = JSON.parse(read(pkgPath) || "{}"); } catch {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const files = existsSync(dir) ? listSourceFiles(dir).slice(0, 3000) : [];
  const cssSample = files.filter((f) => /\.css$/.test(f)).slice(0, 20).map((f) => read(f).slice(0, 4000)).join("\n");
  const framework = detectFramework(deps);
  const styling = detectStyling(deps, dir, cssSample);
  if (anyFile(dir, "components.json")) styling.push("shadcn");
  if (files.some((f) => /\.module\.(css|scss)$/.test(f))) styling.push("css-modules");
  if (has(deps, "@radix-ui/react-slot", "radix-ui") && !styling.includes("shadcn")) styling.push("radix");
  const wordpress = detectWordPress(dir);
  const tokens = findTokens(dir, styling);
  const pm = anyFile(dir, "pnpm-lock.yaml") ? "pnpm" : anyFile(dir, "yarn.lock") ? "yarn" : anyFile(dir, "bun.lockb", "bun.lock") ? "bun" : anyFile(dir, "package-lock.json") ? "npm" : null;
  const tests = ["vitest", "jest", "@playwright/test", "cypress", "@testing-library/react"].filter((t) => deps[t] !== undefined);
  const app = framework === "next" ? (anyFile(dir, "app", "src/app") ? "app-router" : anyFile(dir, "pages", "src/pages") ? "pages-router" : null) : null;
  const plain = !framework && !wordpress && files.some((f) => /\.html?$/.test(f));
  const kind = wordpress ? "wordpress" : framework || (plain ? "plain-html" : null);
  const guides = [kind, ...styling.filter((s) => s !== "css-modules" && s !== "sass" && s !== "bulma")].filter(Boolean);
  const { versions, notes } = versionInfo(framework, deps);
  return {
    kind, framework, app, versions, notes, wordpress, styling, tokens, language: anyFile(dir, "tsconfig.json") ? "ts" : "js", packageManager: pm, tests,
    scripts: { dev: pkg.scripts?.dev || pkg.scripts?.start || null, build: pkg.scripts?.build || null, test: pkg.scripts?.test || null },
    guides,
  };
}

export function formatStack(s) {
  if (!s.kind) return "Stack: nothing detected (no package.json, no HTML, no WordPress files). Ask the user.";
  const lines = [`Stack: ${s.kind}${s.app ? ` (${s.app})` : ""} · ${s.language === "ts" ? "TypeScript" : "JavaScript"}${s.packageManager ? ` · ${s.packageManager}` : ""}`];
  const ver = Object.entries(s.versions || {}).map(([k, v]) => `${k} ${v}`).join(" · ");
  if (ver) lines.push(`Versions: ${ver}`);
  for (const n of s.notes || []) lines.push(`  ! ${n}`);
  if (s.styling.length) lines.push(`Styling / UI: ${s.styling.join(", ")}`);
  if (s.wordpress) lines.push(`WordPress: ${s.wordpress.blockTheme ? "block theme (theme.json)" : "classic theme"}${s.wordpress.builders.length ? ` · page builder: ${s.wordpress.builders.join(", ")}` : ""}`);
  lines.push(s.tokens.length ? `Design tokens live in: ${s.tokens.map((t) => `${t.file} (${t.kind})`).join(", ")}` : "Design tokens: none found (do not invent a system; ask or extract with extract-tokens.mjs)");
  if (s.tests.length) lines.push(`Tests: ${s.tests.join(", ")}`);
  const run = Object.entries(s.scripts).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  if (run.length) lines.push(`Scripts: ${run.join(" · ")}`);
  lines.push(`Read in references/frameworks.md: ${s.guides.join(", ")}`);
  lines.push("Keep the existing stack and libraries; add nothing new without asking.");
  return lines.join("\n");
}
