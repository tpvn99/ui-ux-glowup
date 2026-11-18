# Benchmark

Does the toolchain find what is wrong, stay quiet when nothing is, and catch regressions? This folder measures it, and the numbers are published in [RESULTS.md](RESULTS.md).

## Method

Ten projects, each from one **clean** page:

| Page | Built from | Used for |
|---|---|---|
| **before** | the clean page + 12 seeded defects | *Recall*: how many seeded defects are reported |
| **after** | the clean page | *False positives*: what is reported although nothing was seeded |
| **after-broken** | the clean page + injected regressions | *Regressions caught*: does `verify` report what stopped working |

Defects and regressions live in `defects.mjs` (each names the rules that should report it, any one is enough); projects in `projects.mjs`. Because we broke the pages ourselves, the ground truth is exact **for what was seeded**: it says nothing about defects nobody thought to seed, and a perfect recall would not prove the tools find unknown problems.

A defect is *attributable* when the rule fires on **before** and not on **after**. If the clean page already reports that rule it is *ambiguous* and excluded. In fast mode (`--fast`) defects that only performance checks can report are *not measured*.

Findings on the clean pages are reviewed one by one and labelled in `labels.json` (`valid`, `by-design`, `false-positive`; key `project:source:rule`). **The labels were assigned by an AI agent, not by a human**: they need a second opinion before they are quoted as precision.

## The ten projects

SaaS landing page, e-commerce product page, professional dashboard, WordPress-style site (a static export of a theme's markup, *not* a running WordPress), React app (React 18 from a CDN, no bundler), Vue app (Vue 3 from a CDN), institutional site, editorial article, responsive application screen, and an application with several user journeys (its five scenarios are part of the check). Seven use the repository's examples; three were written for this benchmark in `bases/`.

## Run it

```bash
npm install && npx playwright install chromium     # Node 20+; needs network (examples load Tailwind and fonts from CDNs)
node benchmark/run.mjs                              # all ten, about 15–25 minutes; writes RESULTS.md and results.json
node benchmark/run.mjs --only ecommerce --fast      # one project, no performance or size sweep
node benchmark/run.mjs --check                      # compare with baseline.json: exit 1 on a regression
node benchmark/run.mjs --write-baseline             # after a deliberate improvement, accept the new numbers
```

`--check` fails when recall drops by more than 3 points, when fewer regressions are caught, when a clean page gains an error or a false positive, or when fewer than ten projects ran. `.github/workflows/benchmark.yml` runs it every week and on pull requests that touch the scripts.

## Add a project

1. Put a clean page in `bases/` (or point to an example): valid head, one `<h1>`, `<main>`, labelled fields, no known problem.
2. Add it to `projects.mjs` with the defects (from `defects.mjs`) and traps that apply; add a new defect to `defects.mjs` with the rules that should report it.
3. Run it, label what it reports on the clean page in `labels.json`, and regenerate the baseline.

## What it does not measure

Tokens (the checks are scripts and call no model), real devices, screen readers, real users, field performance, or the quality of an agent's redesign. Time is wall-clock on one machine.
