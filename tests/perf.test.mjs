import { test, after } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { perfFindings } from "../skills/ui-ux-glowup/scripts/lib/perf.mjs";
import { perf } from "../skills/ui-ux-glowup/scripts/perf.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";

const crc32 = (buf) => { let c, crc = -1; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ -1) >>> 0; };
const png = (w, h, noisy) => {
  const row = 1 + w * 3;
  const raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) { raw[y * row] = 0; if (noisy) randomBytes(w * 3).copy(raw, y * row + 1); else raw.fill(120, y * row + 1, (y + 1) * row); }
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]); const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b) >>> 0); return Buffer.concat([len, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

const below = [1, 2, 3, 4].map((i) => `<img src="/s${i}.png" width="100" height="60" alt="">`).join("");
const pages = {
  "/bad.html": `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Bad</title><script src="/blocking.js"></script>
<style>@font-face{font-family:X;src:url(/x.woff2)}</style></head><body>
<img src="/hero.png" loading="lazy" width="600" height="300" alt="hero"><img src="/noisy.png" width="200" height="130" alt="">
<div style="height:2400px"></div>${below}</body></html>`,
  "/good.html": `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Good</title><script src="/blocking.js" defer></script>
<style>@font-face{font-family:X;src:url(/x.woff2);font-display:swap}</style></head><body>
<img src="/small.png" width="300" height="150" fetchpriority="high" alt="hero"><h1>Hello</h1></body></html>`,
};
const assets = { ...Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`/lib-${i}.js`, ["text/javascript", Buffer.from(`window.__${i}={start(){}}`)]])),  "/blocking.js": ["text/javascript", Buffer.from("window.x=1")], "/hero.png": ["image/png", png(2400, 1200)], "/noisy.png": ["image/png", png(500, 330, true)], "/small.png": ["image/png", png(600, 300)] };
for (let i = 1; i <= 4; i++) assets[`/s${i}.png`] = ["image/png", png(200, 120)];
const server = createServer((req, res) => {
  const p = req.url.split("?")[0];
  if (p === "/fragile.html") { res.setHeader("content-type", "text/html"); return res.end(readFileSync(new URL("./fixtures/fragile.html", import.meta.url))); }
  if (pages[p]) { res.setHeader("content-type", "text/html"); return res.end(pages[p]); }
  if (assets[p]) { res.setHeader("content-type", assets[p][0]); return res.end(assets[p][1]); }
  res.statusCode = 404; res.end();
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

const rules = (l) => l.map((f) => f.rule).sort();
const D = (o = {}) => ({
  metrics: { lcp: 1200, fcp: 800, ttfb: 100, cls: 0.01, tbt: 50, longTasks: 0, lcpEl: null, ...(o.metrics || {}) },
  resources: o.resources || [], images: o.images || [],
  page: { blockingScripts: [], fontFaces: 0, fontsNoDisplay: 0, costlyEffects: 0, viewportH: 844, ...(o.page || {}) },
});
const res = (type, kb, url = `https://x.test/${type}-${kb}.bin`, thirdParty = false) => ({ type, bytes: kb * 1024, url, thirdParty });

test("a fast light page has no finding", () => assert.deepEqual(perfFindings(D()), []));

test("Core Web Vitals thresholds: warning then error", () => {
  assert.deepEqual(rules(perfFindings(D({ metrics: { lcp: 3000, cls: 0.15, tbt: 300 } }))), ["cls-high", "lcp-slow", "tbt-high"]);
  const e = perfFindings(D({ metrics: { lcp: 5000, cls: 0.3, tbt: 700 } }));
  assert.ok(e.every((f) => f.severity === "error"));
});

test("weight: heavy page, heavy JS, heavy libraries, third parties, fonts", () => {
  const r = [res("script", 200, "https://cdn.test/@tailwindcss/browser@4"), res("script", 200, "https://x.test/jquery-3.7.min.js"), res("script", 200, "https://x.test/moment.min.js"), res("image", 2000), res("font", 400, "https://x.test/a.woff2")];
  const hl = perfFindings(D({ resources: r }));
  assert.deepEqual(rules(hl), ["fonts-heavy", "heavy-library", "js-heavy", "page-heavy"]);
  assert.ok(hl.find((f) => f.rule === "heavy-library").items.some((i) => /Tailwind/.test(i)));
  const third = Array.from({ length: 13 }, (_, i) => res("script", 1, `https://t${i}.test/a.js`, true));
  assert.deepEqual(rules(perfFindings(D({ resources: third }))), ["third-party-heavy"]);
});

test("images: oversized, heavy, below the fold, LCP lazy or without priority", () => {
  const img = (o) => ({ sel: "img", src: "https://x.test/a.png", nat: [2400, 1200], box: [600, 300], dpr: 1, top: 0, lazy: false, fetchpriority: null, hasDims: true, visible: true, ...o });
  assert.deepEqual(rules(perfFindings(D({ images: [img()] }))), ["image-oversized"]);
  assert.deepEqual(rules(perfFindings(D({ images: [img({ nat: [800, 400], src: "https://x.test/b.png" })], resources: [res("image", 400, "https://x.test/b.png")] }))), ["image-heavy"]);
  const far = [1, 2, 3].map((i) => img({ nat: [300, 200], box: [300, 200], top: 3000, src: `https://x.test/${i}.png` }));
  assert.deepEqual(rules(perfFindings(D({ images: far }))), ["below-fold-not-lazy"]);
  const lazyLcp = { sel: "img", isImg: true, src: "https://x.test/h.png", loading: "lazy", fetchpriority: null };
  assert.deepEqual(rules(perfFindings(D({ metrics: { lcpEl: lazyLcp } }))), ["lcp-lazy"]);
  assert.deepEqual(rules(perfFindings(D({ metrics: { lcp: 3000, lcpEl: { ...lazyLcp, loading: null } } }))), ["lcp-no-priority", "lcp-slow"]);
});

test("page: blocking scripts, font-display, costly effects; every finding has a fix", () => {
  const f = perfFindings(D({ page: { blockingScripts: ["app.js"], fontFaces: 2, fontsNoDisplay: 2, costlyEffects: 9 } }));
  assert.deepEqual(rules(f), ["costly-effects", "font-display-missing", "render-blocking-script"]);
  assert.ok(f.every((x) => x.fix.length > 15));
});

test("perf.mjs measures a real page and finds the causes, and passes a clean one", { skip }, async () => {
  const bad = await perf(`${base}/bad.html`, { profile: "fast" });
  const got = rules(bad.findings);
  for (const x of ["lcp-lazy", "image-oversized", "image-heavy", "render-blocking-script", "font-display-missing", "below-fold-not-lazy"]) assert.ok(got.includes(x), `${x} in ${got}`);
  assert.ok(bad.requests >= 8 && bad.weightBytes > 300 * 1024);
  const good = await perf(`${base}/good.html`, { profile: "fast" });
  assert.deepEqual(rules(good.findings), [], JSON.stringify(good.findings));
});

test("animations: layout-property animations and swarms are reported, a compositor-only animation is not", () => {
  const page = (o) => ({ blockingScripts: [], fontFaces: 0, fontsNoDisplay: 0, costlyEffects: 0, viewportH: 844, runningAnimations: 1, layoutAnims: [], bodyText: 500, hasH1: true, ...o });
  assert.deepEqual(rules(perfFindings(D({ page: page({ layoutAnims: ["div#bar animates width"], runningAnimations: 15 }) }))), ["animates-layout", "many-animations"]);
  assert.deepEqual(rules(perfFindings(D({ page: page({}) }))), []);
});

test("resilience: a page that throws or empties when requests are lost is reported", () => {
  const page = { blockingScripts: [], fontFaces: 0, fontsNoDisplay: 0, costlyEffects: 0, viewportH: 844, runningAnimations: 0, layoutAnims: [], bodyText: 500, hasH1: true };
  assert.deepEqual(rules(perfFindings({ ...D(), page, resilience: { failed: 3, errors: 2, bodyText: 500, hasH1: true } })), ["breaks-on-failed-requests"]);
  assert.deepEqual(rules(perfFindings({ ...D(), page, resilience: { failed: 3, errors: 0, bodyText: 80, hasH1: true } })), ["breaks-on-failed-requests"]);
  assert.deepEqual(rules(perfFindings({ ...D(), page, resilience: { failed: 3, errors: 0, bodyText: 500, hasH1: true } })), []);
});

test("real pages: layout animation found, calm animation clean; the flaky profile loses the same requests every run and flags a fragile page", { skip }, async () => {
  const bad = await perf(fileURLToPath(new URL("./fixtures/anim-bad.html", import.meta.url)), { profile: "fast" });
  assert.ok(rules(bad.findings).includes("animates-layout") && rules(bad.findings).includes("many-animations"), rules(bad.findings).join());
  assert.deepEqual(rules((await perf(fileURLToPath(new URL("./fixtures/anim-good.html", import.meta.url)), { profile: "fast" })).findings), []);
  const runs = [];
  for (let i = 0; i < 2; i++) runs.push(await perf(`${base}/fragile.html`, { profile: "flaky" }));
  assert.ok(runs.every((r) => rules(r.findings).includes("breaks-on-failed-requests")), runs.map((r) => rules(r.findings).join()).join(" | "));
  assert.equal(runs[0].requests, runs[1].requests, "the same requests are lost on every run");
});
