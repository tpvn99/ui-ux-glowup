// Pure analysis of data collected by probe.mjs. No browser needed — fully unit-testable.
import { flattenBackground, composite, contrastRatio, requiredRatio } from "./color.mjs";

export const CRITERIA = ["Hierarchy", "Typography", "Spacing", "Components", "Visuals", "Content", "Responsive", "Accessibility"];

const PENALTY = { error: 1, warn: 0.5, info: 0 };

/** Group numbers and return [value, count] sorted by count desc. */
export function histogram(values, round = (v) => v) {
  const map = new Map();
  for (const v of values) {
    const k = round(v);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/** A spacing value is on-grid if it's a multiple of 4px, or of 2px below 16px (half steps like 6px, 10px). */
export function onGrid(v) {
  const step = v < 16 ? 2 : 4;
  return Math.abs(v / step - Math.round(v / step)) < 0.01;
}

/** Share of spacing values (>= 2px) that sit on the grid. */
export function gridConformity(values) {
  const relevant = values.filter((v) => v >= 2);
  if (!relevant.length) return 1;
  return relevant.filter(onGrid).length / relevant.length;
}

/** Most common paragraph font size, falling back to the most common non-heading text size. */
export function bodyFontSize(data) {
  const para = histogram(data.paragraphs.map((p) => p.fontSize), Math.round);
  if (para.length) return para[0][0];
  const texts = histogram(data.texts.filter((t) => !/^h[1-6]$/.test(t.tag)).map((t) => t.fontSize), Math.round);
  return texts.length ? texts[0][0] : 16;
}

/** Contrast failures for collected text nodes. Skips text over background images (unknowable). */
export function contrastIssues(texts) {
  const seen = new Set();
  const out = [];
  for (const t of texts) {
    if (t.bgImage || !t.fontSize) continue;
    const bg = flattenBackground(t.bgLayers);
    const fg = composite(t.color, bg);
    const ratio = contrastRatio(fg, bg);
    const need = requiredRatio(t.fontSize, t.fontWeight);
    const key = t.sel + "|" + ratio;
    if (ratio < need && !seen.has(key)) {
      seen.add(key);
      out.push({ sel: t.sel, text: t.text, ratio, required: need });
    }
  }
  return out.sort((a, b) => a.ratio - b.ratio);
}

/** Produce findings from desktop + mobile page data. */
export function analyze(desktop, mobile) {
  const findings = [];
  const add = (criterion, severity, rule, message, items = []) =>
    findings.push({ criterion, severity, rule, message, items: items.slice(0, 8), count: items.length || undefined });

  const d = desktop;
  const m = mobile || desktop;

  // ---------- Hierarchy ----------
  const h1s = d.headings.filter((h) => h.level === 1);
  if (h1s.length === 0) add("Hierarchy", "error", "h1-missing", "No <h1> on the page.");
  if (h1s.length > 1) add("Hierarchy", "warn", "h1-multiple", `${h1s.length} <h1> elements; use one per page.`, h1s.map((h) => h.text));
  const bodySize = bodyFontSize(d);
  if (h1s[0] && h1s[0].fontSize / bodySize < 1.8)
    add("Hierarchy", "warn", "h1-weak", `<h1> is only ${(h1s[0].fontSize / bodySize).toFixed(1)}× body size (${h1s[0].fontSize}px vs ${bodySize}px). Aim for 2.5× or more on landing pages.`);

  // ---------- Typography ----------
  const families = histogram(d.texts.map((t) => t.fontFamily)).filter(([f]) => !/mono|courier|consolas|menlo/i.test(f));
  if (families.length > 2) add("Typography", "warn", "font-families", `${families.length} font families in use; keep to 2.`, families.map(([f, c]) => `${f} (${c})`));
  const sizes = histogram(d.texts.map((t) => t.fontSize), (v) => Math.round(v));
  if (sizes.length > 10) add("Typography", "warn", "type-scale", `${sizes.length} distinct font sizes; use a tighter type scale (≈ 6–9 steps).`, sizes.map(([s, c]) => `${s}px ×${c}`));
  const tightBody = d.paragraphs.filter((p) => p.fontSize < 24 && p.lineHeight && p.lineHeight / p.fontSize < 1.4);
  if (tightBody.length) add("Typography", "warn", "line-height", "Paragraph line-height below 1.4.", tightBody.map((p) => `${p.sel} (${(p.lineHeight / p.fontSize).toFixed(2)})`));
  const wide = d.paragraphs.filter((p) => p.measure > 85);
  if (wide.length) add("Typography", "warn", "measure", "Lines longer than ~85 characters; cap paragraphs around 65ch.", wide.map((p) => `${p.sel} (~${p.measure}ch)`));
  const looseHeadings = d.headings.filter((h) => h.fontSize >= 32 && h.letterSpacing >= 0);
  if (looseHeadings.length)
    add("Typography", "info", "heading-tracking", "Large headings with default tracking; -0.02em to -0.04em usually reads more refined.", looseHeadings.map((h) => `${h.text} (${h.fontSize}px)`));

  // ---------- Spacing ----------
  const conformity = gridConformity(d.spacing);
  const offGrid = histogram(d.spacing.filter((v) => v >= 2 && !onGrid(v)));
  if (conformity < 0.7) add("Spacing", "error", "spacing-grid", `Only ${Math.round(conformity * 100)}% of spacing values sit on the 4px grid (2px half-steps allowed under 16px).`, offGrid.map(([v, c]) => `${v}px ×${c}`));
  else if (conformity < 0.85) add("Spacing", "warn", "spacing-grid", `${Math.round(conformity * 100)}% of spacing values sit on the 4px grid; aim for 85%+.`, offGrid.map(([v, c]) => `${v}px ×${c}`));
  const radii = histogram(d.radii);
  if (radii.length > 5) add("Spacing", "warn", "radii", `${radii.length} distinct border radii; keep 2–4.`, radii.map(([r, c]) => `${r}px ×${c}`));

  // ---------- Components ----------
  const colors = histogram(d.texts.map((t) => t.color.join(",")));
  if (colors.length > 12) add("Components", "warn", "text-colors", `${colors.length} distinct text colors; consolidate into a few neutrals + accent.`);
  const shadows = histogram(d.shadows);
  if (shadows.length > 4) add("Components", "warn", "shadows", `${shadows.length} distinct box-shadows; keep 2–3 elevation levels.`);
  const clickDivs = d.interactive.filter((i) => i.clickableNonInteractive);
  if (clickDivs.length) add("Components", "error", "clickable-div", "Clickable non-interactive elements; use <button> or <a>.", clickDivs.map((i) => i.sel));

  // ---------- Visuals ----------
  const broken = d.images.filter((i) => i.broken);
  if (broken.length) add("Visuals", "error", "broken-images", "Images failed to load.", broken.map((i) => i.src));
  const distorted = d.images.filter((i) => i.naturalRatio && i.renderedRatio && i.objectFit === "fill" && Math.abs(i.naturalRatio / i.renderedRatio - 1) > 0.05);
  if (distorted.length) add("Visuals", "warn", "distorted-images", "Images stretched out of their ratio; use object-fit: cover and a fixed aspect-ratio.", distorted.map((i) => i.sel));
  const noDims = d.images.filter((i) => !i.hasDimensions);
  if (noDims.length) add("Visuals", "info", "image-dimensions", "Images without width/height attributes (layout shift).", noDims.map((i) => i.sel));

  // ---------- Content ----------
  if (d.lorem) add("Content", "error", "lorem", "Placeholder lorem ipsum text found.");
  if (d.vagueLinks) add("Content", "warn", "vague-links", `${d.vagueLinks} vague link label(s) like "click here" / "read more"; use verb + object.`);
  if (!d.title) add("Content", "warn", "title", "Missing <title>.");

  // ---------- Responsive ----------
  if (!m.hasViewportMeta) add("Responsive", "error", "viewport-meta", 'Missing <meta name="viewport">.');
  if (m.overflowX > 1) add("Responsive", "error", "overflow", `Horizontal overflow of ${m.overflowX}px on mobile.`);
  const targets = m.interactive.filter((i) => !i.inline && i.width > 0);
  const isControl = (i) => i.tag !== "a";
  const tiny = targets.filter((i) => (i.width < 24 || i.height < 24) && isControl(i));
  if (tiny.length) add("Responsive", "error", "tap-target-min", "Controls under 24px (WCAG 2.2 target size minimum).", tiny.map((i) => `${i.sel} ${i.width}×${i.height}`));
  const small = targets.filter((i) => !tiny.includes(i) && i.height < 36 && (isControl(i) || i.height < 24));
  if (small.length > 2) add("Responsive", "warn", "tap-target", "Touch targets under 36px tall on mobile (44px is comfortable; standalone text links need ≥ 24px or spacing).", small.map((i) => `${i.sel} ${i.width}×${i.height}`));
  const tinyText = m.texts.filter((t) => t.fontSize < 12 && t.chars > 3);
  if (tinyText.length) add("Responsive", "warn", "tiny-text", "Text below 12px on mobile.", tinyText.map((t) => `${t.sel} ${t.fontSize}px "${t.text}"`));
  const smallBody = m.paragraphs.filter((p) => p.fontSize < 15);
  if (smallBody.length) add("Responsive", "warn", "mobile-body-size", "Paragraph text under 15px on mobile; use 16px.", smallBody.map((p) => `${p.sel} ${p.fontSize}px`));

  // ---------- Accessibility ----------
  const contrast = [...contrastIssues(d.texts), ...contrastIssues(m.texts)];
  const uniqueContrast = [...new Map(contrast.map((c) => [c.sel + c.ratio, c])).values()];
  if (uniqueContrast.length)
    add("Accessibility", uniqueContrast.length > 3 ? "error" : "warn", "contrast", "Text below WCAG AA contrast.", uniqueContrast.map((c) => `${c.sel} "${c.text}" ${c.ratio}:1 (needs ${c.required}:1)`));
  const noAlt = d.images.filter((i) => !i.hasAlt);
  if (noAlt.length) add("Accessibility", "error", "img-alt", "Images without an alt attribute.", noAlt.map((i) => i.src));
  const unlabeled = d.fields.filter((f) => !f.labelled);
  if (unlabeled.length) add("Accessibility", "error", "form-labels", "Form fields without a label.", unlabeled.map((f) => f.sel));
  const nameless = d.interactive.filter((i) => !i.hasName);
  if (nameless.length) add("Accessibility", "error", "accessible-name", "Interactive elements without an accessible name (icon buttons need aria-label).", nameless.map((i) => i.sel));
  if (!d.lang) add("Accessibility", "warn", "lang", "Missing lang attribute on <html>.");
  const levels = d.headings.map((h) => h.level);
  const skips = levels.filter((l, i) => i > 0 && l - levels[i - 1] > 1);
  if (skips.length) add("Accessibility", "warn", "heading-order", "Heading levels skip (e.g. h2 → h4).");

  return findings;
}

/** Score 1–5 per criterion from findings. Criteria that can't be fully measured are flagged. */
export function score(findings) {
  const scores = {};
  for (const c of CRITERIA) {
    const penalty = findings.filter((f) => f.criterion === c).reduce((s, f) => s + PENALTY[f.severity], 0);
    scores[c] = Math.max(1, Math.round((5 - penalty) * 2) / 2);
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { scores, total, max: CRITERIA.length * 5 };
}

/** Design-token summary useful for both audits and reference extraction. */
export function summarizeTokens(data) {
  const byChars = new Map();
  for (const t of data.texts) byChars.set(t.fontFamily, (byChars.get(t.fontFamily) || 0) + t.chars);
  const totalChars = [...byChars.values()].reduce((a, b) => a + b, 0) || 1;
  const fonts = [...byChars.entries()].sort((a, b) => b[1] - a[1]).map(([f, c]) => ({ family: f, share: Math.round((c / totalChars) * 100) }));
  const typeScale = histogram(data.texts.map((t) => t.fontSize), Math.round).map(([s]) => s).sort((a, b) => b - a);
  const weights = histogram(data.texts.map((t) => t.fontWeight)).map(([w]) => w).sort((a, b) => a - b);
  const headings = data.headings.slice(0, 6).map((h) => ({
    level: h.level,
    fontSize: h.fontSize,
    letterSpacingEm: h.fontSize ? Math.round((h.letterSpacing / h.fontSize) * 1000) / 1000 : 0,
    lineHeight: h.lineHeight && h.fontSize ? Math.round((h.lineHeight / h.fontSize) * 100) / 100 : null,
    text: h.text,
  }));
  return {
    fonts,
    typeScale,
    weights,
    headings,
    spacing: histogram(data.spacing, Math.round).slice(0, 12).map(([v, c]) => ({ px: v, count: c })),
    gridConformity: Math.round(gridConformity(data.spacing) * 100),
    radii: histogram(data.radii).slice(0, 6).map(([v, c]) => ({ px: v, count: c })),
    shadows: histogram(data.shadows).slice(0, 4).map(([v, c]) => ({ value: v, count: c })),
  };
}
