// UX audit: can people find the main action, fill the forms, understand the states, move around?
// collectUx runs in the page (self-contained); uxFindings is pure and unit-tested.

export function collectUx() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    const c = [...el.classList].slice(0, 2).join(".");
    return c ? s + "." + c : s;
  };
  const txt = (el) => (el.getAttribute("aria-label") || el.textContent || el.value || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const alpha = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(/[ ,/]+/).filter(Boolean);
    return p.length > 3 ? Number(p[3]) : 1;
  };
  const filled = [];
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input[type="submit"]')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top >= innerHeight || r.height < 30) continue;
    if (alpha(getComputedStyle(el).backgroundColor) >= 0.9) filled.push({ sel: sel(el), label: txt(el) });
  }
  const fields = [];
  const forms = [];
  for (const f of document.forms) {
    if (!vis(f)) continue;
    const els = [...f.elements].filter((e) => vis(e) && e.name !== undefined && !["hidden", "submit", "button", "reset", "image"].includes(e.type));
    forms.push({
      sel: sel(f), fields: els.length, novalidate: f.noValidate,
      hasRequired: els.some((e) => e.required),
      announces: !!f.querySelector('[role="alert"], [aria-live], [aria-describedby]'),
    });
  }
  for (const e of document.querySelectorAll("input, textarea, select")) {
    if (!vis(e) || ["hidden", "submit", "button", "reset", "image", "checkbox", "radio"].includes(e.type)) continue;
    fields.push({
      sel: sel(e), type: e.type || e.tagName.toLowerCase(),
      id: [e.name, e.id, e.getAttribute("placeholder") || ""].join(" ").toLowerCase(),
      placeholder: !!e.getAttribute("placeholder"),
      labelled: !!(e.labels && e.labels.length) || !!e.getAttribute("aria-label") || !!e.getAttribute("aria-labelledby") || !!e.getAttribute("title"),
      autocomplete: e.getAttribute("autocomplete"),
    });
  }
  const emptyLists = [];
  for (const t of document.querySelectorAll("table")) {
    if (!vis(t)) continue;
    const rows = t.querySelectorAll("tbody tr").length;
    if (t.querySelector("thead") && rows === 0) emptyLists.push({ sel: sel(t), kind: "table" });
  }
  for (const l of document.querySelectorAll("ul, ol")) {
    if (vis(l) && !l.querySelector("li") && !l.closest("nav") && !(l.textContent || "").trim()) emptyLists.push({ sel: sel(l), kind: "list" });
  }
  const navs = [];
  const path = location.pathname;
  for (const n of document.querySelectorAll("nav, [role='navigation']")) {
    if (!vis(n)) continue;
    const links = [...n.querySelectorAll("a[href]")].filter(vis);
    if (!links.length) continue;
    const top = links.filter((a) => !a.closest("ul ul, li li, [role='menu']"));
    navs.push({
      sel: sel(n), links: top.length,
      anchorsOnly: links.every((a) => (a.getAttribute("href") || "").startsWith("#")),
      hasCurrent: links.some((a) => a.getAttribute("aria-current") || /\b(active|current|selected)\b/i.test(a.className) || (a.pathname === path && path !== "/" && a.origin === location.origin)),
      inHeader: !!n.closest("header"),
    });
  }
  const homeLink = [...document.querySelectorAll("a[href]")].some((a) => a.origin === location.origin && (a.pathname === "/" || a.pathname === "/index.html"));
  return {
    url: location.href, web: /^https?:$/.test(location.protocol), isHome: path === "/" || /index\.html$/.test(path),
    filled, fields, forms, emptyLists, navs, homeLink,
  };
}

const TYPE_HINTS = [
  [/e-?mail|courriel/, "email", "email"],
  [/\b(phone|tel|mobile|t[ée]l[ée]phone)\b/, "tel", "tel"],
];
const AUTOCOMPLETE_HINTS = [
  [/e-?mail|courriel/, "email"],
  [/\b(phone|tel|mobile|t[ée]l[ée]phone)\b/, "tel"],
  [/first.?name|pr[ée]nom|given/, "given-name"],
  [/last.?name|family|\bnom\b/, "family-name"],
  [/zip|postal|code.?postal/, "postal-code"],
  [/\bcity\b|ville/, "address-level2"],
  [/street|address|adresse/, "street-address"],
];

export function uxFindings(d) {
  const out = [];
  const add = (rule, severity, message, fix, items = []) => out.push({ rule, severity, message, fix, items: items.slice(0, 4) });

  if (d.filled.length === 0) {
    add("no-primary-action", "warning", "No filled button or link above the fold: nothing says what to do first.", "Give the one main action a filled button in the first screen, with a verb + result label.");
  } else if (new Set(d.filled.map((f) => f.label.toLowerCase())).size >= 4) {
    add("competing-primary-actions", "warning", `${d.filled.length} filled actions above the fold compete for attention.`, "Keep one filled primary; make the others outline or text links.", d.filled.map((f) => `${f.sel} "${f.label}"`));
  }

  const bare = d.fields.filter((f) => !f.labelled && f.placeholder);
  if (bare.length) add("placeholder-as-label", "error", `${bare.length} field(s) use the placeholder as the only label; it disappears while typing.`, "Add a visible <label for> above each field; keep the placeholder for an example only.", bare.map((f) => f.sel));

  const noAc = d.fields.filter((f) => f.autocomplete === null && f.type !== "search" && AUTOCOMPLETE_HINTS.some(([re]) => re.test(f.id)));
  const pwd = d.fields.filter((f) => f.type === "password" && f.autocomplete === null);
  if (noAc.length + pwd.length) add("missing-autocomplete", "warning", `${noAc.length + pwd.length} personal-data field(s) have no autocomplete attribute; browsers can't fill them.`, 'Add autocomplete (email, tel, given-name, postal-code, current-password / new-password).', [...noAc, ...pwd].map((f) => f.sel));

  const wrong = d.fields.filter((f) => f.type === "text" && TYPE_HINTS.some(([re, t]) => re.test(f.id) && t));
  if (wrong.length) add("wrong-input-type", "warning", `${wrong.length} email/phone field(s) are type="text": no suitable mobile keyboard, no built-in validation.`, 'Use type="email" or type="tel" (and inputmode where needed).', wrong.map((f) => f.sel));

  for (const f of d.forms) {
    if (f.fields > 7) add("long-form", "warning", `${f.sel} asks for ${f.fields} fields at once.`, "Ask only what is needed now; split into steps or make optional fields optional and last.", [f.sel]);
    if (f.novalidate && f.hasRequired && !f.announces) add("errors-unsupported", "warning", `${f.sel} disables browser validation and has no alert region: errors may never be shown or announced.`, 'Show each error next to its field with role="alert" or aria-describedby, in plain words saying how to fix it.', [f.sel]);
  }

  if (d.emptyLists.length) add("empty-state-missing", "warning", `${d.emptyLists.length} table/list is empty with no message: users can't tell loading from "nothing here".`, "Add an empty state: what this is, why it's empty, and the action that fills it (microcopy.md).", d.emptyLists.map((e) => `${e.kind} ${e.sel}`));

  const real = d.navs.filter((n) => !n.anchorsOnly && n.links >= 3);
  const flat = real.filter((n) => !n.hasCurrent);
  if (flat.length) add("nav-no-current", "warning", "Navigation doesn't show which page you're on.", 'Mark the current link with aria-current="page" and a visible style.', flat.map((n) => n.sel));
  const wide = d.navs.filter((n) => n.inHeader && n.links > 8);
  if (wide.length) add("nav-too-many", "warning", `Main navigation has ${wide[0].links} top-level links.`, "Group into 5–7 entries; move the rest to the footer or a submenu.", wide.map((n) => n.sel));

  if (d.web && !d.isHome && !d.homeLink) add("no-home-link", "warning", "No link back to the home page (logo or menu).", "Make the logo a link to /.");
  return out;
}

export function formatUx(findings, viewport) {
  if (!findings.length) return `UX audit (${viewport}): no issue found by these checks.`;
  const lines = [`UX audit (${viewport}): ${findings.length} issue(s)`];
  for (const f of findings) {
    lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`);
    if (f.items.length) lines.push(`      ${f.items.join(" · ")}`);
    lines.push(`      → ${f.fix}`);
  }
  return lines.join("\n");
}
