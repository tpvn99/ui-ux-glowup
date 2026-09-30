# AGENTS.md

Guidelines for AI agents working in this repository.

## Repository Overview

This repository contains an **Agent Skill** following the [Agent Skills specification](https://agentskills.io/specification.md). Skills install to `.agents/skills/` (the cross-agent standard) or `.claude/skills/` for Claude Code. The repo also serves as a **Claude Code plugin marketplace** via `.claude-plugin/marketplace.json`.

- **Name**: UI/UX Glowup
- **GitHub**: [tpvn99/ui-ux-glowup](https://github.com/tpvn99/ui-ux-glowup)
- **License**: MIT

## Repository Structure

```
ui-ux-glowup/
├── .claude-plugin/
│   ├── plugin.json            # Claude Code plugin manifest
│   └── marketplace.json       # Claude Code plugin marketplace manifest
├── .github/                   # Issue/PR templates, validation + release workflows
├── skills/
│   └── ui-ux-glowup/
│       ├── SKILL.md           # Required skill file (<500 lines)
│       ├── references/        # Loaded on demand: intake, sites, sections, craft, visuals, mobile, seo-readability, icons, anti-ai, implement, audit, checklist
│       ├── assets/examples/   # Tested Tailwind v4 examples + React dashboard
│       ├── scripts/           # audit, audit-site, inventory, locate, extract-tokens, screenshot, compare, login, find-icons, make-favicon (+ lib/, audit.browser.js)
│       └── evals/             # evals.json
├── tests/                     # node:test suite + fixtures
├── package.json               # Dev deps (playwright) and npm scripts
├── AGENTS.md                  # This file (CLAUDE.md symlinks here)
├── CONTRIBUTING.md
├── VERSIONS.md
├── validate-skills.sh
├── LICENSE
└── README.md
```

## Build / Lint / Test Commands

**Skills** are content-only (no build step). Validate with:

```bash
./validate-skills.sh     # Frontmatter, naming, referenced files, manifests
npm install && npx playwright install chromium
npm test                 # Unit tests (color math, analysis rules) + browser integration tests
CI=true npm test         # Also audits every example (needs network)
```

**Scripts** are zero-dependency ES modules except Playwright, resolved from the user's project. Keep in-page code in `scripts/lib/probe.mjs` self-contained (it is serialized into the browser) and all judgement in `scripts/lib/analyze.mjs` (pure, unit-tested). Add a test for every new audit rule. After changing anything in `scripts/lib/`, run `node skills/ui-ux-glowup/scripts/build-browser-audit.mjs` — a test fails if `audit.browser.js` is stale.

**Examples** must be checked visually after any change:

```bash
npm i -D playwright && npx playwright install chromium
node skills/ui-ux-glowup/scripts/screenshot.mjs skills/ui-ux-glowup/assets/examples/<file>.html shots/
```

Review both `-desktop.png` and `-mobile.png`. No horizontal overflow warning is allowed, and `node skills/ui-ux-glowup/scripts/audit.mjs <file>` must report no errors.

**React example** must type-check:

```bash
npx tsc --noEmit --jsx react-jsx --strict --moduleResolution bundler --module esnext --target es2020 --skipLibCheck skills/ui-ux-glowup/assets/examples/react/DashboardShell.tsx
```

## Versioning

**Repo release version** — `.claude-plugin/plugin.json` `version`, `.claude-plugin/marketplace.json` `metadata.version`, and the `VERSIONS.md` changelog headings share one x.y.z number:

- **x** — repo-wide changes (restructures, spec changes, breaking changes)
- **y** — new skill(s) added
- **z** — updates to existing skills (new example, new reference, fixes)

**Per-skill version** — `metadata.version` in `SKILL.md`, mirrored in the `VERSIONS.md` table. Bump on ANY shipped change to the skill: minor for new capability, examples or triggers; patch for fixes and clarifications.

Bump the repo release version in the same PR that ships the change. Pushing a new version to `main` triggers `.github/workflows/release.yml`, which tags and publishes a GitHub Release using the matching `### x.y.z (date)` block in `VERSIONS.md`.

## Agent Skills Specification

### Required Frontmatter

```yaml
---
name: skill-name
description: What this skill does and when to use it. Include trigger phrases.
---
```

| Field         | Required | Constraints                                                     |
|---------------|----------|-----------------------------------------------------------------|
| `name`        | Yes      | 1-64 chars, lowercase `a-z`, numbers, hyphens. Must match dir.  |
| `description` | Yes      | 1-1024 chars. What it does, when to use it, scope boundaries.   |
| `license`     | No       | License name (default: MIT)                                     |
| `metadata`    | No       | Key-value pairs (`version`, etc.)                               |

### Optional Skill Directories

```
skills/skill-name/
├── SKILL.md        # Required - main instructions (<500 lines)
├── references/     # Optional - detailed docs loaded on demand
├── scripts/        # Optional - executable code
└── assets/         # Optional - templates, examples, data files
```

## Content Rules for This Skill

- **Brand colors are never changed** by the skill — only how color is used.
- Every pattern in `references/sections.md` should, when possible, point to a working file in `assets/examples/`.
- Examples use Tailwind v4 (`@tailwindcss/browser`) with two tokens: `--color-accent` and `--color-line`.
- Examples use realistic, specific content — never lorem ipsum. Unsplash URLs are placeholders.
- Every HTML example has full SEO head tags (title 30–60 chars, description, canonical, Open Graph, favicon) and must pass the audit's mobile, SEO and `ai-*` rules.
- Every delivery in the workflow ends with the "Directions taken" recap — keep it in `SKILL.md` when editing the workflow.
- **Token budget**: `SKILL.md` stays under ~10 KB and the description under ~500 characters (it is loaded in every session). New detail goes in a reference file listed in the "Load on demand" table, never in `SKILL.md`. Script output must stay compact (cap listed items, offer `--brief`/`--baseline`-style modes).
- Never reproduce a reference site's copy, logos or illustrations: borrow mechanics only.

## Writing Style Guidelines

- Keep `SKILL.md` under 500 lines; move details to `references/`
- Second person, direct and instructional ("You are a senior product designer…")
- H2 for main sections, H3 for subsections; short paragraphs
- Bold for key terms, code blocks for commands and snippets, tables for reference data
- Specific over vague: name the site, the value, the class

## Git Workflow

- Branches: `feature/<name>`, `fix/<description>`, `docs/<description>`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat: add settings-page example`, `fix: mobile overflow in pricing example`, `docs: update README`

### Pull Request Checklist

- [ ] `./validate-skills.sh` and `npm test` pass
- [ ] `SKILL.md` is under 500 lines
- [ ] Changed examples re-captured at desktop + mobile, no overflow
- [ ] Versions bumped (`SKILL.md` metadata, `VERSIONS.md`, `plugin.json`, `marketplace.json`)
- [ ] No sensitive data or credentials
