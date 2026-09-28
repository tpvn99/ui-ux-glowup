# UI/UX Glowup — Agent Skill

An AI agent skill that upgrades any web interface to the level of the best-designed sites on the web — Linear, Stripe, Vercel, Apple, Airbnb, Mercury and more. Works with Claude Code, OpenAI Codex, Cursor, Windsurf, GitHub Copilot and any agent that supports the [Agent Skills spec](https://agentskills.io).

It **keeps your brand colors** and works on everything else: structure, typography, spacing, components and finishing details. Then it **looks at its own output** with desktop and mobile screenshots and fixes what it sees.

**Contributions welcome!** Found a way to improve the skill or have a new example to add? [Open a PR](#contributing).

## What makes it different

- **Named references, not vague best practices.** For every job the agent picks 2–3 reference sites from the same category and states exactly what it borrows from each.
- **Tested example code.** 7 complete sections in Tailwind v4 plus a typed React dashboard. The agent starts from them, so the floor is high.
- **Visual self-check.** A Playwright script captures the result at 1440px and 390px and flags horizontal overflow. The agent reviews, fixes and re-captures.
- **Measured, not eyeballed.** `audit.mjs` checks contrast, touch targets, type scale, spacing grid, headings, labels and more at desktop and mobile, and scores the 8 audit criteria before and after. Nothing ships below 4/5.
- **Catches real mobile bugs.** Amounts and button labels that wrap, table columns pushed off-screen, clipped content — and it names root causes (e.g. a 15px root font-size behind hundreds of fractional spacings).
- **Works on real products.** Audits pages behind a login, whole sites (`audit-site.mjs`), and maps every finding to `file:line` in your codebase (`locate.mjs`) so fixes land in the real components.
- **Real reference values.** `extract-tokens.mjs` measures a reference site's type scale, heading tracking, spacing rhythm, radii and shadows — so "like Linear" means Linear's actual numbers.
- **Anti "AI look".** Explicit list of patterns to avoid (purple gradients, blobs, three identical icon cards…).

## How it works

```
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
  Re-audit (≥ 4/5, no errors) → code + before/after image ──► scripts/compare.mjs
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

You get complete code plus a short recap: score before → after, references used and what was borrowed, and the key changes.

## Repository structure

```
skills/ui-ux-glowup/
├── SKILL.md                    # Workflow
├── references/
│   ├── sites.md                # Reference sites by category + what to borrow
│   ├── sections.md             # Patterns by section (hero, features, pricing, dashboard…)
│   ├── craft.md                # Finishing details that make it look professional
│   ├── implement.md            # Code mode: from findings to changes in the real codebase
│   ├── audit.md                # 8-criteria audit grid
│   └── checklist.md            # Pre-delivery checklist
├── assets/examples/            # Tested examples (Tailwind v4 + React)
├── scripts/
│   ├── audit.mjs               # Automated UI audit (desktop + mobile), scored /40
│   ├── extract-tokens.mjs      # Measure a reference site's design tokens
│   ├── screenshot.mjs          # Desktop + mobile capture with overflow warning
│   ├── compare.mjs             # Before/after side-by-side image (pages or screenshots)
│   ├── audit-site.mjs          # Crawl + audit a whole site, recurring issues
│   ├── locate.mjs              # Map findings to file:line in the codebase
│   ├── login.mjs               # Save a logged-in session (--storage-state)
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

# Behind a login
node skills/ui-ux-glowup/scripts/login.mjs https://app.your-site.com      # log in, press Enter
node skills/ui-ux-glowup/scripts/audit.mjs https://app.your-site.com/dashboard --storage-state state.json --json audit.json
node skills/ui-ux-glowup/scripts/locate.mjs audit.json src                # file:line for each finding
```

Or paste `skills/ui-ux-glowup/scripts/audit.browser.js` into the DevTools console of any tab.

Example audit output:

```
Audit: Hierarchy 4 · Typography 3.5 · Spacing 4 · Components 4 · Visuals* 4.5 · Content* 3.5 · Responsive 1.5 · A11y 1 → 26/40
✗ [Accessibility] Form fields without a label.
    form > input
✗ [Responsive] Controls under 24px (WCAG 2.2 target size minimum).
    form > button 8×8
! [Typography] Lines longer than ~85 characters; cap paragraphs around 65ch.
    div > p (~218ch)
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
