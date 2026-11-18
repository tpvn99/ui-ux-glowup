# Levels, modes and limits

## Modes: does any code change?

| Mode | You say | Result | Code changed? |
|---|---|---|---|
| **Audit only** | "Audit this, don't change anything" | A report: status per area, what to fix first, what was not tested | No |
| **Recommend** | "Propose changes, I'll choose" | A numbered list (problem, fix, files, risk); you pick numbers | Only what you picked |
| **Apply** | "Improve / redesign / fix this" | Backup, change, checks, recap | Yes |

You can also limit the scope: "only the mobile menu", "only accessibility". Anything found elsewhere is listed as *Seen, not touched*.

## Levels of intervention

| Level | Scope | When |
|---|---|---|
| **Light** | One component, one bug, a token or a global fix; no restructuring, no rewriting | "Fix the slider on phones" |
| **Intermediate** *(default)* | One page or section at a time: structure kept, hierarchy, spacing, components, states and mobile redone | "Improve this page" |
| **Complete** | A whole site or a new one: questionnaire, inventory, references, rebuild, every check | "Redesign the site" |

How far the *look* moves (Classic, Modern, Bold) is a separate choice from the level.

## What it protects

Brand colors, fonts and logo are kept. Features, routes, data and business logic are not touched. Adding or replacing a library, moving files or changing the build is **asked first**. A backup is taken before changes, and `restore` rolls back. `verify.mjs check` lists anything that worked before and no longer does.

## What is supported

- **Pages**: static HTML, and any site you can open in a browser (a URL or a local server), whatever it is built with.
- **Code changes**: React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Astro, Remix, Angular, plain HTML/CSS/JS, WordPress (classic, block themes, Elementor, Divi, Bricks…); Tailwind v3 and v4, shadcn/ui, MUI, Chakra, Mantine, Ant, Vuetify, Angular Material, Bootstrap, styled-components, Emotion, CSS Modules. `stack.mjs` detects them.
- **Browsers**: Chromium for every check; Firefox and WebKit for `cross-browser.mjs` and `--browser`.
- **Documents**: PDF templates (invoice, quote, report, proposal, one-pager, CV, letter).

## Known limits

- **A score is not a guarantee.** The /45 audit score and "no issue found" mean that automatic rules found nothing. They say nothing about real usability, real devices, or screen reader experience.
- **Performance numbers are lab measurements** on one machine with a simulated phone. They compare before and after; they are not field data.
- **Scenarios are written by hand** (or by the agent from your code). Only the journeys you describe are tested.
- **Safari is tested through its engine (WebKit)**, not on a real iPhone; `--device` emulates a phone's screen, it is not a phone. See the [real-device checklist](real-device-checklist.md).
- **No screen reader is driven.** Names, roles, states and focus order are checked, which is what a screen reader receives, not what it announces.
- **Roles**: `roles.mjs` compares what each role's interface shows, and with `--expect` checks the server's status per role. A hidden button is not authorization. Only GET, HEAD and OPTIONS are sent unless you add `--unsafe`, and write operations were not exercised against a real server in the tests beyond a local one.
- **Node**: browser checks need Node 20+ (Playwright); Node 18 runs the scripts that need no browser. Windows is untested.
- **Benchmark numbers** are exact for seeded defects only; see the [benchmark](benchmark.md).
- **WordPress content lives in the database**: the file backup does not cover it.
- **Pages behind a login** need `login.mjs` first; multi-factor flows are done by you in the browser window.
- **Designs are judged by rules, not taste.** The agent checks for AI-looking patterns and for readability; a human still decides whether it is right for the brand.
- **No real client project yet**: the examples, the example report and the case studies are built on prepared pages. If you try it on a real project, a report is welcome in an issue.
