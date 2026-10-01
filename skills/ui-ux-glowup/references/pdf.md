# PDF Documents

Invoices, quotes, reports, proposals, one-pagers: write them as HTML + print CSS, print with `scripts/pdf.mjs`, look at the page sheet, fix, deliver. Same design rules as the web (hierarchy, spacing, one accent, brand colors kept).

## Workflow

1. **Fonts = the client's website fonts**, so documents match the site:
   ```bash
   node <skill-dir>/scripts/site-fonts.mjs https://client-site.com docs/ --static
   ```
   Writes `docs/fonts.css` (+ `docs/fonts/`) with `--font-heading` / `--font-body`, and a license hint per font. `--static` turns variable fonts into one file per weight (needs `pip install fonttools brotli`).
2. **Start from a template** in `assets/pdf/` (table below): delete its `@font-face` lines and add `<link rel="stylesheet" href="fonts.css">` after `</style>`, set `--accent` to the brand color, replace the content.
3. **Print and check**:
   ```bash
   node <skill-dir>/scripts/pdf.mjs docs/facture.html --type invoice      # invoice | quote | report | proposal | onepager
   ```
   Prints the PDF (tagged, bookmarks, fonts embedded), checks it, writes `facture-pages.png` (all pages side by side). Look at that one image, fix, re-run. Existing PDF: `pdf.mjs --check file.pdf`.
4. **Deliver** only when the report says ✓ and the sheet shows no stranded block, no near-empty last page.

## Fonts: the site's, and legally embeddable

| Source of the site font | What to do |
|---|---|
| Google Fonts, Bunny, Fontsource | Open license (OFL): embed freely |
| Adobe Fonts (Typekit) | Embedding in the client's own PDFs is allowed, but kit files can't be reused: activate the font in Creative Cloud on the machine that prints, or use the closest open font |
| Self-hosted / commercial (Monotype, MyFonts…) | Ask the client for the license: web licenses often exclude PDF embedding (a desktop license usually allows it). Otherwise the closest open font |
| System font (Helvetica, Segoe, SF, Arial) | Not reliably embeddable: Inter (sans), Source Serif 4 (serif) |

Always name the font and its license in the recap. Technical rules (checked by `pdf.mjs`):
- **Static files for every weight and style used** — a variable font or a missing bold/italic is printed as a Type 3 font (blurry, bad copy/paste, rejected by printers) [`pdf-type3-font`].
- **Every character covered**: `→ ✓ ★` and many arrows are outside latin subsets and fall back to a system font [`pdf-fallback-font`]. Load the subset that has them, use inline SVG icons, or rephrase.
- 2 families max, 3 weights max; body 9.5–11pt, never under 7pt, no weights under 300 [`pdf-small-text`, `pdf-thin-text`]; `font-variant-numeric: tabular-nums` on amounts.

## Page setup (CSS)

```css
@page { size: A4; margin: 16mm 16mm 20mm;
  @bottom-left  { content: "Company SAS · RCS … · SIRET …"; font: 400 7pt var(--font-body); color: #6b6b76 }
  @bottom-right { content: counter(page) " / " counter(pages); font: 500 7.5pt var(--font-body) } }
@page cover { margin: 0; @bottom-left { content: none } @bottom-right { content: none } }
.cover { page: cover; height: 297mm }
h2, h3 { break-after: avoid }            /* pdf.mjs adds these defaults */
tr, figure, .card { break-inside: avoid }
thead { display: table-header-group }    /* header repeats on each page */
```
- Margin boxes must name the font (`font: … var(--font-body)`) or they fall back to a system font.
- Chapters: `break-before: page` only for the cover and big sections; let short sections flow (no half-empty pages).
- Images: ≥ 150 dpi at printed size (300 for professional print, `--print`) [`pdf-low-res-image`]; JPEG/WebP ~80%; charts and logos in SVG (set `font-family` on SVG text).
- Real `<title>` (becomes the PDF title) and `<html lang>` [`pdf-title`, `pdf-lang`]. Target < 2 MB for email [`pdf-heavy`].

## Every document

- Logo + contact in the header or footer, page numbers "2 / 5" from 2 pages, date, reference/version.
- No stranded heading, no split table row, no blank or near-empty last page [`pdf-blank-page`, `pdf-orphan-page`], nothing past the margins [`pdf-overflow`].
- Same look as the web: clear hierarchy, 2 greys, brand color as the only accent, aligned numbers.

## By type (`--type` checks the text for them)

**Invoice / quote (France)** — `facture-devis.html` (`<body data-kind="facture|devis">`)
- Seller: legal name, legal form and capital, address, SIREN/SIRET, RCS/RM, intra-EU VAT number.
- Client: name, billing address, **client SIREN**; delivery address if different.
- Number (unique, sequential), issue date, service date, due date.
- Lines: precise description, quantity, unit price excl. VAT, VAT rate per line; totals HT / VAT per rate / TTC, discounts, deposit, amount due. Or "TVA non applicable, art. 293 B du CGI".
- Payment terms, late penalties, €40 fixed recovery fee (B2B), discount or "Pas d'escompte".
- 2026 reform: **nature of the operation** (goods / services / mixed), **VAT on debits** option if chosen.
- Quote only: validity period, "Bon pour accord" + date + signature box, deposit.
- ⚠ From the e-invoicing reform, B2B invoices must go through an approved platform in a structured format (Factur-X…). The PDF is the **readable version**; the legal sending goes through the invoicing tool. Tell the user to confirm with their accountant.

**Report / audit** — `report.html`: cover (title, client, date, author) · one-page executive summary first (3–5 key figures, findings, recommendations) · contents from 5 pages · numbered figures with sources · action plan (priority, effort, owner, date) at the end.

**Proposal / brochure** — `proposal.html`: cover · the client's problem · approach in steps with timing · proof (figures, testimonial, team) · options and prices · one clear next step with contact.

**CV** — `cv.html`: 1 page, dates aligned right, numbers in every bullet, no photo or rating bars unless asked. **Letter** — `letter.html`: letterhead, recipient, date, subject line, short paragraphs (72 characters wide), signature, enclosure.

**One-pager / product sheet** — `one-pager.html`: fits on 1 page (2 max), readable in 10 seconds · name + value proposition at the top · visual · key specs · benefits · price · call to action and contact.
