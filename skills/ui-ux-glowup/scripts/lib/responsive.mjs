// Responsive sweep: the same page at many widths and orientations, optionally with stressed content
// (longer texts, long words, right-to-left). collectResponsive and applyStress run in the page
// (self-contained). --stress long: +50% words (translations are longer) and a 34-letter word in headings; numbers untouched. responsiveFindings is pure and unit-tested.

export const SIZES = [
  { name: "320", width: 320, height: 640 }, { name: "360", width: 360, height: 780 }, { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 }, { name: "600", width: 600, height: 900 }, { name: "768 tablet", width: 768, height: 1024 },
  { name: "820 tablet", width: 820, height: 1180 }, { name: "1024", width: 1024, height: 768 }, { name: "1180", width: 1180, height: 820 },
  { name: "1280", width: 1280, height: 800 }, { name: "1440", width: 1440, height: 900 }, { name: "1920", width: 1920, height: 1080 },
  { name: "844×390 phone landscape", width: 844, height: 390 }, { name: "1024×768 tablet landscape", width: 1024, height: 768 },
];

export function applyStress(mode) {
  if (mode === "rtl") { document.documentElement.dir = "rtl"; return; }
  if (mode !== "long") return;
  const LONG = "Donaudampfschifffahrtsgesellschaft";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const t = n.nodeValue.trim();
    const p = n.parentElement;
    if (!p || t.length < 3 || /^(script|style|noscript)$/i.test(p.tagName) || p.closest("script,style")) continue;
    if (!/[A-Za-zÀ-ÿ]{3,}/.test(t)) continue;
    const words = t.split(/\s+/);
    const extra = /^h[1-3]$/i.test(p.tagName) ? LONG : words.slice(0, Math.max(1, Math.ceil(words.length / 2))).join(" ");
    n.nodeValue = n.nodeValue.replace(t, t + " " + extra);
  }
}

export function collectResponsive() {
  const W = document.documentElement.clientWidth, H = innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : el.classList[0] ? "." + el.classList[0] : "");
  const scroller = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll") return true; } return false; };
  const overflow = document.documentElement.scrollWidth - W;
  const offenders = overflow > 2 ? [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 2 && r.width > 0 && !scroller(e) && !e.closest("svg"); }).slice(0, 4).map(sel) : [];
  const clipped = [];
  const small = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 2);
    if (hasText) {
      if (parseFloat(s.fontSize) < 12) small.push(sel(el));
      if ((s.overflowX === "hidden" || s.overflowX === "clip") && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== "ellipsis" && !scroller(el) && el.getBoundingClientRect().width > 4 && el.getBoundingClientRect().height > 4) clipped.push(sel(el));
    }
  }
  const lines = (el) => { const r = el.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2; return Math.round(r.height / lh); };
  const h1 = document.querySelector("h1");
  const long = [...document.querySelectorAll("main p, article p, p")].filter((p) => vis(p) && p.textContent.length > 200).map((p) => { const fs = parseFloat(getComputedStyle(p).fontSize); return { sel: sel(p), ch: Math.round(p.getBoundingClientRect().width / (fs * 0.5)) }; }).sort((a, b) => b.ch - a.ch)[0];
  const stuck = [...document.querySelectorAll("body *")].filter((el) => { const s = getComputedStyle(el); return (s.position === "fixed" || (s.position === "sticky" && (s.top !== "auto" || s.bottom !== "auto"))) && vis(el) && el.getBoundingClientRect().width > W * 0.6; });
  const fixedH = stuck.filter((el) => !stuck.some((o) => o !== el && o.contains(el))).reduce((a, el) => a + Math.min(el.getBoundingClientRect().height, H), 0);
  const targets = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")].filter((e) => vis(e) && !e.closest("p, li") ).filter((e) => { let r = e.getBoundingClientRect(); if (r.width <= 2 && r.height <= 2 && e.labels && e.labels[0]) r = e.labels[0].getBoundingClientRect(); return (r.width < 24 || r.height < 24) && e.tagName !== "A" && !(r.width <= 2 && r.height <= 2); }).map(sel);
  return { overflow, offenders, clipped: [...new Set(clipped)].slice(0, 4), smallText: [...new Set(small)].slice(0, 4), h1Lines: h1 ? lines(h1) : 0, longLine: long || null, fixedShare: Math.round((fixedH / H) * 100), smallTargets: [...new Set(targets)].slice(0, 4), dir: document.documentElement.dir };
}

/** perSize: [{ size: {name,width,height}, data }] */
export function responsiveFindings(perSize, { stress = null } = {}) {
  const out = [];
  const by = (pred) => perSize.filter(({ data }) => pred(data));
  const add = (rule, severity, sizes, message, fix, items = []) => out.push({ rule, severity, widths: sizes.map((s) => s.size.name), message, fix, items: [...new Set(items)].slice(0, 4) });
  const o = by((d) => d.overflow > 2);
  if (o.length) add("overflow-x", "error", o, `Horizontal scroll at ${o.length} size(s) (up to ${Math.max(...o.map((s) => s.data.overflow))}px).`, "Find the element wider than the viewport: fixed widths, 100vw, nowrap, grids without grid-cols-1, flex children without min-width: 0.", o.flatMap((s) => s.data.offenders));
  const c = by((d) => d.clipped.length);
  if (c.length) add("text-clipped", "error", c, `Text is cut off at ${c.length} size(s)${stress ? " (stress test)" : ""}.`, "Let the text wrap (remove fixed widths and overflow: hidden), or truncate with an ellipsis on purpose and keep the full text reachable.", c.flatMap((s) => s.data.clipped));
  const t = by((d) => d.smallText.length);
  if (t.length) add("text-too-small", "warning", t, "Text under 12px.", "Keep body text at 16px and secondary text at 14px or more.", t.flatMap((s) => s.data.smallText));
  const h = by((d) => d.h1Lines > 4);
  if (h.length) add("h1-wraps", "warning", h, `The H1 takes more than 4 lines at ${h.length} size(s).`, "Scale the heading with clamp() and give it a max-width in ch; shorten the sentence on narrow screens if needed.");
  const l = by((d) => d.longLine && d.longLine.ch > 95);
  if (l.length) add("line-too-long", "warning", l, `Paragraph lines run past ~95 characters at ${l.length} size(s).`, "Cap text blocks at 60–75ch (max-width: 68ch).", l.map((s) => s.data.longLine.sel));
  const f = by((d) => d.fixedShare > 35);
  if (f.length) add("fixed-covers-screen", "warning", f, "Fixed or sticky bars take more than a third of the screen height.", "On short screens let headers scroll away, shrink them, or drop the sticky bottom bar in landscape.");
  const g = by((d) => d.smallTargets.length && d.overflow <= 2);
  if (g.length) add("target-small", "warning", g.filter((s) => s.size.width <= 1180), "Controls under 24×24px (WCAG 2.5.8).", "Give buttons and inputs at least 24px (44px on phones).", g.flatMap((s) => s.data.smallTargets));
  if (stress === "rtl") {
    const bad = by((d) => d.dir !== "rtl");
    if (bad.length) add("rtl-not-applied", "warning", bad, "Right-to-left could not be applied.", "");
  }
  return out.filter((x) => x.widths.length);
}

export function formatResponsive(findings, perSize, stress) {
  const sizes = perSize.length;
  const bad = new Set(findings.filter((f) => f.severity === "error").flatMap((f) => f.widths));
  const lines = [`Responsive: ${sizes} sizes${stress ? ` · stress: ${stress}` : ""} · ${bad.size ? `${bad.size} with errors (${[...bad].join(", ")})` : "no error at any size"}`];
  if (!findings.length) lines.push("  no issue found by these checks.");
  for (const f of findings) {
    lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message} [${f.widths.length === sizes ? "all sizes" : f.widths.join(", ")}]`);
    if (f.items.length) lines.push(`      ${f.items.join(" · ")}`);
    if (f.fix) lines.push(`      → ${f.fix}`);
  }
  return lines.join("\n");
}
