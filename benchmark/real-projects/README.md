# Real projects

The ten benchmark projects are prepared pages. This folder is for **real open-source projects built with their own bundlers**, audited with the same scripts.

**Status: nothing has been run yet.** `RESULTS.md` does not exist until someone runs the script; this repository never publishes numbers it did not measure.

```bash
node benchmark/real-projects/run.mjs --list     # shows what would run; runs nothing
node benchmark/real-projects/run.mjs            # clone, install, build, serve, audit each project
node benchmark/real-projects/run.mjs --only nextjs-blog
```

## Read this before running

The script clones third-party repositories and **runs their install and build commands**: that is arbitrary code execution. Use a throwaway directory or a container, never a machine with secrets. Installs use `--ignore-scripts`; builds still run the project's code. The commands for each project are in `projects.json` so you can read them first.

## What it measures, and what it does not

| Measured | Not measured |
|---|---|
| Whether the project installs, builds, serves and is auditable | Bugs introduced by applying the skill: the run is a read-only audit, no change is applied |
| Verdict and score of `verify.mjs report` and `audit.mjs` | Whether each finding is right: they are unreviewed until a person reads the report |
| Time of the audit, commit of each project | Behaviour behind a login or an API that is not running |

Apply changes and compare before and after only on a copy of the project, with its own tests, and write down every regression found. That is the work behind the "real projects" lines of the [ROADMAP](../../ROADMAP.md).
