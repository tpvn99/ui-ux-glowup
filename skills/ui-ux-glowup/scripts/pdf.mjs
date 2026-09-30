#!/usr/bin/env node
// Print an HTML document to a clean PDF, check it, and make a one-image preview of every page.
//
// Usage:
//   node pdf.mjs <doc.html | url> [out.pdf] [--type invoice|quote|report|proposal|onepager]
//                [--format A4|Letter] [--landscape] [--print] [--no-preview] [--pages]
//   node pdf.mjs --check <file.pdf> [--type invoice]          # check an existing PDF
//
//   --type        also checks the content that document type needs (legal mentions, summary, next step…)
//   --print       professional printing: allows heavier files (images at 300 dpi)
//   --pages       one PNG per page (100 dpi) instead of a single contact sheet
//
// Output: out.pdf, out-pages.png (all pages side by side — look at it before delivering), and a short report.
// Previews need `pdftoppm` (poppler: brew install poppler / apt install poppler-utils); the checks don't.
// Requires: npm i -D playwright && npx playwright install chromium

import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { loadPlaywright, resolveTarget, parseArgs, isMain, commonOptions } from "./lib/browser.mjs";
import { parsePdf, analyzePdf, formatPdfReport } from "./lib/pdfcheck.mjs";

const BASE_PRINT_CSS = `
:where(h1,h2,h3,h4,h5){break-after:avoid;page-break-after:avoid}
:where(tr,figure,img,svg,pre,blockquote,.avoid-break,.card){break-inside:avoid;page-break-inside:avoid}
:where(thead){display:table-header-group}
:where(tfoot){display:table-footer-group}
:where(p,li){orphans:3;widows:3}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
`;

const NO_MARGIN_BOXES = `@page{${["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right", "left-top", "right-top"].map((b) => `@${b}{content:none}`).join("")}}`;

/** Facts only the browser knows, measured in print mode before printing. */
function measureDocument() {
  const px = (v) => parseFloat(v) || 0;
  const sel = (el) => {
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : cls}`;
  };
  const rootWidth = document.documentElement.clientWidth;
  const overflow = [];
  const smallText = [];
  const thinText = [];
  const families = new Map();
  for (const el of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > rootWidth + 2 && cs.position !== "fixed") overflow.push(`${sel(el)} ${Math.round(r.right - rootWidth)}px`);
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!ownText) continue;
    const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    families.set(fam, (families.get(fam) || 0) + 1);
    if (px(cs.fontSize) < 9.3) smallText.push(`${sel(el)} ${(px(cs.fontSize) * 0.75).toFixed(1)}pt`);
    if (Number(cs.fontWeight) < 300 && el.textContent.trim().length > 20) thinText.push(`${sel(el)} ${cs.fontWeight}`);
  }
  const missingFonts = [];
  for (const f of document.fonts || []) if (f.status === "error") missingFonts.push(`${f.family} ${f.weight} ${f.style}`);
  const lowRes = [];
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (!r.width || !img.naturalWidth || /\.svg(\?|$)/i.test(img.currentSrc)) continue;
    const dpi = (img.naturalWidth / r.width) * 96;
    if (dpi < 140) lowRes.push(`${(img.currentSrc || "").split("/").pop().slice(0, 40)} ~${Math.round(dpi)} dpi`);
  }
  const tablesWithoutHead = [...document.querySelectorAll("table")].filter((t) => t.rows.length > 12 && !t.tHead).map(sel);
  let css = "";
  for (const s of document.styleSheets) {
    try {
      for (const rule of s.cssRules) css += rule.cssText;
    } catch {}
  }
  const common = new Set("ŒœŸ€–—‘’‚“”„†‡•…‰‹›™−\u00a0\u202f\u2009\u200b\ufeff");
  const unusualChars = [...new Set([...document.body.innerText].filter((c) => c.charCodeAt(0) > 0xff && !common.has(c) && !/[\u0100-\u017f]/.test(c)))].slice(0, 12);
  return {
    lang: document.documentElement.lang || "",
    unusualChars,
    fontFamilies: [...families.keys()],
    missingFonts: [...new Set(missingFonts)],
    overflow: [...new Set(overflow)].slice(0, 8),
    smallText: [...new Set(smallText)].slice(0, 8),
    thinText: [...new Set(thinText)].slice(0, 8),
    lowRes,
    tablesWithoutHead,
    pageNumbers: /counter\(page/.test(css),
    hasPageRule: /@page/.test(css),
    text: document.body.innerText,
  };
}

/** Render HTML to PDF. Returns { file, pdf, findings, report, preview }. */
export async function makePdf(target, out, { type, format = "A4", landscape = false, print = false, preview = true, pages = false, route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const { url, name } = resolveTarget(target);
  const file = resolve(out || `${/^https?:/.test(target) ? name : join(dirname(target), basename(target, extname(target)))}.pdf`);
  const browser = await chromium.launch();
  let dom;
  let check;
  try {
    const context = await browser.newContext({ ...(options.storageState ? { storageState: options.storageState } : {}) });
    if (route) await context.route("**/*", route);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.emulateMedia({ media: "print" });
    await page.addStyleTag({ content: BASE_PRINT_CSS });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const hasPageRule = await page.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.type === 6); } catch { return false; } }));
    if (!hasPageRule) await page.addStyleTag({ content: `@page{size:${format} ${landscape ? "landscape" : "portrait"};margin:18mm 16mm 20mm}` });
    const margins = await page.evaluate(() => {
      for (const s of document.styleSheets) {
        try {
          for (const r of s.cssRules) if (r.type === 6) return { left: r.style.marginLeft, right: r.style.marginRight, size: r.style.size };
        } catch {}
      }
      return {};
    });
    const mm = (v) => (/mm/.test(v) ? parseFloat(v) * 3.7795 : /cm/.test(v) ? parseFloat(v) * 37.795 : /in/.test(v) ? parseFloat(v) * 96 : /pt/.test(v) ? parseFloat(v) * 1.333 : parseFloat(v) || 38);
    const pageWidth = /letter/i.test(margins.size || format) ? 816 : 794;
    const wide = /landscape/i.test(margins.size || "") || landscape;
    await page.setViewportSize({ width: Math.round((wide ? 1123 : pageWidth) - mm(margins.left) - mm(margins.right)), height: 1000 });
    await page.waitForTimeout(150);
    dom = await page.evaluate(measureDocument);
    const pdfOptions = { preferCSSPageSize: true, printBackground: true, tagged: true, outline: true, format, landscape };
    await page.pdf({ ...pdfOptions, path: file });
    await page.addStyleTag({ content: NO_MARGIN_BOXES });
    check = parsePdf(await page.pdf(pdfOptions));
    await context.close();
  } finally {
    await browser.close();
  }
  const pdf = parsePdf(readFileSync(file));
  const findings = analyzePdf({ ...pdf, pages: pdf.pages.map((p, i) => ({ ...p, textOps: check.pages[i]?.textOps ?? p.textOps })) }, dom, { type, print });
  const shots = preview ? await previewPdf(file, { pages }) : null;
  return { file, pdf, findings, report: formatPdfReport(basename(file), pdf, findings), preview: shots };
}

/** Check an existing PDF (no browser facts). */
export function checkPdf(file, opts = {}) {
  const pdf = parsePdf(readFileSync(file));
  const findings = analyzePdf(pdf, {}, opts);
  return { pdf, findings, report: formatPdfReport(basename(file), pdf, findings) };
}

/** Page previews: one contact sheet (default) or one PNG per page. Needs pdftoppm. */
export async function previewPdf(file, { pages = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "glowup-pdf-"));
  try {
    execFileSync("pdftoppm", ["-png", "-r", pages ? "100" : "60", file, join(dir, "p")], { stdio: "ignore" });
  } catch {
    rmSync(dir, { recursive: true, force: true });
    return { note: "No preview: install poppler (brew install poppler / apt install poppler-utils) to get page images." };
  }
  const pngs = readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => join(dir, f));
  const base = file.replace(/\.pdf$/i, "");
  if (pages) {
    const outs = pngs.map((p, i) => {
      const o = `${base}-p${i + 1}.png`;
      writeFileSync(o, readFileSync(p));
      return o;
    });
    rmSync(dir, { recursive: true, force: true });
    return { files: outs };
  }
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const cols = Math.min(4, pngs.length);
  const html = `<body style="margin:0;background:#e5e5e5;font:12px system-ui"><div style="display:grid;grid-template-columns:repeat(${cols},auto);gap:16px;padding:16px;width:max-content">${pngs
    .map((p, i) => `<figure style="margin:0"><img src="${pathToFileURL(p).href}" style="display:block;box-shadow:0 1px 4px rgb(0 0 0/.25);background:#fff"><figcaption style="text-align:center;padding-top:4px;color:#555">${i + 1}</figcaption></figure>`)
    .join("")}</div></body>`;
  const htmlFile = join(dir, "sheet.html");
  writeFileSync(htmlFile, html);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href);
  const sheet = `${base}-pages.png`;
  await page.locator("div").first().screenshot({ path: sheet });
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
  return { files: [sheet] };
}

if (isMain(import.meta.url)) {
  const { _: [target, out], flags } = parseArgs(process.argv.slice(2));
  const type = typeof flags.type === "string" ? flags.type : undefined;
  try {
    if (typeof flags.check === "string" || (target && /\.pdf$/i.test(target))) {
      const r = checkPdf(typeof flags.check === "string" ? flags.check : target, { type, print: Boolean(flags.print) });
      console.log(r.report);
      process.exit(r.findings.some((f) => f.severity === "error") ? 2 : 0);
    }
    if (!target) {
      console.error("Usage: node pdf.mjs <doc.html | url> [out.pdf] [--type invoice|quote|report|proposal|onepager] [--format A4|Letter] [--landscape] [--print] [--pages] [--no-preview]\n       node pdf.mjs --check <file.pdf> [--type …]");
      process.exit(1);
    }
    const r = await makePdf(target, out, {
      type,
      format: typeof flags.format === "string" ? flags.format : "A4",
      landscape: Boolean(flags.landscape),
      print: Boolean(flags.print),
      preview: !flags["no-preview"],
      pages: Boolean(flags.pages),
      ...commonOptions(flags),
    });
    console.log(r.report);
    if (r.preview?.files) console.log(`Preview: ${r.preview.files.join(", ")}`);
    else if (r.preview?.note) console.log(r.preview.note);
    console.log(r.file);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
