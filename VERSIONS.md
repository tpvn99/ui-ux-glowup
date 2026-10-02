# UI/UX Glowup Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated |
|-------|---------|--------------|
| ui-ux-glowup | 1.6.0 | 2026-10-01 |

## Recent Changes

### 1.6.0 (2026-10-01)

- **ui-ux-glowup** (1.5.0 → 1.6.0): for everyone — creators and people who only modify — and no more "made by AI" tells.
  - **Anti-AI tells, measured**: new audit rules `ai-hero-pill` (pill, badge or "New" announcement above the H1, with or without a dot), `ai-status-dot` (green or pulsing decorative dots), `ai-accent-border` (colored line on one side of a block), `ai-icon-tile` (icons in tinted rounded squares), `ai-gradient-text`, `ai-glow`. `anti-ai.md` opens with the five tells people spot first; `craft.md`, `sections.md`, `sites.md` no longer recommend eyebrows, badges above the hero or accent borders.
  - **Accessibility**: `focus-invisible` (tabs through the controls and reports those with no visible focus) and `reduced-motion` (animations with no `prefers-reduced-motion` rule).
  - **Create or modify**: new entry table in `SKILL.md` (create / modify / document) and plain-words guidance for beginners.
  - **Examples**: `article.html`, `auth.html`, `settings.html`; existing examples cleaned of the tells (hero pill, side bars, colored glow).
  - **PDF templates**: `cv.html`, `letter.html`; accent side bars removed from `one-pager.html` and `proposal.html`.
  - **Direction first** (`references/direction.md`, adapted from Anthropic's public `frontend-design` skill): subject in 3 lines, token plan, check against AI defaults, one bold place, critique. New audit rules `ai-arrow-cta`, `ai-caps-label`, `ai-numbered-markers`, `ai-accent-word`, `ai-middot-meta`; `anti-ai.md` lists the template-chrome tells.
  - **Motion** (`references/motion.md`): one orchestrated moment, motion that answers an action, reduced-motion and no-JS safe; no per-section fade-ups.
  - Fix found by testing on a real site: closed `<details>` (FAQ accordions) no longer count as section content, which produced false `section-gap` warnings.
  - Tests: 58 (new fixtures `ai-tells.html`, `a11y-bugs.html`, `accordion.html`, `ai-chrome.html`).

### 1.5.0 (2026-09-30)

- **ui-ux-glowup** (1.4.1 → 1.5.0): professional PDFs.
  - `scripts/pdf.mjs`: HTML → PDF with Chromium (tagged, bookmarks, CSS page size and margin boxes, safe break defaults), then checks the real file: Type 3 fonts (variable fonts or faked bold/italic), fonts not embedded, system fallback fonts with the suspect characters, blank and near-empty pages, content past the margins, text under 7pt, thin weights, low-resolution images, long tables without `<thead>`, file weight, title, lang, page numbers — and the content each type needs (`--type invoice|quote|report|proposal|onepager`, French invoice mentions incl. the 2026 reform). One PNG with all pages (`--pages` for one per page; needs poppler). `--check file.pdf` for existing PDFs.
  - `scripts/lib/pdfcheck.mjs`: dependency-free PDF reader (objects, Flate streams, object streams, fonts, pages, title, tags).
  - `scripts/site-fonts.mjs`: reuses the website's fonts — finds the families and weights actually used, downloads their files, writes `fonts.css` with `--font-heading`/`--font-body`, license hint per source, `--static` turns variable fonts into static weights (fontTools), warns about faked bold.
  - `references/pdf.md`: workflow, font licensing, page CSS, checklists (every document, invoice/quote, report, proposal, one-pager).
  - Templates in `assets/pdf/`: `facture-devis.html`, `report.html`, `proposal.html`, `one-pager.html` — all print clean on the first page count.
  - Tests: 51.

### 1.4.1 (2026-09-30)

- **ui-ux-glowup** (1.4.0 → 1.4.1): no comments in generated code (section markers, notes, commented-out code) — they cost tokens and get removed anyway; examples' navigation comments are not to be copied. Checklist item added.

### 1.4.0 (2026-09-30)

- **ui-ux-glowup** (1.3.0 → 1.4.0): same results, far fewer tokens.
  - **Effort levels** Quick / Standard / Full: small requests skip intake, references, inventory and token extraction; Standard asks only the intake questions it can't infer.
  - **Load on demand** routing table in `SKILL.md` (one reference per need, only the relevant sections); examples read section by section via their `<!-- -->` markers. `SKILL.md` 14.5 KB → 9 KB, description 938 → 485 characters.
  - `audit.mjs --baseline before.json`: compact delta (scores before → after, fixed rules, open and NEW issues) for every re-check; `--brief` one-line findings; `--max-items`; items capped at 4 in full reports. Header docs updated to /45.
  - `screenshot.mjs --selector <css>`, `--only desktop|mobile`, `--max-height`: re-check just the changed section.
  - `inventory.mjs --json` prints a one-line summary (`--print` for the full list).
  - Token discipline rules (edit instead of rewrite, look at an image once, stop when clean).
  - Tests: 42.

### 1.3.0 (2026-09-28)

- **ui-ux-glowup** (1.2.0 → 1.3.0): intake, recap, phones, SEO, visuals and "nothing forgotten".
  - **Intake questionnaire** (`references/intake.md`): one message, multiple choice, from zero or for a redesign — project type and style family (SaaS/tech, portfolio/agency, business showcase, e-commerce, dashboard), goal, **modernity level** (Classic / Modern / Bold), assets, icons, dark mode, charts, must-keep, audience and SEO phrases → a written brief. Modern touches per level in `craft.md`.
  - **"Directions taken" recap** mandatory after every job (brief, score, references, typography, components, icons, charts/KPIs, mobile, SEO, text edits before → after, inventory, product decisions).
  - **Phones**: new audit rules `zoom-blocked`, `input-zoom`, `tap-crowded`, `fixed-overlay`, `touch-blocked`, `carousel-snap`, `carousel-controls`, `carousel-small-controls`, `carousel-affordance`; `references/mobile.md` (taps, forms, scroll-snap carousel snippet, overlays, safe areas).
  - **Spacing between blocks, readability, SEO**: new SEO criterion (audit now /45) — `section-gap-*`, `section-rhythm`, `long-paragraphs`, `long-sentences`, `justified-text`, `uppercase-text`, `seo-*` (title, description, noindex, Open Graph, favicon, canonical, JSON-LD, thin content), `image-format`, `image-oversized`, `image-lazy`; `references/seo-readability.md` with copy rules (understand first, keep facts and voice, never stuff keywords, list every edit).
  - **Anti-AI**: `ai-gradient`, `ai-glass`, `ai-radius`, `ai-identical-cards`, `ai-emoji`, `ai-cliche`, `ai-centered`; `references/anti-ai.md`.
  - **Nothing forgotten**: `scripts/inventory.mjs` lists every element of a page; `--compare` reports what a redesign lost.
  - **Icons & favicons**: `scripts/find-icons.mjs` (Iconify search online or local `@iconify-json/*`, licenses, React import hints, Flaticon link, `--download`); `scripts/make-favicon.mjs` (ICO/SVG/apple-touch/PWA + head snippet, monogram mode); `references/icons.md`.
  - **Visuals, charts & KPIs**: `references/visuals.md` (clean 3D, bento + micro-animations, semi-flat, Recharts/Chart.js/Framer Motion, donut, KPI card designs, dark mode for charts, WebP/AVIF + SVG, style per project type); new example `kpi-cards.html` (light/dark auto + toggle).
  - All examples get full SEO head tags; `local-business` and `product-page` get JSON-LD.
  - Tests: 40 (new rule groups, inventory diff, icon/favicon helpers, fixture with phone bugs). 6 new evals.

### 1.2.0 (2026-09-28)

- **ui-ux-glowup** (1.1.0 → 1.2.0): lessons from the first real-product test (a dark reseller dashboard behind a login).
  - Audit catches what only the screenshots showed before: **numbers and button labels that wrap**, **table columns hidden off-screen** in scroll areas, **content cut off** by `overflow: hidden`. Line counting ignores icons and mixed font sizes on one baseline.
  - **Root causes over symptoms**: a non-16px `<html>` font-size is reported as the cause of fractional spacing, with the fix, instead of a generic grid warning.
  - **Logged-in pages**: `login.mjs` saves a session (`--storage-state` on every script); `audit.browser.js` (generated by `build-browser-audit.mjs`) runs the full audit pasted into DevTools or a browser JS tool; scripts auto-close modals/cookie banners via their close/decline button (`--no-dismiss` to keep them), `--wait-for` for slow SPAs.
  - **Code mode**: `locate.mjs` maps findings to `file:line` (by text and Tailwind classes, root font rule in CSS); new `references/implement.md` (root-cause-first fixes, working the project's way, verification, implementation-prompt template for coding agents).
  - **Whole sites**: `audit-site.mjs` crawls internal links (skips logout/delete), audits each page and lists issues repeated across pages.
  - `compare.mjs` accepts screenshots (`.png/.jpg/.webp`) as before/after.
  - New example `dashboard-dark.html`; `dashboard-shell.html` (+ React) table now keeps key columns visible on mobile.
  - Workflow: explicit code vs mockup mode, "Product decisions to confirm" kept separate from design changes, mobile-table rule.
  - Tests: 30 (new rules, locate, crawler helpers, bundle freshness + in-page run, site crawl).

### 1.1.0 (2026-09-28)

- **ui-ux-glowup** (1.0.0 → 1.1.0): measurable audits and real reference tokens.
  - New `scripts/audit.mjs`: automated audit at desktop and mobile — WCAG contrast (handles oklch/Tailwind v4 colors and translucent layers), touch targets (WCAG 2.2), type scale, line length/height, 4px spacing grid, radius/shadow/color sprawl, heading order, alt text, form labels, clickable divs, broken/stretched images, lorem ipsum, overflow. Scores the 8 audit criteria with offending selectors; `--json` and `--fail-under` for CI.
  - New `scripts/extract-tokens.mjs`: measures a reference site's fonts, type scale, heading tracking and line-height ratios, spacing rhythm, radii and shadows, so borrowed values are real.
  - New `scripts/compare.mjs`: before/after side-by-side image for the deliverable.
  - `scripts/screenshot.mjs` refactored on a shared `scripts/lib/` (browser loader, color math, page probe, pure analysis).
  - Examples fixed from their own audit: contrast on muted text, decorative mockups exposed as `role="img"`, larger mobile touch targets, accordion hit areas. All examples now pass with no errors.
  - Repo: `package.json`, `node:test` suite (unit tests for color math and analysis rules + browser integration tests), CI runs the tests and posts example audits to the job summary.

### 1.0.0 (2026-09-28)

- Initial release of the **`ui-ux-glowup`** skill (1.0.0).
- Workflow: audit (8 criteria / 40) → pick 2–3 reference sites and name what is borrowed → rebuild from tested examples → screenshot check at desktop and mobile → self-review → deliver with before/after score.
- `references/`: reference-site library by category (`sites.md`), patterns by section (`sections.md`), finishing details (`craft.md`), audit grid (`audit.md`), pre-delivery checklist (`checklist.md`).
- `assets/examples/`: 7 complete Tailwind v4 examples (Linear-style hero, Vercel-style bento, Stripe-style features, pricing + FAQ, dashboard, local business site, product page) + a typed React dashboard.
- `scripts/screenshot.mjs`: Playwright capture at 1440px and 390px with horizontal-overflow warning; also captures live reference sites.
- 6 evals in `evals/evals.json`.
