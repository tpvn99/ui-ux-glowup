# Reference Examples

Complete code, checked at desktop (1440px) and mobile (390px). Read the matching file **before** coding a section: reuse its structure, classes and finishing details, then adapt the content and the brand.

| File | Pattern | Inspired by | Use for |
|---|---|---|---|
| `hero-linear.html` | Editorial hero + rebuilt product shot (dark) | Linear, Attio | SaaS, apps, tools |
| `bento-vercel.html` | Bento grid with shared borders, feature-specific visuals | Vercel, Apple | Features, services |
| `features-stripe.html` | Visible grid, text / mini-UI, stats row | Stripe | Product explanation, B2B |
| `pricing.html` | 3 plans + billing toggle + 2-column FAQ | Linear, Vercel | Pricing page |
| `dashboard-shell.html` | Sidebar, ⌘K top bar, KPIs, filtered table | Linear, Stripe Dashboard | Back-office, CRM, app |
| `local-business.html` | Split photo hero, numbered services, steps, contact, mobile CTA bar | Aesop, Mercury, Stripe | Trades, local services, health |
| `product-page.html` | Gallery + sticky buy column, variants, accordions | Aesop, Allbirds | E-commerce |
| `react/DashboardShell.tsx` | Same dashboard split into typed components | — | React projects |

## Shared conventions

- Tailwind v4 via `@tailwindcss/browser`; tokens in `@theme`: `--color-accent` (the client's brand color) and `--color-line` (hairline borders).
- Replace `--color-accent` with the brand color; leave the neutrals alone unless there is a reason.
- Unsplash photos are placeholders: replace them with the client's real visuals.
- In React: one component per block, data separated from rendering, variants via a mapping object, formatting via `Intl`.
