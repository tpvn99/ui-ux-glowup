import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, statSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describeSession, protectSession, formatSession, warnIfOpen, clearSession } from "../skills/ui-ux-glowup/scripts/lib/session.mjs";

const SECRET = "tok_live_abcdef123456";
const state = (d, name = "state.json") => {
  const f = join(d, name);
  writeFileSync(f, JSON.stringify({ cookies: [{ name: "sid", value: SECRET, domain: ".app.test", expires: Math.floor(Date.now() / 1000) + 5 * 86400 }, { name: "x", value: "y", domain: "app.test", expires: -1 }], origins: [{ origin: "https://app.test", localStorage: [{ name: "jwt", value: SECRET }] }] }));
  return f;
};
const repo = () => { const d = mkdtempSync(join(tmpdir(), "glowup-sess-")); execFileSync("git", ["init", "-q"], { cwd: d }); return d; };

test("describeSession counts and dates the session without exposing any value", () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-sess-"));
  const info = describeSession(state(d));
  assert.equal(info.cookies, 2); assert.deepEqual(info.domains, ["app.test"]); assert.equal(info.nearestExpiryDays, 5);
  assert.ok(!JSON.stringify(info).includes(SECRET));
});

test("protectSession locks the file and adds it to .gitignore in a repo, once", { skip: process.platform === "win32" }, () => {
  const d = repo();
  const f = state(d);
  chmodSync(f, 0o644);
  const p = protectSession(f);
  assert.equal(p.mode, "600"); assert.equal(statSync(f).mode & 0o077, 0);
  assert.equal(p.inRepo, true); assert.equal(p.ignored, true); assert.equal(p.added, "state.json");
  assert.match(readFileSync(join(d, ".gitignore"), "utf8"), /\/state\.json/);
  assert.equal(protectSession(f).added, null);
  const text = formatSession(p);
  assert.ok(!text.includes(SECRET));
  assert.match(text, /Added \/state\.json to \.gitignore/);
});

test("an already ignored session file is not added twice; outside git there is a warning", () => {
  const d = repo();
  writeFileSync(join(d, ".gitignore"), "*.state.json\n");
  assert.equal(protectSession(state(d, "my.state.json")).added, null);
  const plain = mkdtempSync(join(tmpdir(), "glowup-nogit-"));
  const p = protectSession(state(plain));
  assert.equal(p.inRepo, false);
  assert.match(formatSession(p), /Not in a git repository/);
});

test("warnIfOpen flags a world-readable session file once, clearSession deletes it", { skip: process.platform === "win32" }, () => {
  const d = mkdtempSync(join(tmpdir(), "glowup-sess-"));
  const f = state(d); chmodSync(f, 0o644);
  const orig = console.error; let seen = ""; console.error = (m) => { seen += m; };
  try { assert.match(warnIfOpen(f), /chmod 600/); assert.equal(warnIfOpen(f), null); } finally { console.error = orig; }
  assert.ok(!seen.includes(SECRET));
  assert.equal(clearSession(f), true); assert.equal(existsSync(f), false); assert.equal(clearSession(f), false);
});
