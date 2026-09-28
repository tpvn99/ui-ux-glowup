# Implementing in a Real Codebase

A mockup proves the direction; the job is done when the real product changes. Use this when the user has an existing app or site (React, Vue, Svelte, Astro, WordPress theme…).

## 1. Find the source of each problem

Run the app locally, audit it, then map findings to files:

```bash
npm run dev                                                         # note the local URL
node <skill-dir>/scripts/audit.mjs http://localhost:5173/dashboard --json audit.json
node <skill-dir>/scripts/locate.mjs audit.json src                  # file:line for each finding
```

`locate.mjs` matches flagged elements by their visible text and class names. When it can't match (text from data, generated class names), search by the component's role: the page route file, then the components it imports.

Behind a login: `node <skill-dir>/scripts/login.mjs http://localhost:5173` once, then add `--storage-state state.json` to every command.

## 2. Fix root causes before symptoms

Work top-down — one global fix often removes dozens of findings:

1. **Global tokens** — root font-size (`html { font-size: 100% }`), base font, neutrals, radius scale, focus ring. In Tailwind v4 these live in `@theme`; in v3 in `tailwind.config.*`.
2. **Shared components** — Button, Card, Badge, Input, Table, PageHeader. Fix them once; every page inherits it.
3. **Layout shells** — sidebar, top bar, page container width and padding.
4. **Page-level composition** — hierarchy, order of sections, which action is primary.

## 3. Change the code the way the project does

- Reuse the project's existing components, tokens, icon set and naming. Don't introduce a second button style or a new UI library.
- Match the language (JS vs TS), styling approach (Tailwind, CSS modules, styled-components) and file structure.
- Keep diffs focused: design changes only. Don't refactor data fetching or state while you're there.
- Keep behavior identical: same handlers, routes, props, analytics events, test IDs and ARIA already present.

## 4. Separate design changes from product changes

Some improvements change what the product does or shows, not just how it looks — grouping rows, hiding a column, removing a button, renaming a feature, changing default filters or what's shown on mobile.

List these separately as **Product decisions to confirm** and don't ship them without a yes. Design-only changes (spacing, type, color usage, alignment, states) don't need confirmation.

## 5. Verify on the running app

```bash
node <skill-dir>/scripts/audit.mjs http://localhost:5173/dashboard          # no errors left
node <skill-dir>/scripts/screenshot.mjs http://localhost:5173/dashboard shots/
node <skill-dir>/scripts/compare.mjs before.png http://localhost:5173/dashboard compare.png
```

Also run the project's own checks (`npm run lint`, `npm test`, type-check) — a redesign that breaks the build isn't done.

## 6. No access to the code? Hand off a prompt

When you only have the live site (URL, screenshots) and the user will implement with a coding agent, deliver a prompt instead of a mockup alone:

```markdown
# Task: redesign <page> in <project> (design only)

## Context
Stack: <React + Vite + Tailwind v4 …>. Keep brand colors <…> and existing components.
Reference mockup: <path or link to the HTML mockup>. Before/after: <compare.png>.

## Global fixes (do first)
1. <e.g. src/index.css: html font-size 15px → 100%; convert any px sizes that relied on it>
2. …

## Page changes
1. <Header: page title h1 "…" + single primary action "…", secondary actions grouped in "Ajouter" menu>
2. <KPI grid: 3 columns desktop / 2 mobile, shared hairline borders, value 32px / 22px mobile, tabular-nums, nowrap>
3. …

## Mobile
- <Sales table: hide Date/Qty/Price below 640px, show them under the item name; keep Profit visible>

## Product decisions — do NOT implement without confirmation
- <Group same-day sales of the same item into one row>

## Acceptance
- `node <skill-dir>/scripts/audit.mjs <url>` reports no errors at desktop and mobile
- No horizontal overflow at 390px; no number or button label wraps
- Existing tests, lint and build pass; no behavior change
```

Fill every `<…>` with specifics from the audit, `locate.mjs` output and the mockup. Vague prompts ("make it look like Linear") produce vague results.
