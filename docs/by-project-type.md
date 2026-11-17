# By type of project

`<skill-dir>` is where the skill is installed (`.claude/skills/ui-ux-glowup` or `.agents/skills/ui-ux-glowup`). Every project: say what must **not** change (colors, fonts, copy, features).

## A landing page or showcase site (HTML, any builder export)

> Redesign `index.html` for a plumber in Leeds. Keep our green and our logo. Mobile first.

Commands behind it: `verify.mjs snapshot` before, `verify.mjs check` after. The agent proposes reference sites from your sector (`sectors.md`), builds from the closest example (`local-business.html`, `smb-light.html`), checks SEO and phone layout.

## A SaaS app or dashboard (React, Vue, Svelte, Angular…)

> Make our dashboard feel calmer and more readable. Don't touch data fetching or routes.

`stack.mjs` detects the framework and where the design tokens live; the agent changes tokens and shared components first (`frameworks.md`), never adds a UI library without asking, and `brand-guard.mjs` fails if a brand color, font or library changed. Behind a login: `login.mjs <url>` once, then `--storage-state state.json` (the file is locked and git-ignored for you).

## Next.js, Nuxt, SvelteKit, Astro

Same as above. The agent follows the router and the framework's own image, font and SEO tools (App Router, `next/image`, `useSeoMeta`, `<svelte:head>`, `astro:assets`). Run the project's `build` and `test` scripts after the change.

## An online shop

> The product page looks generic and mobile checkout is hard. Improve it, keep the buy flow identical.

Use `product-page.html` as the pattern. Write 3–5 scenarios with `scenario.mjs` for the buy flow (add to cart, choose a variant, reach checkout) **before** the change, and run them after: a journey that passed before and fails now is reported.

## WordPress

> Improve the header and the services section of our theme, using our page builder's global styles.

The agent works in the child theme or the builder's global styles, not core files. Take a full backup of files **and database** first (`safeguard.mjs` only covers files). Work on a staging copy when you can.

## An article, blog or documentation site

Pattern `article.html`: serif body at 60–70 characters, sticky contents, readable tables. Check with `responsive.mjs --stress long` for long titles and other languages.

## A back-office list or table

Pattern `data-table.html`: search, filter, sortable headers, selection, a real empty state, key columns visible on phones. Scenarios: type in search, filter to nothing, clear, sort twice, select all.

## A whole site

> Audit the whole site, then fix the three costliest problems.

`audit-site.mjs <url>` crawls it; `consistency.mjs --site <url>` checks that pages look like one product; `verify.mjs report` gives the combined view.

## An invoice, quote, report or CV (PDF)

> Make a clean invoice PDF with our logo and the legal mentions.

Templates in `assets/pdf/`, checked by `pdf.mjs` (fonts embedded, no blank page, mentions present). IDs in the templates are placeholders: use your real ones.
