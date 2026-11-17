# Tutorials

Three walk-throughs you can run from the root of this repository. They use the demo pages in `tests/fixtures/`. Replace paths with your own pages afterwards.

Prerequisite: `npm install && npx playwright install chromium`.

## 1. Audit a page without changing anything

```bash
node skills/ui-ux-glowup/scripts/verify.mjs report tests/fixtures/before.html --out report.html
```

Open `report.html`. Read in this order: the **verdict**, the table **by category** (a status each, not one blended score), **Fix first** (the five costliest issues), then **What was not tested**. For the details of one area, run its script: `ux.mjs`, `a11y.mjs`, `perf.mjs`, `responsive.mjs`.

What you learned: the page scores 27/45 on the visual audit; the report also shows accessibility, UX and responsive errors that the score alone would hide.

## 2. Improve a page safely, with a way back

```bash
mkdir demo && cp tests/fixtures/before.html demo/page.html && cd demo
S=../skills/ui-ux-glowup/scripts
node $S/safeguard.mjs backup .                                  # a snapshot you can restore
node $S/verify.mjs snapshot page.html --dir .glowup/before      # the checks, as they are today
```

Now change the page (ask your agent, or `cp ../tests/fixtures/after.html page.html` to follow along), then:

```bash
node $S/verify.mjs check page.html --dir .glowup/before --out report.md
```

The report lists what improved, what is new, and anything that **worked before and no longer does**. If you dislike the result:

```bash
node $S/safeguard.mjs restore latest --yes
```

In a real git project, also run `brand-guard.mjs` (fails if a brand color, font or UI library changed) and add `--scenarios journeys.json` to compare your key user journeys.

## 3. Test a journey that must not break

Write the journey once, on the page as it is today (`tests/fixtures/data-table.scenarios.json` is a real example: search, empty state, filter, sort, select):

```bash
node skills/ui-ux-glowup/scripts/scenario.mjs skills/ui-ux-glowup/assets/examples/data-table.html \
  tests/fixtures/data-table.scenarios.json --json before-sc.json
```

After any change:

```bash
node skills/ui-ux-glowup/scripts/scenario.mjs <page> tests/fixtures/data-table.scenarios.json --baseline before-sc.json
```

It exits with an error if a journey that passed before fails now, and it prints how many actions each journey takes (more than 6 is flagged as long). The same file works in Firefox and Safari's engine: add `--browser firefox` or `--browser webkit`.

## Bonus: fix keyboard access

```bash
node skills/ui-ux-glowup/scripts/a11y.mjs tests/fixtures/a11y2-bad.html
```

It presses Tab through the page and reports a keyboard trap, ARIA that points nowhere, controls with a role that the keyboard cannot reach, and horizontal scrolling at 320 px, each with its fix. Compare with `tests/fixtures/a11y2-good.html`.
