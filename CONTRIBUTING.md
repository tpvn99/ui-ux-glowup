# Contributing

Thanks for helping make UI/UX Glowup better! This guide covers the most common contributions.

## Requesting an improvement

[Open an issue](../../issues/new/choose) using the **Improvement** or **Bug report** template.

## Adding an example

Examples are the highest-leverage contribution: the agent copies their level of craft.

1. Create `skills/ui-ux-glowup/assets/examples/<pattern-name>.html`.
2. Follow the shared conventions:
   - Tailwind v4 via `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`
   - Tokens in `@theme`: `--color-accent` (brand) and `--color-line` (hairline borders)
   - A header comment: pattern name, inspiration, 2–3 "key points"
   - Realistic, specific content — no lorem ipsum; Unsplash URLs only as placeholders
   - Semantic HTML, AA contrast, visible focus, responsive from 390px
3. Capture it at desktop and mobile and review both images:
   ```bash
   npm i -D playwright && npx playwright install chromium
   node skills/ui-ux-glowup/scripts/screenshot.mjs skills/ui-ux-glowup/assets/examples/<pattern-name>.html shots/
   ```
   No horizontal overflow warning is allowed. Then audit it — no errors allowed:
   ```bash
   node skills/ui-ux-glowup/scripts/audit.mjs skills/ui-ux-glowup/assets/examples/<pattern-name>.html
   ```
4. Add a row to `assets/examples/README.md` and point to it from `references/sections.md`.
5. Attach the two screenshots to your PR.

## Adding a reference site

Add it to the right category in `references/sites.md` with **specific mechanics to borrow** (layout, type, spacing, components). "Nice design" is not a mechanic.

## Editing SKILL.md

- Keep it under 500 lines; move detail to `references/`
- Keep the `description` under 1024 characters, with trigger phrases and scope boundaries
- Bump `metadata.version`

## Versioning

See [AGENTS.md](AGENTS.md#versioning). In short: bump `SKILL.md` `metadata.version`, the `VERSIONS.md` table and changelog, and the version in both `.claude-plugin/*.json` files in the same PR.

## Adding an audit rule

Rules live in `skills/ui-ux-glowup/scripts/lib/analyze.mjs` (pure functions over data collected by `lib/probe.mjs`). Add the measurement to the probe if needed, the rule to `analyze()`, a test in `tests/analyze.test.mjs`, then regenerate the in-browser bundle:

```bash
node skills/ui-ux-glowup/scripts/build-browser-audit.mjs
```

## Before opening a PR

```bash
./validate-skills.sh
npm test
```

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
