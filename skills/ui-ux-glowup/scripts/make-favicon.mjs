#!/usr/bin/env node
// Generates a complete favicon set from a logo (SVG/PNG) or from a monogram letter.
//
// Usage:
//   node make-favicon.mjs <logo.svg | logo.png> [out-dir] [--bg "#1f4d3a"] [--padding 12] [--radius 22]
//   node make-favicon.mjs --letter A [out-dir] --bg "#1f4d3a" [--color "#fff"] [--font "Inter"]
//
// Outputs: favicon.ico (16/32/48), favicon.svg (when possible), apple-touch-icon.png (180),
// icon-192.png, icon-512.png, site.webmanifest, and the <head> snippet to paste.
// --padding is a % of the icon size, --radius a % for rounded corners (0 = square, 50 = circle).
// Tip: find a symbol with find-icons.mjs --download, then: make-favicon.mjs icons/ph-leaf-bold.svg --bg "#1f4d3a"

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { loadPlaywright, parseArgs, isMain } from "./lib/browser.mjs";

/** Pack PNG buffers into a .ico file (PNG-compressed entries, supported by all modern browsers). */
export function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  let offset = 6 + 16 * count;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

/** SVG for a monogram favicon. */
export function monogramSvg(letter, { bg = "#111827", color = "#ffffff", radius = 22, font = "Inter, system-ui, sans-serif" } = {}) {
  const r = (radius / 100) * 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${r}" fill="${bg}"/><text x="32" y="44" text-anchor="middle" font-family="${font}" font-size="38" font-weight="700" fill="${color}">${letter.slice(0, 2)}</text></svg>`;
}

function pageHtml(src, { bg, padding, radius }) {
  return `<!doctype html><html><body style="margin:0;background:transparent">
    <div id="c" style="width:512px;height:512px;display:grid;place-items:center;box-sizing:border-box;padding:${(padding / 100) * 512}px;background:${bg || "transparent"};border-radius:${bg ? (radius / 100) * 512 : 0}px;overflow:hidden">
      <img src="${src}" style="max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain">
    </div></body></html>`;
}

export async function makeFavicon({ input, letter, outDir = "favicon", bg, color = "#ffffff", padding, radius = 22, font, name = "Site" }) {
  mkdirSync(outDir, { recursive: true });
  let svg = null;
  let src;
  if (letter) {
    svg = monogramSvg(letter, { bg: bg || "#111827", color, radius, font });
    src = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
    bg = undefined; // background is inside the SVG
    padding = 0;
  } else {
    const ext = extname(input).toLowerCase();
    let data = readFileSync(input);
    if (ext === ".svg") {
      // Icons drawn with currentColor (Lucide, Phosphor…) take --color (white by default on a --bg).
      svg = data.toString("utf8");
      if (bg || color !== "#ffffff") svg = svg.replace(/currentColor/g, color);
      data = Buffer.from(svg);
    }
    src = `data:${ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : "image/jpeg"};base64,${data.toString("base64")}`;
    padding = padding ?? (bg ? 14 : 0);
  }
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const pngs = {};
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await page.setContent(pageHtml(src, { bg, padding, radius }), { waitUntil: "load" });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const master = await page.locator("#c").screenshot({ omitBackground: true });
    for (const size of [16, 32, 48, 180, 192, 512]) {
      const p = await browser.newPage({ viewport: { width: size, height: size } });
      await p.setContent(`<body style="margin:0;background:transparent"><img src="data:image/png;base64,${master.toString("base64")}" style="width:${size}px;height:${size}px;display:block"></body>`, { waitUntil: "load" });
      pngs[size] = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
      await p.close();
    }
  } finally {
    await browser.close();
  }
  const files = [];
  const write = (f, d) => {
    writeFileSync(join(outDir, f), d);
    files.push(f);
  };
  write("favicon.ico", buildIco([16, 32, 48].map((s) => ({ size: s, data: pngs[s] }))));
  if (svg) write("favicon.svg", svg);
  write("apple-touch-icon.png", pngs[180]);
  write("icon-192.png", pngs[192]);
  write("icon-512.png", pngs[512]);
  write(
    "site.webmanifest",
    JSON.stringify({ name, short_name: name, icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }], theme_color: bg || "#ffffff", background_color: "#ffffff", display: "standalone" }, null, 2)
  );
  const snippet = [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    svg ? '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' : null,
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].filter(Boolean).join("\n");
  return { outDir: resolve(outDir), files, snippet };
}

if (isMain(import.meta.url)) {
  const { _: [first, second], flags } = parseArgs(process.argv.slice(2));
  const letter = typeof flags.letter === "string" ? flags.letter : undefined;
  const input = letter ? undefined : first;
  const outDir = (letter ? first : second) || "favicon";
  if (!letter && !input) {
    console.error('Usage: node make-favicon.mjs <logo.svg|png> [out-dir] [--bg "#hex"] [--padding 12] [--radius 22]\n       node make-favicon.mjs --letter A [out-dir] --bg "#hex" [--color "#fff"]');
    process.exit(1);
  }
  try {
    const r = await makeFavicon({
      input,
      letter,
      outDir,
      bg: typeof flags.bg === "string" ? flags.bg : undefined,
      color: typeof flags.color === "string" ? flags.color : "#ffffff",
      padding: flags.padding !== undefined ? Number(flags.padding) : undefined,
      radius: flags.radius !== undefined ? Number(flags.radius) : 22,
      font: typeof flags.font === "string" ? flags.font : undefined,
      name: typeof flags.name === "string" ? flags.name : "Site",
    });
    console.log(`Wrote ${r.files.join(", ")} to ${r.outDir}\n\nPaste in <head>:\n${r.snippet}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
