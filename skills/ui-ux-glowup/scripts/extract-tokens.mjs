#!/usr/bin/env node
// Extracts the real design tokens of a page — typically a reference site (linear.app, stripe.com…)
// or the user's current site — so you borrow measured values instead of guessing.
//
// Usage:
//   node extract-tokens.mjs <url | file.html> [--json tokens.json] [--mobile]
//
// Reports: font families and their share of text, type scale, heading size / tracking / line-height
// ratios, font weights, most used spacing values and 4px-grid conformity, border radii, shadows,
// and the page's dominant text and background colors.
// Colors are reported for context only: never copy a reference site's palette onto the user's brand.

import { writeFileSync } from "node:fs";
import { VIEWPORTS, loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { collectPageData } from "./lib/probe.mjs";
import { summarizeTokens, histogram } from "./lib/analyze.mjs";
import { flattenBackground, toHex } from "./lib/color.mjs";

/** Extract tokens from one page. Returns the summary plus dominant colors. */
export async function extractTokens(target, { mobile = false, route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const { url } = resolveTarget(target);
  const browser = await chromium.launch();
  try {
    const vp = mobile ? VIEWPORTS.mobile : VIEWPORTS.desktop;
    const { page, close } = await openPage(browser, url, vp, { route, ...options });
    const data = await page.evaluate(collectPageData);
    await close();
    const weighted = (pick) => {
      const map = new Map();
      for (const t of data.texts) {
        const hex = pick(t);
        map.set(hex, (map.get(hex) || 0) + t.chars);
      }
      const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([hex, c]) => ({ hex, share: Math.round((c / total) * 100) }));
    };
    return {
      target,
      viewport: vp.label,
      ...summarizeTokens(data),
      textColors: weighted((t) => toHex(t.color)),
      backgrounds: weighted((t) => toHex(flattenBackground(t.bgLayers))),
      contentWidth: histogram(data.paragraphs.map((p) => p.measure)).slice(0, 1).map(([m]) => m)[0] ?? null,
    };
  } finally {
    await browser.close();
  }
}

/** Markdown summary ready to paste into the working notes. */
export function formatTokens(t) {
  const lines = [`## Tokens — ${t.target} (${t.viewport})`, ""];
  lines.push(`**Fonts:** ${t.fonts.map((f) => `${f.family} (${f.share}% of text)`).join(", ")}`);
  lines.push(`**Weights:** ${t.weights.join(", ")}`);
  lines.push(`**Type scale (px):** ${t.typeScale.join(" / ")}`);
  if (t.headings.length) {
    lines.push("", "| Heading | Size | Tracking | Line-height | Text |", "|---|---|---|---|---|");
    for (const h of t.headings)
      lines.push(`| h${h.level} | ${h.fontSize}px | ${h.letterSpacingEm}em | ${h.lineHeight ?? "normal"} | ${h.text.replace(/\|/g, "/")} |`);
  }
  lines.push("", `**Spacing (most used, px):** ${t.spacing.map((s) => s.px).join(", ")} — ${t.gridConformity}% on the 4px grid`);
  lines.push(`**Radii (px):** ${t.radii.map((r) => `${r.px} (×${r.count})`).join(", ") || "none"}`);
  lines.push(`**Shadows:** ${t.shadows.length ? "" : "none"}`);
  for (const s of t.shadows) lines.push(`- \`${s.value}\` (×${s.count})`);
  lines.push(`**Text colors (context only):** ${t.textColors.map((c) => `${c.hex} ${c.share}%`).join(", ")}`);
  lines.push(`**Backgrounds behind text (context only):** ${t.backgrounds.map((c) => `${c.hex} ${c.share}%`).join(", ")}`);
  return lines.join("\n");
}

if (isMain(import.meta.url)) {
  const { _: [target], flags } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Usage: node extract-tokens.mjs <url | file.html> [--json tokens.json] [--mobile]");
    process.exit(1);
  }
  try {
    const tokens = await extractTokens(target, { mobile: Boolean(flags.mobile), ...commonOptions(flags) });
    console.log(formatTokens(tokens));
    if (flags.json) writeFileSync(flags.json === true ? "tokens.json" : flags.json, JSON.stringify(tokens, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
