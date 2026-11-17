// Cross-page consistency: the same site should look and behave like one product.
// collectSignature runs in the page (self-contained); compareSignatures is pure and unit-tested.

export function collectSignature() {
  const vis = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hex = (c) => { const p = parse(c); return p && p.a >= 0.5 ? "#" + [p.r, p.g, p.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") : null; };
  const fam = (el) => getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
  const px = (v) => Math.round(parseFloat(v) || 0);
  const txt = (el) => (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40);
  const h = (sel) => { const el = [...document.querySelectorAll(sel)].find(vis); if (!el) return null; const s = getComputedStyle(el); return { size: px(s.fontSize), weight: +s.fontWeight, font: fam(el) }; };
  const header = document.querySelector("header");
  const navLabels = header ? [...header.querySelectorAll("a[href]")].filter(vis).map(txt).filter(Boolean).slice(0, 10) : [];
  const footer = document.querySelector("footer");
  const footerLabels = footer ? [...footer.querySelectorAll("a[href]")].filter(vis).map(txt).filter(Boolean).slice(0, 12) : [];
  let button = null;
  for (const el of document.querySelectorAll("a[href], button, [role=button]")) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el), r = el.getBoundingClientRect(), bg = parse(s.backgroundColor);
    if (bg && bg.a >= 0.9 && r.height >= 28 && r.width >= 48) { button = { bg: hex(s.backgroundColor), color: hex(s.color), radius: px(s.borderRadius), height: Math.round(r.height), weight: +s.fontWeight }; break; }
  }
  const h1 = document.querySelector("h1");
  let container = null;
  for (let p = h1 && h1.parentElement; p && p !== document.documentElement; p = p.parentElement) { const mw = getComputedStyle(p).maxWidth; if (mw && mw !== "none" && mw.endsWith("px") && parseFloat(mw) >= 480) { container = px(mw); break; } }
  const radii = new Map();
  for (const el of document.querySelectorAll("main *, section *")) { const s = getComputedStyle(el); const r = px(s.borderTopLeftRadius); if (r > 0 && r < 60 && (parseFloat(s.borderTopWidth) > 0 || parse(s.backgroundColor)?.a >= 0.9)) radii.set(r, (radii.get(r) || 0) + 1); }
  const radius = [...radii].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const colors = new Map();
  for (const el of document.querySelectorAll("body, body *")) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    for (const c of [s.color, s.backgroundColor, s.borderTopColor]) { const x = hex(c); if (x) colors.set(x, (colors.get(x) || 0) + 1); }
  }
  const palette = [...colors].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  const title = document.title || "";
  const sep = title.match(/\s[|–—·-]\s([^|–—·-]+)$/);
  return {
    url: location.pathname || location.href, lang: document.documentElement.lang || "", title, titleSuffix: sep ? sep[1].trim().toLowerCase() : "",
    favicon: !!document.querySelector('link[rel~="icon"]'), bodyFont: fam(document.body), bodySize: px(getComputedStyle(document.body).fontSize),
    bodyBg: hex(getComputedStyle(document.body).backgroundColor) || hex(getComputedStyle(document.documentElement).backgroundColor), h1: h("h1"), h2: h("h2"), h3: h("h3"),
    nav: navLabels, footerNav: footerLabels, hasHeader: !!header, hasFooter: !!footer, headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
    button, container, radius, palette,
  };
}

const tol = (a, b, t = 0.15) => a != null && b != null && Math.abs(a - b) <= Math.max(2, Math.max(a, b) * t);

function groups(pages, get) {
  const m = new Map();
  for (const p of pages) { const v = get(p.sig); const k = JSON.stringify(v); if (!m.has(k)) m.set(k, { value: v, pages: [] }); m.get(k).pages.push(p.label); }
  return [...m.values()].sort((a, b) => b.pages.length - a.pages.length);
}
const show = (v) => (v == null ? "none" : Array.isArray(v) ? v.join(", ") || "none" : typeof v === "object" ? Object.values(v).join("/") : String(v));
const describe = (gs) => gs.map((g) => `${show(g.value)} (${g.pages.join(", ")})`).join(" vs ");

export function compareSignatures(pages) {
  const out = [];
  if (pages.length < 2) return out;
  const add = (rule, severity, message, fix) => out.push({ rule, severity, message, fix });
  const same = (get, eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)) => {
    const gs = groups(pages, get);
    const merged = [];
    for (const g of gs) { const hit = merged.find((m) => eq(m.value, g.value)); if (hit) hit.pages.push(...g.pages); else merged.push({ value: g.value, pages: [...g.pages] }); }
    return merged.length > 1 ? merged : null;
  };
  let g;
  if ((g = same((s) => s.bodyFont))) add("font-differs", "error", `Body font differs: ${describe(g)}.`, "One body family per site: set it once at the root (or the shared layout) and remove page-level overrides.");
  if ((g = same((s) => s.h1?.font))) add("heading-font-differs", "error", `Heading font differs: ${describe(g)}.`, "Define heading fonts in one place (tokens or the base layer).");
  if ((g = same((s) => s.h1?.size, (a, b) => tol(a, b, 0.2)))) add("h1-size-differs", "warning", `H1 size differs: ${describe(g)}.`, "Use one heading scale; only a landing hero may be larger, and that should be deliberate.");
  if ((g = same((s) => s.bodySize, (a, b) => a === b))) add("body-size-differs", "warning", `Body text size differs: ${describe(g)}.`, "Keep body text at one size across pages.");
  if ((g = same((s) => s.nav, (a, b) => JSON.stringify(a) === JSON.stringify(b)))) add("nav-differs", "warning", `Header links differ: ${describe(g)}.`, "The header navigation should be identical on every page (only the current-page state changes).");
  if ((g = same((s) => s.hasFooter ? s.footerNav : "no footer"))) add("footer-differs", "warning", `Footer differs: ${describe(g)}.`, "Share one footer component across pages.");
  if ((g = same((s) => s.button && [s.button.bg, s.button.color]))) add("button-color-differs", "error", `Primary button colors differ: ${describe(g)}.`, "One primary button style (a shared component or class), brand color from the token.");
  if ((g = same((s) => s.button?.radius, (a, b) => tol(a, b, 0.25)))) add("button-radius-differs", "warning", `Primary button radius differs: ${describe(g)}.`, "One radius for buttons across the site.");
  if ((g = same((s) => s.button?.height, (a, b) => tol(a, b, 0.2)))) add("button-height-differs", "warning", `Primary button height differs: ${describe(g)}.`, "One button size per role.");
  if ((g = same((s) => s.radius, (a, b) => tol(a, b, 0.3)))) add("card-radius-differs", "warning", `Card/panel radius differs: ${describe(g)}.`, "Pick one radius scale and reuse it.");
  if ((g = same((s) => s.container, (a, b) => tol(a, b, 0.15)))) add("container-differs", "warning", `Content width differs: ${describe(g)} px.`, "Use one container width for page content (reading pages may be narrower, deliberately).");
  if ((g = same((s) => s.headerHeight, (a, b) => tol(a, b, 0.2)))) add("header-height-differs", "warning", `Header height differs: ${describe(g)}.`, "Same header on every page: content jumps when navigating otherwise.");
  if ((g = same((s) => s.bodyBg))) add("background-differs", "warning", `Page background differs: ${describe(g)}.`, "Keep one base background, vary sections instead.");
  if ((g = same((s) => s.lang))) add("lang-differs", "error", `Language attribute differs: ${describe(g)}.`, "Set the correct lang on each page (a mixed-language site needs hreflang).");
  const miss = pages.filter((p) => !p.sig.favicon).map((p) => p.label);
  if (miss.length) add("favicon-missing", "warning", `No favicon on: ${miss.join(", ")}.`, "Add the favicon link to the shared head.");
  if ((g = same((s) => s.titleSuffix))) add("title-pattern-differs", "warning", `Title suffix differs: ${describe(g)}.`, 'Use one pattern, e.g. "Page title | Brand".');
  const pal = pages.slice(1).map((p) => { const a = new Set(pages[0].sig.palette), b = new Set(p.sig.palette); const i = [...a].filter((c) => b.has(c)).length; return { label: p.label, j: i / Math.max(1, new Set([...a, ...b]).size) }; }).filter((x) => x.j < 0.4);
  if (pal.length) add("palette-differs", "warning", `Colors barely overlap with ${pages[0].label}: ${pal.map((x) => `${x.label} (${Math.round(x.j * 100)}% in common)`).join(", ")}.`, "Draw every color from the same tokens; a page with another palette reads as another site.");
  return out;
}

export function formatConsistency(findings, labels) {
  const head = `Consistency across ${labels.length} pages: ${labels.join(", ")}`;
  if (!findings.length) return head + "\n  no inconsistency found by these checks.";
  const err = findings.filter((f) => f.severity === "error").length;
  const lines = [head, `  ${err} error(s), ${findings.length - err} warning(s)`];
  for (const f of findings) lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`, `      → ${f.fix}`);
  return lines.join("\n");
}
