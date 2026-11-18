# Performance

A fast page is part of the design: people leave slow pages before seeing them.

```bash
node <skill-dir>/scripts/perf.mjs <page|url> [--profile phone|desktop|fast] [--json before-perf.json]
node <skill-dir>/scripts/perf.mjs <page|url> --baseline before-perf.json     # LCP, CLS, TBT, weight: before → after
```

Real Chromium. Default for a URL is **phone**: 390 px, CPU 4× slower, 1.6 Mbps and 150 ms latency. Local files use `fast` (no throttling). These are lab numbers from this machine: compare before and after, never quote them as field data. Exit 1 on errors only.

## Measured

| Metric | Good | Warning | Error |
|---|---|---|---|
| LCP (largest content visible) | ≤ 2.5 s | > 2.5 s | > 4 s |
| CLS (layout shift, measured across a scroll) | ≤ 0.1 | > 0.1 | > 0.25 |
| TBT (blocking time, stands in for INP) | ≤ 200 ms | > 200 ms | > 600 ms |
| FCP / server response | ≤ 1.8 s / ≤ 0.8 s | above | — |
| Page weight | ≤ 2 MB | > 2 MB | > 5 MB |

## Causes found

Network and device profiles: `--profile phone` (default for URLs), `desktop`, `fast` (no throttling), `slow` (400 kbps, 400 ms, CPU 6×), `flaky` (phone + 8% of requests lost, always the same ones, so a run can be repeated): `breaks-on-failed-requests` when the page then throws or shows almost nothing. During the measurement motion is NOT reduced, so running animations are the ones people see.

`animates-layout` (an animation changes width, height, top, left or margins on every frame), `many-animations` (more than 12 at once), `lcp-lazy` (error: the first-screen image is `loading="lazy"`), `lcp-no-priority`, `image-oversized` (more than 2.5× its display width), `image-heavy` (> 300 KB), `below-fold-not-lazy`, `render-blocking-script`, `font-display-missing`, `fonts-heavy`, `js-heavy` (> 300 KB), `heavy-library` (jQuery, Moment, full lodash, three.js, Chart.js, Bootstrap JS, Font Awesome, Tailwind compiled in the browser), `third-party-heavy`, `too-many-requests`, `costly-effects` (more than 6 blur / backdrop-filter surfaces). Each has a fix in the report. `audit.mjs` already covers `image-format`, `image-dimensions` and `scroll-cls`.

## Fix in this order

1. **The LCP element**: usually the hero image. Right size, WebP/AVIF, `fetchpriority="high"`, never lazy.
2. **Blocking resources**: `defer` scripts, `font-display: swap`, preconnect to font and image hosts.
3. **Weight**: images at display size × 2 with `srcset`, lazy below the fold, remove unused libraries and trackers.
4. **Layout stability**: `width`/`height` or `aspect-ratio` on images and embeds, reserved space for late content.
5. **Effects**: blur and glass on one surface at most; no animation of `width`, `height`, `top`, `left`.

The examples compile Tailwind in the browser for convenience: in a real project build the CSS, and the finding disappears.

## Not measured

Real devices and field data (CrUX, RUM), INP on real interactions, other networks, server-side rendering time. Say so in the report, and never present a lab score as a guarantee.
