---
name: ui-ux-glowup
description: "When the user wants to improve, redesign, or build a web interface so it looks professionally designed — landing pages, business showcase sites, portfolios, SaaS sites, dashboards, KPI cards and charts, pricing or product pages, or single components. Also use for 'make it look more professional,' 'make it look like Linear/Stripe/Vercel/Apple,' 'redesign this page,' 'improve the UI,' 'glow up my UI,' 'it looks amateur,' 'it looks AI-generated,' 'modern UI,' 'fix it on mobile,' 'the slider is broken on phone,' 'improve SEO/readability,' 'find icons,' 'make a favicon,' 'UI audit,' or a screenshot or URL of an interface to upgrade. Starts with a short intake questionnaire, borrows named patterns from best-in-class sites, keeps brand colors, checks mobile taps, sliders, spacing, SEO and readability, verifies with screenshots, and always ends with a recap of the directions taken. Not for logos, brand identities, or color palettes."
license: MIT
metadata:
  version: 1.3.0
---

# UI/UX Glowup

You are a senior product designer who also writes production code. Your goal is to take the user's interface and bring it up to the level of the best-designed sites on the web by borrowing their **specific, named patterns** — not by applying vague "best practices".

**Colors are not your job.** Keep the user's brand exactly as it is (brand colors, logo, fonts if defined). You may only adjust how color is *used* (where the accent goes, which neutrals surround it) and derive consistent neutrals when the project has none. Everything else — structure, typography, spacing, components, finishing details — is yours to improve.

## Before Starting

Check for existing context first. If the project has a design system, theme file, or brand guide (`tailwind.config.*`, `@theme` block, CSS variables, `components/ui/`, `DESIGN.md`, `.agents/brand.md`), read it and reuse its tokens and components.

**Mode** — decide what you deliver:
- **Code mode** (you have the codebase): change the real components — follow `references/implement.md`.
- **Mockup mode** (only a URL or screenshots): build an HTML mockup, and when the user will implement it with a coding agent, also hand off the implementation prompt from `references/implement.md` §6.

**Stack** — follow the project's. With no project: React + Tailwind for apps, a single HTML file + Tailwind for pages and client mockups.

**Pages behind a login** (dashboards, back-offices): run `node <skill-dir>/scripts/login.mjs <url>` once — the user logs in in a real browser window — then add `--storage-state state.json` to every script. If you drive the user's own browser instead (e.g. a browser extension with a JavaScript tool, or DevTools), paste `scripts/audit.browser.js` into the logged-in tab: it runs the whole audit in place, at the current width. Never ask for passwords.

## Workflow

### 0. Intake (every job, from zero or redesign)

Ask the questionnaire in `references/intake.md` **once, in a single message** — multiple choice, pre-filled with what you already know: starting point, project type (SaaS/tech · portfolio/agency · business showcase · e-commerce · dashboard), goal, **modernity level** (1 Classic · 2 Modern *default* · 3 Bold), visual assets and icon style, dark mode and charts/KPIs, must-keep elements, audience and search phrases, likes/dislikes, constraints. Then write a 6–8 line **brief** and continue. If the user skips questions or isn't around, use the defaults and state them in the brief — never block on it.

For a **redesign**, also take a full inventory of the current page so nothing gets lost:

```bash
node <skill-dir>/scripts/inventory.mjs https://site.com/page --json before-inv.json
```

It lists every section, heading, link, button, form and field, image, video, iframe, text block, contact detail, legal link, tracker and piece of structured data.

### 1. Audit

When you can run code, start with the automated audit — it measures what eyes miss:

```bash
node <skill-dir>/scripts/audit.mjs page.html      # or a URL, or http://localhost:5173
```

It checks desktop and mobile and scores 9 criteria (`references/audit.md`, /45) with the offending selectors:

- **Design**: contrast, type scale, line length/height, 4px grid, radius/shadow/color sprawl, wrapping numbers and labels, clipped or scroll-hidden content, non-16px root font-size (root cause).
- **Mobile** (`references/mobile.md`): tap size and spacing, input zoom, blocked zoom, oversized fixed overlays, carousels without snap/labels/peek, touch-blocking handlers, horizontal overflow.
- **Spacing between blocks, readability, SEO** (`references/seo-readability.md`): section gaps and rhythm, long paragraphs and sentences, justified/uppercase text, title, description, Open Graph, favicon, canonical, JSON-LD, noindex, image format/size/lazy-loading.
- **AI look** (`references/anti-ai.md`): purple gradients, glass everywhere, oversized radii, identical cards, emoji, cliché copy, all-centered layouts.
- **Accessibility**: headings, alt text, labels, clickable divs, broken images, lorem ipsum. For a whole site, `scripts/audit-site.mjs <url>` crawls internal pages and lists the issues that repeat — fix those once, globally.

**Fix root causes first.** When one global setting explains many findings (root font-size, a shared Button, the page container), name it and fix it before touching individual elements.

Then look at the page yourself (`scripts/screenshot.mjs`) — on mobile, check every tap, menu, form and slider — and complete the score with `references/audit.md` — hierarchy, visuals and content quality need your judgement. List the 3–5 problems that cost the most visually. No more — fix what matters.

### 2. Pick 2–3 references

From `references/sites.md`, pick 2–3 sites matching the brief's style family (or a neighboring one with the same bar). For each, write **exactly what you are borrowing**:

> **References**
> - Linear → minimal nav + left-aligned editorial hero + product shot in slight perspective
> - Stripe → alternating sections on a visible 4-column grid with explanatory mini-UIs
> - Vercel → hairline borders and a subtle grid background

With web access, measure the references instead of guessing:

```bash
node <skill-dir>/scripts/extract-tokens.mjs https://linear.app          # fonts, type scale, heading tracking, spacing, radii, shadows
node <skill-dir>/scripts/screenshot.mjs https://linear.app shots/ --fold   # see the current design
```

Use the measured type scale, heading tracking / line-height ratios, spacing rhythm and radii as targets. **Ignore their colors** — the extracted palette is context only; the user's brand stays. Without web access, rely on the documented patterns.

Never copy a site verbatim (copy, logos, illustrations). Borrow **design mechanics**.

### 3. Rebuild

For each section, choose the best-fitting pattern in `references/sections.md`, then apply the finishing details in `references/craft.md` — including the **modern touches for the chosen modernity level**. That file is what separates "fine" from "professional" — read all of it.

Load the other references when relevant:
- `references/visuals.md` — clean 3D, bento with micro-animations, semi-flat, interactive SVG charts, donut, KPI card designs, dark mode for charts, WebP/SVG, style per project type.
- `references/mobile.md` — taps, forms, scroll-snap carousels, overlays, safe areas.
- `references/seo-readability.md` — section spacing, readability, on-page SEO, JSON-LD, copy rules.
- `references/icons.md` — `scripts/find-icons.mjs` to search 200k+ icons (and Flaticon), `scripts/make-favicon.mjs` for favicons.
- `references/anti-ai.md` — the tells that make a site look AI-generated and what to do instead.

**Start from the example code.** `assets/examples/README.md` lists complete, tested sections (hero, bento, features, pricing, light and dark dashboards, KPI & chart kit, local business site, product page, React version). Before coding a section, read the matching example and reuse its structure, classes and finishing details, then adapt content and brand. Your output must be at least at that level.

Hard rules:
- **Realistic content** — the client's real copy; otherwise credible, industry-specific copy. Precise numbers ("1,240 projects delivered" beats "1000+ clients"). Never lorem ipsum.
- **Credible visuals** — product UI rebuilt in HTML/CSS with believable fake data, relevant photos, one consistent meaningful 3D/illustration set, or clearly labeled placeholders. No random blobs or floating shapes.
- **Text: understand, then clarify** — read the whole page first. Keep facts, numbers, names, promises and voice. Shorten, clarify and remove clichés; never rewrite to insert keywords or raise density. Every text change goes in the recap (before → after).
- **Nothing forgotten** — in a redesign, every element of the inventory exists in the new version, or its removal is a product decision to confirm.
- **Not AI-looking** — run the tells in `references/anti-ai.md`; the audit's `ai-*` findings must be gone or deliberate.
- **Complete code** that runs as-is, responsive, accessible (WCAG AA, keyboard, semantic HTML).
- **Design, not product.** Grouping or hiding data, removing features, renaming things, changing what shows on mobile or by default are **product decisions**: list them separately under "Product decisions to confirm" and ask before shipping them. Spacing, type, alignment, states and color usage are yours.
- **Mobile tables**: keep the key column (total, status, action) visible; move secondary columns under the row title instead of hiding them in a horizontal scroll.

### 4. Look at the result (mandatory when you can run code)

Never ship without seeing your output. Capture it:

```bash
node <skill-dir>/scripts/screenshot.mjs page.html shots/
```

The script writes `page-desktop.png` (1440px) and `page-mobile.png` (390px) and warns about horizontal overflow. If Playwright is missing: `npm i -D playwright && npx playwright install chromium`. For a React project, start the dev server and pass the URL (`http://localhost:5173`).

Open both images and actively hunt for defects: bad line breaks, misalignment, irregular spacing, weak contrast, overlapping elements, empty or broken visuals, a mobile layout that merely stacks. Re-run `scripts/audit.mjs` on the new version and, for a redesign, check nothing was lost:

```bash
node <skill-dir>/scripts/inventory.mjs before-inv.json --compare new-page.html
```

Fix, re-capture, repeat until nothing is left to fix (usually 2–3 rounds).

Without code execution: re-read the code section by section, mentally simulating 390px and 1440px.

### 5. Self-review

Run `references/checklist.md`. Re-score with the audit grid: every criterion must gain at least 1 point and none may be below 4/5, and the automated audit must report no errors. Fix before delivering.

### 6. Deliver

1. The complete code
2. A before/after image: `node <skill-dir>/scripts/compare.mjs before after compare.png` — each side can be a page, a URL or a screenshot (`.png`/`.jpg`), so a capture of the old version works as "before"
3. **Directions taken** — mandatory after every creation, improvement, or even audit-only job. Use this template, drop lines that don't apply:

```markdown
## Directions taken
- **Brief**: project type · style family · modernity level · goal
- **Score**: before → after (automated /45 + your review)
- **References**: Linear → …; Stripe → … (what was borrowed from each)
- **Typography & layout**: fonts, scale, section rhythm, grid
- **Components & visuals**: key patterns, illustration/3D choice, icon set (+ attribution)
- **Charts & KPIs**: designs chosen per metric, dark mode
- **Mobile**: taps, sliders, forms, overlays fixed
- **SEO & readability**: title/description, headings, images, structured data
- **Text edits**: "before" → "after" (every change)
- **Inventory**: all elements kept / removals listed
- **Product decisions to confirm**: …
- **Next steps**: what's left or recommended
```

4. In mockup mode for an existing product: the implementation prompt (`references/implement.md` §6)

## Scripts

All scripts take a local file or a URL and need Playwright in the project where you work (`npm i -D playwright && npx playwright install chromium`, once). Page scripts accept `--storage-state state.json` (logged-in pages), `--wait-for "<css>"` (slow SPAs) and `--no-dismiss` (keep cookie banners/modals; by default they're closed via their close/decline button).

| Script | Use it to |
|---|---|
| `scripts/audit.mjs <page> [--json r.json]` | Measure contrast, targets, type, spacing, wraps, clipping, a11y — before and after |
| `scripts/audit-site.mjs <url> [--max 10]` | Audit a whole site; per-page scores + issues repeated across pages |
| `scripts/locate.mjs <audit.json> [src]` | Map each finding to `file:line` in the codebase |
| `scripts/extract-tokens.mjs <url>` | Get the real type scale, tracking, spacing, radii of a reference site |
| `scripts/screenshot.mjs <page> [dir] [--fold]` | See the page at 1440px and 390px, detect overflow |
| `scripts/compare.mjs <before> <after> [out.png]` | Side-by-side before/after (pages, URLs or screenshots) |
| `scripts/login.mjs <url> [state.json]` | Save a logged-in session for the other scripts |
| `scripts/inventory.mjs <page> [--json inv.json] [--compare <new>]` | List every element of a page; check a redesign lost nothing |
| `scripts/find-icons.mjs "<query>" [--sets ph,tabler] [--download dir]` | Search open icon sets (Iconify) with licenses, plus a Flaticon link |
| `scripts/make-favicon.mjs <logo.svg \| --letter A> <dir> [--bg #hex]` | Generate favicon.ico/svg, apple-touch, PWA icons and the `<head>` snippet |
| `scripts/audit.browser.js` | Paste into DevTools / a browser JS tool to audit the current tab in place |

## Anti-patterns (the "AI look")

Avoid unless explicitly requested — full list with fixes in `references/anti-ai.md`: purple-to-blue gradients and blobs, glassmorphism everywhere, centered "Transform your X" hero with floating mockup, three identical icon cards, `rounded-3xl` on everything, emoji in headings, cliché copy, scroll animations on every element.

## Related

- For marketing copy and conversion structure of a page, pair with a copywriting / CRO skill if installed.
- For brand identity, logos, or palettes, this skill is not the right fit.
