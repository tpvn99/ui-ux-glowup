import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, symlinkSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const skills = new URL("../skills", import.meta.url).pathname;

test("scripts run when the skill is installed through a symbolic link (npx skills add)", { skip: process.platform === "win32" }, () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-link-"));
  symlinkSync(skills, join(d, "skills"));
  const out = execFileSync("node", [join(d, "skills/ui-ux-glowup/scripts/stack.mjs"), realpathSync(d)], { encoding: "utf8" });
  assert.match(out, /Stack:|nothing detected/);
  const usage = (() => { try { execFileSync("node", [join(d, "skills/ui-ux-glowup/scripts/smoke.mjs")], { encoding: "utf8", stdio: "pipe" }); return ""; } catch (e) { return String(e.stderr); } })();
  assert.match(usage, /Usage: node smoke\.mjs/);
});
