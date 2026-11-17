#!/usr/bin/env node
// Before / after images for the ten benchmark projects (phone width), written to docs/gallery/.
// "Before" is the clean page with its seeded defects, "after" the clean page: the point is to SEE what the
// defects do to a page and what the checks were looking for, not to show a redesign.
//
// Usage:  node benchmark/gallery.mjs [--only id,id]

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { buildPages } from "./run.mjs";
import { PROJECTS } from "./projects.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
const out = join(root, "docs", "gallery");
mkdirSync(out, { recursive: true });
for (const p of PROJECTS.filter((x) => !only || only.includes(x.id))) {
  const dir = mkdtempSync(join(tmpdir(), `glowup-gal-${p.id}-`));
  const { before, base } = buildPages(p);
  writeFileSync(join(dir, "before.html"), before); writeFileSync(join(dir, "after.html"), base);
  execFileSync("node", [join(root, "skills/ui-ux-glowup/scripts/compare.mjs"), join(dir, "before.html"), join(dir, "after.html"), join(out, `${p.id}.png`), "--mobile"], { stdio: "inherit" });
}
console.log(`Gallery images in ${out}`);
