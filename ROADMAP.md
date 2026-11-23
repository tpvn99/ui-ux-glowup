# Roadmap: what is left

This file lists what is **not done**. An item is ticked only when the evidence exists in this repository (a file, a result, a passing check) and the line says where. Items that need people, devices or measurements outside a lab stay open until someone has actually done them; automatic tests, AI-assigned labels and emulation do not count.

Last checked: 2026-11-23, version 1.15.2.

## Done, with the evidence

- [x] **Windows in CI**: the suite runs on Windows (Node 22, Chromium) and is blocking. Evidence: `.github/workflows/compat.yml`. A real Windows PC with real browsers and a screen reader is still untested (below).
- [x] **Keyboard checks for custom widgets**: comboboxes, listboxes, trees, sliders, menu bars and drag-and-drop alternatives. Evidence: `skills/ui-ux-glowup/scripts/lib/a11y.mjs`, `tests/a11y.test.mjs`. Date pickers and data grids are not covered (below).
- [x] **Tooling for the human review of the benchmark labels**: a sheet to fill (`benchmark/REVIEW.md`), `node benchmark/review-sheet.mjs --apply`, and a "reviewed by" field in the results. The review itself is **not** done (below).
- [x] **Two more seeded defect families**: wrong `lang` and right-to-left breakage (`benchmark/defects.mjs`, 1.15.0 and 1.15.2). Error flows after submission are covered only by the `validation-lost` regression, not by a seeded family.
- [x] **Protocols and templates** for the work that needs people: `docs/real-device-checklist.md`, `docs/device-test-log.md`, `docs/voiceover-journey.md`, `docs/agent-cost-protocol.md`. They are templates; none has been filled in with a real run.

## Needs a human

- [ ] **Review the benchmark labels**: tick `benchmark/REVIEW.md`, then `node benchmark/review-sheet.mjs --apply`. Today 0 findings of the clean pages are reviewed by a human; every label comes from an AI agent (`benchmark/labels.json`). Precision is not quoted as proven until this is done.
- [ ] **Review the recommendations** of `ux.mjs` per kind of site with people who run such sites, and adjust the impact levels (`IMPACT` in `lib/ux.mjs`) from what they say matters. Not started.

## Needs real devices and assistive technology

- [ ] **iPhone and Android phones**: run `docs/real-device-checklist.md` on real hardware and fill `docs/device-test-log.md`. `--device` is an emulation. No device has been logged.
- [ ] **Screen readers**: VoiceOver, NVDA, TalkBack and JAWS on the main journeys (`docs/voiceover-journey.md`). Names, roles, states and focus are checked automatically; what is announced is not. No run has been recorded.
- [ ] **Date pickers and data grids**: no automatic keyboard test yet; each needs a scenario.
- [ ] **Windows on a real machine**: a real PC with Edge, Chrome and a screen reader.

## Needs real projects

- [ ] **Benchmark on real code**: the ten benchmark projects are prepared pages (three written for the benchmark, seven from the repository's examples). Add real open-source projects built with their bundlers (Next, Nuxt, SvelteKit, Angular, a running WordPress) and, with permission, client projects; publish the same indicators.
- [ ] **Frameworks by version**: detection and notes exist for major versions; nothing runs a changed project across Next 13/14/15, Vue 2/3, Angular 14/17+, Svelte 4/5.
- [ ] **Server-side permissions on real systems**: `roles.mjs --expect` has only been tried against a local test server (write operations, multi-step flows, token refresh).
- [ ] **Case studies from real interventions**: `docs/case-studies.md` describes prepared benchmark pages, not real projects.

## Needs measurements outside a lab

- [ ] **Field performance**: real-user data (CrUX, RUM) and INP on real interactions. Today the numbers are lab measurements with simulated throttling, and total blocking time is only a proxy for INP.
- [ ] **Agent cost**: time and tokens of an agent-driven intervention (the scripts call no model). Needs recorded agent runs following `docs/agent-cost-protocol.md`.

## Benchmark growth

- [ ] **A second set of clean pages and defects written by someone else**, so the benchmark does not only test what its author thought of. Recall of 100 % on seeded defects says nothing about defects nobody seeded.
