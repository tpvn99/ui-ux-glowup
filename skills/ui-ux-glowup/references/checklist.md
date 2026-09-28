# Pre-Delivery Checklist

## References
- [ ] 2–3 references chosen, specific borrowings named for each
- [ ] Nothing copied verbatim (copy, logos, illustrations)
- [ ] User's brand colors preserved

## Craft (craft.md)
- [ ] Tight headings (negative tracking), `text-wrap: balance`, body ≤ 65ch
- [ ] Hairline borders, a single delimiting method per card
- [ ] Soft layered shadows, consistent and nested radii
- [ ] Layouts vary from one section to the next
- [ ] Specific visuals (rebuilt product UI, real photos), no blobs / generic 3D

## Content
- [ ] No lorem ipsum, industry-specific copy, precise numbers
- [ ] Button labels = verb + object
- [ ] Locale typography respected (e.g. French: non-breaking space before `: ; ! ?`, « » quotes)

## Interaction
- [ ] hover, focus-visible, active, disabled, loading on every interactive element
- [ ] Empty, loading and error states for data
- [ ] Restrained motion, `prefers-reduced-motion` respected

## Responsive
- [ ] Works at 375, 768, 1280, 1536px, no horizontal scroll
- [ ] Touch targets ≥ 44px, CTA reachable on mobile

## Accessibility
- [ ] AA contrast (secondary text included)
- [ ] Semantic HTML, a single `h1`, labels, `alt`, `aria-label` on icon buttons
- [ ] Full keyboard navigation

## Visual check
- [ ] Desktop + mobile screenshots taken with `scripts/screenshot.mjs` and reviewed
- [ ] No horizontal overflow reported
- [ ] At least on par with the matching example in `assets/examples/`

## Technical
- [ ] Complete code that runs as-is, no unnecessary dependencies
- [ ] Images sized, `loading="lazy"` below the fold
- [ ] Audit re-run: every criterion ≥ 4/5, `scripts/audit.mjs` reports no errors
