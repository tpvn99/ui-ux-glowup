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

## 6. Goals, budgets and the keyboard

A scenario can state what a person is trying to do, and how much effort is acceptable:

```json
{ "name": "A shopper picks a size and reaches the buy button",
  "goal": "A shopper chooses the second size and can add the product to the cart",
  "maxActions": 2, "profile": "keyboard",
  "steps": [ { "check": "input[name=size] >> nth=1" }, { "expect": { "checked": "input[name=size] >> nth=1" } },
             { "click": "button:has-text('Add to cart')" }, { "expect": { "visible": "button:has-text('Add to cart')" } } ] }
```

The goal must end with an `expect` (nothing else proves it was reached). The journey fails when it takes more than `maxActions`. `--profile keyboard` removes the mouse: every click and field is reached with Tab (radio groups with the arrow keys) and the report says how many presses it took; a control that Tab cannot reach fails the journey. Templates for find a product, reach payment, change a setting, administer an account, understand an offer, and three working journeys: `assets/scenarios/`. An automatic journey says whether the goal can be reached and at what effort, never whether people understand the page.

## 7. Real phones, roles and visual regressions

```bash
node <skill-dir>/scripts/screenshot.mjs <page> shots/ --device "iPhone 15"      # also on audit, a11y, ux, smoke, scenario…
node <skill-dir>/scripts/roles.mjs <url> --as admin=admin.json --as user=user.json --as guest=none --forbid user:#delete-account
node <skill-dir>/scripts/visual-diff.mjs <before> <after> --sizes 390,768,1440 --tolerance 0.5 --out shots/
```

`--device` applies a named device's viewport, pixel ratio, touch and user agent: an **emulation**, not a phone (`docs/real-device-checklist.md` lists what only a real iPhone or Android phone shows). `roles.mjs` compares what each saved session is shown and fails when a role sees a control it should not. `--expect user:GET:/api/admin/users:401,403` goes further and asks the **server**, with that role's cookies (`--header-env role:Authorization=ENVVAR` for a token read from the environment, never typed on the command line), and fails when the status is not one you allowed. Only GET, HEAD and OPTIONS are sent unless you add `--unsafe`: a server whose authorization is broken would really delete or change data, so use a test environment with test accounts. `visual-diff.mjs` counts changed pixels against a tolerance, ignores content that moves by itself (it compares the page with a second shot of itself), groups changes into regions and names the elements under them; use a tight tolerance after a refactor, and read the regions after a redesign. `verify.mjs snapshot` keeps screenshots and `check` adds the same comparison to the report.

## Which journeys to write

Pick from what the product does, most valuable first: the primary action (sign-up, checkout, save) · each form's validation (`invalid` then `valid`) · each modal / drawer / menu (opens, focus inside, closes with Escape) · each filter, search, tab, sort · login and logout (log in with `login.mjs` and `--storage-state`; never write credentials in a scenario file).

## Reporting

Say what ran, what passed, what failed, and what was **not** tested (no scenario written, skipped controls). A green run means the listed journeys work, not that the product is bug-free.
