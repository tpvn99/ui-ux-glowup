# UI/UX Glowup Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated |
|-------|---------|--------------|
| ui-ux-glowup | 1.15.1 | 2026-11-18 |

## Recent Changes

### 1.15.1 (2026-11-18)

- **ui-ux-glowup** (1.15.0 → 1.15.1): `a11y.mjs` drives two more custom widgets with the keyboard alone.
  - `slider-no-arrow-keys` (error): a `role="slider"` that does not change `aria-valuenow` with the arrow keys.
  - `menubar-no-arrow-keys` (error): a `role="menubar"` whose items ignore ArrowRight / ArrowLeft.
  - Tests: both added to the widgets good/bad fixtures; the good page stays clean. Date pickers and data grids remain on the roadmap.

### 1.15.0 (2026-11-18)

- **ui-ux-glowup** (1.14.2 → 1.15.0): two new audit rules and two new benchmark defect families.
  - `lang-mismatch` (warning): `<html lang>` disagrees with the language of the visible text (guessed from common words in en, fr, es, de, it, pt; silent on short or unclear text).
  - `rtl-direction` (error): the text is mostly Arabic or Hebrew but the page direction is `ltr` (no `dir="rtl"`).
  - Benchmark: `lang-wrong` and `rtl-not-mirrored` seeded in every project; recall 100 %, no new finding on the clean pages.
  - Tests: 3 new (good and bad fixtures for each rule).

### 1.14.2 (2026-11-18)

- **ui-ux-glowup** (1.14.1 → 1.14.2): an audit of a live site no longer counts as a visit.
  - **Found by a real audit**: auditing a live site loaded its analytics and tag-manager scripts and, with each fresh browser, triggered its A/B test: dozens of phantom visitors in one audit.
  - Every browser script now **blocks known analytics, tag-manager and session-recording hosts by default** (`TRACKING_HOSTS` in `lib/browser.mjs`: Google Tag Manager / Analytics, Umami, Plausible, PostHog, Segment, Mixpanel, Hotjar, Clarity, Meta and TikTok pixels, Sentry, …) and reports how many requests were blocked (`perf.mjs`, the `verify` report). `--allow-tracking` loads them; `--block host,host` adds the site's own stats or experiment endpoint, which cannot be known in advance.
  - `docs/faq.md`, `docs/troubleshooting.md`, `references/implement.md` ("Before auditing a live site"), `references/scripts.md`.
  - Tests: 1 new (blocked by default, `--allow-tracking`, `--block`, no false match on look-alike hosts).

### 1.14.1 (2026-11-18)

- **ui-ux-glowup** (1.14.0 → 1.14.1): six false positives found by running the tools on two real, live sites (read-only audit), fixed with tests.
  - `smoke.mjs`: a link to the page you are already on (the logo link `href="/"` on the home page) is skipped, not reported as a dead control; a control that cannot be clicked (covered, moving, hidden) is reported as "could not be clicked" with the reason instead of "does nothing"; controls are found again through a marker attribute rather than by index (an index could land on a neighbour on pages with carousels or lazy content); an image-only link is named by its `alt`.
  - Audit: arrows such as ↗ are no longer counted as emojis (`ai-emoji` needs an emoji presentation); a link inside a heading may wrap onto two lines (`wrapped-control`); a horizontally scrolling navigation is not a carousel (`carousel-snap`, `carousel-affordance`).
  - Effect on one of the sites: audit 39.5 → 41/45 with no real problem hidden; 0 false dead controls. The real findings on both sites (content invisible without JavaScript, 320px overflow, low contrast, an unnamed button, a glued H1) were checked by hand and kept.
  - Tests: 6 new (`tests/fixtures/real-world.html`, `covered.html`).

### 1.14.0 (2026-11-17)

- **ui-ux-glowup** (1.13.0 → 1.14.0): reliability, a measured benchmark, UX that knows the kind of site, goals reachable by keyboard, deeper accessibility and performance, visual regressions, adoption. One release for all of it.
  - **Reliability.** `scripts/doctor.mjs` (Node, Playwright, the three engines, git, poppler, network, skill version with `--online`; the exact fix for each gap). Everything the scripts write (JSON, snapshots, reports) has tokens in URLs, credentials in links and known key shapes masked (`lib/redact.mjs`). `safeguard.mjs`: backups leave out `.env`, sessions and keys (git and copy), the copy folder is owner-only, `staged` and `hook install|remove` block commits with secrets and never overwrite someone else's hook. `.glowup-safeguard-ignore` lists paths (fake keys in tests) whose content is not scanned; file names such as `.env` and sessions are always reported. `verify.mjs` snapshots carry a schema number: a snapshot from another version is refused before anything runs. New `compat.yml` (Node 20/22/24 on Linux, Node 22 on macOS, Node 18 for the scripts that need no browser, clean copied and symlinked installs, weekly run); `release.yml` validates the commit and requires release notes before tagging. **Finding:** Playwright needs Node 20, not 18; docs, `doctor` and CI now say so.
  - **Benchmark.** `benchmark/`: ten projects (three written for it: WordPress-style export, React app, Vue app), 12 seeded defects each, injected regressions, ground truth by construction. Result: **125 of 125 attributable defects found (133 seeded), 25 of 25 regressions caught, 33 findings on the clean pages all reviewed (0 false positives left)**; exact for what was seeded only, labels by an AI (`labels.json`) awaiting human review. `run.mjs --check` against `baseline.json`, weekly `benchmark.yml`, `gallery.mjs`; `docs/benchmark.md`, `docs/gallery.md`, `docs/case-studies.md`. Defect families: missing basics, accessibility, responsive, visuals, functionality, performance, UX, a stretched image, a heading hidden until an animation runs, a form that cannot show errors; `history.json` keeps every full run. The benchmark exposed ten gaps in the tools, all fixed with tests: a heading shorter than 20 characters hidden by an animation was ignored; errors from Chrome's directory listing were blamed on the page; hidden skip links counted as small targets and wrapping controls; a word in a label made a task board look like a SaaS site; "Book a free consultation" was not a conversion action; white pills counted as primary actions; already-active toggles were reported as dead controls; hidden radios as tiny targets.
  - **UX by kind of site.** `ux.mjs --context saas|ecommerce|showcase|dashboard|content|app` (inferred by default): `no-buy-action`, `buy-no-price`, `no-shipping-info`, `no-signup-action`, `no-pricing-link`, `no-login-link`, `primary-action-buried`, `no-contact-method`, `no-hours-or-address`, `table-no-search|sort|count`, `no-date`, `no-author`, `radio-group-no-legend`, `invalid-not-described`; `--links` finds broken internal links. Every finding has an impact and is ordered by it; `verify` separates problems from matters of style and puts problems first.
  - **Journeys with a goal.** Scenarios take `goal` (must end with an `expect`), `maxActions` and `profile`; `--profile keyboard` removes the mouse (Tab, arrow keys for radio groups) and reports the presses; `checked` / `unchecked` expectations; hints for repeated steps and long forms; five templates and three working journeys in `assets/scenarios/`.
  - **Accessibility.** `a11y.mjs` also tries comboboxes, listboxes and trees with the arrow keys (`combobox-no-arrow-down`, `combobox-no-escape`, `listbox-no-arrow-keys`, `tree-no-arrow-keys`) and requires a button alternative to dragging (`drag-without-alternative`, WCAG 2.5.7). It operates tab lists, disclosure buttons, dialogs and menus with the keyboard (`tabs-no-arrow-keys`, `disclosure-not-toggling`, `modal-focus-not-moved`, `modal-no-escape`, `modal-focus-not-returned`, `menu-no-escape`, `menu-no-arrow-keys`), tests 200% and 400% zoom (`zoom-200-overflow`, `zoom-200-clipped`, `zoom-fixed-covers`) and `fieldset-no-legend`.
  - **Performance.** `perf.mjs --profile slow|flaky` (400 kbps; 8% of requests lost, the same ones every run: `breaks-on-failed-requests`), `animates-layout`, `many-animations`; motion is no longer reduced during the measurement.
  - **Devices, roles, versions, visual regressions.** `--device "iPhone 15"` on every browser script (an emulation, with `docs/real-device-checklist.md` for the rest); `roles.mjs` compares what each saved session sees (`--forbid`, `--require`) and, with `--expect role:GET:/path:401,403`, asks the server with that role's cookies (`--header-env` reads a token from the environment; only GET, HEAD and OPTIONS unless `--unsafe`); `stack.mjs` reports major versions and what they change (Vue 2/3, Angular before/after 17, Svelte 4/5, Next, React, Bootstrap, MUI, Tailwind); `visual-diff.mjs` (tolerance, regions, elements named, moving content ignored by comparing the page with a second shot of itself) and `verify` keeps screenshots and reports where the page changed.
  - **Human review and field work, prepared.** `benchmark/review-sheet.mjs` turns the 33 clean-page findings into `REVIEW.md` (what the tool said, the AI's label and reason, two boxes) and applies the answers back; labels a person answered are counted as reviewed by a human in the results. `docs/device-test-log.md`, `docs/voiceover-journey.md` and `docs/agent-cost-protocol.md` are the templates for real devices, screen readers and agent cost.
  - **Docs and adoption.** `docs/faq.md`, `docs/install-by-agent.md`, `docs/real-device-checklist.md`, troubleshooting and limits updated; `ROADMAP.md` lists only what is left and needs a human, real devices, real projects or field data. 4 evals (33 total).
  - Tests: 51 new, 193 in all (`reliability`, `uxcontext`, `scenarioassets`, `visualdiff`, `roles`, plus additions to `a11y`, `perf`, `scenario`, `stack`, `smoke`, `verify`, `responsive`, `browser`).

### 1.13.0 (2026-11-17)

- **ui-ux-glowup** (1.12.0 → 1.13.0): one verification command with an exportable report, modes and levels, documentation for newcomers (roadmap phase 4).
  - `scripts/verify.mjs` (+ `lib/verify.mjs`): `snapshot` before the change, `check` after, `report` for an audit that changes nothing. Runs the audit, smoke test, UX, accessibility, inventory, optional scenarios, performance and the size sweep (`--fast` skips the last two). The report is classified by **category** (Functionality, UX, Accessibility, Performance, Visual quality, Responsive, SEO) and severity, never blended into one number; it lists *Fix first*, what is new, what was fixed, regressions, the /45 score before → after, performance before → after, and **what was not tested**. Verdict PASS / REVIEW / FAIL (exit 1 on FAIL). `--out report.md` or `.html` (light and dark, escaped).
  - `references/modes.md`: audit only, recommend (numbered list, the user picks), apply; selecting what to improve; light / intermediate / complete (the effort levels, in plainer words). `references/audit.md`: how the /45 is computed (equal weights, −1 per error, −0.5 per warning, floor 1), which criteria are only partly measurable, and why a high score is not a guarantee.
  - `docs/`: `getting-started`, `by-project-type`, `levels-and-limits` (supported technologies and known limits), `tutorials` (three walk-throughs, replayed as written), `troubleshooting`, `example-report` (a real run on the README's demo pair, labelled as a fixture, not a client project).
  - `smoke.mjs`: a renamed link with the same target is a `control-renamed` warning, not a missing control.
  - **Fix**: scripts did nothing, silently, when the skill was installed through a symbolic link (`isMain` compared the typed path with the real path). It now resolves real paths; test with a symlinked install.
  - `safeguard.mjs` ignores `.glowup/` (snapshots) in backups; `check` suggests adding it to `.gitignore`.
  - 4 new evals (audit only, recommend, code mode with brand kept, did we break anything). Tests: 7 new (`verify`, `symlink`; renamed-link case).

### 1.12.0 (2026-11-17)

- **ui-ux-glowup** (1.11.0 → 1.12.0): art direction by sector, brand guard, responsive sweep, consistency across pages, two sober examples (roadmap phase 3).
  - `references/sectors.md`: health, public sector and non-profits, banking and insurance, real estate, travel, education, fashion, media, professional services, food, events; a **variety check** (the dark hairline "Linear" look is only for developer tools), a style spectrum (sober to expressive), sector to example table. `sites.md` and `direction.md` point to it.
  - `scripts/brand-guard.mjs` (+ `lib/brandguard.mjs`): compares the project (untracked files included) with the latest `safeguard` backup, a backup id or a git ref: `brand-color-changed` (error: one of the 3 most used non-neutral colors disappeared), `font-changed` (error), `ui-dependency-added` / `ui-dependency-removed` (error), `color-removed`, `palette-growth`, `font-added`. `--allow color,font,dependency` when the user asked.
  - `scripts/responsive.mjs` (+ `lib/responsive.mjs`): 14 sizes (320 to 1920, two tablets, phone and tablet landscape); `overflow-x`, `text-clipped`, `text-too-small`, `h1-wraps`, `line-too-long`, `fixed-covers-screen`, `target-small`; `--stress long` (+50% words, 34-letter word in headings, numbers untouched) and `--stress rtl`.
  - `scripts/consistency.mjs` (+ `lib/consistency.mjs`): several pages or `--site`; fonts, heading scale, header and footer links, primary button color / radius / height, palette, card radius, content width, header height, background, title pattern, language, favicon; values and pages named.
  - **Examples**: `clinic.html` (sober health practice) and `data-table.html` (sober back-office list; its 5 interaction scenarios are a test). All 13 existing examples now carry `h1, h2, h3 { overflow-wrap: anywhere; }` (a 34-letter heading word overflowed 11 of them).
  - Tool fixes found while building them: the audit no longer counts a visually hidden skip link as a small touch target; `smoke.mjs` sees a sort that only reorders rows (hashes instead of lengths, reads `aria-sort`) and skips visually hidden links; `responsive.mjs` counts stuck bars only, not sticky table cells.
  - Known stress findings left as they are (stress is a "what breaks first" tool, not a pass criterion): `dashboard-dark.html` header and `kpi-cards.html` labels at +50% text.
  - Tests: 31 new (`brandguard`, `responsive`, `consistency`, `v112`; fixtures `resp-*.html`, `site-pages/`, `skiplink.html`, `data-table.scenarios.json`).

### 1.11.0 (2026-11-17)

- **ui-ux-glowup** (1.10.0 → 1.11.0): stack detection, other browsers, safer sessions (roadmap phase 2, steps 3–5).
  - `scripts/stack.mjs` (+ `lib/stack.mjs`): detects Next (app / pages router), Nuxt, Vue, SvelteKit, Svelte, Astro, Remix, Angular, Solid, React + Vite, WordPress (classic, block theme, Elementor / Divi / Bricks / Beaver / Oxygen / WPBakery), plain HTML; Tailwind v3 vs v4, shadcn, MUI, Chakra, Mantine, Ant, Vuetify, Angular Material, Bootstrap, styled-components, Emotion, CSS Modules; where the design tokens live; package manager, tests, scripts. `references/frameworks.md`: per-stack rules (keep the stack, tokens first, no new library, where WordPress changes belong, staging and database backup).
  - `scripts/cross-browser.mjs` (+ `lib/crossbrowser.mjs`): Chromium (reference), Firefox, WebKit at desktop and phone width: `engine-js-error`, `engine-overflow`, `engine-height-differs`, `engine-h1-wraps`, `engine-broken-images`, `engine-unsupported-css` (13 CSS features checked against what the page's stylesheets use); one screenshot per engine and width; missing engines listed with the install command. `--browser chromium|firefox|webkit` on `audit`, `screenshot`, `smoke`, `scenario`, `ux`, `a11y`. `openPage` no longer passes `isMobile` to Firefox (unsupported).
  - **Sessions**: `login.mjs` locks `state.json` (600), adds it to `.gitignore` in a git repo, prints a summary (cookie count, domains, nearest expiry) and never a value; `login.mjs --clear` deletes it; every script warns once when a session file is readable by other users (`lib/session.mjs`).
  - Fix found by WebKit: `no-primary-action` ignored buttons under 30px; threshold lowered to 24px (the WCAG minimum).
  - Tests: 17 new (`stack`, `crossbrowser`, `session`; fixture `engine-diff.html`).

### 1.10.0 (2026-11-17)

- **ui-ux-glowup** (1.9.0 → 1.10.0): performance audit (roadmap phase 2, step 2).
  - `scripts/perf.mjs` (+ `lib/perf.mjs`): real Chromium measurements: LCP (element and image), CLS (across a scroll), TBT from long tasks, FCP, TTFB, weight and requests by type. Profiles: `phone` (default for URLs: 390px, CPU 4× slower, 1.6 Mbps / 150 ms), `desktop`, `fast` (no throttling; default for local files). `--json` saves a run, `--baseline` prints LCP / CLS / TBT / weight before → after. Exit 1 on errors.
  - Rules: `lcp-slow`, `cls-high`, `tbt-high`, `fcp-slow`, `ttfb-slow`, `page-heavy`, `too-many-requests`, `js-heavy`, `heavy-library` (jQuery, Moment, full lodash, three.js, Chart.js, Bootstrap JS, Font Awesome, Tailwind compiled in the browser), `third-party-heavy`, `fonts-heavy`, `font-display-missing`, `render-blocking-script`, `costly-effects`, `image-oversized`, `image-heavy`, `below-fold-not-lazy`, `lcp-lazy` (error), `lcp-no-priority`. A fix per finding. Existing `image-format`, `image-dimensions`, `scroll-cls` stay in `audit.mjs`.
  - `references/performance.md`: thresholds, fix order, what lab numbers cannot tell (field data, INP on real interactions, real devices).
  - `openPage` awaits `onPage` (needed to set throttling before navigation). The script table moved from `SKILL.md` to `references/scripts.md` (SKILL.md back to ~9.9 KB).
  - Tests: 6 new (`tests/perf.test.mjs`: pure rules, and a local HTTP server serving a bad and a clean page).

### 1.9.0 (2026-11-17)

- **ui-ux-glowup** (1.8.0 → 1.9.0): WCAG 2.2 AA behaviour audit (roadmap phase 2, step 1).
  - `scripts/a11y.mjs` (+ `lib/a11y.mjs`): presses Tab up to 60 times and checks the page, read-only. Rules: `keyboard-trap`, `focus-obscured` (2.4.11), `focus-order-jumps`, `no-focusable`, `role-not-focusable`, `aria-invalid-role`, `aria-broken-reference`, `aria-hidden-focusable` (ignores `inert`), `dialog-no-name`, `auth-paste-blocked` (3.3.8), `reflow-320` (1.4.10, ignores deliberate scrollers), `no-skip-link`, `no-main-landmark`, `autoplay-no-pause`, `duplicate-id`, `positive-tabindex`, `table-no-headers`. A fix per finding; exit 1 on errors. A custom switch whose hidden input sits under its label is not reported as obscured.
  - `references/a11y.md`: rule table with WCAG criteria, how to test modals and menus with `scenario.mjs` (`focusWithin`, `focusOutside`), what only a human can check.
  - Examples fixed after the new checks found real defects at 320 px: `settings.html`, `smb-light.html` (grids without `grid-cols-1` could not shrink), `dashboard-dark.html` (header overflow; "1 pending" stays available to screen readers). Warnings left: no skip link / `<main>` in section-style examples (`dashboard-*`, `settings`, `hero-linear`, `local-business`, `bento-vercel`, `features-stripe`).
  - Tests: 3 new (`tests/a11y.test.mjs`; fixtures `a11y2-bad.html`, `a11y2-good.html`).

### 1.8.0 (2026-11-17)

- **ui-ux-glowup** (1.7.0 → 1.8.0): functional smoke test, user-journey scenarios, non-regression, UX audit, backup and rollback (roadmap phase 1, steps 1–4).
  - `scripts/smoke.mjs` (+ `lib/smoke.mjs`): clicks every visible, safe control (one fresh page per control) and records its effect (`navigates`, `scrolls`, `toggles`, `changes-ui`, `none`); records forms, required fields, labels and whether an empty submission is blocked; collects JS errors and failed same-origin requests. Never submits forms, leaves the site, or clicks delete / logout / pay style controls (listed as skipped).
  - `--json` saves a run; `--baseline before.json` reports regressions (`control-missing`, `control-broken`, `control-changed`, `link-changed`, `form-missing`, `field-missing`, `validation-lost`, `field-type-changed`, `new-js-error`) and exits 1 on errors. Alone it flags `dead-control`, `empty-link`, `field-unlabelled`, `js-error`, `request-failed`.
  - `scripts/scenario.mjs` (+ `lib/scenario.mjs`): user journeys in a JSON file (click, fill, select, check, press, hover, expect visible / hidden / text / url / count / focusWithin / focusOutside / valid / invalid / attr). Each scenario starts on a fresh page; the file is validated first with precise messages; `--baseline` lists scenarios that passed before and fail now; exit 1 on failure. `--only mobile` supported.
  - `scripts/ux.mjs` (+ `lib/ux.mjs`): read-only UX audit, a concrete fix per finding. Rules: `no-primary-action`, `competing-primary-actions`, `placeholder-as-label` (error), `missing-autocomplete`, `wrong-input-type`, `long-form`, `errors-unsupported`, `empty-state-missing`, `nav-no-current`, `nav-too-many`, `no-home-link`. `scenario.mjs` now reports actions per scenario and flags journeys over 6 (`LONG_JOURNEY`).
  - `scripts/safeguard.mjs` (+ `lib/safeguard.mjs`): `backup` (git: commit object under `refs/glowup/`, untracked files included, working tree/index/branch/stash untouched; no git: copy in `.glowup-backup/`), `list`, `restore <id|latest> --yes [--clean]` (takes a backup first, lists files created since, deletes them only with `--clean`), `check` (`sensitive-tracked`, `sensitive-not-ignored`, `secret-in-code`, `gitignore-gaps`; never prints a secret; `--fix` appends the missing `.gitignore` lines). `implement.md` §5: protect first, ask before structural changes (dependencies, file moves, routes, build, business logic, auth, payments, tracking).
  - `references/ux.md`: rule table, and the checks a script can't make (loading/error states, confirmations, findability).
  - `references/testing.md`: smoke test + scenarios workflow, which journeys to write, how to report what was not tested.
  - `openPage` accepts `onPage` to listen for errors raised during load.
  - Tests: 22 new (`smoke`, `scenario`, `ux`, `safeguard`; fixtures `smoke-*.html`, `journey*.html`, `journey.json`, `ux-bad.html`, `ux-good.html`).

### 1.7.0 (2026-11-16)

- **ui-ux-glowup** (1.6.0 → 1.7.0): readable without JavaScript, honest copy, motion that hides nothing, brand choices respected.
  - **No-JS render, once**: the first audit loads the page once more with JavaScript off (`lib/browser.mjs`, `collectSnapshot` in `lib/probe.mjs`). `no-js-content-missing` (error): the H1, more than 20% of the main text or a FAQ question is absent. `--baseline` re-checks repeat that load only when the first audit found a no-JS problem; `--fast` skips it, `--deep` forces it. A skipped check is stated in the report.
  - **SEO / GEO**: `h1-word-glue` (error, words in separate elements with no space in the HTML), `jsonld-invalid` (error), `jsonld-unknown-type`, `faq-jsonld-mismatch` (error, FAQPage text differs from the visible page), `rating-without-reviews`, `canonical-og-mismatch`, `hreflang`. `audit-site.mjs` + `lib/site.mjs`: `robots-missing`, `robots-invalid`, `sitemap-missing`, `sitemap-invalid`, `llms-missing`, `ai-bots-blocked` (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), `hreflang-not-reciprocal`. New GEO section in `seo-readability.md`.
  - **Motion**: `hidden-until-animated` (error, text still at `opacity: 0`, `visibility: hidden` or off-screen with no JS or reduced motion), `layout-animation`, `scroll-cls` (warning above 0.1, error above 0.25, measured with a `layout-shift` observer during the scroll pass), `ai-reveal-everywhere`, `ai-infinite-animation`, `ai-slow-motion`, `ai-will-change-everywhere`. `motion.md`: counters keep their final value in the HTML, shorter travel and no grid stagger on phones.
  - **Copy**: `vague-cta` replaces `vague-links` (French and English labels, suggests a verb + result), `unproven-claim` ("#1", "leader", "+500 clients", "98%" with no source or link nearby; goes to "Product decisions to confirm"), `vague-error-message`. Cliché list extended in French and English and checked in list items, buttons, links, captions and badges. New `references/microcopy.md` (errors, confirmations, empty states, 404).
  - **Brand choices**: intake question 11 "Brand choices to keep"; `--allow ai-hero-pill,ai-accent-word,ai-caps-label` reports them as "accepted (brand choice)" with no penalty; these three rules are never errors. "Never" becomes "Avoid by default (unless listed in brand choices)".
  - **Colors**: one rule. A brand exists → its colors are kept. No brand → a short palette (4–6 named hex, AA checked) proposed as a decision to confirm, never as a brand identity (`SKILL.md`, `direction.md` §3, `intake.md`).
  - **No invented figures**: the `aggregateRating` of `local-business.html` and the rating of `product-page.html` are now marked placeholders; `seo-readability.md` says "never a rating or review count without real reviews".
  - **Example**: `smb-light.html` — warm light theme for small-business software and B2B services (hero with one field and one button, product demo in tabs readable without JS, full-width color band, comparison `<table>`, `<details>` FAQ mirrored in FAQPage JSON-LD).
  - **Docs**: versions aligned (`package.json` was still 1.5.0); README examples table fixed (13 examples + React), before/after image with the measured score (`docs/before-after.png`, `tests/fixtures/after.html`), `README.fr.md`; `SKILL.md` kept at ~10 KB (script rows already shown in the workflow removed). 4 new evals (25).
  - Tests: 74 (new `tests/v17.test.mjs`; fixtures `no-js.html`, `motion.html`, `copy.html`, `jsonld.html`, `after.html`, `site/`).

### 1.6.0 (2026-10-01)

- **ui-ux-glowup** (1.5.0 → 1.6.0): for everyone — creators and people who only modify — and no more "made by AI" tells.
  - **Anti-AI tells, measured**: new audit rules `ai-hero-pill` (pill, badge or "New" announcement above the H1, with or without a dot), `ai-status-dot` (green or pulsing decorative dots), `ai-accent-border` (colored line on one side of a block), `ai-icon-tile` (icons in tinted rounded squares), `ai-gradient-text`, `ai-glow`. `anti-ai.md` opens with the five tells people spot first; `craft.md`, `sections.md`, `sites.md` no longer recommend eyebrows, badges above the hero or accent borders.
  - **Accessibility**: `focus-invisible` (tabs through the controls and reports those with no visible focus) and `reduced-motion` (animations with no `prefers-reduced-motion` rule).
  - **Create or modify**: new entry table in `SKILL.md` (create / modify / document) and plain-words guidance for beginners.
  - **Examples**: `article.html`, `auth.html`, `settings.html`; existing examples cleaned of the tells (hero pill, side bars, colored glow).
  - **PDF templates**: `cv.html`, `letter.html`; accent side bars removed from `one-pager.html` and `proposal.html`.
  - **Direction first** (`references/direction.md`, adapted from Anthropic's public `frontend-design` skill): subject in 3 lines, token plan, check against AI defaults, one bold place, critique. New audit rules `ai-arrow-cta`, `ai-caps-label`, `ai-numbered-markers`, `ai-accent-word`, `ai-middot-meta`; `anti-ai.md` lists the template-chrome tells.
  - **Motion** (`references/motion.md`): one orchestrated moment, motion that answers an action, reduced-motion and no-JS safe; no per-section fade-ups.
  - Fix found by testing on a real site: closed `<details>` (FAQ accordions) no longer count as section content, which produced false `section-gap` warnings.
  - Tests: 58 (new fixtures `ai-tells.html`, `a11y-bugs.html`, `accordion.html`, `ai-chrome.html`).

### 1.5.0 (2026-09-30)

- **ui-ux-glowup** (1.4.1 → 1.5.0): professional PDFs.
  - `scripts/pdf.mjs`: HTML → PDF with Chromium (tagged, bookmarks, CSS page size and margin boxes, safe break defaults), then checks the real file: Type 3 fonts (variable fonts or faked bold/italic), fonts not embedded, system fallback fonts with the suspect characters, blank and near-empty pages, content past the margins, text under 7pt, thin weights, low-resolution images, long tables without `<thead>`, file weight, title, lang, page numbers — and the content each type needs (`--type invoice|quote|report|proposal|onepager`, French invoice mentions incl. the 2026 reform). One PNG with all pages (`--pages` for one per page; needs poppler). `--check file.pdf` for existing PDFs.
  - `scripts/lib/pdfcheck.mjs`: dependency-free PDF reader (objects, Flate streams, object streams, fonts, pages, title, tags).
  - `scripts/site-fonts.mjs`: reuses the website's fonts — finds the families and weights actually used, downloads their files, writes `fonts.css` with `--font-heading`/`--font-body`, license hint per source, `--static` turns variable fonts into static weights (fontTools), warns about faked bold.
  - `references/pdf.md`: workflow, font licensing, page CSS, checklists (every document, invoice/quote, report, proposal, one-pager).
  - Templates in `assets/pdf/`: `facture-devis.html`, `report.html`, `proposal.html`, `one-pager.html` — all print clean on the first page count.
  - Tests: 51.

### 1.4.1 (2026-09-30)

- **ui-ux-glowup** (1.4.0 → 1.4.1): no comments in generated code (section markers, notes, commented-out code) — they cost tokens and get removed anyway; examples' navigation comments are not to be copied. Checklist item added.

### 1.4.0 (2026-09-30)

- **ui-ux-glowup** (1.3.0 → 1.4.0): same results, far fewer tokens.
  - **Effort levels** Quick / Standard / Full: small requests skip intake, references, inventory and token extraction; Standard asks only the intake questions it can't infer.
  - **Load on demand** routing table in `SKILL.md` (one reference per need, only the relevant sections); examples read section by section via their `<!-- -->` markers. `SKILL.md` 14.5 KB → 9 KB, description 938 → 485 characters.
  - `audit.mjs --baseline before.json`: compact delta (scores before → after, fixed rules, open and NEW issues) for every re-check; `--brief` one-line findings; `--max-items`; items capped at 4 in full reports. Header docs updated to /45.
  - `screenshot.mjs --selector <css>`, `--only desktop|mobile`, `--max-height`: re-check just the changed section.
  - `inventory.mjs --json` prints a one-line summary (`--print` for the full list).
  - Token discipline rules (edit instead of rewrite, look at an image once, stop when clean).
  - Tests: 42.

### 1.3.0 (2026-09-28)

- **ui-ux-glowup** (1.2.0 → 1.3.0): intake, recap, phones, SEO, visuals and "nothing forgotten".
  - **Intake questionnaire** (`references/intake.md`): one message, multiple choice, from zero or for a redesign — project type and style family (SaaS/tech, portfolio/agency, business showcase, e-commerce, dashboard), goal, **modernity level** (Classic / Modern / Bold), assets, icons, dark mode, charts, must-keep, audience and SEO phrases → a written brief. Modern touches per level in `craft.md`.
  - **"Directions taken" recap** mandatory after every job (brief, score, references, typography, components, icons, charts/KPIs, mobile, SEO, text edits before → after, inventory, product decisions).
  - **Phones**: new audit rules `zoom-blocked`, `input-zoom`, `tap-crowded`, `fixed-overlay`, `touch-blocked`, `carousel-snap`, `carousel-controls`, `carousel-small-controls`, `carousel-affordance`; `references/mobile.md` (taps, forms, scroll-snap carousel snippet, overlays, safe areas).
  - **Spacing between blocks, readability, SEO**: new SEO criterion (audit now /45) — `section-gap-*`, `section-rhythm`, `long-paragraphs`, `long-sentences`, `justified-text`, `uppercase-text`, `seo-*` (title, description, noindex, Open Graph, favicon, canonical, JSON-LD, thin content), `image-format`, `image-oversized`, `image-lazy`; `references/seo-readability.md` with copy rules (understand first, keep facts and voice, never stuff keywords, list every edit).
  - **Anti-AI**: `ai-gradient`, `ai-glass`, `ai-radius`, `ai-identical-cards`, `ai-emoji`, `ai-cliche`, `ai-centered`; `references/anti-ai.md`.
  - **Nothing forgotten**: `scripts/inventory.mjs` lists every element of a page; `--compare` reports what a redesign lost.
  - **Icons & favicons**: `scripts/find-icons.mjs` (Iconify search online or local `@iconify-json/*`, licenses, React import hints, Flaticon link, `--download`); `scripts/make-favicon.mjs` (ICO/SVG/apple-touch/PWA + head snippet, monogram mode); `references/icons.md`.
  - **Visuals, charts & KPIs**: `references/visuals.md` (clean 3D, bento + micro-animations, semi-flat, Recharts/Chart.js/Framer Motion, donut, KPI card designs, dark mode for charts, WebP/AVIF + SVG, style per project type); new example `kpi-cards.html` (light/dark auto + toggle).
  - All examples get full SEO head tags; `local-business` and `product-page` get JSON-LD.
  - Tests: 40 (new rule groups, inventory diff, icon/favicon helpers, fixture with phone bugs). 6 new evals.

### 1.2.0 (2026-09-28)

- **ui-ux-glowup** (1.1.0 → 1.2.0): lessons from the first real-product test (a dark reseller dashboard behind a login).
  - Audit catches what only the screenshots showed before: **numbers and button labels that wrap**, **table columns hidden off-screen** in scroll areas, **content cut off** by `overflow: hidden`. Line counting ignores icons and mixed font sizes on one baseline.
  - **Root causes over symptoms**: a non-16px `<html>` font-size is reported as the cause of fractional spacing, with the fix, instead of a generic grid warning.
  - **Logged-in pages**: `login.mjs` saves a session (`--storage-state` on every script); `audit.browser.js` (generated by `build-browser-audit.mjs`) runs the full audit pasted into DevTools or a browser JS tool; scripts auto-close modals/cookie banners via their close/decline button (`--no-dismiss` to keep them), `--wait-for` for slow SPAs.
  - **Code mode**: `locate.mjs` maps findings to `file:line` (by text and Tailwind classes, root font rule in CSS); new `references/implement.md` (root-cause-first fixes, working the project's way, verification, implementation-prompt template for coding agents).
  - **Whole sites**: `audit-site.mjs` crawls internal links (skips logout/delete), audits each page and lists issues repeated across pages.
  - `compare.mjs` accepts screenshots (`.png/.jpg/.webp`) as before/after.
  - New example `dashboard-dark.html`; `dashboard-shell.html` (+ React) table now keeps key columns visible on mobile.
  - Workflow: explicit code vs mockup mode, "Product decisions to confirm" kept separate from design changes, mobile-table rule.
  - Tests: 30 (new rules, locate, crawler helpers, bundle freshness + in-page run, site crawl).

### 1.1.0 (2026-09-28)

- **ui-ux-glowup** (1.0.0 → 1.1.0): measurable audits and real reference tokens.
  - New `scripts/audit.mjs`: automated audit at desktop and mobile — WCAG contrast (handles oklch/Tailwind v4 colors and translucent layers), touch targets (WCAG 2.2), type scale, line length/height, 4px spacing grid, radius/shadow/color sprawl, heading order, alt text, form labels, clickable divs, broken/stretched images, lorem ipsum, overflow. Scores the 8 audit criteria with offending selectors; `--json` and `--fail-under` for CI.
  - New `scripts/extract-tokens.mjs`: measures a reference site's fonts, type scale, heading tracking and line-height ratios, spacing rhythm, radii and shadows, so borrowed values are real.
  - New `scripts/compare.mjs`: before/after side-by-side image for the deliverable.
  - `scripts/screenshot.mjs` refactored on a shared `scripts/lib/` (browser loader, color math, page probe, pure analysis).
  - Examples fixed from their own audit: contrast on muted text, decorative mockups exposed as `role="img"`, larger mobile touch targets, accordion hit areas. All examples now pass with no errors.
  - Repo: `package.json`, `node:test` suite (unit tests for color math and analysis rules + browser integration tests), CI runs the tests and posts example audits to the job summary.

### 1.0.0 (2026-09-28)

- Initial release of the **`ui-ux-glowup`** skill (1.0.0).
- Workflow: audit (8 criteria / 40) → pick 2–3 reference sites and name what is borrowed → rebuild from tested examples → screenshot check at desktop and mobile → self-review → deliver with before/after score.
- `references/`: reference-site library by category (`sites.md`), patterns by section (`sections.md`), finishing details (`craft.md`), audit grid (`audit.md`), pre-delivery checklist (`checklist.md`).
- `assets/examples/`: 7 complete Tailwind v4 examples (Linear-style hero, Vercel-style bento, Stripe-style features, pricing + FAQ, dashboard, local business site, product page) + a typed React dashboard.
- `scripts/screenshot.mjs`: Playwright capture at 1440px and 390px with horizontal-overflow warning; also captures live reference sites.
- 6 evals in `evals/evals.json`.
