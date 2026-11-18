// WCAG 2.2 AA behaviour checks the static audit can't make: keyboard traversal, focus not obscured,
// ARIA validity, skip links, reflow at 320px, accessible authentication. collectA11y and describeFocus
// run in the page (self-contained); a11yFindings is pure and unit-tested.

export function collectA11y() {
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
  const ROLES = new Set("alert alertdialog application article banner button cell checkbox columnheader combobox complementary contentinfo definition dialog directory document feed figure form grid gridcell group heading img link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status switch tab table tablist tabpanel term textbox timer toolbar tooltip tree treegrid treeitem generic paragraph blockquote caption code deletion emphasis insertion strong subscript superscript time".split(" "));
  const FOCUSABLE = "a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]";
  const nativelyFocusable = /^(a|button|input|select|textarea|summary)$/;

  const invalidRoles = [];
  for (const el of document.querySelectorAll("[role]")) {
    const r = (el.getAttribute("role") || "").trim().split(/\s+/)[0].toLowerCase();
    if (r && !ROLES.has(r)) invalidRoles.push(`${sel(el)} role="${r}"`);
  }
  const brokenRefs = [];
  for (const attr of ["aria-labelledby", "aria-describedby"]) {
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      const missing = el.getAttribute(attr).split(/\s+/).filter((id) => id && !document.getElementById(id));
      if (missing.length) brokenRefs.push(`${sel(el)} ${attr}="${missing.join(" ")}"`);
    }
  }
  const hiddenFocusable = [];
  for (const el of document.querySelectorAll('[aria-hidden="true"]')) {
    const f = [...el.querySelectorAll(FOCUSABLE), ...(el.matches(FOCUSABLE) ? [el] : [])].filter((x) => !x.disabled && x.getAttribute("tabindex") !== "-1" && !x.closest("[inert]") && vis(x));
    if (f.length) hiddenFocusable.push(`${sel(el)} contains ${sel(f[0])}`);
  }
  const roleNotFocusable = [];
  for (const el of document.querySelectorAll('[role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"]')) {
    if (vis(el) && !nativelyFocusable.test(el.tagName.toLowerCase()) && !el.hasAttribute("tabindex") && !el.closest("[role=tablist], [role=menu]")) roleNotFocusable.push(`${sel(el)} role="${el.getAttribute("role")}"`);
  }
  const ids = new Map();
  for (const el of document.querySelectorAll("[id]")) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  const duplicateIds = [...ids].filter(([, n]) => n > 1).map(([id, n]) => `#${id} ×${n}`);
  const positiveTabindex = [...document.querySelectorAll("[tabindex]")].filter((el) => Number(el.getAttribute("tabindex")) > 0).map(sel);
  const dialogsUnnamed = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog')].filter((d) => !d.getAttribute("aria-label") && !d.getAttribute("aria-labelledby") && !d.getAttribute("title")).map(sel);

  const mainEl = document.querySelector("main, [role='main']");
  const links = [...document.querySelectorAll("a[href]")].filter(vis);
  const first = links[0];
  const skipTarget = first && (first.getAttribute("href") || "").startsWith("#") && first.getAttribute("href").length > 1 && document.querySelector(first.getAttribute("href").replace(/[^#\w-]/g, ""));
  const beforeMain = mainEl ? links.filter((a) => a.compareDocumentPosition(mainEl) & Node.DOCUMENT_POSITION_FOLLOWING).length : 0;

  const authFields = [...document.querySelectorAll('input[type="password"], input[autocomplete="one-time-code"]')].filter(vis)
    .filter((el) => /^(off|false)$/i.test(el.getAttribute("autocomplete") || "") || el.hasAttribute("onpaste")).map(sel);
  const autoplay = [...document.querySelectorAll("video[autoplay]")].filter((v) => vis(v) && !v.controls).map(sel);
  const tables = [...document.querySelectorAll("table")].filter((t) => vis(t) && t.rows.length >= 2 && !t.querySelector("th") && !/presentation|none/.test(t.getAttribute("role") || "")).map(sel);

  return {
    invalidRoles, brokenRefs, hiddenFocusable, roleNotFocusable, duplicateIds, positiveTabindex, dialogsUnnamed,
    dragNoAlternative: (() => {
      const drag = [...document.querySelectorAll('[draggable="true"]')].filter(vis);
      if (!drag.length) return [];
      const alt = [...document.querySelectorAll("button, [role=button], a[href]")].some((b) => vis(b) && /\b(move|up|down|reorder|déplacer|monter|descendre)\b/i.test((b.getAttribute("aria-label") || b.textContent || "")));
      return alt ? [] : [sel(drag[0]) + ` (${drag.length} draggable)`];
    })(),
    fieldsetsNoLegend: [...document.querySelectorAll("fieldset")].filter((f) => vis(f) && !f.querySelector(":scope > legend")).map(sel),
    hasMain: !!mainEl, hasSkipLink: !!skipTarget, linksBeforeMain: beforeMain, authFields, autoplay, tables,
  };
}

/** Run in the page after each Tab: where focus is and whether something sits on top of it. */
export function describeFocus() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let obscuredBy = null;
  if (cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight) {
    const top = document.elementFromPoint(cx, cy);
    const lab = el.closest("label");
    if (top && top !== el && !el.contains(top) && !top.contains(el) && !(lab && lab.contains(top))) {
      let s = top.tagName.toLowerCase();
      if (top.id) s += "#" + top.id; else if (top.classList[0]) s += "." + top.classList[0];
      obscuredBy = s;
    }
  }
  let s = el.tagName.toLowerCase();
  if (el.id) s += "#" + el.id; else if (el.classList[0]) s += "." + el.classList[0];
  const label = (el.getAttribute("aria-label") || el.textContent || el.value || "").replace(/\s+/g, " ").trim().slice(0, 30);
  return { sel: s, label, top: Math.round(r.top + scrollY), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), obscuredBy, inDialog: !!el.closest('[role="dialog"], dialog[open], [aria-modal="true"]') };
}

export const MAX_TABS = 60;

/** Keyboard traversal findings from the list of focus stops (null = focus left the page). */
export function traversalFindings(stops) {
  const out = [];
  const real = stops.filter(Boolean);
  let run = 1;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    run = a && b && a.sel === b.sel && a.top === b.top && a.left === b.left ? run + 1 : 1;
    if (run >= 3) { out.push({ rule: "keyboard-trap", severity: "error", message: `Tab does not move past ${b.sel} "${b.label}" (WCAG 2.1.2).`, items: [b.sel], fix: "Don't capture Tab in a widget; let it leave, or use Escape to exit and document it." }); break; }
  }
  const hidden = real.filter((s) => s.obscuredBy);
  if (hidden.length) out.push({ rule: "focus-obscured", severity: "error", message: `${hidden.length} focused control(s) are covered by another element, e.g. a sticky header or banner (WCAG 2.4.11).`, items: hidden.map((s) => `${s.sel} ← ${s.obscuredBy}`), fix: "Add scroll-padding-top equal to the sticky header height, or lower its z-index below focused content." });
  let jumps = 0;
  for (let i = 1; i < real.length; i++) if (real[i].top < real[i - 1].top - 200 && !real[i].inDialog) jumps++;
  if (jumps >= 3) out.push({ rule: "focus-order-jumps", severity: "warning", message: `Focus jumps back up the page ${jumps} times: tab order doesn't follow reading order (WCAG 2.4.3).`, items: [], fix: "Reorder the DOM to match the visual order instead of positioning; remove positive tabindex." });
  if (real.length === 0) out.push({ rule: "no-focusable", severity: "error", message: "Tab never reaches any control.", items: [], fix: "Use real <a href>, <button>, <input>; keep custom controls focusable with tabindex=\"0\"." });
  return out;
}

export function a11yFindings({ statics: s, stops, reflow, zoom200 = null, zoom400 = null, components = [] }) {
  const out = [...traversalFindings(stops), ...components];
  const add = (rule, severity, message, items, fix) => out.push({ rule, severity, message, items: (items || []).slice(0, 4), fix });
  if (s.invalidRoles.length) add("aria-invalid-role", "error", "ARIA role that does not exist.", s.invalidRoles, "Use a valid role, or a native element.");
  if (s.brokenRefs.length) add("aria-broken-reference", "error", "aria-labelledby / aria-describedby point to an id that does not exist.", s.brokenRefs, "Fix the id or remove the attribute; a broken reference gives no name at all.");
  if (s.hiddenFocusable.length) add("aria-hidden-focusable", "error", "Focusable controls inside aria-hidden: keyboard users land on something screen readers don't announce.", s.hiddenFocusable, 'Remove aria-hidden, or make the content inert (the inert attribute) or tabindex="-1".');
  if (s.roleNotFocusable.length) add("role-not-focusable", "error", "Custom controls with a role but unreachable by keyboard.", s.roleNotFocusable, 'Use a native <button>/<a href>, or add tabindex="0" and Enter/Space handlers.');
  if (s.duplicateIds.length) add("duplicate-id", "warning", "Duplicate ids break label and ARIA references.", s.duplicateIds, "Make every id unique.");
  if (s.positiveTabindex.length) add("positive-tabindex", "warning", "tabindex above 0 overrides the natural tab order.", s.positiveTabindex, 'Use tabindex="0" or -1 only; fix the DOM order instead.');
  if (s.dialogsUnnamed.length) add("dialog-no-name", "error", "Dialogs without an accessible name.", s.dialogsUnnamed, "Add aria-labelledby pointing at the dialog's title.");
  if (!s.hasMain) add("no-main-landmark", "warning", "No <main> landmark: screen reader users can't jump to the content.", [], "Wrap the page's primary content in <main>.");
  else if (!s.hasSkipLink && s.linksBeforeMain > 5) add("no-skip-link", "warning", `${s.linksBeforeMain} links before the main content and no skip link (WCAG 2.4.1).`, [], 'Add <a href="#main" class="sr-only focus:not-sr-only">Skip to content</a> as the first element.');
  if (s.authFields.length) add("auth-paste-blocked", "error", "Password / code fields block autofill or paste (WCAG 3.3.8, accessible authentication).", s.authFields, 'Use autocomplete="current-password" / "new-password" / "one-time-code" and remove onpaste handlers.');
  if (s.autoplay.length) add("autoplay-no-pause", "warning", "Autoplaying video with no controls: moving content longer than 5s needs a pause button (WCAG 2.2.2).", s.autoplay, "Add a visible pause control, or stop after 5s; honour prefers-reduced-motion.");
  if (s.tables.length) add("table-no-headers", "warning", "Data tables without <th> header cells.", s.tables, 'Use <th scope="col"> / <th scope="row">.');
  if (s.dragNoAlternative && s.dragNoAlternative.length) add("drag-without-alternative", "error", "Items can be dragged but there is no button to do the same without dragging (WCAG 2.5.7).", s.dragNoAlternative, "Add Move up / Move down (or a Move to… menu) buttons that do what the drag does.");
  if (s.fieldsetsNoLegend && s.fieldsetsNoLegend.length) add("fieldset-no-legend", "warning", "A fieldset without a legend: the group has no name for screen reader users.", s.fieldsetsNoLegend, "Add <legend> as the first child of the fieldset, with the question or group name.");
  if (zoom200 && zoom200.overflow > 2) add("zoom-200-overflow", "error", `Horizontal scrolling at 200% zoom (${zoom200.overflow}px too wide, WCAG 1.4.4 / 1.4.10).`, zoom200.offenders, "Use relative widths and wrapping so the page works at 640 CSS px wide.");
  if (zoom200 && zoom200.clipped.length) add("zoom-200-clipped", "error", "Text is cut off at 200% zoom (WCAG 1.4.4).", zoom200.clipped, "Remove fixed heights and overflow: hidden around text; let containers grow.");
  if ((zoom200 && zoom200.fixedShare > 50) || (zoom400 && zoom400.fixedShare > 50)) add("zoom-fixed-covers", "warning", "Fixed or sticky bars take more than half of the screen at 200–400% zoom: little room is left for the content.", [], "Let headers scroll away or shrink at small heights; drop sticky bottom bars when the viewport is short.");
  if (reflow && reflow.overflow > 2) add("reflow-320", "error", `Horizontal scrolling at 320px wide (${reflow.overflow}px too wide); content must reflow (WCAG 1.4.10).`, reflow.items, "Let blocks wrap (min-width: 0, max-width: 100%, flex-wrap), no fixed widths over 320px.");
  return out;
}

export function formatA11y(findings) {
  if (!findings.length) return "Accessibility (WCAG 2.2 AA behaviour checks): no issue found by these checks.";
  const errors = findings.filter((f) => f.severity === "error").length;
  const lines = [`Accessibility: ${errors} error(s), ${findings.length - errors} warning(s)`];
  for (const f of findings) {
    lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`);
    if (f.items.length) lines.push(`      ${f.items.join(" · ")}`);
    lines.push(`      → ${f.fix}`);
  }
  return lines.join("\n");
}
