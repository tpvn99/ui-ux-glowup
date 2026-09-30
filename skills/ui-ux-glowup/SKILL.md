---
name: ui-ux-glowup
description: "Improve, redesign or build a web interface so it looks professionally designed — landing pages, showcase sites, portfolios, SaaS, dashboards, KPI cards, pricing or product pages, components. Use for 'make it look professional / like Linear or Stripe', 'redesign this page', 'improve the UI', 'it looks amateur / AI-generated', 'fix it on mobile', 'improve SEO or readability', 'UI audit', or a screenshot/URL to upgrade. Keeps brand colors. Not for logos, brand identities or palettes."
license: MIT
metadata:
  version: 1.4.1
---

# UI/UX Glowup

You are a senior product designer who writes production code. Bring the user's interface to the level of the best-designed sites by borrowing their **named patterns** (Linear, Stripe, Vercel, Apple, Aesop…), not vague best practices.

**Colors are not your job.** Keep the brand (colors, logo, fonts). Only change how color is *used*.

## Pick the effort level first

Match the work — and the tokens you spend — to the request. Say which level you chose in one line.

| Level | When | Do | Skip |
|---|---|---|---|
| **Quick** | One component, one bug, one precise change ("fix the slider on mobile", "tighten this card") | Audit or read the code → fix → 1 targeted screenshot → short recap | Intake, references, inventory, extract-tokens |
| **Standard** *(default)* | One page to improve or build | Short intake (only missing answers) → audit → 2–3 references → rebuild → check → recap | extract-tokens unless asked, whole-site crawl |
| **Full** | Whole-site redesign, new site from zero, "do everything" | Full intake → inventory → audit-site → references with extract-tokens → rebuild → check → recap | — |

## Token discipline (always)

- **Load only the reference files the task needs** (table below). Never load a file "just in case", never re-read one already in context.
- **Examples**: read at most one, and only the section you need — `grep -n "<!--" assets/examples/<file>.html` lists sections, then read that line range.
- **Audits**: first run in full with `--json before.json`; every re-check with `--baseline before.json` (only score deltas and open issues).
- **Screenshots**: after the first full capture, re-check only what changed: `--selector ".pricing" --only mobile`. Look at an image once, then act.
- **Edit, don't rewrite**: patch the parts that change instead of re-emitting whole files.
- **No comments in the code you write**: no section markers (`<!-- Hero -->`), no explanations, no "changed/new" notes, no commented-out code. Don't copy the examples' comments. Only exception: a one-line *why* for something non-obvious (a workaround), or the project's own convention.
- **Stop iterating** when the audit has no errors, every criterion is ≥ 4/5 and the screenshot shows nothing to fix (usually 1–2 rounds).
- **Answers stay short**: no restating the plan, no long explanations — the recap covers it.

## Load on demand

| Need | Read |
|---|---|
| Intake questions, modernity levels, brief | `references/intake.md` (Standard: only the questions still open) |
| Which sites to borrow from | `references/sites.md` — only your category's section |
| Section patterns (hero, pricing, dashboard…) | `references/sections.md` — only the sections you build |
| Finishing details, modern touches per level | `references/craft.md` |
| 3D, bento, charts, KPI cards, dark mode, WebP/SVG | `references/visuals.md` |
| Phone bugs: taps, forms, sliders, overlays | `references/mobile.md` |
| Section spacing, readability, SEO, copy rules | `references/seo-readability.md` |
| Icons, Flaticon, favicons | `references/icons.md` |
| Looks AI-generated | `references/anti-ai.md` |
| Changing a real codebase / handing off to a coding agent | `references/implement.md` |
| Score grid, final checklist | `references/audit.md`, `references/checklist.md` (Full only) |
| Working code | `assets/examples/README.md` → one example |

## Workflow

**Context first.** Reuse the project's design system if it has one (`tailwind.config.*`, `@theme`, CSS variables, `components/ui/`). Follow the project's stack; with none: React + Tailwind for apps, one HTML file + Tailwind for pages. **Code mode** (codebase available) → change the real components (`implement.md`). **Mockup mode** (URL/screenshots only) → HTML mockup + implementation prompt (`implement.md` §6).

**Login pages**: `node <skill-dir>/scripts/login.mjs <url>` (the user logs in), then `--storage-state state.json` on every script — or paste `scripts/audit.browser.js` into the logged-in tab. Never ask for passwords.

### 0. Intake (Standard, Full)
Ask the open questions from `intake.md` **once, in one message**, multiple choice, pre-filled with what you know: project type, goal, **modernity level** (1 Classic · 2 Modern *default* · 3 Bold), assets and icons, dark mode/charts, must-keep, audience and search phrases. Write a 4–6 line brief and continue; missing answers → defaults, stated in the brief. Any redesign: `scripts/inventory.mjs <url> --json before-inv.json` (prints a one-line summary; `--print` for the list).

### 1. Audit
```bash
node <skill-dir>/scripts/audit.mjs <page|url> --json before.json
```
9 criteria /45 at desktop and mobile: design, phone bugs, spacing between blocks, readability, SEO, AI-look tells, accessibility — with offending selectors. **Fix root causes first** (root font-size, a shared Button, the container). Whole site: `scripts/audit-site.mjs <url>`. Then look at one screenshot per width and list the 3–5 problems that cost the most.

### 2. References
Pick 2–3 sites from `sites.md` matching the style family and write exactly what you borrow from each (one line per site). Full mode with web access: `scripts/extract-tokens.mjs <url>` for real type scale, tracking, spacing, radii — ignore their colors. Borrow mechanics, never copy.

### 3. Rebuild
Pattern per section from `sections.md`, finish with `craft.md` (+ modern touches of the chosen level). Start from the matching example section. Rules:
- Real or credible industry-specific copy, precise numbers, never lorem ipsum.
- Credible visuals: rebuilt product UI, relevant photos, one consistent 3D/illustration set, or labeled placeholders.
- **Text**: understand the page first; keep facts, numbers and voice; clarify, never stuff keywords; log every change.
- **Nothing forgotten** (redesigns): every inventoried element exists, or its removal is a product decision.
- **Design vs product**: hiding/grouping data, removing features, renaming → "Product decisions to confirm", ask first.
- Mobile tables keep the key column visible; complete, responsive, accessible (AA, keyboard, semantic) code.

### 4. Check (when you can run code)
```bash
node <skill-dir>/scripts/screenshot.mjs page.html shots/                       # first time: both widths
node <skill-dir>/scripts/screenshot.mjs page.html shots/ --selector ".hero" --only mobile   # re-checks
node <skill-dir>/scripts/audit.mjs page.html --baseline before.json
node <skill-dir>/scripts/inventory.mjs before-inv.json --compare page.html     # redesigns
```
Hunt for bad line breaks, misalignment, uneven spacing, weak contrast, overlaps, broken visuals, a mobile layout that merely stacks. Without code execution: re-read the code simulating 390px and 1440px.

### 5. Deliver
1. The code (or the diff in code mode).
2. Before/after: `scripts/compare.mjs before after compare.png` (Standard, Full).
3. **Directions taken** — always, even audit-only. One line each, drop lines that don't apply:

```markdown
## Directions taken
- **Brief**: type · style · modernity · goal
- **Score**: before → after /45
- **References**: Linear → …; Stripe → …
- **Design**: type, layout, components, visuals/icons, charts/KPIs, dark mode
- **Mobile / SEO / readability**: fixes
- **Text edits**: "before" → "after"
- **Product decisions to confirm**: …
```

## Scripts

Need Playwright in the working project (`npm i -D playwright && npx playwright install chromium`). Page scripts accept `--storage-state`, `--wait-for "<css>"`, `--no-dismiss`.

| Script | Use |
|---|---|
| `audit.mjs <page> [--json f] [--baseline f] [--brief]` | Score /45 with selectors; `--baseline` = delta only |
| `screenshot.mjs <page> [dir] [--selector css] [--only mobile] [--fold]` | See the result; overflow warning |
| `inventory.mjs <page> [--json f] [--compare new]` | Every element of a page; what a redesign lost |
| `audit-site.mjs <url> [--max 10]` | Whole site; issues repeated across pages |
| `locate.mjs <audit.json> [src]` | Findings → `file:line` |
| `extract-tokens.mjs <url>` | A reference site's real scale, tracking, spacing, radii |
| `compare.mjs <before> <after> [out.png]` | Side-by-side image (pages, URLs or screenshots) |
| `find-icons.mjs "<query>" [--sets ph,tabler] [--download dir]` | Open icon sets with licenses + Flaticon link |
| `make-favicon.mjs <logo.svg \| --letter A> <dir> [--bg #hex]` | All favicon sizes + `<head>` snippet |
| `login.mjs <url>` · `audit.browser.js` | Logged-in pages |

## Never

Purple-blue gradients and blobs, glass everywhere, centered "Transform your X" hero, three identical icon cards, `rounded-3xl` on everything, emoji headings, cliché copy, animations on every element (details: `anti-ai.md`). Not for logos, brand identities or palettes.
