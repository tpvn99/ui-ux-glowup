# UI/UX Glowup — Agent Skill

An AI agent skill that upgrades any web interface to the level of the best-designed sites on the web — Linear, Stripe, Vercel, Apple, Airbnb, Mercury and more. Works with Claude Code, OpenAI Codex, Cursor, Windsurf, GitHub Copilot and any agent that supports the [Agent Skills spec](https://agentskills.io).

It **keeps your brand colors** and works on everything else: structure, typography, spacing, components and finishing details. Then it **looks at its own output** with desktop and mobile screenshots and fixes what it sees.

**Contributions welcome!** Found a way to improve the skill or have a new example to add? [Open a PR](#contributing).

## What makes it different

- **Starts with a short questionnaire.** From zero or for a redesign: project type (SaaS/tech, portfolio/agency, business showcase, e-commerce, dashboard), goal, **modernity level** (Classic / Modern / Bold), assets, icons, dark mode, charts, must-keep elements, SEO phrases. Answers become a brief.
- **Always ends with a "Directions taken" recap.** Style, references and what was borrowed, typography, components, icons, charts/KPIs, mobile fixes, SEO, every text edit before → after, product decisions to confirm.

- **Named references, not vague best practices.** For every job the agent picks 2–3 reference sites from the same category and states exactly what it borrows from each.
- **Tested example code.** 9 complete pages and sections (including a light/dark KPI & chart kit) in Tailwind v4 plus a typed React dashboard. The agent starts from them, so the floor is high.
- **Visual self-check.** A Playwright script captures the result at 1440px and 390px and flags horizontal overflow. The agent reviews, fixes and re-captures.
- **Measured, not eyeballed.** `audit.mjs` checks contrast, touch targets, type scale, spacing grid, headings, labels and more at desktop and mobile, and scores 9 criteria (/45, including SEO) before and after. Nothing ships below 4/5.
- **Catches real phone bugs.** Amounts and button labels that wrap, table columns pushed off-screen, clipped content, crowded taps, inputs that make iOS zoom, blocked zoom, banners covering the screen, sliders without snap or with tiny/unlabeled arrows — and it names root causes (e.g. a 15px root font-size behind hundreds of fractional spacings).
- **Spacing, readability and SEO.** Gaps between blocks and section rhythm, long paragraphs and sentences, justified text, title/description/Open Graph/favicon/canonical/JSON-LD, image format, size and lazy-loading. Copy is clarified for readers — never rewritten to stuff keywords.
- **Nothing forgotten.** `inventory.mjs` lists every element of a page (links, CTAs, forms, images, contacts, legal, trackers, structured data) and `--compare` shows what a redesign lost.
- **Visuals, charts and KPIs.** Guidance for clean 3D, bento with micro-animations, semi-flat, interactive SVG charts (Recharts, Chart.js, Framer Motion), donuts with the key number in the center, KPI cards with sparklines, dark mode for every chart, WebP/AVIF + SVG.
- **Icons and favicons.** `find-icons.mjs` searches 200k+ open icons (Phosphor, Solar, Tabler…) with licenses, plus Flaticon; `make-favicon.mjs` generates every favicon size and the `<head>` snippet.
- **Works on real products.** Audits pages behind a login, whole sites (`audit-site.mjs`), and maps every finding to `file:line` in your codebase (`locate.mjs`) so fixes land in the real components.
- **Real reference values.** `extract-tokens.mjs` measures a reference site's type scale, heading tracking, spacing rhythm, radii and shadows — so "like Linear" means Linear's actual numbers.
- **Anti "AI look".** The audit flags the measurable tells (purple gradients, glass everywhere, giant radii, three identical cards, emoji headings, cliché copy, everything centered); `anti-ai.md` gives the fix for each.

## How it works

```
  Intake questionnaire → brief ──► references/intake.md
  (redesign: inventory)          scripts/inventory.mjs
          │
          ▼
  Automated audit + visual review ──► scripts/audit.mjs
          │
          ▼
  Pick 2–3 reference sites ──► references/sites.md
          │                            scripts/extract-tokens.mjs
          │
          ▼
  Rebuild section by section ──► references/sections.md + craft.md
          │                      assets/examples/*.html
          ▼
  Screenshot desktop + mobile ──► scripts/screenshot.mjs
          │        ▲
          └─ fix ──┘
          │
          ▼
  Re-audit (≥ 4/5, no errors) + inventory --compare
          │
          ▼
  Code + before/after image + "Directions taken" recap ──► scripts/compare.mjs
```

## Examples included

| Example | Inspired by | Use for |
|---|---|---|
| `hero-linear.html` | Linear, Attio | SaaS, apps, tools |
| `bento-vercel.html` | Vercel, Apple | Features, services |
| `features-stripe.html` | Stripe | Product explanation, B2B |
| `pricing.html` | Linear, Vercel | Pricing pages |
| `dashboard-shell.html` | Linear, Stripe Dashboard | Back-offices, CRMs, apps |
| `dashboard-dark.html` | Linear app, Stripe, Vercel | Dark, data-dense apps |
| `local-business.html` | Aesop, Mercury, Stripe | Trades, local services, health |
| `product-page.html` | Aesop, Allbirds | E-commerce |
| `kpi-cards.html` | Stripe, Linear, Vercel | KPI cards, donut, goal ring, bars, sparklines — light/dark |
| `react/DashboardShell.tsx` | — | React projects |

## Installation

### Option 1: CLI Install (Recommended)

Use [npx skills](https://github.com/vercel-labs/skills):

```bash
npx skills add tpvn99/ui-ux-glowup
```

The CLI detects which agents you have installed and asks where to install. For Claude Code it installs into `.claude/skills/`; universal agents share `.agents/skills/`.

> [!TIP]
> If you run the command from **inside** an agent session, pass the agent explicitly so it lands where your agent reads it:
>
> ```bash
> npx skills add tpvn99/ui-ux-glowup -a claude-code
> ```

### Option 2: Claude Code Plugin

```bash
/plugin marketplace add tpvn99/ui-ux-glowup
/plugin install ui-ux-glowup
```

### Option 3: Clone and Copy

```bash
git clone https://github.com/tpvn99/ui-ux-glowup.git
cp -r ui-ux-glowup/skills/ui-ux-glowup .agents/skills/     # or ~/.claude/skills/
```

### Option 4: Claude.ai / Claude Desktop

Zip the `skills/ui-ux-glowup` folder and upload it from the Skills section of Claude's settings.

### Recommended: enable the visual check

The screenshot step needs Node 18+ and Playwright in the project where the agent works:

```bash
npm i -D playwright && npx playwright install chromium
```

Without it, the skill still works — the agent falls back to a careful code review.

## Usage

Just ask your agent. The skill triggers on requests like:

- "Make this landing page look like Stripe" (attach the file or paste the code)
- "Redesign our admin dashboard, it should feel like Linear"
- "Here's a screenshot of our homepage — it looks amateur, fix it"
- "Build a homepage for a plumber in Leeds: 4.8★ from 212 reviews, 24/7 callouts"
- "Audit the UI of https://example.com and tell me what to improve"
- "The slider is broken on phones and people tap the wrong buttons"
- "Improve SEO and readability of this page without changing our message"
- "Design the KPI section of our dashboard, it must work in dark mode"
- "Find less generic icons and make us a favicon"

It first asks a short questionnaire (skip any question and it uses sensible defaults). You get complete code, a before/after image and a **Directions taken** recap: brief, score before → after, references and what was borrowed, typography, components, icons, charts, mobile and SEO fixes, every text edit, and product decisions to confirm.

## Repository structure

```
skills/ui-ux-glowup/
├── SKILL.md                    # Workflow
├── references/
│   ├── intake.md               # Start-of-job questionnaire, modernity levels, brief
│   ├── sites.md                # Reference sites by category + what to borrow
│   ├── sections.md             # Patterns by section (hero, features, pricing, dashboard…)
│   ├── craft.md                # Finishing details that make it look professional
│   ├── implement.md            # Code mode: from findings to changes in the real codebase
│   ├── visuals.md              # 3D, bento, semi-flat, charts, KPI designs, dark mode, WebP/SVG
│   ├── mobile.md               # Taps, forms, carousels, overlays on phones
│   ├── seo-readability.md      # Section spacing, readability, on-page SEO, copy rules
│   ├── icons.md                # Icon search, Flaticon, favicons
│   ├── anti-ai.md              # Tells of AI-generated design and what to do instead
│   ├── audit.md                # 9-criteria audit grid (/45)
│   └── checklist.md            # Pre-delivery checklist
├── assets/examples/            # Tested examples (Tailwind v4 + React)
├── scripts/
│   ├── audit.mjs               # Automated UI audit (desktop + mobile), scored /45
│   ├── extract-tokens.mjs      # Measure a reference site's design tokens
│   ├── screenshot.mjs          # Desktop + mobile capture with overflow warning
│   ├── compare.mjs             # Before/after side-by-side image (pages or screenshots)
│   ├── audit-site.mjs          # Crawl + audit a whole site, recurring issues
│   ├── locate.mjs              # Map findings to file:line in the codebase
│   ├── login.mjs               # Save a logged-in session (--storage-state)
│   ├── inventory.mjs           # Every element of a page; --compare for redesigns
│   ├── find-icons.mjs          # Search open icon sets (Iconify) + Flaticon link
│   ├── make-favicon.mjs        # favicon.ico/svg, apple-touch, PWA icons, <head> snippet
│   ├── audit.browser.js        # Paste-in-DevTools audit (generated)
│   ├── build-browser-audit.mjs # Regenerates audit.browser.js
│   └── lib/                    # Browser loader, color math, page probe, analysis rules, locate, report
└── evals/evals.json            # Test prompts with assertions
```

## Using the scripts directly

They're useful on their own, with or without an agent:

```bash
npm i -D playwright && npx playwright install chromium

node skills/ui-ux-glowup/scripts/audit.mjs https://your-site.com
node skills/ui-ux-glowup/scripts/extract-tokens.mjs https://stripe.com
node skills/ui-ux-glowup/scripts/compare.mjs old.png new.html compare.png
node skills/ui-ux-glowup/scripts/audit-site.mjs https://your-site.com --max 15
node skills/ui-ux-glowup/scripts/inventory.mjs https://your-site.com --json before.json
node skills/ui-ux-glowup/scripts/inventory.mjs before.json --compare new-page.html
node skills/ui-ux-glowup/scripts/find-icons.mjs "delivery truck" --sets ph,solar,tabler --download icons/
node skills/ui-ux-glowup/scripts/make-favicon.mjs logo.svg public/ --bg "#1f4d3a"

# Behind a login
node skills/ui-ux-glowup/scripts/login.mjs https://app.your-site.com      # log in, press Enter
node skills/ui-ux-glowup/scripts/audit.mjs https://app.your-site.com/dashboard --storage-state state.json --json audit.json
node skills/ui-ux-glowup/scripts/locate.mjs audit.json src                # file:line for each finding
```

Or paste `skills/ui-ux-glowup/scripts/audit.browser.js` into the DevTools console of any tab.

Example audit output:

```
Audit: Hierarchy 5 · Typography 4 · Spacing 3.5 · Components 4.5 · Visuals* 4 · Content* 3.5 · Responsive 1.5 · A11y 4 · SEO 4 → 34/45
✗ [Accessibility] The viewport meta blocks pinch-zoom (user-scalable=no / maximum-scale=1); remove it.
✗ [Responsive] Fixed/sticky elements cover a large part of the mobile screen.
    body > div.banner covers 49% (fixed)
! [Components] Swipe areas without scroll-snap stop between slides.
    section > div.track (4 items)
! [Visuals] Row of 3–4 identical icon + title + text cards — the default AI layout.
```

## Development

```bash
npm install && npx playwright install chromium
npm test              # unit tests + browser integration tests
./validate-skills.sh  # skill spec + manifests
```

## Contributing

New example, better reference, a pattern the skill misses? See [CONTRIBUTING.md](CONTRIBUTING.md). Run `./validate-skills.sh` and re-capture any example you touch before opening a PR.

## License

[MIT](LICENSE)
