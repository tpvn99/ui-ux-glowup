# Testing that a redesign broke nothing

Two scripts, both read-only on the product (no form is submitted by `smoke`, scenarios only do what you write).

## 1. Smoke test — always, any redesign

```bash
node <skill-dir>/scripts/smoke.mjs <original> --json before-smoke.json
node <skill-dir>/scripts/smoke.mjs <redesign> --baseline before-smoke.json    # exit 1 on regressions
```

Clicks every visible control on a fresh page, records its effect, forms, JS errors. Skipped on purpose: submit buttons, external links, delete / logout / pay controls. `--only mobile` repeats it at 390 px.

## 2. Scenarios — the 3–5 journeys that matter

Write them on the **original** page (read its inventory or code for selectors), run, redesign, run again. A scenario that passed before and fails now is a regression.

```bash
node <skill-dir>/scripts/scenario.mjs <page> scenarios.json --json before-sc.json
node <skill-dir>/scripts/scenario.mjs <redesign> scenarios.json --baseline before-sc.json
```

```json
{ "scenarios": [
  { "name": "Settings dialog traps focus", "steps": [
    { "click": "text=Settings" }, { "expect": { "visible": "[role=dialog]" } },
    { "press": "Tab" }, { "expect": { "focusWithin": "[role=dialog]" } },
    { "press": "Escape" }, { "expect": { "hidden": "[role=dialog]" } } ] },
  { "name": "Search filters the table", "steps": [
    { "fill": ["input[type=search]", "acme"] }, { "expect": { "count": ["tbody tr:visible", 1] } } ] }
] }
```

Actions: `goto click fill select check uncheck hover press wait`. Expectations: `visible hidden text url count focusWithin focusOutside enabled disabled valid invalid attr`. Selectors: CSS, `text=Label`, `role=button[name=Save]`.

## 3. Other browsers

```bash
npx playwright install firefox webkit                          # once
node <skill-dir>/scripts/cross-browser.mjs <page> [--out shots]
node <skill-dir>/scripts/smoke.mjs <page> --browser webkit     # same flag on audit, ux, a11y, scenario, screenshot
```

`cross-browser.mjs` opens the page in Chromium (reference), Firefox and WebKit (Safari's engine) at desktop and phone width, and reports what differs: JS errors, horizontal scroll, page height, heading wrapping, broken images, and CSS the engine doesn't support (`backdrop-filter`, container queries, `:has()`, `oklch()`, `text-wrap`, `dvh`, subgrid…). One screenshot per engine and width. Engines not installed are listed, not failed. It checks rendering engines, not real devices: test the primary journey on a real iPhone and Android phone when the product matters.

## 4. Sizes, long content, other languages

```bash
node <skill-dir>/scripts/responsive.mjs <page>                    # 14 sizes: 320 to 1920, tablets, phone and tablet landscape
node <skill-dir>/scripts/responsive.mjs <page> --stress long      # +50% words (translations are longer) and a 34-letter word in headings
node <skill-dir>/scripts/responsive.mjs <page> --stress rtl       # right-to-left (Arabic, Hebrew)
```

Reports horizontal scroll, clipped or tiny text, runaway headings, line length, bars that eat short screens, small targets, with the sizes concerned. `--stress long` shows what breaks first; headings get `overflow-wrap: anywhere` by default in the examples. Numbers are never stretched.

## 5. Same site, same product

```bash
node <skill-dir>/scripts/consistency.mjs index.html pricing.html about.html
node <skill-dir>/scripts/consistency.mjs --site https://example.com --max 6    # home + pages linked from its header
```

Compares fonts, heading scale, header and footer links, primary button, palette, card radius, content width, header height, title pattern and language. Differences are listed with the values and the pages. Reading pages may be narrower on purpose: say so rather than "fix" it.

## Which journeys to write

Pick from what the product does, most valuable first: the primary action (sign-up, checkout, save) · each form's validation (`invalid` then `valid`) · each modal / drawer / menu (opens, focus inside, closes with Escape) · each filter, search, tab, sort · login and logout (log in with `login.mjs` and `--storage-state`; never write credentials in a scenario file).

## Reporting

Say what ran, what passed, what failed, and what was **not** tested (no scenario written, skipped controls). A green run means the listed journeys work, not that the product is bug-free.
