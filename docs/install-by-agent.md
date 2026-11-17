# Installing for each agent

The skill is a folder (`skills/ui-ux-glowup`) with a `SKILL.md`. What differs between agents is where that folder lives. The installer knows the locations, so prefer it to copying by hand.

```bash
npx skills add tpvn99/ui-ux-glowup                  # asks which agents you use and installs for each
npx skills add tpvn99/ui-ux-glowup -a <agent>       # one agent; run this form when you are inside an agent session
```

| Agent | How |
|---|---|
| **Claude Code** | `npx skills add tpvn99/ui-ux-glowup -a claude-code` (installs into `.claude/skills/`), or `/plugin marketplace add tpvn99/ui-ux-glowup` then `/plugin install ui-ux-glowup` |
| **Claude.ai / Claude Desktop** | Zip the `skills/ui-ux-glowup` folder and upload it in the Skills section of the settings. The agent cannot run the scripts there: it reviews code and uses the references |
| **Agents that read `.agents/skills/`** (the cross-agent folder) | `npx skills add tpvn99/ui-ux-glowup`, or copy the folder to `.agents/skills/ui-ux-glowup` |
| **Any other agent that supports skills** | Use the installer with its name (`-a <agent>`); if it is not listed, copy the folder to the directory that agent documents for skills |

Anything else (Codex, Cursor, Windsurf, Copilot…): check that agent's documentation for where it reads skills or instructions from, and use `npx skills add … -a <agent>` when the installer lists it. This page does not guess locations it cannot verify.

## After installing

1. In the project where the agent works: `npm i -D playwright && npx playwright install chromium` (Node 20 or newer for anything that opens a browser).
2. `node <skill-dir>/scripts/doctor.mjs`: lists what is missing and the exact command that fixes each item. Add `--online` to see whether a newer release exists.
3. Ask: "Audit `index.html` and tell me what to fix first. Don't change any code."

A symbolic-link install works (the scripts resolve real paths). If a script prints nothing at all, upgrade to 1.13.0 or later.

## Updating

`node <skill-dir>/scripts/doctor.mjs --online`, then re-run the installer. Saved snapshots from `verify.mjs snapshot` are tied to a version: if `check` says the snapshot was made by another version, take a new one before the change you want to compare.
