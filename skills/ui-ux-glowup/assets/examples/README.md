# Reference Examples

Complete code, checked at desktop (1440px) and mobile (390px). Read the matching file **before** coding a section: reuse its structure, classes and finishing details, then adapt the content and the brand.

**Read only what you need**: every section is marked with an HTML comment. `grep -n "<!--" <file>` lists them with line numbers; read just that range instead of the whole file (examples are 8–23 KB each). These comments are for navigation only: don't copy them into your code.

| File | Pattern | Inspired by | Use for |
|---|---|---|---|
| `hero-linear.html` | Editorial hero + rebuilt product shot (dark) | Linear, Attio | SaaS, apps, tools |
| `bento-vercel.html` | Bento grid with shared borders, feature-specific visuals | Vercel, Apple | Features, services |
| `features-stripe.html` | Visible grid, text / mini-UI, stats row | Stripe | Product explanation, B2B |
| `pricing.html` | 3 plans + billing toggle + 2-column FAQ | Linear, Vercel | Pricing page |
| `dashboard-shell.html` | Sidebar, ⌘K top bar, KPIs, filtered table (light) | Linear, Stripe Dashboard | Back-office, CRM, app |
| `dashboard-dark.html` | Dark data-dense dashboard: header with one primary action, status strip, KPI grid, mobile-first table | Linear app, Stripe, Vercel | Dark apps, analytics, reseller/stock tools |
| `local-business.html` | Split photo hero, numbered services, steps, contact, mobile CTA bar | Aesop, Mercury, Stripe | Trades, local services, health |
| `product-page.html` | Gallery + sticky buy column, variants, accordions | Aesop, Allbirds | E-commerce |
| `kpi-cards.html` | KPI & chart kit: hero KPI + area sparkline, donut with center value, goal ring, 7-day bars, compact tiles; light/dark auto + toggle | Stripe, Linear, Vercel | Dashboards, stats sections, reports |
| `article.html` | Editorial article: serif body at 68ch, sticky contents, pull quote, data table, author, related reads, newsletter | Stripe Press, Linear Method | Blog, docs, case studies, news |
| `auth.html` | Sign-in screen: SSO + email, inline error, password reveal, quiet proof panel | Linear, Vercel, Clerk | Login, sign-up, onboarding step |
| `settings.html` | Settings: section nav (scrolling row on mobile), cards with their own save, switches, members list, isolated delete | Linear, Stripe, GitHub | Account, workspace, admin screens |
| `react/DashboardShell.tsx` | Same dashboard split into typed components | — | React projects |

## Audit status

Every example scores ≥ 43/45 and none of the AI-look tells (hero pill, status dot, side-bar border, icon tiles, gradient text, glow) (all 9 criteria, including SEO) with `scripts/audit.mjs` and has no wrapping numbers, no clipped content and no off-screen table columns on mobile. Two expected findings:
- `bento-vercel.html` and `features-stripe.html` are **sections** meant to sit below a page hero, so they start at `<h2>` and the audit reports a missing `<h1>`.
- Unsplash placeholders are reported as broken only when the network blocks them.

## Shared conventions

- Tailwind v4 via `@tailwindcss/browser`; tokens in `@theme`: `--color-accent` (the client's brand color) and `--color-line` (hairline borders).
- Replace `--color-accent` with the brand color; leave the neutrals alone unless there is a reason.
- Unsplash photos are placeholders: replace them with the client's real visuals.
- Decorative product mockups use `role="img"` + `aria-label` on the wrapper and `aria-hidden="true"` (plus `inert` if they contain controls) on the fake UI, so screen readers and the contrast audit skip them.
- In React: one component per block, data separated from rendering, variants via a mapping object, formatting via `Intl`.
