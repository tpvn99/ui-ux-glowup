# Tested environments

What has actually been run, and what has not. If an environment is not in the first table, assume it is untested.

## Run automatically (GitHub Actions)

| Environment | What runs |
|---|---|
| Ubuntu, Node 20, 22, 24 | validation + the full test suite, Chromium, Firefox and WebKit installed |
| macOS (latest runner), Node 22 | validation + the test suite **without `pdf.test.mjs`** (that test used to fail on macOS because of a missing fallback font; it is fixed, but the macOS job still skips it until a runner run confirms it) |
| Windows, Node 22 | the test suite on Chromium (blocking) |
| Node 18, no browser | the scripts that need no browser (`stack`, `safeguard`, `brand-guard`, `doctor`) |
| Clean install, copied and symlinked | the skill folder installed both ways |
| Weekly benchmark | `node benchmark/run.mjs --check` on the ten prepared projects |

Definitions: `.github/workflows/compat.yml`, `validate.yml`, `benchmark.yml`.

## Run by hand

| Date | Environment | What | Result |
|---|---|---|---|
| 2026-11-23 | macOS 26.6.2 arm64, Node 26.7.0, Chromium | full test suite, version 1.15.2 plus the changes after it | 208 pass, 0 fail, 1 skipped |
| 2026-11-23 | same | full benchmark, 10 projects | see [benchmark.md](benchmark.md) |

## Not tested

- **Real phones and tablets** (`--device` is an emulation of the screen size and user agent). No entry in [`device-test-log.md`](device-test-log.md) has been filled in.
- **Screen readers**: VoiceOver, NVDA, TalkBack, JAWS. The checks read names, roles, states and focus; what is announced is not tested.
- **A real Windows PC** with Edge, Chrome and a screen reader, and **Linux on ARM**.
- **Real projects built with their bundlers** (Next, Nuxt, SvelteKit, Angular, a running WordPress). A runner is ready in `benchmark/real-projects/`; nothing has been run with it.
- **Field performance**: no CrUX or real-user data. Lab numbers only.
- **Node 26 in CI**: it was used for the manual runs above, not by the workflows.

The same list, with what is needed to close each item, is in [`ROADMAP.md`](../ROADMAP.md).
