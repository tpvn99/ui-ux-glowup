# Scripts

Need Playwright (`npm i -D playwright && npx playwright install chromium`). Page scripts accept `--storage-state`, `--wait-for "<css>"`, `--no-dismiss`.

The workflow in `SKILL.md` shows `audit`, `audit-site`, `inventory`, `extract-tokens`, `screenshot`, `compare` and `login`. Also:

| Script | Use |
|---|---|
| `cross-browser.mjs <page>` | Chromium, Firefox, WebKit: what differs; `--browser` on other scripts |
| `login.mjs <url>` | Saves a session locked (600), git-ignored, summarised without values; `--clear` deletes it |
| `responsive.mjs <page> [--stress long\|rtl]` | 14 sizes (320–1920, tablets, landscape), long words and +50% text, right-to-left |
| `consistency.mjs <page> <page>…` / `--site <url>` | Fonts, heading scale, header/footer links, buttons, palette, width across pages |
| `brand-guard.mjs [dir] [--allow color,font,dependency]` | Did the change touch brand colors, fonts or UI dependencies? (vs the last backup) |
| `verify.mjs snapshot\|check\|report <page>` | Every check in one run: snapshot before, compare after, classified report (`--out report.md` or `.html`), `--fast` skips performance and the size sweep |
| `stack.mjs [dir]` | Framework, styling, token files, WordPress builders |
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
