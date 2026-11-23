# Known false positives and by-design findings

Every finding reported on a **clean** page of the benchmark was labelled (`benchmark/labels.json`). **The labels were assigned by an AI agent, not a person**: read them as the author's working notes until a human review is recorded in [`benchmark/REVIEW.md`](../benchmark/REVIEW.md).

## Findings that are true but may not apply to your page

| Rule | Why it fires | When to ignore it |
|---|---|---|
| `perf:heavy-library`, `perf:render-blocking-script` | The examples compile Tailwind in the browser from a CDN script (a prototype setup) | A prototype or a static mockup. In production, build the CSS. |
| `perf:third-party-heavy` | Placeholder photos and web fonts come from other hosts | The images are temporary. |
| `smoke:dead-control`, `smoke:empty-link` | A static mockup has buttons with no behaviour, or links with `href="#"` | You are auditing a design mockup, not a working page. In a real page the links and buttons are real findings. |
| `audit:no-js-content-missing` | The text is absent when JavaScript is off | A client-rendered app where that is the point. For a content site it is a real SEO and accessibility problem. |
| `responsive:text-too-small` | Text under 12px exists | It is in a decorative mockup, not body text. |
| `a11y:no-skip-link`, `audit:tap-target` | Missing skip link; checkboxes of 24px (above the WCAG 2.5.8 minimum of 24px, below the comfortable 44px) | These were labelled *valid*: real, but small. |
| `ux` findings tagged *judgement* | They depend on what the page is for (for instance "several primary actions") | Use `ux.mjs --ignore <rule>` when the page is a dashboard, a form or a tool. |

## Measurements that vary between runs

- **`perf:fcp-slow`** appeared on one benchmark page (multi-journey app) in the first full run of 2026-11-23 and in two single-project reruns, and did not appear in the second full run the same day. The pages load Tailwind and fonts from CDNs, so First Contentful Paint depends on the network. Treat a lone `fcp-slow` on a page that loads CDN assets as unverified.
- Lab performance numbers compare before and after on one machine; they are not field data.

## False positives found and fixed

False positives found by running the tools on real sites are listed with their fix in [`VERSIONS.md`](../VERSIONS.md) (1.14.1: six false positives from two live sites). The benchmark also exposed one: a visually hidden radio button was reported as a tiny touch target although its label is the real target; it was fixed with a test. The benchmark currently records 0 false positives among its labelled findings; that number is the author's own labelling, not an independent measure.

## If you find one

Open an issue with the page (or a minimal reproduction), the rule name and what is actually true on the page. A false positive that can be reproduced gets a fix and a test.
