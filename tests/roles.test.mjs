import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compareRoles, formatRoles } from "../skills/ui-ux-glowup/scripts/lib/roles.mjs";
import { roles } from "../skills/ui-ux-glowup/scripts/roles.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";

const page = (leaky) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Accounts</title></head><body><h1>Accounts</h1><button id="export" onclick="void 0">Export</button>
<script>var r=localStorage.getItem("role");if(!r){location.replace("/login.html")}${leaky ? "" : 'if(r==="admin")'}{document.body.insertAdjacentHTML("beforeend",'<button id="delete" onclick="void 0">Delete account</button>')}</script></body></html>`;
const server = createServer((req, res) => { res.setHeader("content-type", "text/html"); res.end(req.url.startsWith("/login") ? '<!doctype html><html lang="en"><title>Sign in</title><h1>Sign in</h1><button>Sign in</button></html>' : page(req.url.startsWith("/leaky"))); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());
const dir = mkdtempSync(join(tmpdir(), "glowup-roles-"));
const state = (role) => { const f = join(dir, `${role}.json`); writeFileSync(f, JSON.stringify({ cookies: [], origins: [{ origin: base, localStorage: [{ name: "role", value: role }] }] }), { mode: 0o600 }); return f; };

test("compareRoles: differences, forbidden and required controls, redirects", () => {
  const c = (key, label) => ({ key, label, tag: "button" });
  const by = {
    admin: { controls: [c("button||export", "Export"), c("button||delete", "Delete")], finalPath: "/a", requestedPath: "/a", visible: { "#delete": true } },
    user: { controls: [c("button||export", "Export"), c("button||delete", "Delete")], finalPath: "/a", requestedPath: "/a", visible: { "#delete": true, "#export": false } },
    guest: { controls: [c("button||signin", "Sign in")], finalPath: "/login", requestedPath: "/a", visible: {} },
  };
  const r = compareRoles(by, { forbid: [{ role: "user", selector: "#delete" }], require: [{ role: "user", selector: "#export" }] });
  assert.deepEqual(r.findings.map((f) => f.rule).sort(), ["forbidden-control-visible", "required-control-missing", "role-redirected"]);
  assert.equal(r.differences.length, 3);
  assert.match(formatRoles(r, by), /does not prove the server refuses/);
});

test("real roles: admin sees Delete, user and guest do not, guest is redirected; a leaky page is caught", { skip }, async () => {
  const states = { admin: state("admin"), user: state("user"), guest: "none" };
  const ok = await roles(`${base}/accounts.html`, states, { forbid: [{ role: "user", selector: "#delete" }, { role: "admin", selector: "#nothing" }], require: [{ role: "admin", selector: "#delete" }] });
  assert.deepEqual(ok.findings.map((f) => f.rule), ["role-redirected"]);
  assert.ok(ok.differences.some((d) => /Delete/.test(d.label) && d.seenBy.join() === "admin"));
  const leak = await roles(`${base}/leaky.html`, states, { forbid: [{ role: "user", selector: "#delete" }] });
  assert.ok(leak.findings.some((f) => f.rule === "forbidden-control-visible" && /user/.test(f.message)), JSON.stringify(leak.findings));
  if (process.platform !== "win32") assert.equal(statSync(states.admin).mode & 0o077, 0);
});

test("--expect: the server's answer per role; unsafe methods need --unsafe; header secrets come from the environment", async () => {
  const { parseExpect, assertSafe, checkEndpoints } = await import("../skills/ui-ux-glowup/scripts/lib/roles.mjs");
  assert.deepEqual(parseExpect("user:GET:/api/a:b:401,403"), { role: "user", method: "GET", path: "/api/a:b", allowed: [401, 403] });
  assert.throws(() => parseExpect("user:GET:api:403"), /Cannot read --expect/); assert.throws(() => parseExpect("user:GET:/x:teapot"), /Cannot read/);
  assert.doesNotThrow(() => assertSafe([parseExpect("u:GET:/x:200")], false));
  assert.throws(() => assertSafe([parseExpect("u:DELETE:/x:403")], false), /can change data on the server/);
  assert.doesNotThrow(() => assertSafe([parseExpect("u:DELETE:/x:403")], true));
  const f = checkEndpoints([{ role: "user", method: "GET", path: "/x", status: 200 }, { role: "admin", method: "GET", path: "/x", status: 403 }, { role: "guest", method: "GET", path: "/x", status: 0 }], [parseExpect("user:GET:/x:401,403"), parseExpect("admin:GET:/x:200"), parseExpect("guest:GET:/x:401")]);
  assert.deepEqual(f.map((x) => x.rule), ["endpoint-wrong-status", "endpoint-wrong-status", "endpoint-unreachable"]);
  assert.match(f[0].fix, /Authorize on the server/); assert.match(f[1].fix, /should be allowed/);
});

test("real server: admin allowed, user and guest refused; a leaky endpoint is caught; the token never appears", { skip }, async () => {
  const { createServer } = await import("node:http");
  const srv = createServer((req, res) => {
    const role = (/role=(\w+)/.exec(req.headers.cookie || "") || [])[1] || (req.headers.authorization === "Bearer secret-token-123" ? "admin" : "");
    if (req.url.startsWith("/api/leaky")) { res.statusCode = 200; return res.end("ok"); }
    res.statusCode = role === "admin" ? 200 : role ? 403 : 401; res.end("x");
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${srv.address().port}`;
  const cookieState = (role) => { const f = join(dir, `c-${role}.json`); writeFileSync(f, JSON.stringify({ cookies: [{ name: "role", value: role, domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }), { mode: 0o600 }); return f; };
  try {
    const { parseExpect } = await import("../skills/ui-ux-glowup/scripts/lib/roles.mjs");
    const states = { admin: cookieState("admin"), user: cookieState("user"), guest: "none" };
    const expect = ["admin:GET:/api/users:200", "user:GET:/api/users:401,403", "guest:GET:/api/users:401", "user:GET:/api/leaky:401,403"].map(parseExpect);
    process.env.GL_TEST_TOKEN = "Bearer secret-token-123";
    const r = await roles(`${origin}/accounts.html`, states, { expect, headerEnv: { guest: [["Authorization", "GL_TEST_TOKEN"]] } });
    const bad = r.findings.filter((f) => f.rule === "endpoint-wrong-status");
    assert.equal(bad.length, 2, JSON.stringify(r.findings));
    assert.match(bad.map((b) => b.message).join(), /user got 200 from GET \/api\/leaky/); assert.match(bad.map((b) => b.message).join(), /guest got 200 from GET \/api\/users/);
    assert.ok(!JSON.stringify(r).includes("secret-token-123"));
  } finally { srv.close(); delete process.env.GL_TEST_TOKEN; }
});
