// Visual regression: pixel comparison of two renderings, with a tolerance, changed regions, and the elements
// under them. diffImages runs inside a blank browser page (canvas); the rest is pure and unit-tested.

export const CELL = 40;

/** Compares two PNGs (base64) over their common area. ignore = grid cells to skip (dynamic content). */
export async function diffImages({ a64, b64, threshold, cell, ignore }) {
  const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = "data:image/png;base64," + s; });
  const [A, B] = await Promise.all([load(a64), load(b64)]);
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const pixels = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const da = pixels(A), db = pixels(B);
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const cells = new Uint32Array(cols * rows);
  const skip = new Set(ignore);
  const out = new Uint8ClampedArray(w * h * 4);
  let changed = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, ci = ((y / cell) | 0) * cols + ((x / cell) | 0);
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > threshold && !skip.has(ci)) { changed++; cells[ci]++; out[i] = 255; out[i + 1] = 0; out[i + 2] = 60; out[i + 3] = 255; }
      else { out[i] = db[i]; out[i + 1] = db[i + 1]; out[i + 2] = db[i + 2]; out[i + 3] = 70; }
    }
  }
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").putImageData(new ImageData(out, w, h), 0, 0);
  return { w, h, heightA: A.height, heightB: B.height, changed, cells: Array.from(cells), cols, rows, png: c.toDataURL("image/png").split(",")[1] };
}

/** Connected groups of changed grid cells, as boxes in pixels, biggest first. */
export function regionsFromCells(cells, cols, rows, cell = CELL, minPixels = Math.ceil(cell * cell * 0.01)) {
  const on = (i) => cells[i] >= minPixels;
  const seen = new Uint8Array(cells.length);
  const regions = [];
  for (let s = 0; s < cells.length; s++) {
    if (seen[s] || !on(s)) continue;
    const stack = [s]; seen[s] = 1;
    let x0 = cols, y0 = rows, x1 = 0, y1 = 0, px = 0;
    while (stack.length) {
      const i = stack.pop(), cx = i % cols, cy = (i / cols) | 0;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy); px += cells[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = ny * cols + nx;
        if (!seen[n] && on(n)) { seen[n] = 1; stack.push(n); }
      }
    }
    regions.push({ x: x0 * cell, y: y0 * cell, w: (x1 - x0 + 1) * cell, h: (y1 - y0 + 1) * cell, pixels: px });
  }
  return regions.sort((a, b) => b.w * b.h - a.w * a.h);
}

/** Grid cells that moved between two shots of the SAME page: clocks, carousels, ads. They are not regressions. */
export function unstableCells(cells) {
  const out = [];
  cells.forEach((n, i) => { if (n > 0) out.push(i); });
  return out;
}

/** Result for one size. tolerance is a percentage of compared pixels; layoutShift a percentage of page height. */
export function judge({ changed, w, h, heightA, heightB }, { tolerance = 1, layoutShift = 5 } = {}) {
  const percent = w && h ? +((changed / (w * h)) * 100).toFixed(2) : 0;
  const delta = heightA ? +(((heightB - heightA) / heightA) * 100).toFixed(1) : 0;
  const reasons = [];
  if (percent > tolerance) reasons.push(`${percent}% of the pixels changed (tolerance ${tolerance}%)`);
  if (Math.abs(delta) > layoutShift) reasons.push(`the page is ${Math.abs(delta)}% ${delta > 0 ? "taller" : "shorter"} (${heightA}px → ${heightB}px)`);
  return { percent, heightDelta: delta, verdict: reasons.length ? "changed" : "same", reasons };
}

export function formatVisualDiff(results, opts) {
  const lines = [`Visual comparison: tolerance ${opts.tolerance}% of pixels, layout shift ${opts.layoutShift}% of height${opts.autoMask ? ", moving content masked automatically" : ""}`];
  for (const r of results) {
    lines.push(`  ${r.verdict === "same" ? "✓" : "✗"} ${r.size}px: ${r.percent}% changed${r.heightDelta ? `, height ${r.heightDelta > 0 ? "+" : ""}${r.heightDelta}%` : ""}${r.maskedCells ? ` · ${r.maskedCells} unstable cell(s) ignored` : ""}`);
    for (const why of r.reasons) lines.push(`      ${why}`);
    for (const g of r.regions.slice(0, 6)) lines.push(`      at y=${g.y}px (${g.w}×${g.h}): ${g.element || "?"}`);
    if (r.diffFile) lines.push(`      diff image: ${r.diffFile}`);
  }
  lines.push("A changed pixel is not a defect: after a redesign most of the page should change. After a refactor, nothing should.");
  return lines.join("\n");
}
