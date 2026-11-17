// Brand guard: did a change touch what the user did not ask to touch (brand colors, fonts, UI dependencies)?
// Pure comparison over the text of files before and after; git plumbing lives in brand-guard.mjs.

const HEX = /#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RGB = /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi;
const HSL = /hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/gi;
const MODERN = /\b(oklch|oklab|lab|lch)\(\s*([^)]+)\)/gi;
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Every color literal in a text, normalised (hex 6 lowercase; oklch/lab as a lowercase string). */
export function extractColors(text) {
  const out = [];
  for (const m of text.matchAll(HEX)) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    out.push("#" + h.slice(0, 6));
  }
  for (const m of text.matchAll(RGB)) out.push(toHex(+m[1], +m[2], +m[3]));
  for (const m of text.matchAll(HSL)) out.push(toHex(...hslToRgb(+m[1], +m[2], +m[3])));
  for (const m of text.matchAll(MODERN)) out.push(`${m[1].toLowerCase()}(${m[2].replace(/\s+/g, " ").trim().toLowerCase()})`);
  return out;
}

export function isNeutral(color) {
  if (!color.startsWith("#")) { const l = color.match(/\(\s*[\d.]+%?\s+([\d.]+)/); return l ? Number(l[1]) < 0.03 : false; }
  const v = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return Math.max(...v) - Math.min(...v) <= 24;
}

const GENERIC = new Set(["inherit", "initial", "unset", "sans-serif", "serif", "monospace", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "cursive", "fantasy", "emoji", "math", "fangsong", "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto", "helvetica neue", "helvetica", "arial", "apple color emoji", "segoe ui emoji", "noto color emoji", "var"]);

/** First named family of each font-family / --font-* declaration, plus Google Fonts families. */
export function extractFonts(text) {
  const out = [];
  for (const m of text.matchAll(/(?:font-family|--font-[\w-]+)\s*:\s*([^;}{]+)/gi)) {
    for (const raw of m[1].split(",")) {
      const f = raw.replace(/\s*!important/gi, "").replace(/["']/g, "").trim().toLowerCase();
      if (f && !GENERIC.has(f) && !f.startsWith("var(") && !f.startsWith("--")) out.push(f);
    }
  }
  for (const m of text.matchAll(/fonts\.googleapis\.com\/css2?\?[^"')\s]*/gi)) {
    for (const f of m[0].matchAll(/family=([^&:;"']+)/g)) out.push(decodeURIComponent(f[1]).replace(/\+/g, " ").toLowerCase());
  }
  return out;
}

const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
const UI_DEPS = /^(tailwindcss|@tailwindcss\/.+|bootstrap|react-bootstrap|@mui\/.+|@chakra-ui\/.+|@mantine\/.+|antd|vuetify|@angular\/material|styled-components|@emotion\/.+|@radix-ui\/.+|@headlessui\/.+|framer-motion|motion|gsap|lucide-react|react-icons|@fortawesome\/.+|@heroicons\/.+|@phosphor-icons\/.+|@tabler\/.+|sass|bulma|daisyui|flowbite.*|@shadcn\/.+)$/;

export function dependencyChanges(oldPkg, newPkg) {
  const deps = (p) => { try { const j = JSON.parse(p || "{}"); return { ...(j.dependencies || {}), ...(j.devDependencies || {}) }; } catch { return {}; } };
  const a = deps(oldPkg), b = deps(newPkg);
  return { added: Object.keys(b).filter((k) => !(k in a) && UI_DEPS.test(k)), removed: Object.keys(a).filter((k) => !(k in b) && UI_DEPS.test(k)) };
}

/**
 * before / after: the text of the changed style and markup files, concatenated.
 * allow: ["color", "font", "dependency"] when the user asked for that change.
 */
export function compareBrand({ before, after, oldPkg, newPkg }, { allow = [] } = {}) {
  const out = [];
  const add = (rule, severity, message, items, fix) => out.push({ rule, severity, message, items: items.slice(0, 6), fix });
  const oc = count(extractColors(before)), nc = count(extractColors(after));
  const brandOld = [...oc].filter(([c]) => !isNeutral(c)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  if (!allow.includes("color")) {
    const lost = brandOld.filter((c) => !nc.has(c));
    if (lost.length) add("brand-color-changed", "error", `Main brand color(s) no longer present: ${lost.join(", ")}.`, lost, "Restore them: the skill changes how color is used, never the brand colors. If the user asked for a new palette, re-run with --allow color.");
    const lostOther = [...oc].filter(([c]) => !isNeutral(c) && !brandOld.includes(c) && !nc.has(c)).map(([c]) => c);
    if (lostOther.length) add("color-removed", "warning", `${lostOther.length} other color(s) removed.`, lostOther, "Check they were not part of the design system (status, chart or accent colors).");
    const gained = [...nc].filter(([c]) => !isNeutral(c) && !oc.has(c)).map(([c]) => c);
    if (gained.length >= 3) add("palette-growth", "warning", `${gained.length} new saturated colors introduced.`, gained, "Use the existing tokens; every new hue is a product decision to confirm.");
  }
  if (!allow.includes("font")) {
    const of = new Set(extractFonts(before)), nf = new Set(extractFonts(after));
    const lostF = [...of].filter((f) => !nf.has(f));
    const gainedF = [...nf].filter((f) => !of.has(f));
    if (lostF.length) add("font-changed", "error", `Font(s) no longer used: ${lostF.join(", ")}${gainedF.length ? ` (new: ${gainedF.join(", ")})` : ""}.`, lostF, "Keep the brand's fonts; change sizes, weights and spacing instead. If the user asked for new fonts, re-run with --allow font.");
    else if (gainedF.length) add("font-added", "warning", `New font(s) introduced: ${gainedF.join(", ")}.`, gainedF, "Each new family costs weight and changes the voice: confirm with the user.");
  }
  if (!allow.includes("dependency") && (oldPkg || newPkg)) {
    const d = dependencyChanges(oldPkg, newPkg);
    if (d.added.length) add("ui-dependency-added", "error", `UI/CSS/animation dependencies added: ${d.added.join(", ")}.`, d.added, "Use what the project already has. Adding a library is a structural change to confirm first.");
    if (d.removed.length) add("ui-dependency-removed", "error", `UI/CSS/animation dependencies removed: ${d.removed.join(", ")}.`, d.removed, "Replacing a library is a structural change to confirm first.");
  }
  return out;
}

export function formatBrand(findings, meta) {
  const head = `Brand guard: ${meta.files} changed file(s) compared with ${meta.ref}`;
  if (!findings.length) return `${head}\n  Brand colors, fonts and UI dependencies are unchanged.`;
  const lines = [head];
  for (const f of findings) {
    lines.push(`  ${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}`);
    lines.push(`      → ${f.fix}`);
  }
  return lines.join("\n");
}
