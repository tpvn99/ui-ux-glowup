# Motion that explains

Animate to show **what changed or where to look**, never to decorate. Everything below is validated on a real landing page (reveal on scroll, counters, drawn chart, FAQ, theme switch): no layout shift, no console error, page complete without JS and under `prefers-reduced-motion`.

## Rules
- **One orchestrated moment beats scattered effects**: a single load sequence (hero) or one signature reveal. Fade-and-slide-up on every section and a hover transition on every card are the generic default and read as AI-made.
- **Motion that answers an action is always welcome**: opening, expanding, confirming, switching tabs or theme, a row added in a live demo. Motion that does not answer an action stays rare and purposeful.
- **Scroll reveals are optional and light**: group-level only (one grid, one block), once, 10–14px, 500–700ms, never on every section.
- **Safe by default**: hidden states only exist when `html.motion` is set by JS **and** `prefers-reduced-motion` is not `reduce`. Without JS or with reduced motion, everything is simply visible. Hero uses a CSS load animation; only below-the-fold blocks use an observer.
- Easing `cubic-bezier(.2,.8,.2,1)` (out), draws `cubic-bezier(.4,0,.2,1)`. Animate `opacity`, `transform`, `clip-path` only. No parallax on images, no typewriter, no infinite loops except a real live demo.
- Numbers: count up only real figures that matter, keep the final text in `aria-label`, use `tabular-nums`.

## Where motion earns its place
| Where | Motion |
|---|---|
| Hero (the one moment) | Lines rise in sequence (0 / 120 / 240 / 340 ms); the product shot settles into place; its chart draws with `clip-path` |
| Product tour / tabs | Panel cross-fades or slides on selection |
| Live demo | New row flashes (tint fading out), KPIs tween |
| FAQ, menus | `details::details-content` height transition with `interpolate-size: allow-keywords` (progressive) |
| Theme switch | `document.startViewTransition` cross-fade |
| Buttons | `:active { scale(.98) }` |
| Optional | Hero glow fading with scroll (`animation-timeline: scroll(root)` in `@supports`); one staggered reveal for a single grid |

## Snippets
```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } }
  .hero-in { animation: rise .8s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--d, 0) * 1ms); }
  html.motion [data-reveal] { opacity: 0; transform: translateY(12px); transition: opacity .6s cubic-bezier(.2,.8,.2,1) calc(var(--i, 0) * 70ms), transform .6s cubic-bezier(.2,.8,.2,1) calc(var(--i, 0) * 70ms); }
  html.motion [data-reveal].in { opacity: 1; transform: none; }
  html.motion .chart { clip-path: inset(0 100% 0 0); transition: clip-path 1.4s cubic-bezier(.4,0,.2,1) .4s; }
  html.motion .in .chart { clip-path: inset(0); }
  :root { interpolate-size: allow-keywords; }
  details::details-content { block-size: 0; overflow: clip; transition: block-size .3s ease, content-visibility .3s ease allow-discrete; }
  details[open]::details-content { block-size: auto; }
}
```
```html
<script>if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("motion")</script>
```
```js
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
els.forEach((el, i) => { el.dataset.reveal = ""; el.style.setProperty("--i", i); io.observe(el); });
```

## React / Framer Motion
Same rules: `whileInView` with `viewport={{ once: true, amount: 0.15 }}`, `useReducedMotion()` to drop transforms, `staggerChildren: 0.07`, one `variants` object per group.

## Verify
- `scripts/audit.mjs`: `reduced-motion` must not fire; scripts scroll the page first, so scroll reveals are triggered before measuring.
- Load the page with reduced motion emulated and with JS disabled: nothing may stay at `opacity: 0`.
- Check a frame ~150ms after load and one after scrolling: the hero must be mid-animation, then complete.
