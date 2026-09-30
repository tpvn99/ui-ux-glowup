#!/usr/bin/env node
// Reuse a website's fonts in a document (PDF, mockup): finds the fonts the site actually uses,
// downloads their files and writes a ready-to-use fonts.css — with a license hint for each.
//
// Usage:
//   node site-fonts.mjs <url | page.html> [out-dir] [--static]
//
//   --static   turn variable fonts into one static file per weight used (needs Python fontTools:
//              pip install fonttools brotli). Variable fonts print as blurry Type 3 fonts in PDFs.
//
// Output: <out-dir>/fonts.css (@font-face with relative paths + --font-heading / --font-body),
//         <out-dir>/fonts/*.woff2, and a short report. Default out-dir: ./fonts-<site>

import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { join, resolve, extname } from "node:path";
import { loadPlaywright, resolveTarget, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";

const SYSTEM_FONTS = {
  "-apple-system": "Inter", blinkmacsystemfont: "Inter", "system-ui": "Inter", "sf pro": "Inter", "sf pro display": "Inter", "sf pro text": "Inter",
  "segoe ui": "Inter", helvetica: "Inter", "helvetica neue": "Inter", arial: "Inter", roboto: "Roboto", verdana: "Source Sans 3",
  georgia: "Source Serif 4", "times new roman": "Source Serif 4", times: "Source Serif 4", garamond: "EB Garamond", "courier new": "IBM Plex Mono",
};

/** License hint from where the font file is served. */
export function licenseHint(fontUrl) {
  if (!fontUrl) return "system font — not embeddable reliably; use the open alternative";
  const host = (() => { try { return new URL(fontUrl).hostname; } catch { return "local"; } })();
  if (fontUrl.startsWith("file:")) return "local file — check its license (OFL fonts are OK to embed)";
  if (/gstatic\.com|googleapis\.com|bunny\.net|fontsource|jsdelivr\.net\/npm\/@fontsource/.test(host + fontUrl)) return "open license (Google Fonts / OFL) — OK to embed in PDFs";
  if (/typekit\.net|adobe/.test(host)) return "Adobe Fonts — PDF embedding allowed for the subscriber's own documents, but kit files can't be reused: activate the font in Creative Cloud";
  if (/fonts\.com|myfonts|monotype|typography\.com|fontspring/.test(host)) return "commercial web license — check it allows PDF embedding (often a separate desktop license)";
  return "self-hosted — ask the client for the license (desktop / PDF embedding rights)";
}

/** Parse @font-face blocks from CSS text; URLs resolved against the stylesheet URL. */
export function parseFontFaces(cssText, baseUrl) {
  const faces = [];
  for (const block of cssText.match(/@font-face\s*{[^}]*}/gi) || []) {
    const prop = (name) => (block.match(new RegExp(`${name}\\s*:\\s*([^;}]+)`, "i")) || [])[1]?.trim();
    const family = (prop("font-family") || "").replace(/["']/g, "").trim();
    if (!family) continue;
    const srcs = [...(prop("src") || "").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)(?:\s*format\(\s*["']?([^"')]+)["']?\s*\))?/gi)].map((m) => ({
      url: (() => { try { return new URL(m[1], baseUrl).href; } catch { return m[1]; } })(),
      format: m[2] || extname(m[1].split("?")[0]).slice(1),
    }));
    const pick = srcs.find((s) => /woff2/.test(s.format) || /\.woff2/.test(s.url)) || srcs.find((s) => /woff|truetype|opentype|ttf|otf/.test(s.format)) || srcs[0];
    if (!pick || pick.url.startsWith("data:")) continue;
    const weight = (prop("font-weight") || "400").replace(/normal/, "400").replace(/bold/, "700");
    faces.push({
      family,
      weight,
      variable: /^\d+\s+\d+$/.test(weight),
      style: prop("font-style") || "normal",
      unicodeRange: prop("unicode-range") || "",
      url: pick.url,
    });
  }
  return faces;
}

/** Which faces to keep: used families, latin subsets first (skip cyrillic/greek/vietnamese-only files). */
export function selectFaces(faces, used) {
  const usedFamilies = new Set(used.map((u) => u.family.toLowerCase()));
  const latin = (f) => !f.unicodeRange || /U\+0000|U\+0-|U\+00(?:00|20)/i.test(f.unicodeRange) || /U\+0100-02/i.test(f.unicodeRange);
  return faces.filter((f) => usedFamilies.has(f.family.toLowerCase()) && latin(f));
}

function inPageUsage() {
  const count = new Map();
  const roleOf = (el) => (/^H[1-3]$/.test(el.tagName) ? "heading" : "body");
  const roles = { heading: new Map(), body: new Map() };
  for (const el of document.body.querySelectorAll("*")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const family = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const key = `${family}|${cs.fontWeight}|${cs.fontStyle}`;
    const n = el.textContent.trim().length;
    count.set(key, (count.get(key) || 0) + n);
    const r = roles[roleOf(el)];
    r.set(family, (r.get(family) || 0) + n);
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const inline = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  return {
    used: [...count.entries()].map(([k, n]) => { const [family, weight, style] = k.split("|"); return { family, weight: Number(weight), style, chars: n }; }),
    heading: top(roles.heading),
    body: top(roles.body),
    inline,
  };
}

/** Collect, download and write the site's fonts. Returns { dir, css, faces, report }. */
export async function siteFonts(target, outDir, { makeStatic = false, route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const { url, name } = resolveTarget(target);
  const dir = resolve(outDir || `fonts-${name}`);
  const browser = await chromium.launch();
  const sheets = [];
  const lines = [];
  let usage;
  const saved = [];
  try {
    const context = await browser.newContext({ ...(options.storageState ? { storageState: options.storageState } : {}) });
    if (route) await context.route("**/*", route);
    const page = await context.newPage();
    page.on("response", async (res) => {
      if (res.request().resourceType() !== "stylesheet") return;
      try { sheets.push({ url: res.url(), text: await res.text() }); } catch {}
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    usage = await page.evaluate(inPageUsage);
    const faces = [...sheets.flatMap((s) => parseFontFaces(s.text, s.url)), ...parseFontFaces(usage.inline, url)];
    const keep = selectFaces(faces, usage.used);
    mkdirSync(join(dir, "fonts"), { recursive: true });
    const usedWeights = (family) => [...new Set(usage.used.filter((u) => u.family.toLowerCase() === family.toLowerCase()).map((u) => u.weight))].sort((a, b) => a - b);
    const hasFontTools = makeStatic && (() => { try { execFileSync("python3", ["-c", "import fontTools, brotli"], { stdio: "ignore" }); return true; } catch { return false; } })();

    for (const face of keep) {
      const slug = `${face.family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${face.variable ? "var" : face.weight}-${face.style}`;
      const ext = (face.url.split("?")[0].match(/\.(woff2|woff|ttf|otf)$/i) || [, "woff2"])[1];
      let file = join(dir, "fonts", `${slug}.${ext}`);
      for (let i = 2; existsSync(file); i++) file = join(dir, "fonts", `${slug}-${i}.${ext}`);
      let body = null;
      if (face.url.startsWith("file:")) {
        try { body = readFileSync(fileURLToPath(face.url)); } catch {}
      } else {
        const res = await context.request.get(face.url, { headers: { Referer: url } }).catch(() => null);
        if (res && res.ok()) body = await res.body();
      }
      if (!body) {
        lines.push(`! ${face.family} ${face.weight}: could not download (${licenseHint(face.url)})`);
        continue;
      }
      writeFileSync(file, body);
      if (face.variable && makeStatic && hasFontTools) {
        for (const w of usedWeights(face.family)) {
          const out = join(dir, "fonts", `${face.family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${w}-${face.style}.${ext}`);
          try {
            execFileSync("python3", ["-m", "fontTools", "varLib.instancer", file, `wght=${w}`, "-o", out, "-q"], { stdio: "ignore" });
            saved.push({ ...face, weight: String(w), variable: false, file: out });
          } catch {
            lines.push(`! ${face.family}: could not make a static ${w} weight`);
          }
        }
        if (saved.some((f) => f.family === face.family && !f.variable)) rmSync(file, { force: true });
      } else saved.push({ ...face, file });
    }
    await context.close();
  } finally {
    await browser.close();
  }

  const rel = (f) => `fonts/${f.split(/[\\/]/).pop()}`;
  const fmt = (f) => ({ woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" })[f.split(".").pop()] || "woff2";
  const faceCss = saved.map((f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.style};font-display:block;src:url("${rel(f.file)}") format("${fmt(f.file)}")${f.unicodeRange ? `;unicode-range:${f.unicodeRange}` : ""}}`);
  const alt = (fam) => SYSTEM_FONTS[fam.toLowerCase()];
  const stack = (fam) => `"${fam}"${alt(fam) && !saved.some((s) => s.family === fam) ? `, "${alt(fam)}"` : ""}, system-ui, sans-serif`;
  const css = `${faceCss.join("\n")}\n:root{--font-heading:${stack(usage.heading)};--font-body:${stack(usage.body)}}\n`;
  writeFileSync(join(dir, "fonts.css"), css);

  const families = [...new Set(usage.used.filter((u) => u.chars > 20).map((u) => u.family))];
  const report = [`Fonts of ${target} → ${dir}/fonts.css`, `Heading: ${usage.heading} · Body: ${usage.body}`];
  for (const fam of families) {
    const files = saved.filter((s) => s.family.toLowerCase() === fam.toLowerCase());
    const weights = [...new Set(usage.used.filter((u) => u.family === fam).map((u) => u.weight))].sort((a, b) => a - b).join("/");
    if (!files.length) {
      const a = alt(fam);
      report.push(`! ${fam} (${weights}): no downloadable file — ${licenseHint(null)}${a ? ` → ${a}` : ""}`);
      continue;
    }
    const variable = files.some((f) => f.variable);
    report.push(`✓ ${fam} ${weights} — ${files.length} file(s) · ${licenseHint(files[0].url)}${variable ? " · VARIABLE: prints as Type 3 in PDFs, rerun with --static" : ""}`);
    if (!variable) {
      const have = files.map((f) => Number(f.weight));
      const faked = [...new Set(usage.used.filter((u) => u.family === fam && u.weight >= 600 && !have.some((h) => h >= 600)).map((u) => u.weight))];
      if (faked.length) report.push(`! ${fam} ${faked.join("/")}: no bold file on the site, the browser fakes it (Type 3 in PDFs) — add the real weight or use one that exists`);
    }
  }
  report.push(...lines);
  return { dir, css, faces: saved, heading: usage.heading, body: usage.body, report: report.join("\n") };
}

if (isMain(import.meta.url)) {
  const { _: [target, outDir], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node site-fonts.mjs <url | page.html> [out-dir] [--static]");
    process.exit(1);
  }
  try {
    const r = await siteFonts(target, outDir, { makeStatic: Boolean(flags.static), ...commonOptions(flags) });
    console.log(r.report);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
