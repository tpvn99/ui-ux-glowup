# Spacing, Readability, SEO & Copy

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
- **Links**: descriptive text ("See our kitchen projects", not "click here") [`vague-links`]; internal links to key pages.
- **Open Graph** + **favicon** so shared links and tabs look right [`seo-open-graph`, `seo-favicon`] — `scripts/make-favicon.mjs`.
- **Canonical** and **structured data** (JSON-LD) [`seo-canonical`, `seo-structured-data`]:

```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"LocalBusiness","name":"…","telephone":"…",
 "address":{"@type":"PostalAddress","streetAddress":"…","addressLocality":"…","postalCode":"…","addressCountry":"FR"},
 "openingHours":"Mo-Fr 08:00-18:00","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"127"}}
</script>
```
Other useful types: `Product` (+ `Offer`), `Organization`, `FAQPage`, `BreadcrumbList`, `Service`. Only mark up what is visible on the page.
- **Performance** (Core Web Vitals): light images, no layout shift (dimensions set), fonts with `display=swap`, no huge JS for static pages.
- Never `noindex` a page meant to rank [`seo-noindex`].

## 4. Copy: optimize for people, not keywords
Improving text is part of the redesign, but **meaning comes first**:
1. **Understand before editing**: read the whole page, identify what the business does, for whom, where, and what makes it different. If something is unclear, ask — don't invent.
2. **Keep the facts and the voice**: prices, numbers, promises, names, legal statements, tone (tu/vous, formal/casual) stay as they are unless the user asks.
3. **Clarity edits** you can make: shorter sentences, concrete benefits over slogans, one idea per paragraph, verbs on buttons ("Get a free quote"), remove filler and clichés [`ai-cliche`], fix typos and typography (French: non-breaking spaces before `: ; ! ?`, « » quotes).
4. **Keywords**: never rewrite a sentence just to insert a keyword, never repeat a phrase to raise density, never add hidden or filler text. Use the natural search phrase once where it belongs: title, h1 or first paragraph, one image alt — only if it reads naturally.
5. **Don't change the message** to chase a keyword. If the ranking goal and the text disagree, flag it to the user as a content decision.
6. **Show your edits**: list the texts you changed (before → after) in the recap so the user can approve them.
