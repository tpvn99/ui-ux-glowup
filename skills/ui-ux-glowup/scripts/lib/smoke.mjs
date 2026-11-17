// Functional smoke test: what every control does, so a redesign can be checked for regressions.
// collectControls runs in the page (self-contained); everything else is pure and unit-tested.

const UNSAFE = /(delete|remove|supprimer|retirer|logout|log out|sign out|d[ée]connexion|d[ée]connecter|pay|payer|buy|acheter|order|commander|confirm purchase|unsubscribe|d[ée]sabonner)/i;

export function collectControls() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const text = (el) => (el.getAttribute("aria-label") || el.textContent || el.value || el.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const sel = 'a[href], button, summary, [role="button"], [role="tab"], [role="menuitem"], input[type="button"], input[type="submit"]';
  const controls = [];
  const seen = new Map();
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue;
    const tag = el.tagName.toLowerCase();
    const href = tag === "a" ? el.getAttribute("href") : null;
    const label = text(el) || el.id || el.getAttribute("name") || "";
    let key = [tag, el.getAttribute("role") || "", label.toLowerCase(), href || ""].join("|");
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    if (n > 1) key += "#" + n;
    const inForm = !!el.closest("form");
    const isSubmit = (tag === "button" && (el.type || "submit") === "submit" && inForm) || (tag === "input" && el.type === "submit");
    const external = tag === "a" && el.origin && el.origin !== location.origin;
    const anchor = tag === "a" && /^#/.test(href || "");
    controls.push({
      key, tag, label, href, role: el.getAttribute("role") || "",
      disabled: el.disabled === true || el.getAttribute("aria-disabled") === "true",
      isSubmit, external, anchor,
    });
  }
  const forms = [...document.forms].filter(visible).map((f, i) => ({
    key: f.id || f.getAttribute("name") || f.getAttribute("aria-label") || "form" + (i + 1),
    fields: [...f.elements].filter((e) => e.name && !["hidden", "submit", "button"].includes(e.type)).map((e) => ({
      name: e.name,
      type: e.type || e.tagName.toLowerCase(),
      required: e.required,
      labelled: !!(e.labels && e.labels.length) || !!e.getAttribute("aria-label") || !!e.getAttribute("aria-labelledby"),
    })),
    blocksEmptySubmit: f.checkValidity() === false,
  }));
  return { url: location.href, controls, forms };
}

export function unsafeLabel(label) {
  return UNSAFE.test(label || "");
}

/** What a click changed, from before/after page states measured by the runner. */
export function classifyEffect(b, a) {
  if (a.url !== b.url) return a.url.split("#")[0] === b.url.split("#")[0] && a.url.includes("#") ? "scrolls" : "navigates";
  if (a.expanded !== b.expanded || a.dialogs !== b.dialogs || a.selected !== b.selected) return "toggles";
  if (a.html !== b.html || a.text !== b.text) return "changes-ui";
  return "none";
}

/** Findings for one snapshot on its own. */
export function smokeFindings(snap) {
  const out = [];
  for (const c of snap.results) {
    if (c.effect === "none" && !c.skipped && !c.disabled && c.tag !== "input") {
      out.push({ rule: "dead-control", severity: "warning", key: c.key, message: `"${c.label || c.key}" does nothing when clicked` });
    }
    if (c.href === "#" || /^javascript:/i.test(c.href || "")) {
      out.push({ rule: "empty-link", severity: "warning", key: c.key, message: `Link "${c.label}" points nowhere (${c.href})` });
    }
  }
  for (const f of snap.forms) {
    for (const fld of f.fields) {
      if (!fld.labelled) out.push({ rule: "field-unlabelled", severity: "error", key: f.key + "." + fld.name, message: `Field "${fld.name}" in ${f.key} has no label` });
    }
  }
  for (const e of snap.errors) out.push({ rule: "js-error", severity: "error", key: e, message: `JavaScript error: ${e}` });
  for (const e of snap.failedRequests) out.push({ rule: "request-failed", severity: "warning", key: e, message: `Request failed: ${e}` });
  return out;
}

/** Regressions: what worked before and no longer does. */
export function diffSmoke(before, after) {
  const out = [];
  const post = new Map(after.results.map((c) => [c.key, c]));
  for (const c of before.results) {
    if (c.skipped || c.disabled) continue;
    const now = post.get(c.key);
    if (!now) out.push({ rule: "control-missing", severity: "error", key: c.key, message: `"${c.label || c.key}" (${c.tag}) existed before and is gone` });
    else if (c.effect !== "none" && !now.skipped && now.effect === "none") out.push({ rule: "control-broken", severity: "error", key: c.key, message: `"${c.label}" used to ${c.effect} and now does nothing` });
    else if (c.effect !== "none" && now.effect !== c.effect && !now.skipped) out.push({ rule: "control-changed", severity: "warning", key: c.key, message: `"${c.label}" went from ${c.effect} to ${now.effect}` });
    else if (c.href && now.href && c.href !== now.href) out.push({ rule: "link-changed", severity: "warning", key: c.key, message: `"${c.label}" link ${c.href} → ${now.href}` });
  }
  const pf = new Map(after.forms.map((f) => [f.key, f]));
  for (const f of before.forms) {
    const now = pf.get(f.key);
    if (!now) { out.push({ rule: "form-missing", severity: "error", key: f.key, message: `Form "${f.key}" is gone` }); continue; }
    const fields = new Map(now.fields.map((x) => [x.name, x]));
    for (const fld of f.fields) {
      const n = fields.get(fld.name);
      if (!n) out.push({ rule: "field-missing", severity: "error", key: f.key + "." + fld.name, message: `Field "${fld.name}" removed from ${f.key}` });
      else if (fld.required && !n.required) out.push({ rule: "validation-lost", severity: "error", key: f.key + "." + fld.name, message: `Field "${fld.name}" is no longer required` });
      else if (fld.type !== n.type) out.push({ rule: "field-type-changed", severity: "warning", key: f.key + "." + fld.name, message: `Field "${fld.name}" ${fld.type} → ${n.type}` });
    }
    if (f.blocksEmptySubmit && !now.blocksEmptySubmit) out.push({ rule: "validation-lost", severity: "error", key: f.key, message: `${f.key} now accepts an empty submission` });
  }
  const had = new Set(before.errors);
  for (const e of after.errors) if (!had.has(e)) out.push({ rule: "new-js-error", severity: "error", key: e, message: `New JavaScript error: ${e}` });
  return out;
}

export function formatSmoke(snap, findings, diff) {
  const ran = snap.results.filter((c) => !c.skipped).length;
  const skipped = snap.results.length - ran;
  const lines = [`Smoke test: ${snap.results.length} controls (${ran} clicked, ${skipped} skipped as unsafe/external/submit) · ${snap.forms.length} forms · ${snap.errors.length} JS errors`];
  const all = [...(diff ? [["REGRESSIONS", diff]] : []), ["ISSUES", findings]];
  for (const [title, list] of all) {
    if (!list.length) { lines.push(`${title}: none`); continue; }
    lines.push(`${title}: ${list.length}`);
    for (const f of list.slice(0, 15)) lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`);
    if (list.length > 15) lines.push(`  … ${list.length - 15} more (--json for all)`);
  }
  return lines.join("\n");
}
