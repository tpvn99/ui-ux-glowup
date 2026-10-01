# Finishing Details

What separates a "fine" interface from one that looks like it came from a large design team. Apply everything relevant.

## Typography

- Quality typefaces: Inter, Geist, Manrope, DM Sans, General Sans; editorial serifs: Fraunces, Instrument Serif, Newsreader. Keep the brand's fonts if they exist.
- Headings: `letter-spacing: -0.02em` to `-0.04em` depending on size, `line-height: 1.05–1.15`, weight 500–600 (often more elegant than 700–800).
- Fluid hero size: `clamp(2.5rem, 4vw + 1rem, 4.5rem)`.
- Body: 16–18px, `line-height: 1.6`, max width `65ch`.
- Secondary text: same family, muted color (≈ 60% perceived opacity), never too light for AA contrast.
- Micro-label above a heading only when it carries information (category, date, step number); 12–13px, tracking `+0.04em`, muted. Never above the hero H1, never on every section.
- `font-feature-settings: "ss01", "cv11"` (Inter) and `tabular-nums` for aligned numbers.
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
- Respect the locale's typography (e.g. French: non-breaking space before `: ; ! ?`, « » quotes).

## Space and grid

- Strict 4/8px scale. Sections: 96–160px vertical on desktop, 64–96 on mobile.
- Container 1120–1280px, 24–32px gutters.
- Much more space between groups than within them.
- Align everything to a 12-column grid; break it deliberately in 1–2 places to create rhythm.
- Vary layouts from section to section: never 3 consecutive sections with the same structure.

## Borders, surfaces, depth

- Hairline borders: 1px, color ≈ 8–12% of the text color's opacity. Dark mode: `rgba(255,255,255,.08)`.
- One way to delimit a card: border OR shadow OR background.
- Soft layered shadows instead of one heavy shadow:
  `0 1px 1px rgb(0 0 0/.04), 0 2px 4px rgb(0 0 0/.04), 0 8px 16px rgb(0 0 0/.04)`
- Inner highlight on raised elements: `inset 0 1px 0 rgb(255 255 255/.08)` (dark) — a "real material" feel.
- Consistent, nested radii: outer radius = inner radius + padding.
- Section backgrounds: very subtle grid/dots, or a faint neutral radial gradient behind the main visual. Never colored blobs.

## Product visuals and images

- Rebuild app screenshots in HTML/CSS: window chrome, sidebar, credible fake data (names, amounts, dates). This is what Linear, Stripe and Attio do.
- Mark decorative mockups as one image for assistive tech: `role="img"` + `aria-label` on the wrapper, `aria-hidden="true"` (and `inert` if it contains fake controls) on the fake UI inside.
- Let the shot bleed or crop (cut by the section edge, fading at the bottom) instead of floating it in the middle.
- Photos: same treatment everywhere (ratio, light, framing), `object-cover`, fixed ratios (`aspect-[4/3]`, `aspect-[16/10]`).
- Customer logos: monochrome, uniform height (20–28px), reduced opacity.
- Illustrations, 3D, charts and KPI cards: see `references/visuals.md`. 3D only as one consistent, meaningful set — never random floating shapes (`references/anti-ai.md`).
- Formats: photos in WebP/AVIF with `<picture>`, icons/logos/charts in SVG.

## Components

- Buttons: 36–44px tall, generous horizontal padding, consistent radius, weight 500. Primary filled, secondary hairline border, tertiary text + arrow `→`.
- "Learn more" links: arrow slides 2px on hover.
- Inputs: 40px tall, hairline border, focus = 2–3px accent ring at low opacity + accent border.
- Badges: small (12px, 2×8 padding), muted background, never loud; none above the hero H1 and no status dots as decoration.
- Icons: one family (Phosphor, Tabler, Solar, Lucide…), 16–20px, 1.5px stroke, optically aligned with text. Search beyond the defaults with `scripts/find-icons.mjs` (→ `references/icons.md`).
- Keyboard shortcuts shown as styled `kbd` where relevant (apps).

## Motion

- Hovers: 150ms, `ease-out`. Openings: 200–250ms.
- Scroll reveal: only on key blocks, 8–16px translate + fade, once.
- Nothing moves without a reason; respect `prefers-reduced-motion`.

## Content

- Headings = concrete benefit, not an empty slogan.
- Precise numbers, names and roles for testimonials, real dates.
- Careful microcopy: empty states, errors and confirmations written by a human.

## Color (usage only)

The brand palette is not changed. Only adjust:
- The brand accent reserved for primary actions and points of attention.
- Coherent neutrals: if missing, derive them by slightly tinting gray toward the brand color.
- Guaranteed AA contrast; if a brand color fails as text on white, use it as a button background or darken it for text.

## Modern touches (by modernity level)

Chosen during intake (`references/intake.md`). Add them on top of a solid base, never instead of it.

| Level | Add |
|---|---|
| **1 — Classic** | Tuned type (tracking, `text-wrap: balance`), hairline borders, layered shadows, tabular numbers, careful focus states. |
| **2 — Modern** (default) | + bento sections with one micro-animation per card, semi-flat surfaces (same-hue gradient on the hero or CTA), duotone icons, sparklines/donuts for figures, dark mode following the device, `100svh` heroes, scroll-snap carousels with peek. |
| **3 — Bold** | + oversized editorial type, one clean 3D set or interactive Spline hero (with static fallback), scroll-driven / View Transitions used on 1–2 moments, animated chart drawing, sticky storytelling section. |

Whatever the level: every touch must serve the content, run at 60fps, respect `prefers-reduced-motion`, and pass the anti-AI check (`references/anti-ai.md`).
