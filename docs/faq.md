# FAQ

**Does it change my code without asking?** Only in *Apply* mode, and never before a backup. *Audit only* and *Recommend* change nothing. Adding a library, moving files, changing routes, the build, business logic, auth, payments or tracking is asked first. See [levels, modes and limits](levels-and-limits.md).

**Will it change my brand colors, fonts or logo?** No. `brand-guard.mjs` fails when a brand color disappears, a font is dropped or a UI library is added without being asked.

**Can I undo what it did?** Yes: `node <skill-dir>/scripts/safeguard.mjs restore latest --yes`. A restore takes a new backup first, so the restore itself can be undone. Backups never contain `.env` files, sessions or keys.

**Does auditing my live site count as a visit?** It would: a page loaded in a browser runs its scripts. So the scripts **block known analytics, tag-manager and session-recording hosts by default** (Google Tag Manager and Analytics, Umami, Plausible, PostHog, Segment, Mixpanel, Hotjar, Clarity, Meta and TikTok pixels, Sentry…) and tell you how many requests were blocked. They cannot know your own endpoints: an A/B test or event log that talks to your own server or database still receives an exposure for each fresh browser the audit opens (dozens per audit). Add them with `--block host1,host2` (for example `--block supabase.co`), audit a staging copy, or filter the audit's time window out of your results. `--allow-tracking` loads the trackers (to measure their weight).

**Does it send my code or data anywhere?** The scripts run on your machine. `doctor.mjs --online` asks GitHub for the latest release number and sends nothing about you or your project. Pages you audit are loaded in a local browser. Tokens in URLs and known key shapes are masked in everything the scripts write.

**What does a score of 45/45 mean?** That no automatic rule fired. It is not a guarantee: it says nothing about real usability, real devices or screen reader use. Reports show one status per area instead of a single blended number, and always list what was not tested.

**Does it replace testing with real users, real phones or a screen reader?** No. Journeys check that a goal can be reached and at what effort. Device names are an emulation. Nothing here drives VoiceOver, NVDA, TalkBack or JAWS. [The real-device checklist](real-device-checklist.md) lists what to try by hand.

**It says my page needs JavaScript to show content. Is that wrong?** No: a single-page app that renders nothing without JavaScript is invisible to many crawlers and AI assistants. It is a finding to weigh, not always a defect. `--fast` skips the check.

**It flagged something I chose on purpose.** Pill above the title, tracked caps labels and an accent word are brand choices: `--allow ai-hero-pill,ai-accent-word,ai-caps-label`. Anything else: list it under *Product decisions to confirm*.

**Which frameworks does it support?** Anything you can open in a browser can be audited. For code changes, `stack.mjs` detects Next, Nuxt, Vue (2 and 3), Svelte (4 and 5), SvelteKit, Astro, Remix, Angular (before and after 17), React, Solid, WordPress (classic, block themes, page builders), Tailwind 3 and 4, shadcn/ui, MUI, Chakra, Mantine, Ant, Vuetify, Angular Material, Bootstrap 4 and 5, styled-components, Emotion. It writes the version the project is on and adds no library.

**Does it work on Windows?** Not tested. The scripts are plain Node and should run, but the test suite and the CI cover Linux and macOS only.

**How do I update?** `node <skill-dir>/scripts/doctor.mjs --online` tells you whether a newer release exists and the command to update: `npx skills add tpvn99/ui-ux-glowup`, or `/plugin marketplace update ui-ux-glowup` in Claude Code.

**How accurate is it?** See the [benchmark](benchmark.md): on ten prepared projects with known seeded defects it reports how many it finds, how many regressions it catches and what it flags on clean pages. Those numbers are exact for what was seeded and say nothing about defects nobody thought to seed.

**Something is broken.** [Troubleshooting](troubleshooting.md), or open an issue with the command, its output and `node --version`.
