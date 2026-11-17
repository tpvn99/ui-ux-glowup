# Getting started

UI/UX Glowup is a **skill for an AI coding agent** (Claude Code, Codex, Cursor, Windsurf, Copilot…). You talk to the agent; it follows the skill's method and runs the skill's scripts. You do not need to know the scripts, but you can run them yourself.

## 1. What you need

- An AI agent that supports skills, and a project or a web page to work on.
- **Node.js 18 or newer** (`node --version`) for the checks. Without it the skill still works, the agent just reviews the code instead of running tests.

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

## 6. Where to go next

- [By type of project](by-project-type.md): which prompt and which commands for a landing page, an app, a shop, WordPress…
- [Levels, modes and limits](levels-and-limits.md): audit only, recommend, apply; light to complete; what is supported and what is not.
- [Tutorials](tutorials.md): three walk-throughs you can run in this repository.
- [Troubleshooting](troubleshooting.md): when something does not work.
