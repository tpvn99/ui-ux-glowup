# Audit Grid

Score each criterion from 1 to 5, before and after (`scripts/audit.mjs` does it automatically). Target: no criterion below 4 after the redesign.

The automatic rules behind each criterion are explained in `references/mobile.md` (taps, sliders, overlays), `references/seo-readability.md` (section spacing, readability, SEO) and `references/anti-ai.md` (AI-template tells, counted under Visuals and Content).

| # | Criterion | 1 = weak | 5 = reference level |
|---|---|---|---|
| 1 | **Hierarchy** | Everything has the same weight, the eye doesn't know where to go | One dominant element per screen, reading order is obvious |
| 2 | **Typography** | Default font, random sizes, heavy headings | Clear scale, tight and elegant headings, comfortable body text |
| 3 | **Spacing & grid** | Cramped or inconsistent, nothing aligns | Regular rhythm, generous whitespace, strict alignment |
| 4 | **Components** | Default styles, inconsistent with each other | Coherent system, complete states, refined details |
| 5 | **Visuals** | Generic stock, clipart icons, distorted images | Specific visuals, credible product shots, consistent treatment |
| 6 | **Content** | Empty slogans, lorem ipsum, vague copy | Concrete benefits, precise numbers, careful microcopy |
| 7 | **Responsive** | Broken or just stacked on mobile | Designed for each size, proper touch targets |
| 8 | **Accessibility** | Low contrast, clickable divs, no focus | AA, semantic, keyboard, visible focus |
| 9 | **SEO & readability** | No title/description, walls of text, heavy JPGs, no structure | Title + description + OG + favicon + JSON-LD, one h1, short paragraphs, WebP/SVG, lazy images |

Output format:

```
Audit: Hierarchy 2 · Typography 2 · Spacing 3 · Components 2 · Visuals 1 · Content 3 · Responsive 3 · A11y 2 · SEO 2 → 20/45
Top problems:
1. …
2. …
3. …
```

## How the score of 45 is computed, and what it is not

- **9 criteria, 0–5 each, equal weight** (each is 11% of the total). A criterion starts at 5 and loses **1 per error** and **0.5 per warning**; information-level findings cost nothing. The floor is 1, so the lowest possible total is 9.
- Scores are rounded to the nearest half point. Brand choices accepted with `--allow` (`ai-hero-pill`, `ai-accent-word`, `ai-caps-label`) cost nothing.
- **Visuals\* and Content\*** are only partly measurable by a script: confirm them by looking at the screenshots and reading the copy.
- A 45/45 means **no automatic rule fired**. It is not a guarantee of quality: it says nothing about whether the product is easy to use, fast for real users, or works for people with a screen reader. Never present it as one.

What the score does **not** contain, and where each lives (`verify.mjs` reports them as separate categories, never blended into one number):

| Dimension | Measured by |
|---|---|
| Functionality, regressions | `smoke.mjs`, `scenario.mjs`, `inventory.mjs --compare` |
| UX: main action, forms, states, navigation | `ux.mjs` |
| Accessibility behaviour (keyboard, focus, ARIA, reflow) | `a11y.mjs` |
| Performance (LCP, CLS, blocking time, weight) | `perf.mjs` |
| Sizes, long text, right-to-left | `responsive.mjs` |
| Other browsers | `cross-browser.mjs` |
| Brand kept | `brand-guard.mjs` |
| Same site, same product | `consistency.mjs` |

For a combined, classified report with before / after: `node <skill-dir>/scripts/verify.mjs snapshot|check|report <page>` (`modes.md`).
