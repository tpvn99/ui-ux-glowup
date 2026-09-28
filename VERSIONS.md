# UI/UX Glowup Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated |
|-------|---------|--------------|
| ui-ux-glowup | 1.0.0 | 2026-09-28 |

## Recent Changes

### 1.0.0 (2026-09-28)

- Initial release of the **`ui-ux-glowup`** skill (1.0.0).
- Workflow: audit (8 criteria / 40) → pick 2–3 reference sites and name what is borrowed → rebuild from tested examples → screenshot check at desktop and mobile → self-review → deliver with before/after score.
- `references/`: reference-site library by category (`sites.md`), patterns by section (`sections.md`), finishing details (`craft.md`), audit grid (`audit.md`), pre-delivery checklist (`checklist.md`).
- `assets/examples/`: 7 complete Tailwind v4 examples (Linear-style hero, Vercel-style bento, Stripe-style features, pricing + FAQ, dashboard, local business site, product page) + a typed React dashboard.
- `scripts/screenshot.mjs`: Playwright capture at 1440px and 390px with horizontal-overflow warning; also captures live reference sites.
- 6 evals in `evals/evals.json`.
