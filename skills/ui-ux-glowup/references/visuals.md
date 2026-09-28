# Visuals, Charts & KPIs

What to use, when, and how to build it so it looks current — without falling into the AI-template look (`references/anti-ai.md`).

## 1. Illustration & UI styles

### Clean 3D illustrations
Soft relief, smooth textures, "cartoon-tech" style. Premium and futuristic — very common in tech and apps.
- **Use for**: SaaS/tech heroes, feature highlights, empty states, onboarding. Modernity 2–3.
- **Avoid for**: classic businesses (notary, clinic, industry), and as filler on every section.
- **Rules**: one consistent set (same lighting, angle, material, palette tinted with the brand); 1–3 per page; always meaningful (the object relates to the feature). No random floating blobs or abstract spheres.
- **Sources**: Spline (interactive, exportable), Blender; 3dicons.co (open, CC0), Iconscout / Freepik 3D (check license), Fluent Emoji 3D (MIT, playful). Export as **WebP/AVIF** (with alpha) or render in Spline with a static fallback.

### Bento grid
Information in boxes of different sizes (like a Japanese lunch box), each with its own visual and a **micro-animation** inside (a number ticking, a line drawing, a toggle switching, a cursor moving).
- One card is clearly dominant (2×2); others vary (2×1, 1×1). Never a uniform grid.
- Shared hairline borders (`gap-px` on a border-colored background) or even gaps with soft cards.
- Micro-animations: 150–600ms, triggered on view or hover, one per card max, disabled with `prefers-reduced-motion`.
- → `assets/examples/bento-vercel.html`, `assets/examples/kpi-cards.html`

### Flat Design 2.0 (semi-flat)
Flat minimalism + **subtle** gradients and very soft shadows for depth without weight.
- Gradients: **same hue**, 2 close tones (e.g. brand-500 → brand-600, or 8–15% lightness shift), or a faint radial glow behind a key visual. Not purple→blue→pink.
- Shadows: layered and soft, e.g. `0 1px 2px rgb(0 0 0/.05), 0 8px 24px -8px rgb(0 0 0/.12)`.
- Icons: duotone or two-tone using the brand color at 15–20% for the fill layer.

## 2. Data & statistics

### Interactive SVG charts
Smooth lines or bars that react on hover (value tooltip, highlight), adapt to phones (fewer ticks, full width, bigger touch areas).
- **React**: Recharts (`AreaChart`, `BarChart`, `PieChart innerRadius`), Chart.js (react-chartjs-2), Nivo, visx; animate with Framer Motion (`motion.path` `pathLength`).
- **No framework**: inline SVG like `kpi-cards.html` — `pathLength="1"` + `stroke-dashoffset` animation to draw lines, `transform: scaleY` to grow bars, CSS `:hover` for highlight.
- Rules: 1 accent color for the main series, neutrals for the rest; label the key point directly instead of a legend when possible; `role="img"` + `aria-label` stating the numbers (or a visually hidden table).

### Donut chart (instead of pie)
The empty center holds the key number or an icon. 3–5 segments max; group the rest in "Other". Legend with values next to it. Hover dims other segments. → `kpi-cards.html`

### Bento data cards (KPI + sparkline)
Instead of one big complex chart, several small cards: label, big value, delta chip, **sparkline** (no axes, 20–32px tall). Great on mobile (2 columns). → `kpi-cards.html`, `dashboard-dark.html`

### KPI card designs (pick per metric)
| Design | Best for |
|---|---|
| Hero KPI + area sparkline (same-hue gradient fill) | The one metric that matters most |
| Value + delta chip + "vs last period" | Every trend metric |
| Donut with center value | Share / split (channels, categories) |
| Goal ring / progress ring | Target completion (monthly goal, quota) |
| 7-day bars with highlighted best day | Short-term rhythm (orders, visits) |
| Compact tile + sparkline | Secondary metrics in a row/grid |
| Comparison bars (this vs last) | Two-period comparison |
| Status KPI (dot + label) | Health: synced, uptime, alerts |

Numbers: `tabular-nums`, `white-space: nowrap`, one decimal max, units and period always stated. Colors: green/red only for direction, never decoration.

## 3. Technical must-haves

### Dark mode
Every chart and illustration must work in both themes:
- Drive colors with CSS variables (`--c1`, `--grid`, `--ink`) redefined under `[data-theme=dark]` / `@media (prefers-color-scheme: dark)`; SVG uses `var(--…)` or `currentColor`.
- Follow the device by default, offer a toggle, remember the choice (`localStorage`), set it before paint to avoid a flash.
- In dark: lift surfaces one step above the background, lighten accents (500 → 400), keep text ≥ 4.5:1, soften shadows (use borders instead).
- → `kpi-cards.html` (auto + toggle), `dashboard-dark.html`

### WebP / AVIF and SVG
Pages should show content in under a second:
- Photos: **AVIF or WebP** with a JPG fallback via `<picture>`; `width`/`height` set; `loading="lazy"` below the fold; `srcset` for sizes.
- Icons, logos, charts, simple illustrations: **SVG** (inline or sprite).
- Convert: `npx sharp-cli -i photo.jpg -o photo.webp -q 78` or `cwebp -q 78 in.jpg -o out.webp`; `avifenc` for AVIF.

```html
<picture>
  <source srcset="/img/kitchen-800.avif 800w, /img/kitchen-1600.avif 1600w" type="image/avif">
  <source srcset="/img/kitchen-800.webp 800w, /img/kitchen-1600.webp 1600w" type="image/webp">
  <img src="/img/kitchen-1600.jpg" alt="Solid oak kitchen, Shelburne" width="1600" height="1200" loading="lazy" sizes="(min-width: 768px) 50vw, 100vw">
</picture>
```

The audit flags JPG/PNG photos, oversized images and missing lazy-loading (`image-format`, `image-oversized`, `image-lazy`).

## 4. Style by project type

1. **SaaS / tech startup** → clean 3D or product UI, bento grid, dark-friendly futuristic charts (glow-free, crisp lines), micro-animations.
2. **Portfolio / creative agency** → minimal, giant typography, fluid transitions (View Transitions API, scroll-driven animations used sparingly), work shown big.
3. **Classic business showcase** → clean, professional, trust and clarity: real photos, proof near CTAs, simple KPI figures (years, projects, rating), semi-flat icons, little motion.
