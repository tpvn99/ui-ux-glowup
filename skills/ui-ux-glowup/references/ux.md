# UX audit — beyond how it looks

A page can look excellent and still lose people. Run this on every page you improve, then fix in this order: main action → forms → states → navigation → journey length.

```bash
node <skill-dir>/scripts/ux.mjs <page|url> [--only mobile] [--json ux.json]
```

Read-only. Each finding has a rule id, the offending selectors and a concrete fix. Exit 1 only on errors.

| Rule | Severity | Meaning → fix |
|---|---|---|
| `no-primary-action` | warning | Nothing filled above the fold → one filled button, verb + result label |
| `competing-primary-actions` | warning | 4+ filled actions → one filled, others outline or text |
| `placeholder-as-label` | error | Label vanishes while typing → visible `<label for>` |
| `missing-autocomplete` | warning | Browser can't fill → `autocomplete="email"`, `given-name`, `new-password`… |
| `wrong-input-type` | warning | Email/phone typed as text → `type="email"` / `tel` |
| `long-form` | warning | 8+ fields at once → ask less now, or split in steps |
| `errors-unsupported` | warning | `novalidate` + no alert region → errors next to fields, `role="alert"` |
| `empty-state-missing` | warning | Empty table/list, no message → what it is, why empty, the action that fills it |
| `nav-no-current` | warning | No current page shown → `aria-current="page"` + visible style |
| `nav-too-many` | warning | 9+ top-level links → 5–7 groups |
| `no-home-link` | warning | No way back → logo links to `/` |

## What the script cannot see — check by hand

- **Journey length**: `scenario.mjs` prints the actions (clicks, fills, selects, presses) per scenario and flags more than 6. Count from landing to goal for sign-up, purchase, contact; each field and each page load is a step to justify.
- **Loading and error states**: throttle the network, force an error; there must be a skeleton or spinner, a message that says what happened and what to do, and no lost input.
- **Confirmations**: after saving or sending, the page says it worked; destructive actions ask first or offer undo.
- **Findability**: can someone who doesn't know the product reach the top 3 tasks from the first screen in two clicks?
- **Copy that blocks**: jargon, internal names, vague buttons (`microcopy.md`).

Recommendations that remove steps are design changes; recommendations that remove features or fields are **Product decisions to confirm**.
