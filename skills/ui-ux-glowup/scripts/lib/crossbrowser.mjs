// Cross-browser comparison: the same page in Chromium, Firefox and WebKit (Safari's engine).
// collectLayout runs in the page (self-contained); crossFindings is pure and unit-tested.

export function collectLayout() {
  const doc = document.documentElement;
  const h1 = document.querySelector("h1");
  let h1Info = null;
  if (h1) {
    const r = h1.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) * 1.2;
    h1Info = { lines: Math.max(1, Math.round(r.height / lh)), width: Math.round(r.width) };
  }
  const FEATURES = [
    ["backdrop-filter", /backdrop-filter/, "(backdrop-filter: blur(1px))"],
    ["aspect-ratio", /aspect-ratio/, "(aspect-ratio: 1 / 1)"],
    ["container queries", /container-type|@container/, "(container-type: inline-size)"],
    [":has()", /:has\(/, "selector(:has(a))"],
    ["oklch()", /oklch\(/, "(color: oklch(0.5 0.1 200))"],
    ["color-mix()", /color-mix\(/, "(color: color-mix(in srgb, red, blue))"],
    ["text-wrap: balance", /text-wrap\s*:\s*(balance|pretty)/, "(text-wrap: balance)"],
    ["dvh units", /\d(dvh|svh|lvh)\b/, "(height: 100dvh)"],
    ["scroll-driven animation", /animation-timeline/, "(animation-timeline: scroll())"],
    ["subgrid", /subgrid/, "(grid-template-columns: subgrid)"],
    ["@property", /@property/, "(syntax: '<length>')"],
    ["view transitions", /view-transition/, "(view-transition-name: a)"],
    ["nesting", /&\s*[.:#\[]/, "selector(&)"],
  ];
  let css = "";
  for (const sheet of document.styleSheets) { try { for (const r of sheet.cssRules) css += r.cssText.slice(0, 4000) + "\n"; } catch {} }
  const unsupported = [];
  for (const [name, re, test] of FEATURES) {
    if (!re.test(css)) continue;
    let ok = true;
    try { ok = test.startsWith("selector(") ? CSS.supports(test) : test.startsWith("(syntax") ? typeof CSS.registerProperty === "function" : CSS.supports(test.replace(/^\(|\)$/g, "")); } catch { ok = false; }
    if (!ok) unsupported.push(name);
  }
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 0 && !/\.svg/.test(i.src)).length;
  return {
    overflow: doc.scrollWidth - doc.clientWidth, height: doc.scrollHeight, h1: h1Info, brokenImages: broken, unsupported,
    fontsLoaded: [...document.fonts].filter((f) => f.status === "loaded").length,
  };
}

/** results: { engine: { viewport: { errors, layout } } }. The first engine present is the reference. */
export function crossFindings(results) {
  const out = [];
  const engines = Object.keys(results);
  const base = engines[0];
  if (!base) return out;
  const add = (rule, severity, engine, viewport, message, fix) => out.push({ rule, severity, engine, viewport, message, fix });
  for (const e of engines.slice(1)) {
    for (const [vp, cur] of Object.entries(results[e])) {
      const ref = results[base][vp];
      if (!ref) continue;
      const newErrors = cur.errors.filter((x) => !ref.errors.includes(x));
      if (newErrors.length) add("engine-js-error", "error", e, vp, `JavaScript error only in ${e}: ${newErrors[0]}`, "Check the API used (feature support on MDN / caniuse) and add a fallback or polyfill.");
      if (cur.layout.overflow > 2 && ref.layout.overflow <= 2) add("engine-overflow", "error", e, vp, `Horizontal scroll only in ${e} (${cur.layout.overflow}px).`, "Look for 100vw, fixed widths, or flex/grid children missing min-width: 0.");
      const dh = Math.abs(cur.layout.height - ref.layout.height) / Math.max(1, ref.layout.height);
      if (dh > 0.08) add("engine-height-differs", "warning", e, vp, `Page is ${Math.round(dh * 100)}% ${cur.layout.height > ref.layout.height ? "taller" : "shorter"} in ${e} (${cur.layout.height}px vs ${ref.layout.height}px).`, "Compare the screenshots: usually font metrics, a missing CSS feature, or line-height differences.");
      if (cur.layout.h1 && ref.layout.h1 && Math.abs(cur.layout.h1.lines - ref.layout.h1.lines) >= 2) add("engine-h1-wraps", "warning", e, vp, `Heading wraps on ${cur.layout.h1.lines} lines in ${e}, ${ref.layout.h1.lines} in ${base}.`, "Check font loading and text-wrap support; give the heading a max-width in ch.");
      if (cur.layout.brokenImages > ref.layout.brokenImages) add("engine-broken-images", "error", e, vp, `${cur.layout.brokenImages} image(s) fail to load in ${e}.`, "Image format not supported (AVIF/WebP/HEIC): provide a JPG or PNG fallback with <picture>.");
    }
  }
  const seen = new Set();
  for (const e of engines) for (const [vp, cur] of Object.entries(results[e])) {
    const key = e + cur.layout.unsupported.join();
    if (cur.layout.unsupported.length && !seen.has(key)) { seen.add(key); add("engine-unsupported-css", "warning", e, vp, `CSS used by the page is not supported in ${e}: ${cur.layout.unsupported.join(", ")}.`, "Add a fallback declaration before it, or wrap it in @supports."); }
  }
  return out;
}

export function formatCross(findings, engines, missing, files) {
  const lines = [`Cross-browser: ${engines.join(", ")}${missing.length ? ` · not installed: ${missing.join(", ")} (npx playwright install ${missing.join(" ")})` : ""}`];
  if (!findings.length) lines.push("  no difference found by these checks.");
  for (const f of findings) {
    lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} [${f.engine}, ${f.viewport}] — ${f.message}`, `      → ${f.fix}`);
  }
  if (files.length) lines.push(`Screenshots: ${files.slice(0, 6).join(", ")}${files.length > 6 ? " …" : ""}`);
  lines.push("Rendering engines only: this does not replace a check on a real iPhone or Android phone.");
  return lines.join("\n");
}
