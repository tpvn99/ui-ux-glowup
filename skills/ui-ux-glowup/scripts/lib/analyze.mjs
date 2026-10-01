// Pure analysis of data collected by probe.mjs. No browser needed — fully unit-testable.
import { flattenBackground, composite, contrastRatio, requiredRatio } from "./color.mjs";

export const CRITERIA = ["Hierarchy", "Typography", "Spacing", "Components", "Visuals", "Content", "Responsive", "Accessibility", "SEO"];

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
  const root = d.rootFontSize || 16;
  if (root !== 16) {
    const fractional = d.spacing.filter((v) => !Number.isInteger(v)).length / (d.spacing.length || 1);
    add(
      "Spacing",
      fractional > 0.3 ? "error" : "warn",
      "root-font-size",
      `Root cause: <html> font-size is ${root}px instead of 16px, so every rem value (Tailwind spacing, text sizes, radii) is scaled by ${(root / 16).toFixed(4)} and ${Math.round(fractional * 100)}% of spacing values land on fractions. Set html { font-size: 100% } and size things with the scale instead.`,
      offGrid.slice(0, 6).map(([v, c]) => `${v}px ×${c}`)
    );
  } else if (conformity < 0.7) add("Spacing", "error", "spacing-grid", `Only ${Math.round(conformity * 100)}% of spacing values sit on the 4px grid (2px half-steps allowed under 16px).`, offGrid.map(([v, c]) => `${v}px ×${c}`));
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

  // ---------- Wrapping & clipping (checked at both widths) ----------
  const views = [["desktop", d], ["mobile", m]].filter(([, v], i, arr) => i === 0 || v !== arr[0][1]);
  const wrappedNumbers = new Map();
  const wrappedControls = new Map();
  const clipped = new Map();
  for (const [label, v] of views) {
    for (const t of v.texts || []) if (t.isNumber && t.lines > 1) wrappedNumbers.set(t.sel + t.text, `${t.sel} "${t.text}" (${label}, ${t.lines} lines)`);
    for (const i of v.interactive || [])
      if (["button", "a", "summary"].includes(i.tag) && !i.inline && i.lines > 1 && i.text.length <= 28) wrappedControls.set(i.sel + i.text, `${i.sel} "${i.text}" (${label})`);
    for (const c of v.clipped || []) clipped.set(c.sel + label, { ...c, label });
  }
  if (wrappedNumbers.size) add("Responsive", "error", "wrapped-number", "Numbers break across lines; keep amounts on one line (white-space: nowrap + tabular-nums) and give the column room.", [...wrappedNumbers.values()]);
  if (wrappedControls.size) add("Components", "warn", "wrapped-control", "Button or link labels wrap onto two lines; shorten the label, add whitespace-nowrap, or let the control shrink others.", [...wrappedControls.values()]);
  const cut = [...clipped.values()].filter((c) => !c.scrollable);
  const scroll = [...clipped.values()].filter((c) => c.scrollable);
  if (cut.length) add("Responsive", "error", "clipped-content", "Content is cut off by an overflow: hidden container and can't be reached.", cut.map((c) => `${c.sel} (${c.label}) hides "${c.examples.join('", "')}"`));
  if (scroll.length)
    add("Responsive", "warn", "hidden-scroll-content", "Content sits off-screen in a horizontal scroll area; key columns (totals, status, actions) should stay visible — stack or drop secondary columns on mobile.", scroll.map((c) => `${c.sel} (${c.label}, ${c.hiddenPx}px hidden) e.g. "${c.examples.join('", "')}"`));

  // ---------- Mobile interaction (clicks, forms, sliders) ----------
  const mi = m.mobile;
  if (mi) {
    if (mi.zoomBlocked) add("Accessibility", "error", "zoom-blocked", "The viewport meta blocks pinch-zoom (user-scalable=no / maximum-scale=1); remove it — users with low vision need to zoom.");
    if (mi.smallInputs?.length) add("Responsive", "warn", "input-zoom", "Form fields under 16px make iOS Safari zoom in on focus; use font-size: 16px on inputs.", mi.smallInputs.map((f) => `${f.sel} ${f.fontSize}px`));
    if (mi.crowded?.length) add("Responsive", "warn", "tap-crowded", "Touch targets under 36px packed less than 8px apart — easy to hit the wrong one on a phone; add spacing or enlarge them (44px is comfortable).", mi.crowded.map((c) => `${c.sel}${c.text ? ` "${c.text}"` : ""} ↔ ${c.other} (${c.gap}px)`));
    const big = (mi.overlays || []).filter((o) => o.coverage >= 25);
    if (big.length) add("Responsive", big.some((o) => o.coverage >= 40) ? "error" : "warn", "fixed-overlay", "Fixed/sticky elements cover a large part of the mobile screen; shrink them, make them dismissible, or only stick a slim bar.", big.map((o) => `${o.sel} covers ${o.coverage}% (${o.position})`));
    if (mi.touchBlockers?.length) add("Responsive", "warn", "touch-blocked", "Large areas with touch-action: none block scrolling on phones.", mi.touchBlockers);
  }
  const cars = [...(d.mobile?.carousels || []), ...(mi?.carousels || [])].filter((c, i, arr) => arr.findIndex((x) => x.sel === c.sel) === i);
  const noSnap = cars.filter((c) => c.kind === "native" && !c.snap);
  if (noSnap.length) add("Components", "warn", "carousel-snap", "Swipe areas without scroll-snap stop between slides; add scroll-snap-type: x mandatory on the track and scroll-snap-align on items.", noSnap.map((c) => `${c.sel} (${c.items} items)`));
  const unnamed = cars.filter((c) => c.controls > c.namedControls);
  if (unnamed.length) add("Accessibility", "warn", "carousel-controls", "Slider arrows without an accessible name; add aria-label=\"Previous slide\" / \"Next slide\".", unnamed.map((c) => c.sel));
  const tinyCtl = cars.filter((c) => c.smallControls > 0);
  if (tinyCtl.length) add("Responsive", "warn", "carousel-small-controls", "Slider controls under 32px are hard to tap; use at least 40–44px.", tinyCtl.map((c) => `${c.sel} (${c.smallControls} small)`));
  const noCue = cars.filter((c) => c.kind === "native" && !c.indicators && c.controls === 0);
  if (noCue.length) add("Components", "info", "carousel-affordance", "Horizontal lists with no arrows or dots: let the next item peek (~15%) so people know they can swipe.", noCue.map((c) => c.sel));

  // ---------- Space between blocks ----------
  for (const [label, v, min] of [["desktop", d, 24], ["mobile", m, 20]]) {
    const gaps = (v.sectionGaps || []).filter((g) => g.gap > -1);
    const tight = gaps.filter((g) => g.gap < min);
    if (tight.length) add("Spacing", "warn", `section-gap-${label}`, `Blocks almost touching on ${label} (< ${min}px of air between their content); give sections consistent vertical padding.`, tight.map((g) => `${g.between[0]} → ${g.between[1]}: ${g.gap}px`));
    const roomy = gaps.filter((g) => g.gap >= 16).map((g) => g.gap);
    if (label === "desktop" && roomy.length >= 3 && Math.max(...roomy) / Math.min(...roomy) > 3)
      add("Spacing", "warn", "section-rhythm", `Uneven rhythm between sections (${Math.min(...roomy)}px to ${Math.max(...roomy)}px); use one or two section spacings (e.g. 96/128px desktop, 64px mobile).`, gaps.map((g) => `${g.between[1]}: ${g.gap}px`));
  }

  // ---------- SEO ----------
  const seo = d.seo;
  if (seo) {
    if (!seo.title) add("SEO", "error", "seo-title", "Missing <title>.");
    else if (seo.title.length < 25 || seo.title.length > 65) add("SEO", "warn", "seo-title-length", `Title is ${seo.title.length} characters; aim for 30–60, main topic first, brand last.`, [seo.title]);
    if (!seo.description) add("SEO", "error", "seo-description", "Missing meta description (the snippet under the result in Google).");
    else if (seo.description.length < 70 || seo.description.length > 165) add("SEO", "warn", "seo-description-length", `Meta description is ${seo.description.length} characters; aim for 120–160.`, [seo.description]);
    if (/noindex/i.test(seo.robots)) add("SEO", "error", "seo-noindex", "Page is set to noindex — it won't appear in search results. Intended?");
    if (!seo.ogTitle || !seo.ogImage) add("SEO", "warn", "seo-open-graph", "Missing Open Graph tags (og:title, og:description, og:image): links shared on social apps and messengers look empty.");
    if (!seo.favicon) add("SEO", "warn", "seo-favicon", "No favicon — the tab and search result show a blank icon. Use scripts/make-favicon.mjs.");
    if (!seo.canonical) add("SEO", "info", "seo-canonical", "No canonical URL; add <link rel=\"canonical\"> on indexable pages.");
    if (!seo.jsonLd) add("SEO", "info", "seo-structured-data", "No structured data (JSON-LD): LocalBusiness, Product, Organization or FAQ markup can earn rich results.");
    if (seo.words && seo.words < 120 && d.headings.some((h) => h.level === 1)) add("SEO", "info", "seo-thin", `Only ~${seo.words} words of content; pages that should rank usually need more substance (not filler).`);
  }
  const imgs = d.images || [];
  const legacy = imgs.filter((i) => ["png", "jpg", "jpeg", "gif"].includes(i.format) && i.naturalWidth > 300);
  if (legacy.length >= 2) add("SEO", "warn", "image-format", "Photos served as JPG/PNG; WebP or AVIF are 25–50% lighter and speed up the page (Core Web Vitals).", legacy.map((i) => `${i.src} (${i.format})`));
  const heavy = imgs.filter((i) => i.naturalWidth > 1000 && i.renderedWidth && i.naturalWidth > i.renderedWidth * 2.5);
  if (heavy.length) add("SEO", "warn", "image-oversized", "Images much larger than their displayed size; resize or use srcset.", heavy.map((i) => `${i.src} ${i.naturalWidth}px shown at ${i.renderedWidth}px`));
  const eager = imgs.filter((i) => i.belowFold && !i.lazy);
  if (eager.length >= 2) add("SEO", "info", "image-lazy", "Below-the-fold images without loading=\"lazy\".", eager.map((i) => i.src));

  // ---------- Readability ----------
  const rd = d.readability || [];
  const longPara = rd.filter((p) => p.words > 90);
  if (longPara.length) add("Content", "warn", "long-paragraphs", "Paragraphs over ~90 words are skipped on screens; split them (one idea each, 2–4 sentences).", longPara.map((p) => `${p.sel} ${p.words} words "${p.text}…"`));
  const longSent = rd.filter((p) => p.avgSentence > 28 && p.words > 30);
  if (longSent.length) add("Content", "warn", "long-sentences", "Sentences average over 28 words; shorter sentences read faster (15–20 words).", longSent.map((p) => `${p.sel} ~${p.avgSentence} words/sentence`));
  const justified = rd.filter((p) => p.justified);
  if (justified.length) add("Typography", "warn", "justified-text", "Justified text creates uneven gaps (rivers) on screens, worst on mobile; align left.", justified.map((p) => p.sel));
  const caps = rd.filter((p) => p.uppercase);
  if (caps.length) add("Typography", "warn", "uppercase-text", "Long passages in uppercase are hard to read; keep caps for short labels.", caps.map((p) => p.sel));
  const smallBodyDesk = d.paragraphs.filter((p) => p.fontSize < 15);
  if (smallBodyDesk.length > 1) add("Typography", "warn", "body-size", "Body paragraphs under 15px on desktop; 16–18px reads comfortably.", smallBodyDesk.map((p) => `${p.sel} ${p.fontSize}px`));

  // ---------- "AI look" ----------
  const ai = d.aiLook;
  if (ai) {
    if (ai.gradients.length) add("Visuals", "warn", "ai-gradient", "Large purple→blue/pink gradients — the most recognizable \"AI template\" signature. Use the brand color flat, or a subtle same-hue gradient.", ai.gradients);
    if (ai.glass > 3) add("Visuals", "warn", "ai-glass", `${ai.glass} glassmorphism (backdrop blur) surfaces outside the header; keep blur for overlays and sticky bars.`);
    if (ai.radiusElements > 6 && ai.bigRadius / ai.radiusElements > 0.5) add("Visuals", "warn", "ai-radius", "Most surfaces use very large radii (≥ 24px); use 8–12px for cards, reserve large radii for a few hero elements.", ai.bigRadiusSample);
    if (ai.identicalCards.length) add("Visuals", "warn", "ai-identical-cards", "Row of 3–4 identical icon + title + text cards — the default AI layout. Vary sizes (bento), use real visuals, or a numbered list.", ai.identicalCards);
    if (ai.emoji.length) add("Content", "warn", "ai-emoji", "Emojis in headings or buttons read as generated; use proper icons or none.", ai.emoji);
    if (ai.cliches.length) add("Content", "warn", "ai-cliche", "Generic marketing phrases (\"Transform your…\", \"Unlock…\", \"seamless\", \"innovative solutions\"); say what the product concretely does.", ai.cliches);
    if (ai.heroPills?.length) add("Visuals", "warn", "ai-hero-pill", "A pill / badge / announcement above the main heading (\"New\", \"Now live\", dot + label) — the most copied AI-template opener. Start with the headline; say it in the headline or the first paragraph.", ai.heroPills);
    if (ai.statusDots?.length) add("Visuals", "warn", "ai-status-dot", "Small green or pulsing status dots next to a label (\"Available\", \"Live\", \"Now open\") read as decoration. Keep them only for a real, live status in a product UI.", ai.statusDots);
    if (ai.accentBorders?.length) add("Visuals", "warn", "ai-accent-border", "Colored thick border on one side of a block (left or top accent bar) — a strong AI-template signature. Use a hairline all around, a background tint, or nothing.", ai.accentBorders);
    if (ai.iconTiles?.length >= 3) add("Visuals", "warn", "ai-icon-tile", `${ai.iconTiles.length} icons inside small tinted rounded squares — the default AI feature card. Show the icon bare, larger, or replace it with a real visual.`, ai.iconTiles.slice(0, 4));
    if (ai.gradientText?.length) add("Visuals", "warn", "ai-gradient-text", "Gradient-filled text. Use a solid ink color; emphasis through weight, size or a serif italic.", ai.gradientText);
    if (ai.glows?.length) add("Visuals", "warn", "ai-glow", "Large colored glow shadows behind elements. Use one neutral elevation system (border + soft layered shadow).", ai.glows);
    if (ai.centeredShare > 75) add("Visuals", "info", "ai-centered", `${ai.centeredShare}% of headings and paragraphs are centered; left-aligned editorial layouts read as more intentional.`);
  }

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

  const ax = d.a11y;
  if (ax) {
    if (ax.focusInvisible.length) add("Accessibility", ax.focusInvisible.length > 2 ? "error" : "warn", "focus-invisible", `Keyboard focus is not visible on ${ax.focusInvisible.length} of ${ax.focusChecked} controls checked (outline removed, nothing replaces it). Add a 2px ring with \`:focus-visible\`.`, ax.focusInvisible);
    if (ax.animated > 0 && !ax.reducedMotion) add("Accessibility", "warn", "reduced-motion", `${ax.animated} animated element(s) and no \`prefers-reduced-motion\` rule; turn animations off for people who ask for it.`);
  }

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
