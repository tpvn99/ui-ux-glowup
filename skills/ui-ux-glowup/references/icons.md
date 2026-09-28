# Icons & Favicons

## Finding icons (diversify, don't default)
Every AI-built site uses the same 20 Lucide icons. Search wider:

```bash
node <skill-dir>/scripts/find-icons.mjs "delivery truck"                  # all open sets, with licenses
node <skill-dir>/scripts/find-icons.mjs "leaf" --sets ph,solar,tabler --download icons/
```

It searches 200,000+ icons through Iconify (online) or any `@iconify-json/*` set installed in the project (offline), prints each set's license and the import line for React libraries, and links the same search on Flaticon.

| Style wanted | Sets to try | Notes |
|---|---|---|
| Clean product UI (outline) | `lucide`, `tabler`, `iconoir` | 1.5–2px strokes, neutral |
| Variety / personality | `ph` (Phosphor: thin, light, regular, bold, fill, duotone), `solar` (linear, bold, duotone) | Duotone = semi-flat look |
| Friendly / rounded | `hugeicons`, `material-symbols` (rounded) | Good for apps, kids, health |
| Illustrated / multicolor | Flaticon, `fluent-emoji-flat`, `streamline` | Use as accents, not in UI controls |

Rules:
- **One family per interface**, one stroke weight, one size scale (16/20/24). Mixing sets looks cheap.
- Duotone: second tone = brand color at 15–20% opacity.
- Icons support text; they don't replace labels on important actions (icon-only buttons need `aria-label`).
- Self-host the SVGs (inline or sprite); no icon fonts; no hotlinking.

## Flaticon
Great for illustrated, multicolor or niche icons (trades, food, sports).
- **Free license requires attribution**: "Icons by Flaticon" (or the author) with a link, e.g. in the footer or credits page. **Premium** removes attribution.
- Download SVG from the site (the API needs a paid key), keep the author/license in a comment or credits file, don't redistribute packs.
- Pick icons from **one author/style pack** for consistency.

## Favicons
Every site needs one — the audit flags it [`seo-favicon`].

```bash
node <skill-dir>/scripts/make-favicon.mjs logo.svg public/ --bg "#1f4d3a" --padding 14
node <skill-dir>/scripts/make-favicon.mjs --letter A public/ --bg "#1f4d3a"          # monogram, no logo yet
node <skill-dir>/scripts/make-favicon.mjs icons/ph-leaf-bold.svg public/ --bg "#1f4d3a" --radius 50
```

Generates `favicon.ico` (16/32/48), `favicon.svg`, `apple-touch-icon.png` (180), `icon-192/512.png`, `site.webmanifest`, and the `<head>` snippet. Favicons must read at 16px: a bold symbol or 1–2 letters, strong contrast, no thin lines or text.
