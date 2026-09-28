#!/usr/bin/env node
// Search 200,000+ open-source icons (Iconify: Lucide, Phosphor, Tabler, Solar, Material Symbols,
// Remix, Iconoir, Huge Icons…) by keyword, with each set's license, and download them as SVG.
// Also prints the Flaticon search link for illustrated / multicolor icons.
//
// Usage:
//   node find-icons.mjs "<keywords>" [--sets lucide,ph,tabler] [--limit 24] [--download dir] [--size 24]
//
// Works online through the Iconify API. Offline, it searches any @iconify-json/<set> packages
// installed in the project (npm i -D @iconify-json/lucide @iconify-json/ph …).
// Always self-host downloaded SVGs; never hotlink. Respect attribution when a license requires it.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { parseArgs, isMain } from "./lib/browser.mjs";

/** Sets worth trying first when a design needs icons that don't look generic. */
export const RECOMMENDED_SETS = {
  lucide: "Lucide — clean 1.5–2px outline, the default for product UI",
  ph: "Phosphor — 6 weights (thin → fill, duotone): great for variety",
  tabler: "Tabler — 5,000+ outline icons, consistent 2px stroke",
  solar: "Solar — bold/linear/duotone, modern and less common",
  hugeicons: "Huge Icons — rounded, friendly, big catalog",
  iconoir: "Iconoir — elegant thin outline",
  "material-symbols": "Material Symbols — exhaustive, rounded/sharp/outlined",
  ri: "Remix Icon — neutral, line + fill pairs",
  "fluent-emoji-flat": "Fluent Emoji Flat — colorful 3D-ish illustrations (use sparingly)",
  streamline: "Streamline — multiple styles incl. illustrations",
};

const FREE_ATTRIBUTION = /CC BY(?!-?0)|CC-BY(?!-?0)|Attribution/i;

/** Needs a credit line in the site/footer? (CC BY-*) */
export function needsAttribution(license) {
  return Boolean(license && FREE_ATTRIBUTION.test(`${license.title || ""} ${license.spdx || ""}`));
}

/** Iconify icon id "prefix:name" → component-friendly names for common libraries. */
export function usageHints(id) {
  const [prefix, name] = id.split(":");
  const pascal = name.split(/[-_]/).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  const hints = [`<iconify-icon icon="${id}"></iconify-icon>  or inline the downloaded SVG`];
  if (prefix === "lucide") hints.unshift(`import { ${pascal} } from "lucide-react"`);
  if (prefix === "ph") hints.unshift(`import { ${pascal.replace(/(Bold|Fill|Duotone|Light|Thin)$/, "")} } from "@phosphor-icons/react"  (weight="${(name.match(/-(bold|fill|duotone|light|thin)$/) || [, "regular"])[1]}")`);
  if (prefix === "tabler") hints.unshift(`import { Icon${pascal} } from "@tabler/icons-react"`);
  return hints;
}

async function searchOnline(query, { sets, limit }) {
  const url = new URL("https://api.iconify.design/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(Math.max(32, limit)));
  if (sets?.length) url.searchParams.set("prefixes", sets.join(","));
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Iconify API ${res.status}`);
  const data = await res.json();
  return (data.icons || []).slice(0, limit).map((id) => {
    const c = (data.collections || {})[id.split(":")[0]] || {};
    return { id, set: c.name || id.split(":")[0], license: c.license || null, author: c.author?.name || "" };
  });
}

function localSets(sets) {
  const require = createRequire(resolve(process.cwd(), "package.json"));
  const found = [];
  const base = resolve(process.cwd(), "node_modules", "@iconify-json");
  const names = existsSync(base) ? readdirSync(base) : [];
  for (const prefix of names) {
    if (sets?.length && !sets.includes(prefix)) continue;
    try {
      const file = require.resolve(`@iconify-json/${prefix}/icons.json`);
      const collection = JSON.parse(readFileSync(file, "utf8"));
      if (!collection.info) {
        try {
          collection.info = JSON.parse(readFileSync(file.replace(/icons\.json$/, "info.json"), "utf8"));
        } catch {}
      }
      found.push(collection);
    } catch {}
  }
  return found;
}

function searchLocal(query, { sets, limit }) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (const collection of localSets(sets)) {
    const names = [...Object.keys(collection.icons || {}), ...Object.keys(collection.aliases || {})];
    for (const name of names) if (words.every((w) => name.includes(w))) out.push({ id: `${collection.prefix}:${name}`, set: collection.info?.name || collection.prefix, license: collection.info?.license || null, author: collection.info?.author?.name || "", collection });
  }
  // exact / shorter names first
  return out.sort((a, b) => a.id.length - b.id.length).slice(0, limit);
}

/** Build an SVG string from a local Iconify collection entry. */
export function svgFromCollection(collection, name, size = 24) {
  const icon = collection.icons[name] || collection.icons[collection.aliases?.[name]?.parent];
  if (!icon) return null;
  const w = icon.width || collection.width || 16;
  const h = icon.height || collection.height || 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${icon.left || 0} ${icon.top || 0} ${w} ${h}" fill="none">${icon.body}</svg>`;
}

/** Search icons; returns { source: "iconify-api" | "local" | "none", results }. */
export async function findIcons(query, { sets, limit = 24 } = {}) {
  try {
    return { source: "iconify-api", results: await searchOnline(query, { sets, limit }) };
  } catch (e) {
    const local = searchLocal(query, { sets, limit });
    return { source: local.length ? "local" : "none", error: e.message, results: local };
  }
}

async function download(results, dir, size) {
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (const r of results) {
    const [prefix, name] = r.id.split(":");
    let svg = r.collection ? svgFromCollection(r.collection, name, size) : null;
    if (!svg) {
      const res = await fetch(`https://api.iconify.design/${prefix}/${name}.svg?height=${size}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
      if (res?.ok) svg = await res.text();
    }
    if (svg) {
      const file = join(dir, `${prefix}-${name}.svg`);
      writeFileSync(file, svg);
      files.push(file);
    }
  }
  return files;
}

if (isMain(import.meta.url)) {
  const { _: [query], flags } = parseArgs(process.argv.slice(2));
  if (!query) {
    console.error('Usage: node find-icons.mjs "<keywords>" [--sets lucide,ph,tabler] [--limit 24] [--download dir] [--size 24]');
    console.error("\nRecommended sets:");
    for (const [k, v] of Object.entries(RECOMMENDED_SETS)) console.error(`  ${k.padEnd(18)} ${v}`);
    process.exit(1);
  }
  const sets = typeof flags.sets === "string" ? flags.sets.split(",").map((s) => s.trim()) : undefined;
  const limit = Number(flags.limit) || 24;
  const { source, results, error } = await findIcons(query, { sets, limit });
  if (source === "none") {
    console.error(`No results (${error}). Offline? Install sets locally: npm i -D @iconify-json/lucide @iconify-json/ph @iconify-json/tabler`);
  }
  const bySet = new Map();
  for (const r of results) bySet.set(r.set, [...(bySet.get(r.set) || []), r]);
  for (const [set, items] of bySet) {
    const lic = items[0].license;
    console.log(`\n${set} — ${lic ? `${lic.title}${needsAttribution(lic) ? " (attribution required)" : ""}` : "license: check the set"}${items[0].author ? ` · ${items[0].author}` : ""}`);
    for (const r of items) console.log(`  ${r.id.padEnd(40)} ${usageHints(r.id)[0]}`);
  }
  console.log(`\nFlaticon (illustrated/multicolor, free with attribution or premium): https://www.flaticon.com/search?word=${encodeURIComponent(query)}`);
  console.log("Browse visually: https://icon-sets.iconify.design/?query=" + encodeURIComponent(query));
  if (flags.download) {
    const files = await download(results, flags.download === true ? "icons" : flags.download, Number(flags.size) || 24);
    console.log(`\nDownloaded ${files.length} SVG(s) to ${flags.download === true ? "icons" : flags.download}/`);
  }
}
