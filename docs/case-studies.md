# Case studies

Three of the ten benchmark projects, told with the numbers of the benchmark run of 2026-11-23 (version 1.15.2, one machine; see [benchmark.md](benchmark.md)). They are **prepared pages with seeded defects**, not client projects: they show how the tools behave, and what they miss or can't say. Before = the page with its defects, after = the clean page. Lab measurements, one machine. See [benchmark.md](benchmark.md) for method and limits.

## 1. WordPress-style site: fourteen defects, all found

A services site written as a theme's markup (a static export, **not** a running WordPress).

- **Detected 14 of 14.** Visual audit 35 → 45 /45; accessibility errors 0 after (8 before). Besides the twelve basics, a stretched image (`distorted-images`) and a heading hidden until an animation runs (`hidden-until-animated`) were found.
- **What found what.** `audit`: the unlabelled contact field, the image without alt, the missing `lang`, `<title>` and description, blocked pinch zoom, grey text, the 760px overflow, the `div` used as a button. `a11y`: no `<main>`. `perf`: the synchronous script in the head (23.9 KB for one request that the clean page does not make). `smoke`: the link that points nowhere.
- **Regressions caught, 3 of 3.** A navigation link removed (reported twice: control missing and element missing), the contact field no longer required (`validation-lost`), and a new script error.
- **What it cannot say.** Whether the copy is good, whether the real WordPress theme, its plugins and the database behave the same, or whether the form actually delivers mail.

## 2. Shop product page: thirteen found, one set aside as ambiguous, one trap that did not apply

- **Detected 13 of 13 attributable defects**, visual audit 36.5 → 45 /45, accessibility errors 3 → 0. The lazy-loaded first image was reported by `perf` as `lcp-lazy`.
- **One defect was ambiguous**: the clean page already has buttons with no behaviour (it is a static mockup), so a seeded dead button could not be attributed and is excluded from the score instead of being counted as found.
- **One regression trap did not apply**: "buttons lose their handlers" cannot break buttons that never had any. The benchmark records it as not applicable rather than as a miss.
- **A tool bug it exposed**: the clean page's hidden size radio was first reported as a tiny target; the real target is its label. Fixed with a test, and the project was replayed.
- **What it cannot say.** Whether the checkout works, whether prices are right, or how the page feels on a real phone.

## 3. Application with several journeys: the journeys catch what the counts do not

A searchable, sortable, selectable list, with five scripted user journeys (search, empty state, filter, sort, bulk selection).

- **Detected 14 of 14.** Visual audit 34 → 44.5 /45; errors 15 → 0; accessibility errors 9 → 0, including a **keyboard trap** and a button inside `aria-hidden`.
- **Journeys:** 5 of 5 pass on the clean page. After the regression that strips the buttons' handlers, **only 3 of 5 pass**, and the report names the two that stopped working (`scenario-regressed`) as well as the controls that stopped responding (`control-broken`). A visual score would have said nothing.
- **What it cannot say.** Whether people understand the screen, or whether the server enforces the same rules: a journey proves a goal can be reached, at what effort, not that the interface is understood.

## What these studies do not show

No real project, no real device, no screen reader, no human review of the findings (the labels are the benchmark author's), and no measurement of an agent's own cost. Those are listed in [`ROADMAP.md`](../ROADMAP.md).
