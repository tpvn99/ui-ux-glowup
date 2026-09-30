# PDF Templates

Print-ready HTML (A4, plain CSS, no framework), checked with `scripts/pdf.mjs`: fonts embedded as TrueType, tagged, no fallback glyphs, no blank or near-empty pages. Rules and checklists: `references/pdf.md`.

| File | Document | Pages | `--type` |
|---|---|---|---|
| `facture-devis.html` | French invoice or quote with all legal mentions (2026 reform included). Switch with `<body data-kind="facture">` / `"devis"` | 1 | `invoice` / `quote` |
| `report.html` | Audit / report: dark cover, executive summary with KPIs and findings, contents, chart, tables, action plan | 4 | `report` |
| `proposal.html` | Commercial proposal: cover, problem, 3-step approach, proof and team, 3 pricing options, next step | 3 | `proposal` |
| `one-pager.html` | Product or service sheet: hero with visual, benefits, specs, options, steps, testimonial, CTA | 1 | `onepager` |

Adapt:
1. Fonts: delete the `@font-face` lines and add `<link rel="stylesheet" href="fonts.css">` **after** `</style>` (from `scripts/site-fonts.mjs <site> <dir> --static`); it overrides `--font-heading` and `--font-body`, which the templates use everywhere.
2. Color: set `--accent` to the brand color; leave the neutrals.
3. Content: all names, numbers and IDs are fictional placeholders — replace every one (SIREN, VAT, IBAN, addresses).
4. Print: `node <skill-dir>/scripts/pdf.mjs <file>.html --type <type>`, then look at `<file>-pages.png`.

Read only the part you need: the `<style>` block sets the look, the `<body>` is the structure.
