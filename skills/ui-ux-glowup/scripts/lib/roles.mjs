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

export function formatRoles(res, byRole) {
  const lines = [`Roles compared: ${res.roles.map((r) => `${r} (${byRole[r].controls.length} controls)`).join(" · ")}`];
  if (!res.differences.length) lines.push("  every role sees the same controls");
  else {
    lines.push(`  ${res.differences.length} control(s) differ between roles:`);
    for (const d of res.differences.slice(0, 20)) lines.push(`    ${d.tag} "${d.label}": seen by ${d.seenBy.join(", ")} only`);
  }
  for (const f of res.findings) lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`, `      → ${f.fix}`);
  lines.push("This shows what each role's interface displays. It does not prove the server refuses forbidden actions: test the endpoints with each role.");
  return lines.join("\n");
}
