// Pure color utilities (no browser needed). Colors are [r, g, b, a] with r,g,b in 0-255 and a in 0-1.

/** Composite a (possibly translucent) foreground over an opaque background. */
export function composite(fg, bg) {
  const a = fg[3] ?? 1;
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
    1,
  ];
}

/**
 * Resolve the effective opaque background from a stack of layers,
 * ordered from the element itself up to the root. Falls back to white.
 */
export function flattenBackground(layers, fallback = [255, 255, 255, 1]) {
  let result = fallback;
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer || layer[3] === 0) continue;
    result = composite(layer, result);
  }
  return result;
}

/** WCAG 2.x relative luminance. */
export function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio between two opaque colors, rounded to 2 decimals. */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** WCAG large text: >= 24px, or >= 18.66px (14pt) and bold (>= 700). */
export function isLargeText(fontSizePx, fontWeight) {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && Number(fontWeight) >= 700);
}

/** Minimum AA ratio for a given text size / weight. */
export function requiredRatio(fontSizePx, fontWeight) {
  return isLargeText(fontSizePx, fontWeight) ? 3 : 4.5;
}

export function toHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
