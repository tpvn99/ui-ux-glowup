# Measuring what an agent costs

The scripts call no model, so they cannot tell you what a redesign or an audit costs in tokens or time. That cost belongs to the **agent session**. This protocol measures it in a way that can be repeated.

## Protocol

1. Pick **three tasks** of different sizes, written once and reused as they are:
   - *Quick*: "Fix the slider on mobile in `<file>`."
   - *Standard*: "Improve `<page>`: it looks amateur on mobile. Keep our colors and fonts."
   - *Audit only*: "Audit `<page>` and tell me what to fix first. Don't change any code."
2. For each task, start a **fresh session** with the skill installed, on a clean copy of the project (`git stash` or a new clone), and give the task **verbatim**.
3. Run it **three times** (agents are not deterministic). Do not intervene unless the agent asks a question; answer with the same fixed answers each time.
4. After each run, record from the session's own usage display (in Claude Code, `/cost`, or the usage summary): **input tokens, output tokens, cache reads, number of tool calls, wall-clock minutes**.
5. Check the **outcome**, not only the cost: run `verify.mjs check` against a snapshot taken before the task, and note the verdict, the regressions, and whether the agent stopped at the effort level it announced.

## Record

| Task | Run | Level announced | Input tokens | Output tokens | Tool calls | Minutes | Verdict | Regressions |
|---|---|---|---|---|---|---|---|---|
| Quick | 1 | | | | | | | |
| Quick | 2 | | | | | | | |
| Quick | 3 | | | | | | | |
| Standard | 1–3 | | | | | | | |
| Audit only | 1–3 | | | | | | | |

Report the **median and the range**, never a single run, and say which model and version ran. Compare the same task with and without the skill only if both are run the same number of times.

## What to expect and what not to conclude

The skill is built to spend little: it loads references on demand, re-checks only what changed and stops when the audit is clean. A cheap run that leaves regressions is not a good result, and an expensive run that finds a real problem may be. Cost per task says nothing about quality; read it next to the verdict and the report.
