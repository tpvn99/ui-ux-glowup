import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzePdf, parsePdf, pdfString } from "../skills/ui-ux-glowup/scripts/lib/pdfcheck.mjs";
import { parseFontFaces, selectFaces, licenseHint } from "../skills/ui-ux-glowup/scripts/site-fonts.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try {
  await loadPlaywright();
} catch {
  hasPlaywright = false;
}
const FIX = new URL("./fixtures/pdf/", import.meta.url).pathname;
const page = (textOps = 200, over = {}) => ({ width: 595, height: 842, textOps, drawOps: 10, images: [], ...over });
const pdf = (over = {}) => ({ size: 80_000, title: "Invoice F-2026-042 — Atelier", lang: "fr", tagged: true, outline: false, pages: [page()], fonts: [{ name: "AAAAAA+Inter-Regular", family: "Inter-Regular", subtype: "Type0", embedded: true }], ...over });
const rules = (findings) => new Set(findings.map((f) => f.rule));

test("pdf: a clean document has no findings", () => {
  assert.deepEqual(analyzePdf(pdf(), { fontFamilies: ["Inter"], lang: "fr", pageNumbers: true }), []);
});

test("pdf: Type 3, missing embedding and fallback fonts are errors, with the suspect character", () => {
  const f = analyzePdf(pdf({ fonts: [
    { family: "Inter-Bold", subtype: "Type3", embedded: true },
    { family: "Brand-Regular", subtype: "TrueType", embedded: false },
    { family: "DejaVuSans", subtype: "Type0", embedded: true },
  ] }), { fontFamilies: ["Inter", "Brand"], unusualChars: ["→"] });
  const r = rules(f);
  for (const x of ["pdf-type3-font", "pdf-font-not-embedded", "pdf-fallback-font"]) assert.ok(r.has(x), x);
  assert.match(f.find((x) => x.rule === "pdf-fallback-font").message, /U\+2192/);
});

test("pdf: blank pages, an almost empty last page, heavy files and generic titles are reported", () => {
  const r = rules(analyzePdf(pdf({ size: 6 * 1024 * 1024, title: "doc.html", pages: [page(300), page(0, { drawOps: 0 }), page(280), page(12)] }), { pageNumbers: false }));
  for (const x of ["pdf-blank-page", "pdf-orphan-page", "pdf-heavy", "pdf-title", "pdf-page-numbers"]) assert.ok(r.has(x), x);
});

test("pdf: invoice and quote mentions are checked on the text", () => {
  const missing = rules(analyzePdf(pdf(), { text: "Hello" }, { type: "invoice" }));
  for (const x of ["mention-siren", "mention-number", "mention-totals", "mention-due-date", "mention-late-penalties", "mention-recovery-fee"]) assert.ok(missing.has(x), x);
  const text = "Facture n° F-2026-042 du 30/09/2026. SIREN 123 456 789. Prestation de services. Total HT 100 € TVA 20 % Total TTC 120 €. Échéance 30/10/2026. Pénalités de retard, indemnité forfaitaire de 40 €.";
  assert.deepEqual([...rules(analyzePdf(pdf(), { text }, { type: "invoice" }))], []);
  const quote = rules(analyzePdf(pdf(), { text: text.replace("Facture", "Devis") }, { type: "quote" }));
  assert.ok(quote.has("mention-validity") && quote.has("mention-signature"));
});

test("pdf: string decoding handles UTF-16 hex and literal strings", () => {
  assert.equal(pdfString("/Title <FEFF0046006100630074007500720065>", "Title"), "Facture");
  assert.equal(pdfString("/Title (Devis \\(test\\))", "Title"), "Devis (test)");
});

test("site-fonts: parses @font-face, spots variable fonts, keeps used latin faces, hints licenses", () => {
  const css = `@font-face{font-family:"Inter";font-weight:100 900;src:url(/f/inter-var.woff2) format("woff2-variations")}
@font-face{font-family:Lora;font-weight:400;src:url(lora.woff) format("woff"),url(lora.woff2) format("woff2");unicode-range:U+0000-00FF}
@font-face{font-family:Lora;font-weight:400;src:url(lora-cyr.woff2);unicode-range:U+0400-045F}
@font-face{font-family:Unused;src:url(x.woff2)}`;
  const faces = parseFontFaces(css, "https://site.test/css/main.css");
  assert.equal(faces.length, 4);
  assert.ok(faces[0].variable);
  assert.equal(faces[0].url, "https://site.test/f/inter-var.woff2");
  assert.equal(faces[1].url, "https://site.test/css/lora.woff2");
  const kept = selectFaces(faces, [{ family: "Inter", weight: 400 }, { family: "Lora", weight: 400 }]);
  assert.deepEqual(kept.map((f) => f.url.split("/").pop()), ["inter-var.woff2", "lora.woff2"]);
  assert.match(licenseHint("https://fonts.gstatic.com/s/inter/v1/a.woff2"), /open license/);
  assert.match(licenseHint("https://use.typekit.net/af/x"), /Adobe/);
  assert.match(licenseHint("https://site.test/f/brand.woff2"), /ask the client/);
  assert.match(licenseHint(null), /system font/);
});

test("pdf.mjs prints a clean invoice: embedded TrueType fonts, tagged, titled, one page", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const { makePdf } = await import("../skills/ui-ux-glowup/scripts/pdf.mjs");
  const dir = mkdtempSync(join(tmpdir(), "glowup-pdf-"));
  const r = await makePdf(join(FIX, "good.html"), join(dir, "good.pdf"), { type: "invoice", preview: false });
  assert.ok(existsSync(r.file));
  assert.deepEqual(r.findings.map((f) => f.rule), []);
  const p = parsePdf(readFileSync(r.file));
  assert.equal(p.pages.length, 1);
  assert.ok(p.tagged);
  assert.equal(p.title, "Facture F-2026-001 — Test");
  assert.ok(p.fonts.every((f) => f.embedded && f.subtype !== "Type3"));
});

test("pdf.mjs catches faux bold, fallback glyphs, blank pages, overflow and tiny text", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const { makePdf } = await import("../skills/ui-ux-glowup/scripts/pdf.mjs");
  const dir = mkdtempSync(join(tmpdir(), "glowup-pdf-"));
  const r = await makePdf(join(FIX, "bad.html"), join(dir, "bad.pdf"), { preview: false });
  const got = rules(r.findings);
  for (const x of ["pdf-type3-font", "pdf-fallback-font", "pdf-blank-page", "pdf-overflow", "pdf-small-text", "pdf-title", "pdf-lang", "pdf-page-numbers"]) assert.ok(got.has(x), x);
});

test("site-fonts copies the fonts a page uses and writes fonts.css", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const { siteFonts } = await import("../skills/ui-ux-glowup/scripts/site-fonts.mjs");
  const dir = mkdtempSync(join(tmpdir(), "glowup-fonts-"));
  const r = await siteFonts(join(FIX, "good.html"), dir);
  assert.equal(r.body, "Inter");
  assert.equal(r.faces.length, 2);
  assert.match(readFileSync(join(dir, "fonts.css"), "utf8"), /font-family:"Inter";font-weight:600/);
  assert.ok(r.faces.every((f) => existsSync(f.file)));
});
