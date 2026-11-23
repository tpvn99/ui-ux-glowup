# Review of the findings on the clean pages

34 findings were reported on pages where nothing was seeded. Each was labelled by an AI agent, which is not a review. **Your job: for each one, say whether you agree.**

- **I agree**: the label is right (the tool said something true, or something intended; or it was wrong and the label says so).
- **I disagree**: the label is wrong. A `valid` or `by-design` finding that you think is NOT a real issue becomes a `false-positive`; a `false-positive` that you think is real becomes `valid`.
- Tick one box. Leave both empty to skip. Add a comment if you like.
- **Severity** (optional, only for findings that are real): minor = cosmetic or rare · major = hurts some people or some journeys · critical = blocks a journey, excludes people, or breaks a feature. Tick at most one.
- **Recommendation** (optional): `relevant` if the advice the tool gives would actually help on this kind of page; `not relevant` if it is generic, wrong for this page, or would make it worse. Tick at most one.
- The human review is separate from the automatic run: only ticks made by a person set *reviewed by a human*.

When you are done: `node benchmark/review-sheet.mjs --apply` (it updates `labels.json` and the published results). Labels with a tick become *reviewed by a human*.

Label meaning: **valid**: a real problem or a true statement about the page · **by-design**: true, but intended in this example · **false-positive**: the tool was wrong.

### 1. saas-landing · `a11y:no-skip-link` (warning)

**The tool says:** There are several links before the main content and no skip link to jump past them.

**Label:** valid — the example has 6+ links before the content and no skip link

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 2. saas-landing · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 3. saas-landing · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 4. saas-landing · `responsive:text-too-small` (warning)

**The tool says:** Some text is under 12px at certain screen sizes.

**Label:** by-design — text under 12px exists in the decorative product mockup; exact, but not body text

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 5. saas-landing · `smoke:empty-link` (warning, ×9)

**The tool says:** A link points nowhere (href="#") when clicked.

**Label:** valid — placeholder links with href="#" in the example; they point nowhere

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 6. ecommerce · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 7. ecommerce · `perf:third-party-heavy` (warning)

**The tool says:** Many requests go to other hosts (placeholder photos and web fonts).

**Label:** by-design — placeholder photos from Unsplash and web fonts

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 8. ecommerce · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 9. ecommerce · `smoke:empty-link` (warning, ×2)

**The tool says:** A link points nowhere (href="#") when clicked.

**Label:** valid — placeholder links with href="#" in the example; they point nowhere

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 10. ecommerce · `smoke:dead-control` (warning)

**The tool says:** A button does nothing when clicked.

**Label:** by-design — static mockup: its buttons have no behaviour

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 11. dashboard · `a11y:no-skip-link` (warning)

**The tool says:** There are several links before the main content and no skip link to jump past them.

**Label:** valid — the example has 6+ links before the content and no skip link

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 12. dashboard · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 13. dashboard · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 14. dashboard · `responsive:text-too-small` (warning)

**The tool says:** Some text is under 12px at certain screen sizes.

**Label:** by-design — text under 12px exists in the decorative product mockup; exact, but not body text

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 15. dashboard · `smoke:dead-control` (warning, ×8)

**The tool says:** A button does nothing when clicked.

**Label:** by-design — static mockup: its buttons have no behaviour

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 16. dashboard · `smoke:empty-link` (warning, ×7)

**The tool says:** A link points nowhere (href="#") when clicked.

**Label:** valid — placeholder links with href="#" in the example; they point nowhere

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 17. react-app · `audit:no-js-content-missing` (error)

**The tool says:** Most of the page's text is absent when JavaScript is off.

**Label:** by-design — client-rendered app: the main text is absent without JavaScript, which is what the rule reports

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 18. vue-app · `audit:no-js-content-missing` (error)

**The tool says:** Most of the page's text is absent when JavaScript is off.

**Label:** by-design — client-rendered app: the main text is absent without JavaScript, which is what the rule reports

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 19. vue-app · `audit:tap-target` (warning)

**The tool says:** Touch targets are under 36px tall (the comfortable size is 44px).

**Label:** valid — 24px checkboxes: above the WCAG 2.5.8 minimum, below the 36–44px comfortable size

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 20. institutional · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 21. institutional · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 22. institutional · `smoke:empty-link` (warning, ×3)

**The tool says:** A link points nowhere (href="#") when clicked.

**Label:** valid — placeholder links with href="#" in the example; they point nowhere

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 23. editorial · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 24. editorial · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 25. editorial · `smoke:empty-link` (warning, ×9)

**The tool says:** A link points nowhere (href="#") when clicked.

**Label:** valid — placeholder links with href="#" in the example; they point nowhere

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 26. responsive-app · `a11y:no-skip-link` (warning)

**The tool says:** There are several links before the main content and no skip link to jump past them.

**Label:** valid — the example has 6+ links before the content and no skip link

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 27. responsive-app · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 28. responsive-app · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 29. responsive-app · `smoke:empty-link` (warning, ×2)

**The tool says:** A link points nowhere (href="#") when clicked.

**Label:** valid — placeholder links with href="#" in the example; they point nowhere

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 30. responsive-app · `smoke:dead-control` (warning, ×4)

**The tool says:** A button does nothing when clicked.

**Label:** by-design — static mockup: its buttons have no behaviour

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 31. multi-journey-app · `audit:tap-target` (warning)

**The tool says:** Touch targets are under 36px tall (the comfortable size is 44px).

**Label:** valid — 24px checkboxes: above the WCAG 2.5.8 minimum, below the 36–44px comfortable size

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 32. multi-journey-app · `perf:fcp-slow` (warning)

**The tool says:** perf:fcp-slow

**Label:** unreviewed

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 33. multi-journey-app · `perf:heavy-library` (warning)

**The tool says:** A heavy library is loaded (in the examples: Tailwind compiled in the browser from a CDN script).

**Label:** by-design — Tailwind compiled in the browser (CDN script), documented prototype setup

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 

### 34. multi-journey-app · `perf:render-blocking-script` (warning)

**The tool says:** A script in <head> blocks rendering (in the examples: the Tailwind browser script).

**Label:** by-design — the same Tailwind browser script, in the head

- [ ] I agree
- [ ] I disagree
- If the finding is real, how bad is it? (optional) [ ] minor  [ ] major  [ ] critical
- Is the tool's recommendation useful here? (optional) [ ] relevant  [ ] not relevant
- Comment: 
