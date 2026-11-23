// Performance audit: real Chromium measurements (LCP, CLS, TBT, weight) and the causes behind them.
// initPerf / readPerf / collectImages / collectPage run in the page (self-contained);
// perfFindings is pure and unit-tested.

export function initPerf() {
  window.__perf = { lcp: null, lcpNode: null, fcp: null, longTasks: 0, tbt: 0, inter: {} };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.lcp = e.startTime; window.__perf.lcpNode = e.element || null; } }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__perf.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.longTasks++; window.__perf.tbt += Math.max(0, e.duration - 50); } }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__perf.inter[e.interactionId] = Math.max(window.__perf.inter[e.interactionId] || 0, e.duration); }).observe({ type: "event", durationThreshold: 16, buffered: true });
  } catch {}
}

export function readPerf() {
  const p = window.__perf || {};
  const nav = performance.getEntriesByType("navigation")[0];
  const shifts = window.__glowupShifts || [];
  const cls = shifts.reduce((a, s) => a + s.v, 0);
  const n = p.lcpNode;
  let lcpEl = null;
  if (n) lcpEl = { sel: n.tagName.toLowerCase() + (n.id ? "#" + n.id : n.classList && n.classList[0] ? "." + n.classList[0] : ""), isImg: n.tagName === "IMG", src: n.currentSrc || n.src || "", loading: n.getAttribute && n.getAttribute("loading"), fetchpriority: n.getAttribute && n.getAttribute("fetchpriority") };
  return { lcp: p.lcp, fcp: p.fcp, ttfb: nav ? nav.responseStart : null, cls: Math.round(cls * 1000) / 1000, tbt: Math.round(p.tbt || 0), longTasks: p.longTasks || 0, lcpEl, inp: Object.keys(p.inter || {}).length ? Math.round(Math.max(...Object.values(p.inter))) : null, interactions: Object.keys(p.inter || {}).length };
}

export function collectImages() {
  const dpr = window.devicePixelRatio || 1;
  return [...document.images].map((i) => {
    const r = i.getBoundingClientRect();
    const sel = i.tagName.toLowerCase() + (i.id ? "#" + i.id : i.classList[0] ? "." + i.classList[0] : "");
    return {
      sel, src: i.currentSrc || i.src, nat: [i.naturalWidth, i.naturalHeight], box: [Math.round(r.width), Math.round(r.height)], dpr,
      top: Math.round(r.top + scrollY), lazy: i.getAttribute("loading") === "lazy", fetchpriority: i.getAttribute("fetchpriority"),
      hasDims: (i.hasAttribute("width") && i.hasAttribute("height")) || getComputedStyle(i).aspectRatio !== "auto",
      visible: r.width > 0 && r.height > 0,
    };
  });
}

export function collectPage() {
  const blockingScripts = [...document.querySelectorAll("head script[src]")].filter((s) => !s.async && !s.defer && s.type !== "module").map((s) => s.getAttribute("src").split("?")[0].split("/").pop());
  let fontFaces = 0, noDisplay = 0;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r instanceof CSSFontFaceRule) { fontFaces++; if (!r.style.getPropertyValue("font-display")) noDisplay++; }
  }
  let costly = 0;
  for (const el of document.querySelectorAll("body *")) {
    const s = getComputedStyle(el);
    if ((s.backdropFilter && s.backdropFilter !== "none") || (s.filter && /blur/.test(s.filter))) costly++;
  }
  const LAYOUT_PROPS = new Set(["width", "height", "top", "left", "right", "bottom", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontSize", "borderWidth"]);
  const anims = document.getAnimations ? document.getAnimations().filter((a) => a.playState === "running") : [];
  const layoutAnims = [];
  for (const a of anims) {
    let props = [];
    try { props = Object.keys((a.effect.getKeyframes()[0]) || {}).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)); } catch {}
    const hit = props.filter((k) => LAYOUT_PROPS.has(k));
    if (hit.length) { const t = a.effect && a.effect.target; layoutAnims.push(`${t ? t.tagName.toLowerCase() + (t.id ? "#" + t.id : t.classList && t.classList[0] ? "." + t.classList[0] : "") : "element"} animates ${hit.join(", ")}`); }
  }
  return { blockingScripts, fontFaces, fontsNoDisplay: noDisplay, costlyEffects: costly, viewportH: innerHeight, runningAnimations: anims.length, layoutAnims: [...new Set(layoutAnims)].slice(0, 4), bodyText: (document.body.innerText || "").trim().length, hasH1: !!document.querySelector("h1") };
}

const KB = 1024;
export const HEAVY_LIBS = [
  [/jquery(?!-ui)[.-]/i, "jQuery"], [/moment(\.min)?\.js|moment-with-locales/i, "Moment.js (use date-fns or Intl)"], [/lodash(\.min)?\.js/i, "full lodash (import single functions)"],
  [/three(\.module)?(\.min)?\.js/i, "three.js"], [/chart(\.umd)?(\.min)?\.js|chart\.js/i, "Chart.js"], [/bootstrap(\.bundle)?(\.min)?\.js/i, "Bootstrap JS"],
  [/fontawesome|font-awesome/i, "Font Awesome (use the few SVG icons you need)"],
  [/@tailwindcss\/browser|cdn\.tailwindcss\.com/i, "Tailwind compiled in the browser (fine for a prototype; build the CSS for production)"],
];

const fmt = (b) => (b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + " MB" : Math.round(b / KB) + " KB");
const name = (u) => { try { return new URL(u).pathname.split("/").pop() || new URL(u).host; } catch { return u.slice(0, 40); } };

export function perfFindings(d) {
  const out = [];
  const add = (rule, severity, message, fix, items = []) => out.push({ rule, severity, message, fix, items: items.slice(0, 4) });
  const m = d.metrics;
  const sec = (ms) => (ms / 1000).toFixed(1) + "s";

  if (m.lcp != null && m.lcp > 2500) add("lcp-slow", m.lcp > 4000 ? "error" : "warning", `Largest Contentful Paint ${sec(m.lcp)} (good ≤ 2.5s)${m.lcpEl ? ` — ${m.lcpEl.sel}` : ""}.`, "Preload or prioritise the LCP image (fetchpriority=\"high\"), shrink it, remove render-blocking scripts and fonts ahead of it.", m.lcpEl ? [m.lcpEl.src ? name(m.lcpEl.src) : m.lcpEl.sel] : []);
  if (m.cls > 0.1) add("cls-high", m.cls > 0.25 ? "error" : "warning", `Cumulative Layout Shift ${m.cls} (good ≤ 0.1).`, "Reserve space: width/height or aspect-ratio on images and embeds, min-height on late content, no insertion above existing content.");
  if (m.tbt > 200) add("tbt-high", m.tbt > 600 ? "error" : "warning", `${m.tbt} ms of blocking main-thread time over ${m.longTasks} long task(s) (INP risk; good ≤ 200 ms).`, "Split or defer heavy scripts, drop unused libraries, load third parties after interaction.");
  if (m.inp != null && m.inp > 200) add("inp-slow", m.inp > 500 ? "error" : "warning", `The slowest of ${m.interactions} interaction(s) measured here took ${m.inp} ms to respond (good ≤ 200 ms). This is a lab measurement of a few clicks on this machine, not the INP of real visitors.`, "Do less work in the click handler: defer heavy updates (requestIdleCallback, startTransition), split long tasks, avoid layout thrashing, load third parties after interaction.");
  if (m.fcp != null && m.fcp > 1800) add("fcp-slow", "warning", `First Contentful Paint ${sec(m.fcp)} (good ≤ 1.8s).`, "Inline critical CSS, defer scripts, preconnect to the font and image hosts.");
  if (m.ttfb != null && m.ttfb > 800) add("ttfb-slow", "warning", `Server response ${Math.round(m.ttfb)} ms (good ≤ 800 ms).`, "Cache the HTML, use a CDN, remove server-side work from the first byte.");

  const r = d.resources;
  const total = r.reduce((a, x) => a + x.bytes, 0);
  const js = r.filter((x) => x.type === "script");
  const jsBytes = js.reduce((a, x) => a + x.bytes, 0);
  if (total > 2 * 1024 * KB) add("page-heavy", total > 5 * 1024 * KB ? "error" : "warning", `${fmt(total)} transferred in ${r.length} requests (aim for under 2 MB).`, "Convert images to WebP/AVIF at display size, lazy-load below the fold, drop unused scripts and fonts.", [...r].sort((a, b) => b.bytes - a.bytes).map((x) => `${name(x.url)} ${fmt(x.bytes)}`));
  if (r.length > 80) add("too-many-requests", "warning", `${r.length} requests for one page.`, "Bundle scripts and styles, use SVG sprites or inline icons, remove unused embeds.");
  if (jsBytes > 300 * KB) add("js-heavy", "warning", `${fmt(jsBytes)} of JavaScript transferred (aim for under 300 KB).`, "Code-split by route, remove unused dependencies, load widgets on interaction.", [...js].sort((a, b) => b.bytes - a.bytes).map((x) => `${name(x.url)} ${fmt(x.bytes)}`));
  const libs = [];
  for (const x of js.concat(r.filter((y) => y.type === "stylesheet" || y.type === "font"))) for (const [re, label] of HEAVY_LIBS) if (re.test(x.url) && !libs.includes(label)) libs.push(label);
  if (libs.length) add("heavy-library", "warning", `Heavy libraries loaded: ${libs.join(", ")}.`, "Replace with a native API or a small alternative; Tailwind pages rarely need a CSS framework's JS.", libs);
  const third = r.filter((x) => x.thirdParty);
  const thirdBytes = third.reduce((a, x) => a + x.bytes, 0);
  if (third.length > 12 || thirdBytes > 500 * KB) add("third-party-heavy", "warning", `${third.length} third-party requests (${fmt(thirdBytes)}).`, "Remove trackers and widgets you don't use; load the rest after consent or interaction.", [...new Set(third.map((x) => new URL(x.url).host))]);
  const fontBytes = r.filter((x) => x.type === "font").reduce((a, x) => a + x.bytes, 0);
  if (fontBytes > 300 * KB) add("fonts-heavy", "warning", `${fmt(fontBytes)} of web fonts.`, "Keep 2 families and 3–4 weights, subset to the languages used, prefer one variable font.");
  if (d.page.fontsNoDisplay > 0) add("font-display-missing", "warning", `${d.page.fontsNoDisplay} of ${d.page.fontFaces} @font-face rule(s) have no font-display (text may stay invisible while the font loads).`, "Add font-display: swap (or optional) to each @font-face.");
  if (d.page.blockingScripts.length) add("render-blocking-script", "warning", `${d.page.blockingScripts.length} script(s) in <head> block rendering.`, "Add defer (or async), or move them to the end of <body>.", d.page.blockingScripts);
  if (d.page.layoutAnims && d.page.layoutAnims.length) add("animates-layout", "warning", `${d.page.layoutAnims.length} running animation(s) change layout properties on every frame (jank on modest phones).`, "Animate transform and opacity instead of width, height, top, left or margins.", d.page.layoutAnims);
  if (d.page.runningAnimations > 12) add("many-animations", "warning", `${d.page.runningAnimations} animations run at the same time.`, "Run one orchestrated motion at a time; pause off-screen and looping animations.");
  if (d.resilience && (d.resilience.errors > 0 || d.resilience.bodyText < 150 || !d.resilience.hasH1)) add("breaks-on-failed-requests", "warning", `With ${d.resilience.failed} request(s) randomly lost, the page ${d.resilience.errors > 0 ? `throws ${d.resilience.errors} script error(s)` : d.resilience.bodyText < 150 ? "shows almost no content" : "loses its main heading"}.`, "Keep the content in the HTML, defer non-critical scripts, guard code that depends on a library with a fallback, and give images alt text and a background color.");
  if (d.page.costlyEffects > 6) add("costly-effects", "warning", `${d.page.costlyEffects} elements use backdrop-filter or blur: expensive on modest phones.`, "Keep the effect to one or two surfaces; use a plain translucent color elsewhere.");

  const bytesOf = new Map(r.map((x) => [x.url, x.bytes]));
  const imgs = d.images.filter((i) => i.visible && i.nat[0] > 0 && !/^data:|\.svg(\?|$)/i.test(i.src));
  const over = imgs.filter((i) => i.nat[0] > 800 && i.nat[0] > i.box[0] * Math.max(2, i.dpr) * 1.25);
  if (over.length) add("image-oversized", "warning", `${over.length} image(s) are far larger than their display size.`, "Export at 2× the displayed width at most, or add srcset/sizes.", over.map((i) => `${name(i.src)} ${i.nat[0]}px shown at ${i.box[0]}px`));
  const heavy = imgs.filter((i) => (bytesOf.get(i.src) || 0) > 300 * KB);
  if (heavy.length) add("image-heavy", "warning", `${heavy.length} image(s) over 300 KB.`, "Compress (WebP/AVIF quality 75–80) at display size.", heavy.map((i) => `${name(i.src)} ${fmt(bytesOf.get(i.src))}`));
  const fold = d.page.viewportH;
  const below = imgs.filter((i) => i.top > fold * 1.5 && !i.lazy);
  if (below.length >= 3) add("below-fold-not-lazy", "warning", `${below.length} images far below the fold load immediately.`, 'Add loading="lazy" to images that start below the first screen.', below.map((i) => name(i.src)));
  const lcp = m.lcpEl;
  if (lcp && lcp.isImg && lcp.loading === "lazy") add("lcp-lazy", "error", "The largest image on the first screen is loading=\"lazy\": it starts late and delays LCP.", 'Remove loading="lazy" from it and add fetchpriority="high".', [name(lcp.src)]);
  else if (lcp && lcp.isImg && lcp.fetchpriority !== "high" && m.lcp > 2500) add("lcp-no-priority", "warning", "The LCP image has no fetchpriority and LCP is slow.", 'Add fetchpriority="high" (and a <link rel="preload" as="image"> if it is a CSS or late image).', [name(lcp.src)]);
  return out;
}

export function formatPerf(f, summary) {
  const head = `Performance (${summary.profile}): LCP ${summary.lcp} · CLS ${summary.cls} · TBT ${summary.tbt} ms${summary.inp != null ? ` · interaction latency ${summary.inp} ms (lab, ${summary.interactions} interaction(s))` : ""} · ${summary.weight} in ${summary.requests} requests`;
  if (!f.length) return head + "\n  no issue found by these checks.";
  const errors = f.filter((x) => x.severity === "error").length;
  const lines = [head, `  ${errors} error(s), ${f.length - errors} warning(s)`];
  for (const x of f) {
    lines.push(`  ${x.severity === "error" ? "✗" : "!"} ${x.rule} — ${x.message}`);
    if (x.items.length) lines.push(`      ${x.items.join(" · ")}`);
    lines.push(`      → ${x.fix}`);
  }
  return lines.join("\n");
}
