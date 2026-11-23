# Getting started

UI/UX Glowup is a **skill for an AI coding agent** (Claude Code, Codex, Cursor, Windsurf, Copilot…). You talk to the agent; it follows the skill's method and runs the skill's scripts. You do not need to know the scripts, but you can run them yourself.

## 1. What you need

- An AI agent that supports skills, and a project or a web page to work on.
- **Node.js 20 or newer** (`node --version`) for every check that opens a browser (Playwright requires it). Node 18 still runs the scripts that need no browser (`stack`, `safeguard`, `brand-guard`, `doctor`). Without Node the skill still works: the agent reviews the code instead of running tests.
- Run `node <skill-dir>/scripts/doctor.mjs` at any time: it lists what is missing and the exact command to fix it.

## 2. Install the skill

Pick one (details in the [README](../README.md#installation)):

```bash
npx skills add tpvn99/ui-ux-glowup                 # recommended
npx skills add tpvn99/ui-ux-glowup -a claude-code  # if you run it from inside an agent session
```

or, in Claude Code: `/plugin marketplace add tpvn99/ui-ux-glowup` then `/plugin install ui-ux-glowup`.

## 3. Install the browser used by the checks (once, in your project)

```bash
npm i -D playwright
npx playwright install chromium            # the checks
npx playwright install firefox webkit      # optional: compare with Firefox and Safari's engine
```

## 4. Your first run: audit, change nothing

Ask your agent:

> Audit the UI of `index.html` and tell me what to fix first. Don't change any code.

You get a report with a status for each area (functionality, UX, accessibility, performance, visual quality, responsive, SEO), the issues that matter most first, and what was *not* tested. The same thing from the terminal:

```bash
node <skill-dir>/scripts/verify.mjs report index.html --out report.html
```

Open `report.html` in a browser. An [example report](example-report.md) shows what it looks like.

## 5. Your first improvement

> Improve `index.html`: it looks amateur on mobile. Keep our colors and fonts.

The agent first saves a backup, asks only the questions it needs, makes the change, and runs the checks again. You receive the code, a before/after comparison and a **Directions taken** recap. If you dislike the result: `node <skill-dir>/scripts/safeguard.mjs restore latest --yes` puts everything back.

## Which level? Quick, Standard or Full

Say it in your prompt, or the agent picks one and tells you which.

| Level | Use it for | Example prompt |
|---|---|---|
| **Quick** | One component or one bug | "Fix the slider on mobile in `Slider.tsx`." |
| **Standard** (default) | One page to improve or build | "Improve the pricing page. Keep our colors and fonts." |
| **Full** | A whole site, or a new site from scratch | "Redesign the whole site; list the product decisions you need me to confirm first." |

To only look, say "audit only" or "tell me what to fix first, don't change any code". Anything you do not want changed goes in the prompt ("keep the copy", "keep the logo and colors").

## Keeping it up to date

`node <skill-dir>/scripts/doctor.mjs --online` says whether a newer release exists and which command updates it (see [installing for each agent](install-by-agent.md)).

## 6. Where to go next

- [By type of project](by-project-type.md): which prompt and which commands for a landing page, an app, a shop, WordPress…
- [Levels, modes and limits](levels-and-limits.md): audit only, recommend, apply; light to complete; what is supported and what is not.
- [Tutorials](tutorials.md): three walk-throughs you can run in this repository.
- [FAQ](faq.md), [Troubleshooting](troubleshooting.md), [Installing for each agent](install-by-agent.md), [Real device checklist](real-device-checklist.md), [Benchmark](benchmark.md).
