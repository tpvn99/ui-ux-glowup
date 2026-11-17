# Example report

This is a real run of `verify.mjs` on the demo page of the README: `tests/fixtures/before.html` (the "before") replaced by `tests/fixtures/after.html` (the "after").
It is a demonstration on a fixture, **not a real client project**; the command that produced it:

```bash
node skills/ui-ux-glowup/scripts/verify.mjs snapshot plumber.html --dir .glowup/before
# ...the page is redesigned...
node skills/ui-ux-glowup/scripts/verify.mjs check plumber.html --dir .glowup/before --out report.md
```

Note the verdict: the redesign rewrote the headings and renamed a link, so the report asks for a human decision (REVIEW) instead of claiming everything is fine.

---

# UI/UX report: plumber.html (tests/fixtures/before.html → after.html)

2026-11-17 · before / after · **Verdict: REVIEW**

No new error, but issues remain or changed: review them below.

## Summary by category

A status per category, not one blended score: a high number in one area never hides a problem in another.

| Category | Status | Errors | Warnings | New | Fixed |
|---|---|---|---|---|---|
| Functionality | ! warning | 0 | 6 | 5 | 0 |
| UX | ✓ ok | 0 | 0 | 0 | 4 |
| Accessibility | ✓ ok | 0 | 0 | 0 | 8 |
| Performance | ✓ ok | 0 | 0 | 0 | 0 |
| Visual quality | ✓ ok | 0 | 0 | 0 | 11 |
| Responsive | ✓ ok | 0 | 0 | 0 | 8 |
| SEO | ✓ ok | 0 | 0 | 1 | 4 |

## Fix first

1. **Functionality**: "click here" is now "Joe's Plumbing" (same link #) _(regression)_
2. **Functionality**: heading no longer on the page: Transform your plumbing experience _(regression)_
3. **Functionality**: heading no longer on the page: Fast _(regression)_
4. **Functionality**: heading no longer on the page: Cheap _(regression)_
5. **Functionality**: heading no longer on the page: Good _(regression)_

## Visual audit score

27 → **45 / 45**. Nine criteria scored 0–5 by `audit.mjs`; 9 of them partly rely on a human check. It measures what an automatic audit can see.

| Criterion | Before | After |
|---|---|---|
| Hierarchy | 4 | 5 |
| Typography | 3.5 | 5 |
| Spacing | 4 | 5 |
| Components | 4 | 5 |
| Visuals | 4 | 5 |
| Content | 3 | 5 |
| Responsive | 1 | 5 |
| Accessibility | 1 | 5 |
| SEO | 2.5 | 5 |

## Performance (fast profile, lab measurement)

| Metric | Before | After |
|---|---|---|
| LCP | 0.0 s | 0.0 s |
| CLS | 0 | 0 |
| Blocking time | 0 ms | 0 ms |
| Weight | 0 KB | 0 KB |
| Requests | 0 | 0 |

## Functionality

- ! `element-missing` _(regression)_: heading no longer on the page: Good
  - Fix: Put it back, or list its removal under Product decisions to confirm.
- ! `element-missing` _(regression)_: heading no longer on the page: Cheap
  - Fix: Put it back, or list its removal under Product decisions to confirm.
- ! `element-missing` _(regression)_: heading no longer on the page: Fast
  - Fix: Put it back, or list its removal under Product decisions to confirm.
- ! `element-missing` _(regression)_: heading no longer on the page: Transform your plumbing experience
  - Fix: Put it back, or list its removal under Product decisions to confirm.
- ! `control-renamed` _(regression)_: "click here" is now "Joe's Plumbing" (same link #)
  - Fix: Restore the behaviour, or confirm the change was intended.
- ! `empty-link` _(open)_: Link "Joe's Plumbing" points nowhere (#)

## SEO

- · `seo-thin` _(new)_: Only ~111 words of content; pages that should rank usually need more substance (not filler).

## Fixed since before

- ✓ Visual quality: `h1-missing`
- ✓ Visual quality: `font-families`
- ✓ Visual quality: `line-height`
- ✓ Visual quality: `measure`
- ✓ Visual quality: `spacing-grid`
- ✓ Visual quality: `clickable-div`
- ✓ Visual quality: `distorted-images`
- ✓ Visual quality: `lorem`
- ✓ Visual quality: `vague-cta`
- ✓ Responsive: `input-zoom`
- ✓ Responsive: `tap-crowded`
- ✓ SEO: `seo-title-length`
- ✓ SEO: `seo-description`
- ✓ SEO: `seo-open-graph`
- ✓ SEO: `seo-favicon`
- ✓ Visual quality: `ai-gradient`
- ✓ Visual quality: `ai-cliche`
- ✓ Responsive: `viewport-meta`
- ✓ Responsive: `overflow`
- ✓ Responsive: `tap-target-min`
- ✓ Responsive: `mobile-body-size`
- ✓ Accessibility: `contrast`
- ✓ Accessibility: `img-alt`
- ✓ Accessibility: `form-labels`
- ✓ Accessibility: `accessible-name`
- ✓ Accessibility: `lang`
- ✓ Accessibility: `heading-order`
- ✓ UX: `no-primary-action`
- ✓ UX: `placeholder-as-label`
- ✓ UX: `missing-autocomplete`
- ✓ UX: `wrong-input-type`
- ✓ Accessibility: `no-main-landmark`
- ✓ Accessibility: `reflow-320`
- ✓ Responsive: `overflow-x`
- ✓ Responsive: `line-too-long`

## What was not tested

- User journeys: no scenario file given (`--scenarios`), so only per-control smoke tests ran.
- Real devices and field data (the performance numbers are lab measurements on this machine).
- Screen reader behaviour, zoom to 200%, and anything that needs a human eye on the screenshots.
- Other browsers (run `cross-browser.mjs`) and other languages (`responsive.mjs --stress long`).

## Reading this report

A clean report means these automatic checks found nothing. It does not prove the interface is accessible, fast for everyone, or pleasant to use: those need real users and real devices.
