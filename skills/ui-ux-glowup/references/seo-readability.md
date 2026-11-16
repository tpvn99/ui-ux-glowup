# Spacing, Readability, SEO, GEO & Copy

The audit checks most of this automatically (rules in brackets). This file explains the fixes.

## 1. Space between blocks
People scan in chunks; cramped blocks read as one wall, uneven gaps read as broken.
- **Section rhythm**: pick 1–2 section spacings and stick to them — e.g. `py-24 md:py-32` (96/128px) for marketing sections, `py-16` (64px) on mobile; 24–32px between blocks in app/dashboard layouts [`section-gap-desktop`, `section-gap-mobile`, `section-rhythm`].
- Inside a section: title → text 12–16px, text → CTA 24–32px, header → grid 48–64px.
- Group related items tighter than unrelated ones (proximity), separate with space before lines.
- Color bands can separate sections, but the content inside still needs its padding.

## 2. Readability
- Body 16–18px, line-height 1.5–1.7, line length 60–75 characters [`measure`, `body-size`, `line-height`].
- Paragraphs: one idea, 2–4 sentences, < 90 words [`long-paragraphs`]; sentences ~15–20 words, max ~28 on average [`long-sentences`].
- Scannable: a heading every 200–300 words, lists for 3+ parallel items, bold only the key phrase (not whole sentences).
- Left-aligned text, never justified on screens [`justified-text`]; uppercase only for short labels [`uppercase-text`].
- Contrast AA everywhere, including grey secondary text [`contrast`].

## 3. On-page SEO
Checked by the audit's **SEO** criterion:
- **Title** 30–60 characters: main topic first, place/brand last — "Emergency plumber in Leeds, 24/7 — Hollis Plumbing" [`seo-title`, `seo-title-length`].
- **Meta description** 120–160 characters: what, where, why you, call to action [`seo-description`].
- **One h1** stating the page topic, then a logical h2/h3 outline [`h1-missing`, `h1-multiple`, `heading-order`].
- **Images**: descriptive `alt`, WebP/AVIF, correct size, lazy below the fold [`img-alt`, `image-format`, `image-oversized`, `image-lazy`].
- **Links and buttons**: an action verb + the result ("See our kitchen projects", "Voir les tarifs"), never "Learn more", "Discover", "En savoir plus", "Cliquez ici" [`vague-cta`]; internal links to key pages.
- **The H1 is real text**: words in separate `<span>`s still need spaces between them in the HTML, or crawlers read "DesagentsIA" [`h1-word-glue`].
- **Content in the HTML**: the H1, the main text and the FAQ must be there with JavaScript off [`no-js-content-missing`].
- **Open Graph** + **favicon** so shared links and tabs look right [`seo-open-graph`, `seo-favicon`] — `scripts/make-favicon.mjs`.
- **Canonical** and **structured data** (JSON-LD) [`seo-canonical`, `seo-structured-data`]:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"LocalBusiness","name":"…","telephone":"…",
 "address":{"@type":"PostalAddress","streetAddress":"…","addressLocality":"…","postalCode":"…","addressCountry":"FR"},
 "openingHours":"Mo-Fr 08:00-18:00"}
</script>
```
Other useful types: `Product` (+ `Offer`), `Organization`, `FAQPage`, `BreadcrumbList`, `Service`. Only mark up what is visible on the page. The audit validates it:
  - the JSON parses [`jsonld-invalid`] and the `@type` is a real schema.org type [`jsonld-unknown-type`];
  - every `FAQPage` question and answer is the same text as on the page [`faq-jsonld-mismatch`];
  - **never a rating or review count without real reviews**: `aggregateRating` only with the real figures and the reviews visible on the page [`rating-without-reviews`]. No real figures yet → leave it out.
- **Canonical = `og:url`** [`canonical-og-mismatch`]; on multilingual sites every page lists all its language versions, itself included, plus `x-default` [`hreflang`].
- **Whole site** (`scripts/audit-site.mjs`): `robots.txt` and `sitemap.xml` present and valid, `llms.txt` (optional, emerging convention), AI crawlers blocked in `robots.txt` (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) reported so the block is a decision and not an accident, hreflang links that point back.
- **Performance** (Core Web Vitals): light images, no layout shift (dimensions set), fonts with `display=swap`, no huge JS for static pages.
- Never `noindex` a page meant to rank [`seo-noindex`].

## 4. GEO: being read and quoted by AI assistants
Assistants quote pages they can read without running scripts and that answer plainly.
- **The answer first**: the first sentence under each H2 answers the heading's question on its own. Details come after.
- **FAQ in `<details>`** with the question in `<summary>` and the answer as text in the HTML — not loaded on click.
- **Comparisons in a real `<table>`** with `<th>` headers, not a grid of divs or an image.
- **No invented figure or review**: a number, a ranking or a rating that an assistant could repeat must be true and sourced [`unproven-claim`, `rating-without-reviews`].
- Everything above must hold with JavaScript off [`no-js-content-missing`, `hidden-until-animated`].

## 5. Copy: optimize for people, not keywords
Improving text is part of the redesign, but **meaning comes first**:
1. **Understand before editing**: read the whole page, identify what the business does, for whom, where, and what makes it different. If something is unclear, ask — don't invent.
2. **Keep the facts and the voice**: prices, numbers, promises, names, legal statements, tone (tu/vous, formal/casual) stay as they are unless the user asks.
3. **Clarity edits** you can make: shorter sentences, concrete benefits over slogans, one idea per paragraph, verbs on buttons ("Get a free quote"), remove filler and clichés [`ai-cliche`], fix typos and typography (French: non-breaking spaces before `: ; ! ?`, « » quotes).
4. **Keywords**: never rewrite a sentence just to insert a keyword, never repeat a phrase to raise density, never add hidden or filler text. Use the natural search phrase once where it belongs: title, h1 or first paragraph, one image alt — only if it reads naturally.
5. **Don't change the message** to chase a keyword. If the ranking goal and the text disagree, flag it to the user as a content decision.
6. **Show your edits**: list the texts you changed (before → after) in the recap so the user can approve them.
7. **Claims need proof** [`unproven-claim`]: "#1", "leader", "the best", "+500 clients", "98% satisfied" stay only with a source or a link next to them. You cannot know if they are true: list each one under "Product decisions to confirm" and never write one yourself.
8. **Small texts** (errors, confirmations, empty states, 404): `microcopy.md`.
