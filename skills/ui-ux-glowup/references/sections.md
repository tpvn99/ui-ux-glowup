# Patterns by Section

For each section: several proven patterns and the site that executes each best. Choose based on content, not habit. Working code for most of them is in `assets/examples/`.

## Navigation

- **Minimal floating** (Linear, Vercel): logo, 4–5 links, CTA on the right; sticky, translucent background + `backdrop-blur` + bottom border appearing on scroll.
- **Mega menu** (Stripe): when there are many products; panels with icon + title + short description.
- Mobile: full-screen drawer, large links, CTA at the bottom.

## Hero

- **Left-aligned editorial + product shot** (Linear, Attio): 2-line max heading, 1–2 line subheading, 2 CTAs, then a large bleeding product shot. → `hero-linear.html`
- **Split 55/45** (Mercury, local business sites): text on the left, real photo or visual on the right; proof (Google rating, logos) under the CTAs. → `local-business.html`
- **Centered hero product** (Apple): for a physical or single product; short heading, huge visual.
- **Interactive demo** (Cal.com, Clerk): the real, usable component inside the hero.

## Social proof

- **Logo strip** (Stripe, Vercel): monochrome, 5–8 logos, below the hero.
- **Key figures** (Stripe, Ramp): 3–4 large stats with short labels, separated by hairlines. → `features-stripe.html`
- **Featured testimonial** (Linear): large quote, photo, name, role, company.
- **Testimonial wall**: masonry grid of short cards.

## Features / services

- **Bento grid** (Vercel, Apple): cards of varied sizes sharing their borders, each with its own visual. → `bento-vercel.html`
- **Alternating text / visual** (Stripe, Notion): 3–4 zigzag blocks, a specific visual for each. → `features-stripe.html`
- **Tabs + visual** (Raycast, Linear): feature list on the left, visual changing on the right.
- **Numbered editorial list** (01, 02, 03…): ideal for service businesses. → `local-business.html`

Forbidden: three identical icon + title + text cards as the only features section.

## Process / how it works

- Numbered horizontal steps linked by a line (desktop) → vertical on mobile.
- Each step: number, short title, one sentence, optionally a mini-UI.

## Pricing

- 3 plans max, the recommended one slightly emphasized (accent border, badge), not enlarged. → `pricing.html`
- Monthly/annual toggle, detailed comparison table below (Linear, Vercel).
- Large price with `tabular-nums`, feature list with thin checkmarks.

## FAQ

- 2 columns: title + contact link on the left, accordions on the right (Stripe, Linear).
- Accessible `<details>`, hairline separators, `+` icon that rotates.

## Final CTA

- Sober full-width block: strong heading, one sentence, 1–2 buttons. Slightly different background or border, no loud gradient.

## Footer

- Dense multi-column (Stripe, Vercel): logo + tagline, 3–5 link columns, legal + social bottom row.
- Local business: contact details, hours, service area, map, legal links.

## Dashboard / app

- **Layout** (Linear, Vercel): 240px sidebar with workspace switcher on top, grouped navigation, user at the bottom; content with a page header (title + actions on the right). → `dashboard-shell.html`
- **KPIs**: 3–4 cards, large value, change with arrow + period, optional sparkline.
- **Tables** (Stripe Dashboard): pill filters, search, sortable columns, actions on hover, sober pagination.
- **Settings** (Vercel, GitHub): 2-column sections (title + description | fields), a "Save" button per section.
- **Empty states** (Linear): sober icon, title, one sentence, primary action.
- **Command palette** `⌘K` for rich apps.

## E-commerce

- **Product grid** (Allbirds, Aesop): 4:5 image, name, price, variant swatches; 2 columns mobile, 3–4 desktop.
- **Product page**: gallery on the left, sticky buy column on the right, details in accordions, reviews below. → `product-page.html`
- **Filters** (Airbnb): horizontal scrolling pills + full panel.
