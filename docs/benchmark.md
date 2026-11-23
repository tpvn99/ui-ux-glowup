# Benchmark

Do the tools find real problems, or just produce a score? Ten prepared projects, each with known defects seeded into it and known regressions injected into it, answer that for what was seeded. The full method, the ten projects and how to run it are in [`benchmark/README.md`](../benchmark/README.md); the raw tables are in [`benchmark/RESULTS.md`](../benchmark/RESULTS.md).

## Result (1.15.2 plus the changes listed under "Unreleased" in VERSIONS.md, run on 2026-11-23, full checks, one machine: macOS arm64, Node 26)

| Indicator | Result |
|---|---|
| Projects | 10 (SaaS landing, shop, dashboard, WordPress-style site, React app, Vue app, institutional, editorial, responsive app, multi-journey app) |
| Defects seeded | 141; 133 attributable (3 did not apply to their page, 5 were ambiguous because the clean page already reports that rule) |
| **Found** | **133 of 133** (including `lang-wrong` on 3 projects and `rtl-not-mirrored` on 5) |
| **Regressions caught** | **25 of 25** (a link removed, a field no longer required, buttons that lost their handlers, a new script error, a heading removed) |
| Findings on the clean pages | 33 (2 errors, 31 warnings), all labelled by an AI agent (0 false positives among them). **0 reviewed by a human.** The new keyboard, interaction and UX-tag rules added no finding on these pages. |
| Run time | about 19 minutes (1111 s) for 10 projects (3 pages each) |
| Tokens | not measurable: the checks are scripts and call no model |

## How to read it, honestly

- **Exact only for what was seeded.** We broke the pages ourselves, picking defects from rules that exist. A perfect score here would not mean the tools find problems nobody thought of, and the next benchmark should include defects written by someone else.
- **The review is by an AI, not a human.** Each finding on a clean page was labelled *valid*, *by-design* or *false positive* by the agent that built the benchmark (`benchmark/labels.json`, with a reason for each). Quote the precision only after a human has re-read them. The 33 accurate findings are mostly true statements about the examples (Tailwind compiled in the browser from a CDN, placeholder `href="#"` links, mockup buttons with no behaviour, a single-page app that shows nothing without JavaScript); they are not defects of the benchmark.
- **The benchmark found gaps in the tools**, which is its first use. When three new defect families were added, the first run missed 3 of them: a heading hidden until an animation runs was ignored when the heading was short (the rule skipped any text under 20 characters), and one seeded defect had been made inapplicable by another. Both were fixed and the projects replayed (`benchmark/history.json` keeps the trend). Before the final numbers it also exposed, and the same release fixed: errors thrown by Chrome's own directory-listing page being blamed on the page under test; a visually hidden skip link counted as a small target and as a wrapping control; a word inside a button's label making a task board look like a SaaS site; "Book a free consultation" not recognised as a conversion action; white filter buttons counted as competing primary actions; an off-screen skip link reported as a dead control; an already-selected filter reported as a dead control; a visually hidden radio reported as a tiny target; and a requirement for "a primary action" on utility screens that do not need one. Each has a test.
- **Performance numbers are lab measurements** with no network throttling for these local files; a page with no network request transfers 0 KB. They compare before and after on one machine; they are not field data.
- **A first run was discarded** because the machine went to sleep during it, which cut the network and made every measurement meaningless. The published run keeps the machine awake and measures time with a monotonic clock.

## Keeping it honest

`node benchmark/run.mjs --check` compares a run with `benchmark/baseline.json`; `.github/workflows/benchmark.yml` runs it every week and on pull requests that touch the scripts or the examples. It fails when recall or regressions caught drop, or when a clean page gains an error or a false positive. See also [`ROADMAP.md`](../ROADMAP.md) for what the benchmark does not cover (real projects, real devices, screen readers, a second author for the defects).

## Pictures

[Before and after for each project](gallery.md), and [three case studies](case-studies.md).

**Two full runs on the same day, one machine.** The first (1213 s) reported 34 findings, the second (1111 s) 33: the extra one was `perf:fcp-slow` on the multi-journey app, a lab timing that depends on the CDN. Everything else (recall, regressions, the other 33 findings) was identical.
