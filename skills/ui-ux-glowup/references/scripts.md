# Scripts

Need Playwright (`npm i -D playwright && npx playwright install chromium`). Page scripts accept `--storage-state`, `--wait-for "<css>"`, `--no-dismiss`.

The workflow in `SKILL.md` shows `audit`, `audit-site`, `inventory`, `extract-tokens`, `screenshot`, `compare` and `login`. Also:

| Script | Use |
|---|---|
| `ux.mjs <page>` | UX audit, a fix per finding |
| `a11y.mjs <page>` | WCAG 2.2 AA: Tab walk, ARIA, reflow 320px |
| `perf.mjs <page> [--baseline]` | LCP, CLS, TBT, weight on a throttled phone |
| `safeguard.mjs backup\|restore\|check` | Snapshot, rollback, secrets and session files |
| `locate.mjs <audit.json> [src]` | Findings to `file:line` |
| `scenario.mjs <page> <file.json>` | User journeys; regressions vs a saved run |
| `smoke.mjs <page> [--baseline]` | Clicks every safe control; regressions |
| `pdf.mjs <doc.html> [--type invoice\|quote\|report\|proposal\|onepager]` | Print to PDF, check fonts/pages/mentions |
| `site-fonts.mjs <url> <dir>` | The site's fonts as files + `fonts.css` |
| `find-icons.mjs "<query>"` | Open icon sets, licenses, Flaticon link |
| `make-favicon.mjs <logo.svg> <dir>` | All favicon sizes + `<head>` snippet |
