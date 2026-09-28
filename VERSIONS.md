# UI/UX Glowup Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated |
|-------|---------|--------------|
| ui-ux-glowup | 1.1.0 | 2026-09-28 |

## Recent Changes

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
