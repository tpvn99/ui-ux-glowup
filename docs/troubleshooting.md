# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Playwright not found` | In your project: `npm i -D playwright && npx playwright install chromium`. The scripts look in the folder where you run them first. |
| `firefox is not installed` / `webkit is not installed` | `npx playwright install firefox webkit`. `cross-browser.mjs` lists missing engines instead of failing. |
| `Executable doesn't exist` | A Playwright update needs its browsers again: `npx playwright install`. |
| The agent only reviews code and runs no checks | Node 18+ or Playwright is missing, or the agent cannot run commands. The skill falls back to a careful code reading. |
| The page behind a login looks empty | `node <skill-dir>/scripts/login.mjs <url>`, log in in the window, press Enter, then add `--storage-state state.json` to the commands. |
| `state.json` warning: readable by other users | `chmod 600 state.json`. `login.mjs` already does this; the warning means the file came from elsewhere. |
| A cookie banner hides the page | The scripts close explicit "close / decline" buttons. Use `--no-dismiss` to turn that off, or `--wait-for "<css>"` to wait for the real content. |
| The screenshot is blank or half loaded | Add `--wait-for "<css>"` for something that only exists once the page is ready; for animations that start hidden, check the no-JS rule `hidden-until-animated`. |
| Fonts differ from the live site | Offline or blocked font hosts fall back to system fonts; check the network, or run `site-fonts.mjs <url> <dir>` to reuse the site's fonts. |
| The audit flags a pill, caps label or accent word you chose on purpose | These are brand choices: `--allow ai-hero-pill,ai-accent-word,ai-caps-label`. |
| `verify.mjs check` says FAIL but the change was intended | The report names each thing that worked before and now differs (`control-missing`, `scenario-regressed`…). List intended removals under *Product decisions to confirm*; take a new snapshot once accepted. |
| `verify.mjs check` says "No snapshot" | Run `verify.mjs snapshot <page> --dir <dir>` **before** the change, with the same `--dir` for `check`. |
| `brand-guard.mjs` says "needs a git project" | `git init`, commit, then `safeguard.mjs backup` before changing anything. |
| A restore left files behind | `restore` puts files back and lists files created since; `--clean` deletes them. A new backup is taken first, so the restore itself can be undone. |
| `perf.mjs` numbers change between runs | They are lab measurements; run twice and compare before/after on the same machine. Use `--profile fast` to remove network throttling. |
| The no-JS check fails on a single-page app | The page needs JavaScript to show content. `--fast` skips the check; for SEO, server-render the main content. |
| Tests fail on `pdf.mjs catches faux bold…` | Known: it needs fonts that some machines lack; unrelated to your changes. |

Still stuck? Open an issue with the command, the output and your Node version.
