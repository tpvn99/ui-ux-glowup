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
  return {
    kind, framework, app, wordpress, styling, tokens, language: anyFile(dir, "tsconfig.json") ? "ts" : "js", packageManager: pm, tests,
    scripts: { dev: pkg.scripts?.dev || pkg.scripts?.start || null, build: pkg.scripts?.build || null, test: pkg.scripts?.test || null },
    guides,
  };
}

export function formatStack(s) {
  if (!s.kind) return "Stack: nothing detected (no package.json, no HTML, no WordPress files). Ask the user.";
  const lines = [`Stack: ${s.kind}${s.app ? ` (${s.app})` : ""} · ${s.language === "ts" ? "TypeScript" : "JavaScript"}${s.packageManager ? ` · ${s.packageManager}` : ""}`];
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
