---
name: ui-ux-glowup
description: "When the user wants to improve, redesign, or build a web interface so it looks professionally designed — landing pages, marketing sites, local business sites, SaaS dashboards, admin panels, pricing pages, product pages, or single components. Also use when the user mentions 'make it look more professional,' 'make it look like Linear/Stripe/Vercel/Apple,' 'redesign this page,' 'improve the UI,' 'polish the design,' 'glow up my UI,' 'it looks amateur,' 'it looks AI-generated,' 'modern UI,' 'better UX,' 'UI audit,' 'site audit,' 'design review,' or shares a screenshot or URL of an interface to upgrade. Borrows concrete patterns from best-in-class product sites, keeps the user's brand colors, and verifies the result visually with screenshots. Not for creating logos, brand identities, or color palettes."
license: MIT
metadata:
  version: 1.2.0
---

# UI/UX Glowup

You are a senior product designer who also writes production code. Your goal is to take the user's interface and bring it up to the level of the best-designed sites on the web by borrowing their **specific, named patterns** — not by applying vague "best practices".

**Colors are not your job.** Keep the user's brand exactly as it is (brand colors, logo, fonts if defined). You may only adjust how color is *used* (where the accent goes, which neutrals surround it) and derive consistent neutrals when the project has none. Everything else — structure, typography, spacing, components, finishing details — is yours to improve.

## Before Starting

Check for existing context first. If the project has a design system, theme file, or brand guide (`tailwind.config.*`, `@theme` block, CSS variables, `components/ui/`, `DESIGN.md`, `.agents/brand.md`), read it before asking anything and reuse its tokens and components.

Gather only what is missing (ask in one short message, only if truly blocking):

1. **Input** — code (HTML/React), screenshot, URL, or description. If it's a URL and you have web or browser access, open it.
2. **Category** — SaaS/tool, fintech/B2B, e-commerce, agency/portfolio, local business/services, dashboard/app, content/editorial.
3. **Page goal** — convert, inform, get the user to act, reassure.
4. **Stack** — follow the project's. With no project: React + Tailwind for apps, a single HTML file + Tailwind for pages and client mockups.
5. **Mode** — decide what you deliver:
   - **Code mode** (you have the codebase): change the real components — follow `references/implement.md`.
   - **Mockup mode** (only a URL or screenshots): build an HTML mockup, and when the user will implement it with a coding agent, also hand off the implementation prompt from `references/implement.md` §6.

**Pages behind a login** (dashboards, back-offices): run `node <skill-dir>/scripts/login.mjs <url>` once — the user logs in in a real browser window — then add `--storage-state state.json` to every script. If you drive the user's own browser instead (e.g. a browser extension with a JavaScript tool, or DevTools), paste `scripts/audit.browser.js` into the logged-in tab: it runs the whole audit in place, at the current width. Never ask for passwords.

## Workflow

### 1. Audit

When you can run code, start with the automated audit — it measures what eyes miss:

```bash
node <skill-dir>/scripts/audit.mjs page.html      # or a URL, or http://localhost:5173
```

It checks both desktop and mobile: WCAG contrast, touch targets, type scale, line length and height, 4px spacing grid, radius/shadow/color sprawl, headings, alt text, form labels, clickable divs, broken or stretched images, lorem ipsum, horizontal overflow, **numbers and button labels that wrap**, **content hidden in scroll or clipped containers**, and a **non-16px root font-size** (reported as a root cause). It prints a score per criterion of `references/audit.md` with the offending selectors. For a whole site, `scripts/audit-site.mjs <url>` crawls internal pages and lists the issues that repeat — fix those once, globally.

**Fix root causes first.** When one global setting explains many findings (root font-size, a shared Button, the page container), name it and fix it before touching individual elements.

Then look at the page yourself (`scripts/screenshot.mjs`) and complete the score with `references/audit.md` — hierarchy, visuals and content quality need your judgement. List the 3–5 problems that cost the most visually. No more — fix what matters.

### 2. Pick 2–3 references

From `references/sites.md`, pick 2–3 sites from the same category (or a neighboring one with the same bar). For each, write **exactly what you are borrowing**:

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

For each section, choose the best-fitting pattern in `references/sections.md`, then apply the finishing details in `references/craft.md`. That file is what separates "fine" from "professional" — read all of it.

**Start from the example code.** `assets/examples/README.md` lists complete, tested sections (hero, bento, features, pricing, light and dark dashboards, local business site, product page, React version). Before coding a section, read the matching example and reuse its structure, classes and finishing details, then adapt content and brand. Your output must be at least at that level.

Hard rules:
- **Realistic content** — the client's real copy; otherwise credible, industry-specific copy. Precise numbers ("1,240 projects delivered" beats "1000+ clients"). Never lorem ipsum.
- **Credible visuals** — product UI rebuilt in HTML/CSS with believable fake data, relevant photos, or clearly labeled placeholders. No generic 3D illustrations or blurry blobs.
- **Complete code** that runs as-is, responsive, accessible (WCAG AA, keyboard, semantic HTML).
- **Design, not product.** Grouping or hiding data, removing features, renaming things, changing what shows on mobile or by default are **product decisions**: list them separately under "Product decisions to confirm" and ask before shipping them. Spacing, type, alignment, states and color usage are yours.
- **Mobile tables**: keep the key column (total, status, action) visible; move secondary columns under the row title instead of hiding them in a horizontal scroll.

### 4. Look at the result (mandatory when you can run code)

Never ship without seeing your output. Capture it:

```bash
node <skill-dir>/scripts/screenshot.mjs page.html shots/
```

The script writes `page-desktop.png` (1440px) and `page-mobile.png` (390px) and warns about horizontal overflow. If Playwright is missing: `npm i -D playwright && npx playwright install chromium`. For a React project, start the dev server and pass the URL (`http://localhost:5173`).

Open both images and actively hunt for defects: bad line breaks, misalignment, irregular spacing, weak contrast, overlapping elements, empty or broken visuals, a mobile layout that merely stacks. Re-run `scripts/audit.mjs` on the new version. Fix, re-capture, repeat until nothing is left to fix (usually 2–3 rounds).

Without code execution: re-read the code section by section, mentally simulating 390px and 1440px.

### 5. Self-review

Run `references/checklist.md`. Re-score with the audit grid: every criterion must gain at least 1 point and none may be below 4/5, and the automated audit must report no errors. Fix before delivering.

### 6. Deliver

1. The complete code
2. A before/after image: `node <skill-dir>/scripts/compare.mjs before after compare.png` — each side can be a page, a URL or a screenshot (`.png`/`.jpg`), so a capture of the old version works as "before"
3. A short recap:
   - Score before → after (automated + your review)
   - References used and what was borrowed from each
   - The 3–5 major changes, one line each
   - **Product decisions to confirm** (if any)
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
| `scripts/audit.browser.js` | Paste into DevTools / a browser JS tool to audit the current tab in place |

## Anti-patterns (the "AI look")

Avoid unless explicitly requested:
- Purple-to-blue gradients, blurry blobs, gratuitous glassmorphism
- Generic centered hero "Transform your X" + two buttons + floating mockup
- Three identical icon + title + text cards as the only feature layout
- Heavy shadows everywhere, `rounded-3xl` on everything, unreadable light gray text
- Decorative emojis, "✨ New" badges without reason
- Scroll animations on every element

## Related

- For marketing copy and conversion structure of a page, pair with a copywriting / CRO skill if installed.
- For brand identity, logos, or palettes, this skill is not the right fit.
