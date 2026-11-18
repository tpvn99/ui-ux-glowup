# Roadmap: what is left

Only what is **not done** is listed here. What exists is documented in `VERSIONS.md`, `docs/` and `references/`. Everything below needs something this repository cannot provide on its own: real people, real devices, real projects, or measurements outside a lab.

## Needs a human

- [ ] **Review the benchmark labels** (20 minutes: tick `benchmark/REVIEW.md`, then `node benchmark/review-sheet.mjs --apply` and `node benchmark/run.mjs --relabel`). Findings on the clean pages were labelled valid / by-design / false positive by an AI agent (`benchmark/labels.json`). A human second opinion is needed before precision is quoted.
- [ ] **Review the recommendations** of `ux.mjs` per kind of site with people who run such sites; adjust the impact levels (`IMPACT` in `lib/ux.mjs`) from what they say matters.

## Needs real devices and assistive technology

- [ ] **iPhone and Android phones** (fill `docs/device-test-log.md`): the checks in `docs/real-device-checklist.md` have to be run on real hardware. `--device` is an emulation.
- [ ] **Screen readers** (follow `docs/voiceover-journey.md`): VoiceOver, NVDA, TalkBack and JAWS on the main journeys. Names, roles, states and focus are checked; what is announced is not.
- [ ] **Widgets not driven yet**: date pickers, data grids, menu bars and custom sliders have no automatic keyboard test; they need a scenario each (comboboxes, listboxes, trees and drag and drop alternatives are checked).
- [ ] **Windows on a real machine**: CI runs the suite on Windows (Node 22, Chromium) and it passes; a real Windows PC with real browsers (Edge, Chrome) and a screen reader is untested.

## Needs real projects

- [ ] **Benchmark on real code**: the ten projects are prepared pages. Add real open-source projects built with their bundlers (Next, Nuxt, SvelteKit, Angular, a running WordPress) and, with permission, client projects, and publish the same indicators.
- [ ] **Frameworks by version**: detection and notes exist for major versions; nothing runs a changed project across Next 13/14/15, Vue 2/3, Angular 14/17+, Svelte 4/5.
- [ ] **Server-side permissions on real systems**: `roles.mjs --expect` asks the server for each role (safe methods by default). Write operations, multi-step flows and token refresh have only been tried against a local test server.
- [ ] **Case studies and videos** from real interventions (before/after, what was detected, what was fixed, what broke and was caught).

## Needs measurements outside a lab

- [ ] **Field performance**: real-user data (CrUX, RUM) and INP on real interactions; the numbers here are lab measurements with simulated throttling.
- [ ] **Agent cost** (run `docs/agent-cost-protocol.md`): time and tokens of an agent-driven intervention (the scripts call no model, so they cannot measure it). Needs recorded agent runs.

## Benchmark growth

- [ ] More seeded defect families (right-to-left breakage, wrong `lang`, error flows after submission) and a second set of clean pages written by someone else, so the benchmark does not only test what its author thought of.
