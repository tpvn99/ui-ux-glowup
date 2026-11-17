# Frameworks and UI libraries

```bash
node <skill-dir>/scripts/stack.mjs [dir]      # framework, styling, token files, scripts, what to read below
```

Read only the sections `stack.mjs` lists. The rules that apply everywhere:

- **Keep the stack.** No new UI library, CSS framework, icon set or state library. If the project has one, use it; if it has none, ask.
- **Change tokens and shared components first** (where `stack.mjs` says tokens live), pages last.
- **Match conventions**: file layout, naming, TypeScript or not, import style, how the project writes classes or styles.
- **Do not touch** data fetching, routing, auth, forms' submit logic, analytics, test ids, or generated files.
- Run the project's own `build` and `test` scripts after the change; then `smoke.mjs` and the scenarios (`testing.md`).

## next
- App Router: components are server components by default; add `'use client'` only where state or handlers need it, and keep it low in the tree.
- Images with `next/image` (set `sizes`, `priority` on the LCP image), fonts with `next/font`, SEO head with the `metadata` export. Don't convert `pages/` to `app/` or the reverse.
- Styles stay where the project keeps them (`app/globals.css`, CSS Modules, Tailwind).

## nuxt, vue
- Single-file components: styles go in `<style scoped>` or the project's utility classes. Nuxt: `useSeoMeta` / `useHead` for the head, `components/` auto-import, `<NuxtImg>` only if `@nuxt/image` is installed.
- Animation with `<Transition>`; no new animation library.

## sveltekit, svelte
- Styles are scoped to the component; shared tokens in a global stylesheet or CSS variables. Head tags in `<svelte:head>`. Use `transition:` and `animate:` directives instead of a library.

## angular
- Component styles are encapsulated: put tokens in global `styles` (CSS variables or the Sass theme), not in each component. `NgOptimizedImage` for images. Use `@angular/cdk` for focus traps and overlays rather than hand-written ones.

## astro
- Static `.astro` components by default; ship JavaScript only for interactive islands (`client:visible` or `client:idle`). Images with `astro:assets`.

## react, react-vite, remix, solid
- Follow the existing component folder and the existing styling approach. Shared pieces (Button, Card, Input) first. Routing, loaders and actions untouched.

## tailwind-v4
- Tokens in the CSS file with `@theme { --color-*, --font-*, --radius-* }`; use the generated utilities. No `tailwind.config` unless the project already has one.

## tailwind-v3
- Tokens in `tailwind.config.*` under `theme.extend`; reuse the existing scale. Don't mix arbitrary values everywhere: add a token when a value repeats.

## shadcn
- Components in `components/ui/` belong to the project: change variants (`cva`) in the component once, not overrides per page. Colors are CSS variables (`--background`, `--primary`…) in the global CSS. Don't re-run the CLI over edited components.

## mui
- Express changes in the theme (`createTheme`: `palette`, `typography`, `shape`, `components.styleOverrides`) and with `sx`; never fight it with global CSS and `!important`.

## chakra, mantine, antd, vuetify, angular-material
- Edit the theme object (or Sass theme for Angular Material and Vuetify), then component props. Don't write competing CSS for library components.

## bootstrap
- Override Sass variables or `--bs-*` CSS variables; keep the grid and the component markup. Never patch the compiled CSS.

## styled-components, emotion
- Tokens through the existing `ThemeProvider`; same file and naming pattern as the neighbouring components.

## wordpress
- Work in the **child theme** (never WordPress core, never the parent theme or a plugin's files); styles through `wp_enqueue_style`, not inline in templates.
- **Block theme** (`theme.json`): change `settings` (color palette, typography, spacing) and block styles there.
- **Page builders** (Elementor, Divi, Bricks…): use the builder's global styles or kit (colors, fonts, buttons), and its custom CSS field; avoid per-widget overrides.
- Work on a staging copy or take a full backup (files and database) first; the page content lives in the database, so `safeguard.mjs backup` does not cover it.

## plain-html
- One stylesheet with CSS variables for tokens; no framework added. Keep file names and URLs: they are links and SEO.
