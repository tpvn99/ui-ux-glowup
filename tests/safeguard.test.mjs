import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isSensitivePath, scanSecrets, newFilesSince } from "../skills/ui-ux-glowup/scripts/lib/safeguard.mjs";
import { backup, list, restore, check } from "../skills/ui-ux-glowup/scripts/safeguard.mjs";

const g = (d, ...a) => execFileSync("git", a, { cwd: d, encoding: "utf8" }).trim();
const repo = () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-sg-"));
  g(d, "init", "-q"); g(d, "config", "user.email", "t@t.t"); g(d, "config", "user.name", "t");
  writeFileSync(join(d, "a.css"), "body{color:red}\n");
  g(d, "add", "."); g(d, "commit", "-qm", "init");
  return d;
};

test("isSensitivePath flags sessions, env files and keys but not examples", () => {
  for (const p of ["state.json", "app/auth.state.json", ".env", ".env.local", "keys/server.pem", "storage-state.json"]) assert.ok(isSensitivePath(p), p);
  for (const p of [".env.example", "src/state.ts", "README.md", "package.json"]) assert.equal(isSensitivePath(p), false, p);
});

test("scanSecrets finds real secrets, skips placeholders, never returns the secret", () => {
  const key = "sk-" + "a1B2c3D4e5F6g7H8i9J0k1L2";
  const r = scanSecrets(`const k = "${key}";\nconst t = "your-api-key-here-123456";\napiKey = process.env.KEY\npassword: "hunter2hunter2hunter2"\n`);
  assert.deepEqual(r.map((x) => x.line), [1, 4]);
  assert.ok(!JSON.stringify(r).includes(key));
  assert.deepEqual(scanSecrets("-----BEGIN RSA " + "PRIVATE KEY-----").length, 1);
});

test("newFilesSince lists what a restore would leave behind", () => assert.deepEqual(newFilesSince(["a"], ["a", "b"]), ["b"]));

test("git backup captures untracked files without touching the project, and restore rolls back", () => {
  const d = repo();
  writeFileSync(join(d, "new.html"), "<p>v1</p>");
  const statusBefore = g(d, "status", "--porcelain");
  const b = backup(d, "test");
  assert.equal(g(d, "status", "--porcelain"), statusBefore);
  assert.equal(g(d, "stash", "list"), "");
  assert.equal(list(d).length, 1);
  assert.match(g(d, "ls-tree", "-r", "--name-only", b.ref), /new\.html/);

  writeFileSync(join(d, "a.css"), "body{color:blue}\n");
  writeFileSync(join(d, "new.html"), "<p>BROKEN</p>");
  writeFileSync(join(d, "extra.js"), "x");
  const r = restore(d, "latest");
  assert.equal(readFileSync(join(d, "a.css"), "utf8").replace(/\r\n/g, "\n"), "body{color:red}\n"); // Git on Windows restores CRLF
  assert.equal(readFileSync(join(d, "new.html"), "utf8"), "<p>v1</p>");
  assert.deepEqual(r.left, ["extra.js"]);
  assert.ok(existsSync(join(d, "extra.js")));
  assert.equal(list(d).length, 3 - 1);
  restore(d, b.id, { clean: true });
  assert.equal(existsSync(join(d, "extra.js")), false);
});

test("backup works without git and restore brings files back", () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-nogit-"));
  mkdirSync(join(d, "node_modules")); writeFileSync(join(d, "node_modules", "x.js"), "x");
  writeFileSync(join(d, "index.html"), "ok");
  const b = backup(d);
  assert.equal(b.kind, "copy");
  assert.equal(existsSync(join(d, ".glowup-backup", b.id, "node_modules")), false);
  writeFileSync(join(d, "index.html"), "broken");
  restore(d, b.id);
  assert.equal(readFileSync(join(d, "index.html"), "utf8"), "ok");
});

test("check reports committed session files, unignored env files and secrets in source", () => {
  const d = repo();
  writeFileSync(join(d, "state.json"), "{}");
  g(d, "add", "state.json"); g(d, "commit", "-qm", "oops");
  writeFileSync(join(d, ".env"), "A=1");
  writeFileSync(join(d, "app.js"), 'const k = "sk-' + 'Zy9Xw8Vu7Ts6Rq5Po4Nm3Lk2";\n');
  const rules = check(d).findings.map((f) => f.rule).sort();
  assert.deepEqual(rules, ["gitignore-gaps", "secret-in-code", "sensitive-not-ignored", "sensitive-tracked"]);
  const clean = check(repo()).findings.map((f) => f.rule);
  assert.deepEqual(clean, ["gitignore-gaps"]);
});
