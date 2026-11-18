// What each role (admin, user, guest…) is shown. This checks the INTERFACE only: hiding a button is not
// authorization. The server must refuse the action too, and that has to be tested on the endpoints.

/** byRole: { name: { controls: [{ key, label, tag }], finalPath, requestedPath, visible: { selector: bool } } } */
export function compareRoles(byRole, { forbid = [], require = [] } = {}) {
  const roles = Object.keys(byRole);
  const findings = [];
  const add = (rule, severity, message, fix) => findings.push({ rule, severity, message, fix });
  for (const { role, selector } of forbid) {
    if (byRole[role]?.visible?.[selector]) add("forbidden-control-visible", "error", `The ${role} role can see ${selector}.`, "Do not render it for this role, and make sure the server refuses the action too: hiding it is not enough.");
  }
  for (const { role, selector } of require) {
    if (byRole[role] && byRole[role].visible?.[selector] === false) add("required-control-missing", "error", `The ${role} role cannot see ${selector}, which it needs.`, "Check the role's permissions and the condition that renders it.");
  }
  for (const r of roles) {
    const d = byRole[r];
    if (d.finalPath && d.requestedPath && d.finalPath !== d.requestedPath) add("role-redirected", "warning", `The ${r} role is redirected from ${d.requestedPath} to ${d.finalPath}.`, "Expected for a role without access; make sure it is the intended page (sign-in or an explanation, not a blank screen).");
  }
  const keys = new Map();
  for (const r of roles) for (const c of byRole[r].controls) { const k = c.key.replace(/#\d+$/, ""); if (!keys.has(k)) keys.set(k, { label: c.label || k, tag: c.tag, roles: new Set() }); keys.get(k).roles.add(r); }
  const differences = [...keys.values()].filter((v) => v.roles.size < roles.length).map((v) => ({ label: v.label, tag: v.tag, seenBy: [...v.roles] }));
  return { roles, differences, findings };
}

export const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/** "user:GET:/api/admin/users:401,403,404" -> { role, method, path, allowed } */
export function parseExpect(text) {
  const last = text.lastIndexOf(":");
  const [role, method, ...p] = text.slice(0, last).split(":");
  const path = p.join(":");
  const allowed = text.slice(last + 1).split(",").map((s) => Number(s.trim())).filter((n) => n >= 100 && n <= 599);
  if (!role || !method || !path.startsWith("/") || !allowed.length) throw new Error(`Cannot read --expect "${text}". Use role:METHOD:/path:status[,status], e.g. user:GET:/api/admin/users:401,403`);
  return { role, method: method.toUpperCase(), path, allowed };
}

export function assertSafe(expects, unsafe) {
  const bad = expects.filter((e) => !SAFE_METHODS.includes(e.method));
  if (bad.length && !unsafe) throw new Error(`${bad.map((b) => `${b.method} ${b.path}`).join(", ")} can change data on the server. Only GET, HEAD and OPTIONS are sent by default; add --unsafe, and only against a test environment with test accounts.`);
}

/** results: [{ role, method, path, status }] against expectations. Server-side authorization, not the interface. */
export function checkEndpoints(results, expects) {
  const out = [];
  for (const e of expects) {
    const r = results.find((x) => x.role === e.role && x.method === e.method && x.path === e.path);
    if (!r) continue;
    if (r.status === 0) out.push({ rule: "endpoint-unreachable", severity: "error", message: `${e.method} ${e.path} as ${e.role}: no response.`, fix: "Check the URL, the server and the network." });
    else if (!e.allowed.includes(r.status)) out.push({ rule: "endpoint-wrong-status", severity: "error", message: `${e.role} got ${r.status} from ${e.method} ${e.path} (expected ${e.allowed.join(" or ")}).`, fix: e.allowed.every((s) => s >= 400) ? "Authorize on the server: refuse the request for this role, whatever the interface shows." : "This role should be allowed: check its permissions and its session." });
  }
  return out;
}

export function formatRoles(res, byRole) {
  const lines = [`Roles compared: ${res.roles.map((r) => `${r} (${byRole[r].controls.length} controls)`).join(" · ")}`];
  if (!res.differences.length) lines.push("  every role sees the same controls");
  else {
    lines.push(`  ${res.differences.length} control(s) differ between roles:`);
    for (const d of res.differences.slice(0, 20)) lines.push(`    ${d.tag} "${d.label}": seen by ${d.seenBy.join(", ")} only`);
  }
  for (const f of res.findings) lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`, `      → ${f.fix}`);
  if (res.endpoints) lines.push(`  ${res.endpoints.length} endpoint check(s) sent (${res.endpoints.map((e) => `${e.role} ${e.method} ${e.path} → ${e.status}`).slice(0, 8).join("; ")})`);
  lines.push(res.endpoints ? "Endpoints were tested with the saved cookies of each role (and any --header-env); only what you listed was checked." : "This shows what each role's interface displays. It does not prove the server refuses forbidden actions: test the endpoints with --expect.");
  return lines.join("\n");
}
