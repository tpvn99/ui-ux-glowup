// v1.14 reliability: every script, secrets never copied or printed, interrupted work is recoverable.
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, chmodSync, statSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { redactUrl, redactSecrets, redactDeep, saveJson } from "../skills/ui-ux-glowup/scripts/lib/redact.mjs";
import { compareVersions, checkNode, checkSkillVersion, formatDoctor } from "../skills/ui-ux-glowup/scripts/lib/doctor.mjs";
import { backup, restore, list, stagedCheck, hook, check } from "../skills/ui-ux-glowup/scripts/safeguard.mjs";

const scripts = fileURLToPath(new URL("../skills/ui-ux-glowup/scripts/", import.meta.url));
const g = (d, ...a) => execFileSync("git", a, { cwd: d, encoding: "utf8" }).trim();
const repo = () => { const d = mkdtempSync(join(tmpdir(), "glowup-rel-")); g(d, "init", "-q"); g(d, "config", "user.email", "t@t.t"); g(d, "config", "user.name", "t"); writeFileSync(join(d, "a.css"), "a{color:red}\n"); g(d, "add", "."); g(d, "commit", "-qm", "init"); return d; };
const KEY = "sk-" + "Zy9Xw8Vu7Ts6Rq5Po4Nm3Lk2";

test("every script prints its usage and exits cleanly when called without arguments", () => {
  const names = readdirSync(scripts).filter((f) => f.endsWith(".mjs") && !["build-browser-audit.mjs", "brand-guard.mjs", "doctor.mjs", "stack.mjs"].includes(f));
  assert.ok(names.length >= 20);
  for (const f of names) {
    const r = spawnSync("node", [join(scripts, f)], { encoding: "utf8", timeout: 20000, input: "" });
    assert.equal(r.status, 1, `${f} should exit 1 without arguments (got ${r.status}: ${r.stderr.slice(0, 120)})`);
    assert.match(r.stderr + r.stdout, /Usage:/, `${f} should print Usage`);
    assert.doesNotMatch(r.stderr, /(TypeError|ReferenceError|SyntaxError|at .*\.mjs:\d+)/, `${f} crashed`);
  }
});

test("redactUrl masks tokens, credentials and opaque values, keeps harmless parameters", () => {
  assert.equal(redactUrl("/reset?token=abc123&lang=en"), "/reset?token=REDACTED&lang=en");
  assert.equal(redactUrl("https://u:pw@example.com/x?page=2"), "https://REDACTED@example.com/x?page=2");
  assert.match(redactUrl("/cb?state=" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7"), /state=REDACTED/);
  assert.equal(redactUrl("/search?q=shoes&sort=price"), "/search?q=shoes&sort=price");
  assert.equal(redactUrl("#access_token=eyJabc.def.ghi"), "#access_token=REDACTED");
});

test("redactSecrets and redactDeep remove keys everywhere, saveJson writes none", () => {
  assert.ok(!redactSecrets(`key is ${KEY}`).includes(KEY));
  assert.match(redactSecrets('apiKey = "hunter2hunter2hunter2"'), /REDACTED/);
  assert.equal(redactSecrets("api key: process.env.KEY"), "api key: process.env.KEY");
  const deep = redactDeep({ a: [{ href: `/x?apikey=${KEY}` }], b: `see ${KEY}`, n: 3 });
  assert.ok(!JSON.stringify(deep).includes(KEY)); assert.equal(deep.n, 3);
  const f = join(mkdtempSync(join(tmpdir(), "glowup-rd-")), "o.json");
  saveJson(f, { link: `/cb?token=${KEY}`, text: KEY });
  assert.ok(!readFileSync(f, "utf8").includes(KEY));
});

test("doctor: version comparison, Node floor, skill update advice", () => {
  assert.equal(compareVersions("1.13.0", "1.9.0"), 1); assert.equal(compareVersions("v1.2.0", "1.2.0"), 0); assert.equal(compareVersions("1.4.1", "1.5.0"), -1);
  assert.equal(checkNode("v16.20.0").status, "error"); assert.equal(checkNode("v18.20.8").status, "warning"); assert.match(checkNode("v18.20.8").detail, /Playwright requires Node 20/); assert.equal(checkNode("v20.0.0").status, "ok");
  const old = checkSkillVersion("1.12.0", "1.13.0");
  assert.equal(old.status, "warning"); assert.match(old.fix, /npx skills add/);
  assert.equal(checkSkillVersion("1.13.0", "1.13.0").status, "ok");
  assert.match(formatDoctor([checkNode("v16.0.0")]), /✗ Node\.js[\s\S]*→ Install Node 20/);
});

test("backups never contain secrets: git snapshot and copy snapshot", () => {
  const d = repo();
  writeFileSync(join(d, ".env"), `A=${KEY}`); writeFileSync(join(d, "state.json"), "{}"); writeFileSync(join(d, "page.html"), "<p>x</p>");
  const b = backup(d);
  const files = g(d, "ls-tree", "-r", "--name-only", b.ref).split("\n");
  assert.ok(files.includes("page.html") && !files.includes(".env") && !files.includes("state.json"));
  assert.equal(b.skippedSecrets, 2);
  const plain = mkdtempSync(join(tmpdir(), "glowup-cp-"));
  writeFileSync(join(plain, ".env"), `A=${KEY}`); writeFileSync(join(plain, "page.html"), "<p>x</p>");
  const c = backup(plain);
  assert.equal(c.skippedSecrets, 1); assert.ok(!existsSync(join(c.ref, ".env")) && existsSync(join(c.ref, "page.html")));
  if (process.platform !== "win32") assert.equal(statSync(c.ref).mode & 0o077, 0, "backup folder is owner-only");
});

test("an interrupted intervention (edits, deletions, new files) is fully recoverable, twice over", () => {
  const d = repo();
  writeFileSync(join(d, "b.html"), "<p>keep</p>");
  const b = backup(d, "before");
  writeFileSync(join(d, "a.css"), "HALF-WRITTEN"); rmSync(join(d, "b.html")); writeFileSync(join(d, "new.js"), "x");
  const r1 = restore(d, b.id);
  assert.equal(readFileSync(join(d, "a.css"), "utf8"), "a{color:red}\n"); assert.equal(readFileSync(join(d, "b.html"), "utf8"), "<p>keep</p>");
  assert.deepEqual(r1.left, ["new.js"]);
  restore(d, b.id, { clean: true });
  assert.equal(existsSync(join(d, "new.js")), false);
  const n = list(d).length;
  writeFileSync(join(d, "a.css"), "changed again");
  const undo = restore(d, b.id);
  assert.equal(list(d).length, n + 1);
  restore(d, undo.safety);
  assert.equal(readFileSync(join(d, "a.css"), "utf8"), "changed again", "the restore itself can be undone");
});

test("the pre-commit hook blocks secrets and session files, lets clean commits through, and never overwrites a foreign hook", () => {
  const d = repo();
  const script = join(scripts, "safeguard.mjs");
  const r = spawnSync("node", [script, "hook", "install", d], { encoding: "utf8" });
  assert.match(r.stdout, /installed/);
  writeFileSync(join(d, "clean.txt"), "hello"); g(d, "add", "clean.txt");
  assert.doesNotThrow(() => g(d, "commit", "-qm", "clean"));
  writeFileSync(join(d, "app.js"), `const k = "${KEY}";\n`); g(d, "add", "app.js");
  assert.throws(() => execFileSync("git", ["commit", "-qm", "leak"], { cwd: d, stdio: "pipe" }), /./);
  g(d, "reset", "-q", "app.js");
  writeFileSync(join(d, "state.json"), "{}"); g(d, "add", "-f", "state.json");
  assert.equal(stagedCheck(d).findings[0].rule, "sensitive-staged");
  g(d, "reset", "-q", "state.json");
  assert.match(spawnSync("node", [script, "hook", "remove", d], { encoding: "utf8" }).stdout, /removed/);
  const foreign = repo();
  writeFileSync(join(foreign, ".git/hooks/pre-commit"), "#!/bin/sh\necho mine\n");
  assert.equal(hook(foreign, "install").changed, false);
  assert.match(readFileSync(join(foreign, ".git/hooks/pre-commit"), "utf8"), /echo mine/);
});

test("verify check refuses a snapshot from another version, before running anything", () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-snap-"));
  mkdirSync(join(d, "snap")); writeFileSync(join(d, "snap/snapshot.json"), JSON.stringify({ audit: {} }));
  const t0 = Date.now();
  const r = spawnSync("node", [join(scripts, "verify.mjs"), "check", join(d, "page.html"), "--dir", join(d, "snap")], { encoding: "utf8" });
  assert.equal(r.status, 1); assert.match(r.stderr, /another version of verify\.mjs[\s\S]*Take a new one/);
  assert.ok(Date.now() - t0 < 5000, "fails fast");
  const none = spawnSync("node", [join(scripts, "verify.mjs"), "check", join(d, "page.html"), "--dir", join(d, "nope")], { encoding: "utf8" });
  assert.match(none.stderr, /No snapshot/);
});

test(".glowup-safeguard-ignore skips the content scan of named paths, never the sensitive file names", () => {
  const d = repo();
  mkdirSync(join(d, "tests")); writeFileSync(join(d, "tests/fixture.js"), `const k = "${KEY}";\n`); writeFileSync(join(d, "app.js"), `const k = "${KEY}";\n`);
  const rules = () => check(d).findings.filter((f) => f.rule === "secret-in-code").map((f) => f.file.split(":")[0]).sort();
  assert.deepEqual(rules(), ["app.js", "tests/fixture.js"]);
  writeFileSync(join(d, ".glowup-safeguard-ignore"), "# fake keys\ntests/\n");
  assert.deepEqual(rules(), ["app.js"]);
  writeFileSync(join(d, "tests/state.json"), "{}");
  assert.ok(check(d).findings.some((f) => f.rule === "sensitive-not-ignored" && f.file === "tests/state.json"));
  g(d, "add", "-f", "tests/fixture.js", "app.js"); g(d, "add", "-f", "tests/state.json");
  assert.deepEqual(stagedCheck(d).findings.map((f) => f.rule).sort(), ["secret-staged", "sensitive-staged"]);
});
