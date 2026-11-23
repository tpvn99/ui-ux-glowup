# Benchmark results

Run on 2026-11-23 · skill 1.15.2 · Node v26.7.0 · darwin arm64 · full checks

**How to read this.** Each project is one clean page. A copy gets 12 seeded defects (the *before*), another copy gets injected regressions. Because we broke the pages ourselves, recall is exact **for what was seeded** and says nothing about defects nobody thought to seed. False positives are findings reported on the clean page; each one was reviewed and labelled by the author of this benchmark (an AI agent, not a human): the labels are in `labels.json` and need a human second opinion. Scores are not proof of quality.

## Summary

| Indicator | Result |
|---|---|
| Projects | 10 (0 failed to run) |
| Seeded defects | 141 (3 did not apply, 0 not measured in fast mode, 5 ambiguous: the clean page already reports that rule) |
| Seeded defects missed | 0 of 133 |
| False negatives outside the seeded defects | unknown: not measurable by construction (nobody seeded them) |
| **Recall** on attributable defects | **100%** (133 of 133) |
| **Regressions caught** | **100%** (25 of 25) |
| Findings on the clean pages | 33 (2 errors, 31 warnings) |
| Unverified anomalies on the clean pages | 33 (33 labelled by an AI agent only, 0 without any label) |
| Reviewed as false positive | 0 of 33 reviewed (0 unreviewed) |
| Human-rated severity (of the reviewed real findings) | 0 minor, 0 major, 0 critical |
| Recommendations judged not relevant by a human | 0 |
| **Reviewed by a human** | 0 of 33 (the others were labelled by an AI agent) |
| Precision on reviewed findings | 100% |
| Total run time | 1111 s for 10 projects (3 pages each) |
| Tokens | not measurable here: the checks are scripts and do not call a model |

## By project

| Project | Detected | Missed | Regressions caught | Audit /45 | Errors | Accessibility errors | Time |
|---|---|---|---|---|---|---|---|
| saas-landing | 13/13 | none | 2/2 | 34 → 45 | 12 → 0 | 6 → 0 | 105 s |
| ecommerce | 13/13 | none | 2/2 | 36.5 → 45 | 7 → 0 | 3 → 0 | 104 s |
| dashboard | 13/13 | none | 2/2 | 35 → 45 | 11 → 0 | 7 → 0 | 141 s |
| wordpress | 14/14 | none | 3/3 | 35 → 45 | 15 → 0 | 8 → 0 | 76 s |
| react-app | 13/13 | none | 2/2 | 36 → 44 | 10 → 1 | 5 → 0 | 93 s |
| vue-app | 14/14 | none | 3/3 | 33 → 43.5 | 13 → 1 | 7 → 0 | 78 s |
| institutional | 14/14 | none | 3/3 | 30.5 → 45 | 15 → 0 | 6 → 0 | 126 s |
| editorial | 13/13 | none | 3/3 | 32 → 45 | 7 → 0 | 3 → 0 | 140 s |
| responsive-app | 12/12 | none | 2/2 | 34.5 → 45 | 12 → 0 | 9 → 0 | 114 s |
| multi-journey-app | 14/14 | none | 3/3 | 34 → 44.5 | 15 → 0 | 9 → 0 | 134 s |

## Performance, before → after (lab measurement, fast profile)

| Project | LCP | CLS | Blocking time | Weight |
|---|---|---|---|---|
| saas-landing | 0.2 s → 0.3 s | 0 → 0 | 0 → 0 ms | 120 KB → 107 KB |
| ecommerce | 0.4 s → 0.2 s | 0 → 0 | 0 → 0 ms | 530 KB → 531 KB |
| dashboard | 0.2 s → 0.1 s | 0 → 0 | 0 → 0 ms | 107 KB → 107 KB |
| wordpress | 0.1 s → 0.0 s | 0 → 0 | 0 → 0 ms | 23 KB → 0 KB |
| react-app | 0.1 s → 0.0 s | 0.154 → 0.065 | 0 → 0 ms | 64 KB → 41 KB |
| vue-app | 0.1 s → 0.0 s | 0.126 → 0.056 | 0 → 0 ms | 71 KB → 48 KB |
| institutional | 0.4 s → 0.2 s | 0.009 → 0 | 0 → 0 ms | 82 KB → 82 KB |
| editorial | 0.2 s → 0.3 s | 0.01 → 0.001 | 0 → 0 ms | 407 KB → 384 KB |
| responsive-app | 0.2 s → 0.1 s | 0.007 → 0 | 0 → 0 ms | 107 KB → 107 KB |
| multi-journey-app | 0.2 s → 0.2 s | 0.008 → 0 | 0 → 0 ms | 107 KB → 97 KB |

## What was not detected

Nothing seeded was missed in this run.

## Findings on the clean pages

Each is something the tool reported although no defect was seeded.

| Project | Finding | Severity | Review |
|---|---|---|---|
| saas-landing | `a11y:no-skip-link` | warning | valid: the example has 6+ links before the content and no skip link |
| saas-landing | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| saas-landing | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |
| saas-landing | `responsive:text-too-small` | warning | by-design: text under 12px exists in the decorative product mockup; exact, but not body text |
| saas-landing | `smoke:empty-link` ×9 | warning | valid: placeholder links with href="#" in the example; they point nowhere |
| ecommerce | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| ecommerce | `perf:third-party-heavy` | warning | by-design: placeholder photos from Unsplash and web fonts |
| ecommerce | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |
| ecommerce | `smoke:empty-link` ×2 | warning | valid: placeholder links with href="#" in the example; they point nowhere |
| ecommerce | `smoke:dead-control` | warning | by-design: static mockup: its buttons have no behaviour |
| dashboard | `a11y:no-skip-link` | warning | valid: the example has 6+ links before the content and no skip link |
| dashboard | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| dashboard | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |
| dashboard | `responsive:text-too-small` | warning | by-design: text under 12px exists in the decorative product mockup; exact, but not body text |
| dashboard | `smoke:dead-control` ×8 | warning | by-design: static mockup: its buttons have no behaviour |
| dashboard | `smoke:empty-link` ×7 | warning | valid: placeholder links with href="#" in the example; they point nowhere |
| react-app | `audit:no-js-content-missing` | error | by-design: client-rendered app: the main text is absent without JavaScript, which is what the rule reports |
| vue-app | `audit:no-js-content-missing` | error | by-design: client-rendered app: the main text is absent without JavaScript, which is what the rule reports |
| vue-app | `audit:tap-target` | warning | valid: 24px checkboxes: above the WCAG 2.5.8 minimum, below the 36–44px comfortable size |
| institutional | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| institutional | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |
| institutional | `smoke:empty-link` ×3 | warning | valid: placeholder links with href="#" in the example; they point nowhere |
| editorial | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| editorial | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |
| editorial | `smoke:empty-link` ×9 | warning | valid: placeholder links with href="#" in the example; they point nowhere |
| responsive-app | `a11y:no-skip-link` | warning | valid: the example has 6+ links before the content and no skip link |
| responsive-app | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| responsive-app | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |
| responsive-app | `smoke:empty-link` ×2 | warning | valid: placeholder links with href="#" in the example; they point nowhere |
| responsive-app | `smoke:dead-control` ×4 | warning | by-design: static mockup: its buttons have no behaviour |
| multi-journey-app | `audit:tap-target` | warning | valid: 24px checkboxes: above the WCAG 2.5.8 minimum, below the 36–44px comfortable size |
| multi-journey-app | `perf:heavy-library` | warning | by-design: Tailwind compiled in the browser (CDN script), documented prototype setup |
| multi-journey-app | `perf:render-blocking-script` | warning | by-design: the same Tailwind browser script, in the head |

0 false positive(s), 0 unreviewed.

## Limits

- The defects are ones we thought to seed, picked from the rules that exist: this measures reliability on known problems, not discovery of unknown ones.
- Pages are the repository's examples plus three written for this benchmark; the WordPress project is a static export of a theme's markup, not a running WordPress; the React and Vue apps use CDN builds with no bundler.
- Performance numbers are lab measurements on one machine with network access, not field data.
- Screen readers, real devices and real users are not part of it.
- Labels were assigned by an AI agent: a human review is still outstanding.
