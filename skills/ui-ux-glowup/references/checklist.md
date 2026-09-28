# Pre-Delivery Checklist

## Brief & scope
- [ ] Intake answered (or defaults stated): project type, style family, modernity level, goal, must-keep elements
- [ ] Redesign: `scripts/inventory.mjs --compare` shows no lost element (links, forms, images, texts, legal) — or each removal is listed and confirmed
- [ ] Product decisions (grouping/hiding data, removing features, renaming) listed separately and confirmed

## References
- [ ] 2–3 references chosen, specific borrowings named for each
- [ ] Nothing copied verbatim (copy, logos, illustrations)
- [ ] User's brand colors preserved

## Craft (craft.md)
- [ ] Tight headings (negative tracking), `text-wrap: balance`, body ≤ 65ch
- [ ] Hairline borders, a single delimiting method per card
- [ ] Soft layered shadows, consistent and nested radii
- [ ] Layouts vary from one section to the next
- [ ] Specific visuals (rebuilt product UI, real photos, one consistent 3D set if any), no blobs
- [ ] No AI-template tells (`references/anti-ai.md`): no purple gradients, glass everywhere, 3 identical cards, emoji headings, cliché copy
- [ ] One icon family, found with `scripts/find-icons.mjs` if needed (Flaticon attribution added when used)
- [ ] Charts and KPI cards: design chosen per metric, readable in light and dark

## Content
- [ ] No lorem ipsum, industry-specific copy, precise numbers
- [ ] Button labels = verb + object
- [ ] Locale typography respected (e.g. French: non-breaking space before `: ; ! ?`, « » quotes)
- [ ] Text edits keep meaning, facts and voice; no keyword stuffing; every change listed before → after
- [ ] Short paragraphs (< 90 words), a heading every 200–300 words, no justified text

## Interaction
- [ ] hover, focus-visible, active, disabled, loading on every interactive element
- [ ] Empty, loading and error states for data
- [ ] Restrained motion, `prefers-reduced-motion` respected

## Responsive
- [ ] Works at 375, 768, 1280, 1536px, no horizontal scroll
- [ ] No amount or button label wraps; no key column hidden off-screen on mobile
- [ ] Touch targets ≥ 44px and ≥ 8px apart, CTA reachable on mobile, no hover-only actions
- [ ] Inputs 16px, zoom not blocked, overlays < 25% of the screen
- [ ] Carousels: scroll-snap, next slide peeks, labeled arrows ≥ 40px, no autoplay
- [ ] Section spacing consistent (desktop and mobile)

## Accessibility
- [ ] AA contrast (secondary text included)
- [ ] Semantic HTML, a single `h1`, labels, `alt`, `aria-label` on icon buttons
- [ ] Full keyboard navigation

## Visual check
- [ ] Desktop + mobile screenshots taken with `scripts/screenshot.mjs` and reviewed
- [ ] No horizontal overflow reported
- [ ] At least on par with the matching example in `assets/examples/`

## SEO
- [ ] Title 30–60 chars, meta description 120–160, one h1, logical headings
- [ ] Open Graph, favicon (`scripts/make-favicon.mjs`), canonical, JSON-LD for what's visible
- [ ] Photos WebP/AVIF, sized, lazy below the fold; icons and charts in SVG

## Technical
- [ ] Complete code that runs as-is, no unnecessary dependencies
- [ ] Images sized, `loading="lazy"` below the fold
- [ ] Audit re-run: every criterion ≥ 4/5, `scripts/audit.mjs` reports no errors

## Delivery
- [ ] "Directions taken" recap included (SKILL.md → Deliver), even for audit-only work
