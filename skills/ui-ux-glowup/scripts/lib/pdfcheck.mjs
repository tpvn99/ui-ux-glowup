// Minimal PDF reader + checks for generated documents (pure Node, no dependencies).
// Reads what matters for quality: fonts (embedded? Type 3?), pages (size, text and image operations),
// title, tags, outline. Handles plain objects, FlateDecode streams and object streams.

import { inflateSync } from "node:zlib";

const FALLBACK_FONTS = /DejaVu|Liberation|Noto(?!.*Emoji)|Bitstream|FreeSans|FreeSerif|Nimbus|TimesNewRoman|Times-Roman|Arial(?!.*Nova)|Helvetica|Courier/i;

export function parsePdf(buffer) {
  const src = buffer.toString("latin1");
  const objects = new Map();
  const objRe = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g;
  let m;
  while ((m = objRe.exec(src))) objects.set(Number(m[1]), splitStream(m[3]));
  for (const [, obj] of [...objects]) {
    if (!/\/Type\s*\/ObjStm/.test(obj.dict) || obj.stream == null) continue;
    const data = decode(obj);
    if (!data) continue;
    const n = num(obj.dict, "N");
    const first = num(obj.dict, "First");
    const header = data.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const id = header[i * 2];
      const start = first + header[i * 2 + 1];
      const end = i + 1 < n ? first + header[(i + 1) * 2 + 1] : data.length;
      if (!objects.has(id)) objects.set(id, { dict: data.slice(start, end), stream: null });
    }
  }

  const get = (ref) => (ref == null ? null : objects.get(ref));
  const refOf = (dict, key) => {
    const r = dict.match(new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`));
    return r ? Number(r[1]) : null;
  };

  const trailerSrc = (src.match(/trailer\s*<<([\s\S]*?)>>\s*startxref/g) || []).pop() || [...objects.values()].find((o) => /\/Type\s*\/XRef/.test(o.dict))?.dict || "";
  const info = get(refOf(trailerSrc, "Info"));
  const root = get(refOf(trailerSrc, "Root")) || [...objects.values()].find((o) => /\/Type\s*\/Catalog/.test(o.dict));
  const title = info ? pdfString(info.dict, "Title") : "";
  const tagged = root ? /\/MarkInfo\s*<<[^>]*\/Marked\s+true/.test(root.dict) || /\/StructTreeRoot/.test(root.dict) : false;
  const outline = root ? /\/Outlines\s+\d+\s+\d+\s+R/.test(root.dict) : false;
  const lang = root ? pdfString(root.dict, "Lang") : "";

  const pages = [];
  const walk = (id, inherited, seen = new Set()) => {
    if (id == null || seen.has(id)) return;
    seen.add(id);
    const o = get(id);
    if (!o) return;
    const box = arrayOf(o.dict, "MediaBox") || inherited;
    if (/\/Type\s*\/Pages\b/.test(o.dict)) {
      const kids = (o.dict.match(/\/Kids\s*\[([^\]]*)\]/) || [, ""])[1].match(/(\d+)\s+\d+\s+R/g) || [];
      for (const k of kids) walk(Number(k.split(/\s+/)[0]), box, seen);
    } else if (/\/Type\s*\/Page\b/.test(o.dict)) {
      pages.push(readPage(o, box, get, objects));
    }
  };
  if (root) walk(refOf(root.dict, "Pages"), null);

  const fonts = [];
  for (const [id, o] of objects) {
    if (!/\/Type\s*\/Font\b/.test(o.dict)) continue;
    const subtype = (o.dict.match(/\/Subtype\s*\/(\w+)/) || [])[1] || "";
    if (subtype === "CIDFontType2" || subtype === "CIDFontType0") continue;
    const base = decodeName((o.dict.match(/\/BaseFont\s*\/([^\s/<>\[\]()]+)/) || [])[1] || (subtype === "Type3" ? nameFromType3(o, get) : "?"));
    let embedded = subtype === "Type3";
    let descriptor = get(refOf(o.dict, "FontDescriptor"));
    if (subtype === "Type0") {
      const d = o.dict.match(/\/DescendantFonts\s*(?:\[\s*(\d+)\s+\d+\s+R\s*\]|(\d+)\s+\d+\s+R)/);
      let child = d ? get(Number(d[1] || d[2])) : null;
      if (child && !/\/FontDescriptor/.test(child.dict) && child.dict.trim().startsWith("[")) {
        const inner = child.dict.match(/(\d+)\s+\d+\s+R/);
        child = inner ? get(Number(inner[1])) : child;
      }
      if (child) descriptor = get(refOf(child.dict, "FontDescriptor"));
    }
    if (descriptor && /\/FontFile[23]?\s/.test(descriptor.dict)) embedded = true;
    fonts.push({ id, name: base, family: base.replace(/^[A-Z]{6}\+/, ""), subtype, embedded });
  }

  return { size: buffer.length, title, lang, tagged, outline, pages, fonts };
}

function readPage(o, box, get, objects) {
  const contents = [];
  const c = o.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/);
  if (c) for (const r of c[1].match(/(\d+)\s+\d+\s+R/g) || []) contents.push(get(Number(r.split(/\s+/)[0])));
  const text = contents.map((s) => (s ? decode(s) || "" : "")).join("\n");
  let resources = o.dict;
  const rr = o.dict.match(/\/Resources\s+(\d+)\s+\d+\s+R/);
  if (rr) resources = get(Number(rr[1]))?.dict || "";
  const xobjects = [];
  const xo = resources.match(/\/XObject\s*(<<[\s\S]*?>>|\d+\s+\d+\s+R)/);
  if (xo) {
    const body = /R$/.test(xo[1].trim()) ? get(Number(xo[1].split(/\s+/)[0]))?.dict || "" : xo[1];
    for (const r of body.match(/(\d+)\s+\d+\s+R/g) || []) {
      const x = objects.get(Number(r.split(/\s+/)[0]));
      if (x) xobjects.push({ image: /\/Subtype\s*\/Image/.test(x.dict), width: num(x.dict, "Width"), height: num(x.dict, "Height") });
    }
  }
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = box || [];
  return {
    width: Math.round(x1 - x0),
    height: Math.round(y1 - y0),
    textOps: (text.match(/(?:^|[\s\]>)])(?:Tj|TJ|'|")(?=\s|$)/g) || []).length,
    drawOps: (text.match(/(?:^|\s)(?:re|l|c)\s+[fFBbSs]?\*?(?=\s|$)/g) || []).length,
    images: xobjects.filter((x) => x.image),
  };
}

function nameFromType3(o, get) {
  const d = o.dict.match(/\/FontDescriptor\s+(\d+)\s+\d+\s+R/);
  const desc = d ? get(Number(d[1])) : null;
  return decodeName((desc?.dict.match(/\/FontName\s*\/([^\s/<>\[\]()]+)/) || [])[1] || "Type3");
}

function splitStream(body) {
  const i = body.search(/\bstream\r?\n/);
  if (i < 0) return { dict: body, stream: null };
  const start = body.indexOf("\n", i) + 1;
  const end = body.lastIndexOf("endstream");
  let stream = body.slice(start, end);
  const len = num(body.slice(0, i), "Length");
  if (len && len <= stream.length) stream = stream.slice(0, len);
  return { dict: body.slice(0, i), stream };
}

function decode(obj) {
  if (obj.stream == null) return null;
  const raw = Buffer.from(obj.stream, "latin1");
  if (!/\/Filter\s*\[?\s*\/FlateDecode/.test(obj.dict)) return obj.stream;
  try {
    return inflateSync(raw).toString("latin1");
  } catch {
    try {
      return inflateSync(raw, { finishFlush: 2 }).toString("latin1");
    } catch {
      return null;
    }
  }
}

function num(dict, key) {
  const r = dict.match(new RegExp(`/${key}\\s+(\\d+(?:\\.\\d+)?)(?!\\s+\\d+\\s+R)`));
  return r ? Number(r[1]) : 0;
}

function arrayOf(dict, key) {
  const r = dict.match(new RegExp(`/${key}\\s*\\[([^\\]]*)\\]`));
  return r ? r[1].trim().split(/\s+/).map(Number) : null;
}

function decodeName(n) {
  return n.replace(/#([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Read a PDF text string value (hex UTF-16BE or literal). */
export function pdfString(dict, key) {
  const hex = dict.match(new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]*)>`));
  if (hex) {
    const h = hex[1].replace(/\s/g, "");
    const bytes = Buffer.from(h, "hex");
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      let s = "";
      for (let i = 2; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
      return s;
    }
    return bytes.toString("latin1");
  }
  const lit = dict.match(new RegExp(`/${key}\\s*\\(((?:\\\\.|[^\\\\)])*)\\)`));
  if (!lit) return "";
  return lit[1].replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" })[c] || c);
}

const KB = 1024;

/**
 * Judge a generated PDF. `pdf` = parsePdf() result; `dom` = facts measured in the browser before printing
 * (requested font families, overflow, low-resolution images, lang, page counters, text); `opts.type` =
 * invoice | quote | report | proposal | onepager to check the content that document type needs.
 */
export function analyzePdf(pdf, dom = {}, { type, print = false } = {}) {
  const findings = [];
  const add = (severity, rule, message, items = []) => findings.push({ severity, rule, message, items: items.slice(0, 6), count: items.length || undefined });

  const type3 = [...new Set(pdf.fonts.filter((f) => f.subtype === "Type3").map((f) => f.family))];
  if (type3.length)
    add("error", "pdf-type3-font", "Fonts embedded as Type 3 (blurry in some viewers, bad copy/paste, rejected by printers). Cause: a variable font, or a weight/italic that isn't loaded so the browser fakes it. Load a static file for every weight and style used (scripts/site-fonts.mjs --static).", type3);
  const notEmbedded = pdf.fonts.filter((f) => !f.embedded).map((f) => f.family);
  if (notEmbedded.length) add("error", "pdf-font-not-embedded", "Fonts not embedded: the document will look different on other computers.", [...new Set(notEmbedded)]);
  const requested = (dom.fontFamilies || []).map((f) => f.toLowerCase().replace(/\s+/g, ""));
  const fallback = [...new Set(pdf.fonts.map((f) => f.family.replace(/-.*$/, "")).filter((f) => FALLBACK_FONTS.test(f) && !requested.some((r) => f.toLowerCase().includes(r))))];
  if (fallback.length) {
    const suspects = (dom.unusualChars || []).map((c) => `"${c}" U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
    add("error", "pdf-fallback-font", `A system fallback font was used instead of the chosen one: a character the font doesn't have${suspects.length ? ` (likely ${suspects.join(", ")} — load a subset that has it or replace the character)` : ""}, a missing weight, or a font that failed to load.`, fallback);
  }
  if (dom.missingFonts?.length) add("error", "pdf-font-not-loaded", "Fonts declared in CSS but not loaded when printing.", dom.missingFonts);
  const families = [...new Set(pdf.fonts.map((f) => f.family.replace(/-(Regular|Bold|SemiBold|Semibold|Medium|Light|Italic|BoldItalic|Black|ExtraBold|Thin|ExtraLight).*$/i, "")))].filter((f) => f !== "?");
  if (families.length > 3) add("warn", "pdf-too-many-fonts", `${families.length} font families; keep 2 (the website's heading and body fonts).`, families);

  const texts = pdf.pages.map((p) => p.textOps);
  const blank = pdf.pages.map((p, i) => ({ p, i })).filter(({ p }) => p.textOps === 0 && p.images.length === 0 && p.drawOps < 3);
  if (pdf.pages.length > 1 && blank.length) add("error", "pdf-blank-page", "Blank pages (usually a forced page break after content that already filled the page, or an element taller than the page).", blank.map(({ i }) => `page ${i + 1}`));
  const sorted = [...texts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const last = pdf.pages[pdf.pages.length - 1];
  if (pdf.pages.length > 1 && last && last.textOps > 0 && median > 20 && last.textOps < median * 0.12)
    add("warn", "pdf-orphan-page", `The last page holds very little (${last.textOps} text runs vs ~${median} on other pages); tighten spacing or move a block so it fits.`);
  const sizes = [...new Set(pdf.pages.map((p) => `${p.width}×${p.height}`))];
  if (sizes.length > 1) add("warn", "pdf-mixed-page-sizes", "Pages have different sizes.", sizes);
  const a4 = pdf.pages[0] && Math.abs(pdf.pages[0].width - 595) < 4 && Math.abs(pdf.pages[0].height - 842) < 4;
  const letter = pdf.pages[0] && Math.abs(pdf.pages[0].width - 612) < 4 && Math.abs(pdf.pages[0].height - 792) < 4;
  const landscape = pdf.pages[0] && Math.abs(pdf.pages[0].width - 842) < 4;
  if (pdf.pages[0] && !a4 && !letter && !landscape) add("info", "pdf-page-size", `Page size ${pdf.pages[0].width}×${pdf.pages[0].height}pt (A4 is 595×842).`);

  const limit = print ? 20 * KB * KB : 2 * KB * KB;
  if (pdf.size > limit * 2.5) add("error", "pdf-heavy", `File is ${(pdf.size / KB / KB).toFixed(1)} MB; compress images (JPEG/WebP 80%, max 2× their printed size).`);
  else if (pdf.size > limit) add("warn", "pdf-heavy", `File is ${(pdf.size / KB / KB).toFixed(1)} MB; aim under ${print ? 20 : 2} MB for email.`);

  if (!pdf.title || /\.(html?|pdf)$/i.test(pdf.title) || /^untitled|^document$/i.test(pdf.title)) add("warn", "pdf-title", "PDF title missing or generic (it shows in the tab and in search): set a real <title>, e.g. \"Invoice F-2026-042 — SPINGA\".", [pdf.title || "(none)"]);
  if (dom.lang === "") add("warn", "pdf-lang", "Missing <html lang> (screen readers and hyphenation need it).");
  if (!pdf.tagged) add("info", "pdf-untagged", "PDF isn't tagged (accessibility); print with scripts/pdf.mjs, which tags by default.");
  if (pdf.pages.length >= 5 && !pdf.outline) add("warn", "pdf-outline", "5+ pages without bookmarks: use real h1–h3 headings so the PDF gets a clickable outline.");
  if (pdf.pages.length > 1 && dom.pageNumbers === false) add("warn", "pdf-page-numbers", "Several pages but no page numbers: add @page { @bottom-right { content: counter(page) \" / \" counter(pages) } }.");

  if (dom.overflow?.length) add("error", "pdf-overflow", "Content wider than the printable area (cut off in the PDF).", dom.overflow);
  if (dom.lowRes?.length) add("warn", "pdf-low-res-image", "Images below ~150 dpi at their printed size: they will look blurry.", dom.lowRes);
  if (dom.smallText?.length) add("warn", "pdf-small-text", "Text under 7pt is unreadable once printed.", dom.smallText);
  if (dom.thinText?.length) add("warn", "pdf-thin-text", "Weights under 300 fade on paper and low-end screens.", dom.thinText);
  if (dom.tablesWithoutHead?.length) add("warn", "pdf-table-header", "Long tables without <thead>: the header won't repeat on the next page.", dom.tablesWithoutHead);
  if (dom.missingGlyphs?.length) add("error", "pdf-missing-glyphs", "Characters the font can't draw (rendered with a fallback): check €, « », œ, accents.", dom.missingGlyphs);

  const text = dom.text || "";
  for (const [rule, message] of contentRules(type, text, pdf.pages.length)) add("warn", rule, message);
  return findings;
}

const INVOICE_COMMON = [
  ["mention-siren", /\b\d{3}\s?\d{3}\s?\d{3}(\s?\d{5})?\b/, "No SIREN/SIRET found (seller, and from 2026 the client's SIREN too)."],
  ["mention-date", /\b\d{1,2}[/.\s-](\d{1,2}|janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-zé.]*[/.\s-]\d{2,4}\b/i, "No issue date found."],
  ["mention-totals", /\bHT\b[\s\S]*\bTTC\b|\bTTC\b[\s\S]*\bHT\b|subtotal[\s\S]*total/i, "Totals HT / TVA / TTC not found."],
  ["mention-vat", /TVA|VAT|293\s?B/i, "No VAT line or VAT exemption mention (\"TVA non applicable, art. 293 B du CGI\")."],
];
const CONTENT = {
  invoice: [
    ...INVOICE_COMMON,
    ["mention-number", /(facture|invoice)\s*(n[°o]|#|no\.?)?\s*[:.]?\s*[A-Z]*[-–]?\d/i, "No invoice number found."],
    ["mention-due-date", /échéance|due date|à régler (avant|le)|payable (le|avant|à)/i, "No payment due date."],
    ["mention-late-penalties", /pénalit|late (payment )?(fee|penalt)/i, "No late-payment penalties mention."],
    ["mention-recovery-fee", /40\s?(,00)?\s?€|€\s?40|indemnité forfaitaire/i, "No €40 fixed recovery fee mention (B2B, France)."],
    ["mention-operation-type", /prestation(s)? de services|livraison de biens|nature de l'opération|services|biens/i, "Nature of the operation (goods / services / mixed) not stated (required from 2026)."],
  ],
  quote: [
    ...INVOICE_COMMON,
    ["mention-quote-number", /(devis|quote|quotation)\s*(n[°o]|#|no\.?)?\s*[:.]?\s*[A-Z]*[-–]?\d/i, "No quote number found."],
    ["mention-validity", /validit|valable|valid (until|for)/i, "No validity period."],
    ["mention-signature", /bon pour accord|signature|accepted by/i, "No \"Bon pour accord\" / signature area."],
  ],
  report: [["mention-summary", /synthèse|résumé|executive summary|summary|en bref|key findings/i, "No executive summary at the start."]],
  proposal: [["mention-next-step", /prochaine étape|next step|contact|réserver|book|rendez-vous/i, "No clear next step / contact."]],
  onepager: [],
};

function contentRules(type, text, pages) {
  const out = [];
  for (const [rule, re, msg] of CONTENT[type] || []) if (!re.test(text)) out.push([rule, msg]);
  if (type === "report" && pages >= 5 && !/sommaire|table of contents|contents/i.test(text)) out.push(["mention-toc", "5+ pages without a table of contents."]);
  if (type === "onepager" && pages > 2) out.push(["onepager-length", `${pages} pages: a one-pager should fit on 1 (2 at most).`]);
  return out;
}

export function formatPdfReport(file, pdf, findings) {
  const icon = { error: "✗", warn: "!", info: "·" };
  const fams = [...new Set(pdf.fonts.map((f) => `${f.family} (${f.subtype === "Type3" ? "Type 3" : f.embedded ? "embedded" : "NOT embedded"})`))];
  const lines = [`PDF — ${file}: ${pdf.pages.length} page(s) · ${(pdf.size / 1024).toFixed(0)} KB · ${pdf.pages[0] ? `${pdf.pages[0].width}×${pdf.pages[0].height}pt` : "?"} · title "${pdf.title}" · ${pdf.tagged ? "tagged" : "untagged"}`];
  lines.push(`Fonts: ${fams.join(", ") || "none"}`);
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
  if (!sorted.length) lines.push("✓ No problems found.");
  for (const f of sorted) lines.push(`${icon[f.severity]} ${f.rule}: ${f.message}${f.items.length ? ` — ${f.items.join(" | ")}` : ""}`);
  return lines.join("\n");
}
