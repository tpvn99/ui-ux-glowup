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
