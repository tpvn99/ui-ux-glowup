# Mobile: Bugs, Taps & Swipes

Most visitors are on a phone. Each item below maps to an audit rule (in brackets) so you can find it, fix it, and re-check.

## Finding the bugs
1. `node scripts/audit.mjs <page>` — mobile rules run at 390px.
2. `node scripts/screenshot.mjs <page> shots/` — look at `-mobile.png` top to bottom.
3. On a real phone when possible (or DevTools device mode + touch simulation): tap every button, swipe every slider, open every menu, fill every form.

## Taps (clicks)
- **Size**: 44×44px comfortable, 24px absolute minimum [`tap-target-min`, `tap-target`]. Grow the hit area with padding, not the icon: `p-3` around a 20px icon.
- **Spacing**: ≥ 8px between small targets [`tap-crowded`]. Segmented controls are fine if each segment is ≥ 36px tall.
- **Thumb zone**: primary action reachable at the bottom on mobile (sticky bottom bar for calls/quotes/cart — slim, ≤ 72px).
- **Feedback**: `:active` state (scale .98 or darker bg), no 300ms delay (`touch-action: manipulation` on buttons), loading state on submit.
- **Hover-only content** is invisible on touch: wrap hover effects in `@media (hover: hover)`, never hide actions behind hover on mobile.
- **Inline links** in text: underline them and keep line-height ≥ 1.5 so they're tappable.

## Forms
- Inputs at **16px** or iOS zooms on focus [`input-zoom`].
- Right keyboard: `type="email|tel|number|url"`, `inputmode`, `autocomplete="name|email|tel|street-address"`.
- Labels above fields, errors under them, big submit button full-width on mobile.

## Swipes (carousels / sliders)
- Prefer **native CSS scroll-snap** — smooth, accessible, no JS [`carousel-snap`]:

```html
<div class="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none]" aria-label="Recent projects" tabindex="0">
  <article class="w-[82%] shrink-0 snap-start sm:w-[45%] lg:w-[30%]">…</article>
  …
</div>
```
- **Peek** the next slide (~15%) so people know it swipes [`carousel-affordance`].
- Arrows ≥ 40px with `aria-label="Previous slide"/"Next slide"` [`carousel-controls`, `carousel-small-controls`]; dots with `aria-current`.
- No autoplay (or pause on hover/focus + a pause button); respect `prefers-reduced-motion`.
- Library when you need loops/thumbnails: **Embla** (light, accessible) or Swiper — keep `touch-action: pan-y` so vertical scroll isn't blocked [`touch-blocked`].
- Don't put carousels inside horizontal-scrolling parents; don't hijack page scroll.

## Layout & overlays
- No horizontal overflow [`overflow`]; long words: `overflow-wrap: anywhere` on user content.
- Amounts and short labels on one line [`wrapped-number`, `wrapped-control`]: `whitespace-nowrap` + give the column room.
- Tables: keep the key column visible, stack secondary data under the title [`hidden-scroll-content`].
- Cookie banners / promo bars: slim, dismissible, never > 25% of the screen [`fixed-overlay`].
- Full-height sections: `min-h-[100svh]` (not `100vh`, which jumps with the address bar).
- Notch/home bar: `padding-bottom: env(safe-area-inset-bottom)` on bottom bars.
- Never block zoom: no `user-scalable=no` / `maximum-scale=1` [`zoom-blocked`].

## Menus
- Hamburger ≥ 44px, `aria-expanded`, closes on link click and Escape; menu links 44px tall.
- Keep the phone number / main CTA visible in the header on mobile for local businesses.
