// In-page data collection. `collectPageData` is serialized and run inside the browser
// via page.evaluate, so it must stay self-contained (no imports, no outer variables).
// It only gathers raw measurements; all judgement happens in analyze.mjs (pure, testable).

export function collectPageData() {
  const MAX = 4000;

  // Normalize any CSS color (rgb, hsl, oklch, color(), named…) to [r,g,b,a] through a canvas.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgba = (value) => {
    if (!value || value === "transparent") return [0, 0, 0, 0];
    if (cache.has(value)) return cache.get(value);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const out = [d[0], d[1], d[2], Math.round((d[3] / 255) * 1000) / 1000];
    cache.set(value, out);
    return out;
  };

  const selector = (el) => {
    if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
    const cls = [...el.classList].filter((c) => !c.includes(":") && !c.includes("[")).slice(0, 2);
    const parent = el.parentElement ? el.parentElement.tagName.toLowerCase() + " > " : "";
    return parent + el.tagName.toLowerCase() + (cls.length ? "." + cls.join(".") : "");
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    let n = el;
    while (n && n !== document.documentElement) {
      if (getComputedStyle(n).opacity === "0") return false;
      if (n.hasAttribute && (n.hasAttribute("hidden") || n.hasAttribute("inert") || n.getAttribute("aria-hidden") === "true")) return false;
      n = n.parentElement;
    }
    return true;
  };

  const srOnly = (el) => {
    const r = el.getBoundingClientRect();
    return r.width <= 1 && r.height <= 1;
  };

  // Background stack from the element up to the first opaque layer.
  const backgroundStack = (el) => {
    const layers = [];
    let hasImage = false;
    let n = el;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") hasImage = true;
      const c = rgba(s.backgroundColor);
      if (c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
      n = n.parentElement;
    }
    return { layers, hasImage };
  };

  const px = (v) => (v === "normal" ? null : parseFloat(v));

  // Number of rendered lines for an element's content (1 = no wrap).
  // Only text boxes count (icons and mixed font sizes on one baseline don't), and boxes that
  // overlap vertically belong to the same line.
  const lineCount = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const q of range.getClientRects()) if (q.width > 0 && q.height > 0) rects.push(q);
    }
    rects.sort((a, b) => a.top - b.top);
    let lines = 0;
    let bottom = -Infinity;
    for (const q of rects) {
      if (q.top >= bottom - 2) {
        lines++;
        bottom = q.bottom;
      } else bottom = Math.max(bottom, q.bottom);
    }
    return Math.max(1, lines);
  };
  const NUMBER = /^[\s+\-−–]*(?:[€$£]\s?)?[\d][\d\s.,\u00a0\u202f]*\s?(?:€|\$|£|%|k|K|M|x|×)?$/;
  const all = [...document.body.querySelectorAll("*")].slice(0, MAX);

  const texts = [];
  const spacing = [];
  const radii = [];
  const shadows = [];
  const clipped = [];
  for (const el of all) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName.toUpperCase()) || el.closest("svg")) continue;
    if (!visible(el)) continue;
    const s = getComputedStyle(el);

    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const disabled = el.closest(":disabled, [aria-disabled=true]");
    if (ownText && !srOnly(el) && !disabled) {
      const r = el.getBoundingClientRect();
      const bg = backgroundStack(el);
      texts.push({
        sel: selector(el),
        tag: el.tagName.toLowerCase(),
        text: ownText.slice(0, 60),
        chars: ownText.length,
        fontSize: px(s.fontSize),
        fontWeight: Number(s.fontWeight) || 400,
        lineHeight: px(s.lineHeight),
        letterSpacing: px(s.letterSpacing) ?? 0,
        fontFamily: s.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        color: rgba(s.color),
        opacity: Number(s.opacity),
        bgLayers: bg.layers,
        bgImage: bg.hasImage,
        width: Math.round(r.width),
        lines: ownText.length <= 40 ? lineCount(el) : null,
        isNumber: NUMBER.test(ownText),
      });
    }

    // Content pushed out of a scroll/clip container: only counts when real text is hidden.
    if (["auto", "scroll", "hidden", "clip"].includes(s.overflowX) && el.clientWidth > 0 && el.scrollWidth - el.clientWidth > 4) {
      const box = el.getBoundingClientRect();
      const hiddenText = [...el.querySelectorAll("*")].filter((c) => {
        if (!c.childNodes.length || ![...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
        const q = c.getBoundingClientRect();
        return q.width > 0 && (q.left >= box.right - 1 || q.right > box.right + 8) && visible(c);
      });
      if (hiddenText.length)
        clipped.push({
          sel: selector(el),
          hiddenPx: el.scrollWidth - el.clientWidth,
          scrollable: s.overflowX === "auto" || s.overflowX === "scroll",
          examples: hiddenText.slice(0, 3).map((c) => c.textContent.replace(/\s+/g, " ").trim().slice(0, 30)),
          hiddenCount: hiddenText.length,
        });
    }

    for (const prop of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "rowGap", "columnGap"]) {
      const v = parseFloat(s[prop]);
      if (v > 0 && Number.isFinite(v)) spacing.push(Math.round(v * 100) / 100);
    }
    const rad = parseFloat(s.borderTopLeftRadius);
    if (rad > 0 && rad < 999) radii.push(Math.round(rad * 10) / 10);
    if (s.boxShadow && s.boxShadow !== "none") shadows.push(s.boxShadow);
  }

  const interactiveSel = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=radio], [onclick]";
  const interactive = [...document.querySelectorAll(interactiveSel)]
    .filter((el) => visible(el) || (el.tagName === "INPUT" && el.labels && el.labels.length))
    .map((el) => {
      // Visually hidden radio/checkbox: measure its visible label instead
      let box = el;
      if (el.tagName === "INPUT" && srOnly(el) && el.labels && el.labels[0]) box = el.labels[0];
      const r = box.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      const parentText = el.parentElement ? el.parentElement.textContent.trim().length : 0;
      const inline = tag === "a" && getComputedStyle(el).display === "inline" && parentText > el.textContent.trim().length + 20;
      const name = (
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        el.getAttribute("title") ||
        el.textContent ||
        [...el.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ") ||
        (el.labels && el.labels.length ? "label" : "") ||
        el.getAttribute("placeholder") ||
        el.value ||
        ""
      ).trim();
      const nativeInteractive = ["a", "button", "input", "select", "textarea", "summary"].includes(tag) || el.getAttribute("role");
      return {
        sel: selector(el),
        tag,
        width: Math.round(r.width),
        height: Math.round(r.height),
        inline,
        hasName: name.length > 0,
        clickableNonInteractive: el.hasAttribute("onclick") && !nativeInteractive,
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        lines: (el.textContent || "").trim().length && (el.textContent || "").trim().length <= 40 ? lineCount(el) : 1,
      };
    });

  const images = [...document.images].filter(visible).map((img) => {
    const r = img.getBoundingClientRect();
    const s = getComputedStyle(img);
    return {
      sel: selector(img),
      src: (img.currentSrc || img.src || "").slice(0, 120),
      hasAlt: img.hasAttribute("alt"),
      hasDimensions: img.hasAttribute("width") && img.hasAttribute("height"),
      broken: img.complete && img.naturalWidth === 0,
      naturalRatio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null,
      renderedRatio: r.height ? r.width / r.height : null,
      objectFit: s.objectFit,
      format: ((img.currentSrc || img.src || "").split("?")[0].match(/\.(avif|webp|svg|png|jpe?g|gif)$/i) || [, (img.currentSrc || img.src || "").startsWith("data:image/") ? (img.currentSrc || img.src).slice(11, 15) : "unknown"])[1].toLowerCase(),
      naturalWidth: img.naturalWidth,
      renderedWidth: Math.round(r.width * (window.devicePixelRatio || 1)),
      lazy: img.loading === "lazy",
      belowFold: r.top + window.scrollY > window.innerHeight * 1.2,
    };
  });

  const fields = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")].map((el) => ({
    sel: selector(el),
    labelled: Boolean((el.labels && el.labels.length) || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")),
  }));

  const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(visible).map((h) => {
    const s = getComputedStyle(h);
    return {
      level: Number(h.tagName[1]),
      text: h.textContent.replace(/\s+/g, " ").trim().slice(0, 60),
      fontSize: parseFloat(s.fontSize),
      letterSpacing: px(s.letterSpacing) ?? 0,
      lineHeight: px(s.lineHeight),
    };
  });

  const paragraphs = [...document.querySelectorAll("p, li, blockquote, dd")]
    .filter((el) => visible(el) && el.textContent.trim().length > 90 && !el.querySelector("p, div, ul, ol, table"))
    .map((el) => {
      const s = getComputedStyle(el);
      const fs = parseFloat(s.fontSize);
      return {
        sel: selector(el),
        fontSize: fs,
        lineHeight: px(s.lineHeight),
        measure: Math.round(el.getBoundingClientRect().width / (fs * 0.5)),
      };
    });

  // ---------- Mobile interaction ----------
  const vpMeta = (document.querySelector('meta[name="viewport"]') || {}).content || "";
  const zoomBlocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0+)?(?![\d.])/i.test(vpMeta);
  const smallInputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), select, textarea")]
    .filter(visible)
    .map((el) => ({ sel: selector(el), fontSize: parseFloat(getComputedStyle(el).fontSize) }))
    .filter((f) => f.fontSize < 16);

  const targetEls = [...document.querySelectorAll(interactiveSel)].filter((el) => visible(el) && !srOnly(el));
  const rects = targetEls.map((el) => ({ el, r: el.getBoundingClientRect() }));
  const crowded = [];
  for (let i = 0; i < rects.length && crowded.length < 40; i++) {
    const a = rects[i];
    if (a.r.width >= 44 && a.r.height >= 44) continue;
    if (a.el.tagName === "A" && getComputedStyle(a.el).display === "inline") continue;
    if (a.r.width >= 36 && a.r.height >= 36) continue;
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;
      const b = rects[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const dx = Math.max(0, Math.max(a.r.left, b.r.left) - Math.min(a.r.right, b.r.right));
      const dy = Math.max(0, Math.max(a.r.top, b.r.top) - Math.min(a.r.bottom, b.r.bottom));
      if (Math.hypot(dx, dy) < 8) {
        if (crowded.some((c) => c.el === b.el && c.otherEl === a.el)) break;
        crowded.push({ el: a.el, otherEl: b.el });
        crowded[crowded.length - 1] = Object.assign(crowded[crowded.length - 1], { sel: selector(a.el), other: selector(b.el), gap: Math.round(Math.hypot(dx, dy)), text: (a.el.textContent || a.el.getAttribute("aria-label") || "").trim().slice(0, 24) });
        break;
      }
    }
  }

  for (const c of crowded) { delete c.el; delete c.otherEl; }
  const vpArea = window.innerWidth * window.innerHeight;
  const overlays = [];
  const touchBlockers = [];
  for (const el of all) {
    const s = getComputedStyle(el);
    if ((s.position === "fixed" || s.position === "sticky") && visible(el)) {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
      const coverage = (w * h) / vpArea;
      if (coverage > 0.2) overlays.push({ sel: selector(el), coverage: Math.round(coverage * 100), position: s.position });
    }
    if (s.touchAction === "none" && visible(el)) {
      const r = el.getBoundingClientRect();
      if ((r.width * r.height) / vpArea > 0.3) touchBlockers.push(selector(el));
    }
  }

  // Carousels / sliders: native scroll containers with several items, or known libraries
  const LIB = /swiper|slick|splide|glide|embla|flickity|keen-slider|owl-carousel|carousel|slider/i;
  const carousels = [];
  const seenCar = new Set();
  for (const el of all) {
    if (!visible(el) || seenCar.has(el)) continue;
    const s = getComputedStyle(el);
    const cls = typeof el.className === "string" ? el.className : "";
    const nativeScroll = (s.overflowX === "auto" || s.overflowX === "scroll") && el.children.length >= 3 && el.scrollWidth > el.clientWidth + 20 && !el.querySelector("table") && el.tagName !== "TABLE";
    const lib = LIB.test(cls) && el.children.length >= 2 && !LIB.test(el.parentElement && typeof el.parentElement.className === "string" ? el.parentElement.className : "");
    if (!nativeScroll && !lib) continue;
    [...el.querySelectorAll("*")].forEach((c) => seenCar.add(c));
    const scope = el.parentElement || el;
    const controls = [...scope.querySelectorAll("button, [role=button], a")].filter((b) => /prev|next|précédent|suivant|arrow|chevron|slide/i.test((b.getAttribute("aria-label") || "") + " " + (typeof b.className === "string" ? b.className : "") + " " + b.textContent));
    carousels.push({
      sel: selector(el),
      kind: nativeScroll ? "native" : "library",
      items: el.children.length,
      snap: s.scrollSnapType && s.scrollSnapType !== "none",
      controls: controls.length,
      namedControls: controls.filter((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().length > 0).length,
      smallControls: controls.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 32 || r.height < 32; }).length,
      indicators: Boolean(scope.querySelector('[role=tablist], [class*="dot"], [class*="pagination"], [class*="indicator"], [class*="bullet"]')),
      peek: nativeScroll ? el.scrollWidth > el.clientWidth : true,
    });
  }

  // ---------- Section rhythm (space between top-level blocks) ----------
  const mainEl = document.querySelector("main") || document.body;
  let blocks = [...mainEl.children];
  for (let depth = 0; depth < 3 && blocks.filter(visible).length < 2 && blocks.length === 1; depth++) blocks = [...blocks[0].children];
  const contentBox = (block) => {
    let top = Infinity, bottom = -Infinity;
    const bw = block.getBoundingClientRect().width;
    for (const c of block.querySelectorAll("*")) {
      if (c.closest("svg") && c.tagName.toLowerCase() !== "svg") continue;
      const closed = c.closest("details:not([open])");
      if (closed && c.tagName !== "SUMMARY" && !c.closest("summary")) continue;
      const own = [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const media = ["IMG", "SVG", "svg", "VIDEO", "CANVAS", "IFRAME", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "PICTURE"].includes(c.tagName);
      const s = getComputedStyle(c);
      const painted = (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) || parseFloat(s.borderTopWidth) > 0;
      const r = c.getBoundingClientRect();
      // Full-width colored bands and dividers separate sections; they aren't content.
      if (!own && !media && (!painted || r.width >= bw * 0.95)) continue;
      if (r.width < 1 || r.height < 1) continue;
      top = Math.min(top, r.top + window.scrollY);
      bottom = Math.max(bottom, r.bottom + window.scrollY);
    }
    return top === Infinity ? null : { top, bottom };
  };
  const sectionGaps = [];
  const blockList = blocks.filter((b) => visible(b) && !["SCRIPT", "STYLE", "TEMPLATE"].includes(b.tagName) && b.getBoundingClientRect().height > 40);
  for (let i = 0; i < blockList.length - 1; i++) {
    const a = contentBox(blockList[i]);
    const b = contentBox(blockList[i + 1]);
    if (!a || !b) continue;
    sectionGaps.push({ between: [selector(blockList[i]), selector(blockList[i + 1])], gap: Math.round(b.top - a.bottom) });
  }

  // ---------- SEO ----------
  const meta = (name) => (document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) || {}).content || "";
  const links = [...document.querySelectorAll("a[href]")];
  const mainText = ((document.querySelector("main") || document.body).innerText || "").trim();
  const seo = {
    title: document.title || "",
    description: meta("description"),
    canonical: (document.querySelector('link[rel="canonical"]') || {}).href || "",
    robots: meta("robots"),
    ogTitle: meta("og:title"),
    ogDescription: meta("og:description"),
    ogImage: meta("og:image"),
    twitterCard: meta("twitter:card"),
    jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
    favicon: Boolean(document.querySelector('link[rel~="icon"]')),
    appleTouchIcon: Boolean(document.querySelector('link[rel="apple-touch-icon"]')),
    manifest: Boolean(document.querySelector('link[rel="manifest"]')),
    words: mainText ? mainText.split(/\s+/).length : 0,
    internalLinks: links.filter((a) => a.host === location.host).length,
    externalLinks: links.filter((a) => a.host && a.host !== location.host).length,
  };

  // ---------- Readability ----------
  const prose = [...document.querySelectorAll("p, li, dd, blockquote")].filter((el) => visible(el) && !el.querySelector("p, ul, ol, div"));
  const readability = prose
    .map((el) => {
      const t = el.innerText.replace(/\s+/g, " ").trim();
      const words = t ? t.split(" ").length : 0;
      const sentences = t.split(/[.!?…]+(?:\s|$)/).filter((x) => x.trim().split(" ").length > 2);
      const s = getComputedStyle(el);
      return {
        sel: selector(el),
        words,
        avgSentence: sentences.length ? Math.round(words / sentences.length) : words,
        justified: s.textAlign === "justify",
        uppercase: s.textTransform === "uppercase" && t.length > 40,
        fontSize: parseFloat(s.fontSize),
        text: t.slice(0, 50),
      };
    })
    .filter((p) => p.words >= 12);

  // ---------- "AI look" signals ----------
  const hue = ([r, g, b]) => {
    const R = r / 255, G = g / 255, B = b / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
    if (d < 0.08) return null;
    let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
    return Math.round((h * 60 + 360) % 360);
  };
  const gradients = [];
  let glass = 0;
  const bigRadius = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (s.backgroundImage.includes("gradient")) {
      const r = el.getBoundingClientRect();
      const colors = (s.backgroundImage.match(/(rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*(\([^()]*\)[^()]*)*\)|#[0-9a-f]{3,8}\b/gi) || []).map(rgba).filter((c) => c[3] > 0.25);
      const hues = colors.map(hue).filter((h) => h !== null);
      const purple = hues.some((h) => h >= 255 && h <= 300);
      const blue = hues.some((h) => h >= 190 && h < 255);
      const pink = hues.some((h) => h > 300 && h <= 340);
      if ((r.width * r.height) / vpArea > 0.08 && purple && (blue || pink)) gradients.push(selector(el));
    }
    if (/blur\(/.test(s.backdropFilter || s.webkitBackdropFilter || "") && !["HEADER", "NAV"].includes(el.tagName) && !el.closest("header, nav")) glass++;
    const rad = parseFloat(s.borderTopLeftRadius);
    if (rad >= 24 && rad < 999 && el.getBoundingClientRect().width > 120) bigRadius.push(selector(el));
  }
  const EMOJI = /\p{Extended_Pictographic}/u;
  const emojiIn = [...document.querySelectorAll("h1, h2, h3, button, a")].filter((el) => visible(el) && EMOJI.test(el.textContent)).map((el) => `${selector(el)} "${el.textContent.trim().slice(0, 40)}"`);
  const CLICHE = new RegExp(
    "(?<![\\p{L}\\p{N}])(" +
      [
        "transform(ez)? (your|votre|vos)", "unlock", "revolutioni[sz]e", "révolutionne[zr]?", "elevate", "supercharge", "seamless(ly)?",
        "game[- ]changer", "next[- ]level", "take .{0,15} to the next level", "all[- ]in[- ]one solution", "in today'?s fast[- ]paced",
        "cutting[- ]edge", "innovative solutions?", "empower(ing)? (your|you)", "harness the power", "unleash", "in just a few clicks",
        "boost(er|ez)", "propulsez", "solution tout[- ]en[- ]un", "dans un monde en constante évolution", "solutions? innovantes?",
        "en quelques clics", "n['’]attendez plus", "à portée de main", "votre partenaire de confiance", "incontournables?", "au c(œ|oe)ur de",
        "des experts passionnés", "sur[- ]mesure", "clés? en main", "simplifiez[- ]vous la vie",
      ].join("|") +
      ")(?![\\p{L}\\p{N}])",
    "iu"
  );
  const clicheEls = [...document.querySelectorAll('h1, h2, h3, h4, p, li, button, a, figcaption, [class*="badge"], [class*="chip"], [class*="pill"]')].filter((el) => visible(el) && CLICHE.test(el.textContent));
  const cliches = clicheEls
    .filter((el) => !clicheEls.some((o) => o !== el && el.contains(o)))
    .slice(0, 8)
    .map((el) => `${selector(el)} "${(el.textContent.match(CLICHE) || [""])[0].trim()}" in "${el.textContent.replace(/\s+/g, " ").trim().slice(0, 50)}"`);
  // Rows of 3–4 identical "icon + title + text" cards
  const identicalCards = [];
  for (const parent of document.querySelectorAll("div, section, ul")) {
    const kids = [...parent.children].filter(visible);
    if (kids.length < 3 || kids.length > 4) continue;
    const sig = (k) => [...k.children].map((c) => c.tagName).join(",") + "|" + (typeof k.className === "string" ? k.className : "");
    const first = sig(kids[0]);
    if (!kids.every((k) => sig(k) === first)) continue;
    const iconTitleText = kids.every((k) => k.querySelector("svg, img, i, [class*=icon]") && k.querySelector("h3, h4, strong") && k.querySelector("p") && k.children.length <= 4);
    if (iconTitleText) identicalCards.push(selector(parent));
  }
  const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
  const painted = (c) => c[3] > 0.05;
  const h1 = [...document.querySelectorAll("h1")].find(visible);
  const heroPills = [];
  if (h1) {
    const h1r = h1.getBoundingClientRect();
    for (const el of document.querySelectorAll("a, span, div, p")) {
      if (el === h1 || el.contains(h1) || h1.contains(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt || txt.length > 70 || r.height > 44 || r.width < 40) continue;
      if (r.bottom > h1r.top + 4 || h1r.top - r.bottom > 140 || r.top < 0 || r.top > 700) continue;
      if (el.closest("header, nav")) continue;
      if (el.querySelector("p, h1, h2, h3, ul, button, img") ) continue;
      const s = getComputedStyle(el);
      const pill = parseFloat(s.borderTopLeftRadius) >= Math.min(r.height / 2, 999) - 1 && (painted(rgba(s.backgroundColor)) || parseFloat(s.borderTopWidth) > 0);
      const dot = [...el.querySelectorAll("span, i, svg")].some((d) => { const dr = d.getBoundingClientRect(); return dr.width > 0 && dr.width <= 12 && dr.height <= 12 && painted(rgba(getComputedStyle(d).backgroundColor)); });
      if (pill && !heroPills.some((x) => x.el.contains(el) || el.contains(x.el))) heroPills.push({ el, text: txt.slice(0, 40), dot });
    }
  }
  const heroPillOut = heroPills.slice(0, 3).map((x) => `${selector(x.el)} "${x.text}"${x.dot ? " (with dot)" : ""}`);
  const statusDots = [];
  const accentBorders = [];
  const iconTiles = [];
  const gradientText = [];
  const glows = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width <= 12 && r.height <= 12 && r.width >= 4 && parseFloat(s.borderTopLeftRadius) >= r.width / 2 - 0.5) {
      const bg = rgba(s.backgroundColor);
      const h = painted(bg) ? hue(bg) : null;
      const green = h !== null && h >= 85 && h <= 170;
      const animated = s.animationName !== "none" && /ping|pulse|blink/i.test(s.animationName);
      const hasText = el.parentElement && (el.parentElement.textContent || "").trim().length > 2 && el.parentElement.getBoundingClientRect().height < 48;
      const ps = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const inPill = ps && parseFloat(ps.borderTopLeftRadius) >= 8 && (painted(rgba(ps.backgroundColor)) || parseFloat(ps.borderTopWidth) > 0);
      if (hasText && !el.closest("td, th, tr, li, aside") && ((green && inPill && r.top < 900) || animated)) statusDots.push(`${selector(el)}${animated ? " (pulsing)" : ""} next to "${el.parentElement.textContent.replace(/\s+/g, " ").trim().slice(0, 30)}"`);
    }
    if (r.width > 120 && r.height > 40 && el.tagName !== "BLOCKQUOTE" && !el.closest("blockquote, nav, [role=tablist], table")) {
      const sides = ["Top", "Right", "Bottom", "Left"].map((k) => ({ k, w: parseFloat(s[`border${k}Width`]), c: rgba(s[`border${k}Color`]), st: s[`border${k}Style`] }));
      const thick = sides.filter((x) => x.w >= 2 && x.st !== "none" && painted(x.c) && chroma(x.c) > 40);
      const others = sides.filter((x) => x.w < 1 || x.st === "none");
      if (thick.length === 1 && others.length === 3 && thick[0].k !== "Bottom" && (el.textContent || "").trim().length > 10) accentBorders.push(`${selector(el)} (${thick[0].k.toLowerCase()} ${thick[0].w}px)`);
    }
    if (r.width >= 28 && r.width <= 64 && Math.abs(r.width - r.height) <= 2 && parseFloat(s.borderTopLeftRadius) > 0 && painted(rgba(s.backgroundColor)) && el.children.length === 1 && /^(svg|i|img)$/i.test(el.children[0].tagName) && !(el.textContent || "").trim() && el.tagName !== "BUTTON" && el.tagName !== "A" && !el.closest("button, a, nav, header")) iconTiles.push(selector(el));
    if ((s.backgroundClip === "text" || s.webkitBackgroundClip === "text") && s.backgroundImage.includes("gradient") && (el.textContent || "").trim()) gradientText.push(selector(el));
    if (s.boxShadow && s.boxShadow !== "none" && r.width > 80) {
      for (const m of s.boxShadow.matchAll(/(rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g)) {
        const c = rgba(m[1]);
        if (c[3] >= 0.2 && chroma(c) > 90 && parseFloat(m[4]) >= 20) { glows.push(selector(el)); break; }
      }
    }
  }
  const flat = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
  const arrowCtas = [...document.querySelectorAll("a, button")].filter((el) => visible(el) && flat(el).length < 50 && /(→|↗|›|»|->)$/.test(flat(el))).map((el) => `${selector(el)} "${flat(el).slice(0, 40)}"`);
  const capsLabels = [];
  for (const h of document.querySelectorAll("h1, h2, h3")) {
    if (!visible(h)) continue;
    const prev = h.previousElementSibling;
    if (!prev || !visible(prev) || prev.children.length > 3) continue;
    const t = flat(prev);
    const ps = getComputedStyle(prev);
    const upper = ps.textTransform === "uppercase" || (t.length >= 3 && t === t.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(t));
    if (t && t.length <= 40 && upper && parseFloat(ps.fontSize) <= 15 && parseFloat(ps.letterSpacing) > 0.3) capsLabels.push(`${selector(prev)} "${t}"`);
  }
  const numbered = [...document.querySelectorAll("p, span, div, li")].filter((el) => visible(el) && el.children.length <= 1 && !el.closest("ol, table, dl, time, nav") && /^(0[1-9]|[1-9]\d?\s?[·\/—–-]\s[A-Za-zÀ-ÿ].{0,20}|0[1-9]\s?[·.\/—–-]\s?[A-Za-zÀ-ÿ].{0,20})$/.test(flat(el))).map((el) => `${selector(el)} "${flat(el)}"`);
  const accentWords = [];
  for (const h of document.querySelectorAll("h1, h2")) {
    if (!visible(h)) continue;
    const hs = getComputedStyle(h);
    const total = flat(h).length;
    for (const c of h.querySelectorAll("span, em, i, b, strong, mark")) {
      const t = flat(c);
      if (!t || t.length >= total * 0.7 || c.children.length) continue;
      const cs = getComputedStyle(c);
      const diff = cs.fontStyle !== hs.fontStyle || cs.color !== hs.color || cs.backgroundClip === "text" || Math.abs(parseInt(cs.fontWeight) - parseInt(hs.fontWeight)) >= 200;
      if (diff) { accentWords.push(`${selector(h)} "${t.slice(0, 30)}"`); break; }
    }
  }
  const middots = [...document.querySelectorAll("p, span, li, div")].filter((el) => visible(el) && el.children.length === 0 && flat(el).length >= 12 && flat(el).length <= 110 && /\S\s[·•|]\s\S.*\s[·•|]\s\S/.test(flat(el))).map((el) => `${selector(el)} "${flat(el).slice(0, 50)}"`);
  const centered = [...document.querySelectorAll("h1, h2, h3, p")].filter(visible);
  const centeredShare = centered.length ? centered.filter((el) => getComputedStyle(el).textAlign === "center").length / centered.length : 0;

  const focusInvisible = [];
  const focusable = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1'])")].filter((el) => visible(el) && !srOnly(el) && !el.disabled && !el.closest("[inert]")).slice(0, 25);
  const prevFocus = document.activeElement;
  for (const el of focusable) {
    const look = () => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.backgroundColor, s.textDecorationLine, s.color].join("|"); };
    const before = look();
    try { el.focus({ focusVisible: true, preventScroll: true }); } catch { el.focus(); }
    const after = look();
    const s = getComputedStyle(el);
    const outlined = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 && rgba(s.outlineColor)[3] > 0;
    if (document.activeElement === el && before === after && !outlined) focusInvisible.push(selector(el));
    el.blur();
  }
  if (prevFocus && prevFocus.focus) prevFocus.focus();
  let reducedMotion = false;
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) if (rule.media && /prefers-reduced-motion/.test(rule.media.mediaText)) reducedMotion = true; } catch {}
  }
  const animated = all.filter((el) => { const s = getComputedStyle(el); return s.animationName !== "none" && parseFloat(s.animationDuration) > 0; }).length;

  // ---------- Copy: vague calls to action, unproven claims, generic error messages ----------
  const label = (el) => flat(el).replace(/[\s→↗›»>.!…-]+$/u, "").trim();
  const VAGUE_CTA = /^(en savoir plus|d[ée]couvrir|cliquez ici|cliquer ici|voir plus|lire la suite|plus d['’]infos?|ici|learn more|click here|read more|discover|see more|more info|more|here)$/i;
  const vagueCtas = [...document.querySelectorAll("a[href], button, [role=button]")]
    .filter((el) => {
      if (!visible(el) || !VAGUE_CTA.test(label(el))) return false;
      const named = (el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
      return !named || VAGUE_CTA.test(named);
    })
    .map((el) => `${selector(el)} "${label(el)}"`);
  const SUPERLATIVE = /(?<![\p{L}\p{N}])(n°\s?1|num[ée]ro\s?(1|un)|#\s?1|number one|leaders?|(le|la|les) meilleure?s?|the best|world['’]s leading)(?![\p{L}\p{N}])/iu;
  const FIGURE = /(\+\s?\d[\d\s.,  ]*k?|\d[\d\s.,  ]*k?\s?\+)\s?(clients?|customers?|users?|utilisateurs?|entreprises?|companies|teams|équipes|projets?|projects?|avis|reviews?|pays|countries|téléchargements?|downloads?|membres?|members?|installations?)|\d{1,3}(?:[.,]\d+)?\s?%\s?(?:de |d['’]|of )?(?:nos |our )?(clients?|customers?|users?|utilisateurs?|satisf\p{L}*|recommand\p{L}*|recommend\p{L}*)/iu;
  const SOURCED = /(?<![\p{L}])(source|selon|d['’]après|according to|étude|study|survey|enquête|rapport|report|classement|ranking)(?![\p{L}])|[*†¹²³]|\[\d+\]/iu;
  const claimEls = [...document.querySelectorAll("h1, h2, h3, h4, p, li, dt, dd, figcaption, strong, span, div")].filter((el) => {
    if (!visible(el) || el.closest('table, nav, footer, form, [role=img], [data-demo], script, style, svg, [itemprop="review"], blockquote, q, cite')) return false;
    if (["SPAN", "DIV", "STRONG"].includes(el.tagName) && el.children.length) return false;
    const t = flat(el);
    return t.length <= 240 && (SUPERLATIVE.test(t) || FIGURE.test(t));
  });
  const unprovenClaims = claimEls
    .filter((el) => !claimEls.some((o) => o !== el && el.contains(o)))
    .filter((el) => {
      const scope = el.closest("p, li, figure, blockquote, dl, article, section > div, section") || el.parentElement || el;
      const near = scope.textContent.length < 600 ? scope : el;
      return !near.querySelector("a[href], cite, sup, [data-source]") && !el.closest("a[href]") && !SOURCED.test(near.textContent);
    })
    .slice(0, 8)
    .map((el) => `${selector(el)} "${((flat(el).match(SUPERLATIVE) || flat(el).match(FIGURE) || [""])[0]).trim()}" in "${flat(el).slice(0, 50)}"`);
  const VAGUE_ERROR = /^(invalid( field| input| value| entry)?|error|an error (has )?occurr?ed|something went wrong|oops|please try again|try again|champ invalide|erreur|une erreur est survenue|valeur invalide|saisie (invalide|incorrecte)|invalide|incorrect)[\s.!…]*$/i;
  const vagueErrors = [...document.querySelectorAll('[role=alert], [aria-live=assertive], [class*="error"], [class*="invalid"], [id$="-error"], [id$="_error"], [data-error]')]
    .filter((el) => visible(el) && !el.matches("input, select, textarea, form, fieldset") && VAGUE_ERROR.test(flat(el)))
    .slice(0, 6)
    .map((el) => `${selector(el)} "${flat(el).slice(0, 40)}"`);

  // ---------- H1 as crawlers read it vs as it renders ----------
  let h1Glue = null;
  if (h1) {
    const clone = h1.cloneNode(true);
    for (const br of clone.querySelectorAll("br")) br.replaceWith(" ");
    const kids = [...h1.querySelectorAll("*")].filter((c) => (c.textContent || "").trim() && c.getBoundingClientRect().width > 0);
    const em = parseFloat(getComputedStyle(h1).fontSize) || 16;
    const gapped = [];
    for (const c of kids) {
      const next = c.nextSibling;
      if (!next || next.nodeType !== 1 || next.tagName === "BR" || !(next.textContent || "").trim()) continue;
      if (/\s$/.test(c.textContent) || /^\s/.test(next.textContent)) continue;
      const a = c.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      if (!b.width) continue;
      if (b.top >= a.bottom - 2 || b.left - a.right > em * 0.15) gapped.push(`${c.textContent.trim().slice(-12)}|${next.textContent.trim().slice(0, 12)}`);
    }
    h1Glue = { raw: clone.textContent.replace(/\s+/g, " ").trim().slice(0, 200), rendered: (h1.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200), gapped: gapped.slice(0, 4) };
  }

  // ---------- Structured data, canonical, hreflang ----------
  seo.jsonLdRaw = [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 6).map((sc) => sc.textContent.slice(0, 20000));
  seo.ogUrl = meta("og:url");
  seo.hreflang = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].slice(0, 40).map((l) => ({ lang: l.getAttribute("hreflang"), href: l.href }));
  seo.reviewsVisible = [...document.querySelectorAll('blockquote, [itemprop="review"], [class*="review"], [class*="testimonial"], [class*="avis"], [data-review], iframe[src*="trustpilot"], iframe[src*="google.com/maps"], [class*="trustpilot"]')].filter((el) => el.tagName === "IFRAME" || visible(el)).length;

  // ---------- Motion: what animates, how long, and whether it moves layout ----------
  const LAYOUT_PROP = /^(width|height|top|left|right|bottom|inset|margin(-\w+)?|padding(-\w+)?|max-height|max-width|min-height|min-width)$/;
  const seconds = (v) => Math.max(0, ...String(v || "").split(",").map((x) => (/ms\s*$/.test(x) ? parseFloat(x) / 1000 : parseFloat(x)) || 0));
  const keyframes = new Map();
  const safeRules = [];
  const walkRules = (rules, safe) => {
    for (const rule of rules) {
      if (rule.type === 7 && rule.cssRules) {
        const props = new Set();
        let fromHidden = false;
        for (const frame of rule.cssRules) {
          for (const prop of frame.style) if (LAYOUT_PROP.test(prop)) props.add(prop);
          if (/^(0%|from)/.test(frame.keyText) && frame.style.opacity !== "" && parseFloat(frame.style.opacity) === 0) fromHidden = true;
        }
        keyframes.set(rule.name, { layout: [...props], fromHidden });
      } else if (rule.selectorText && rule.style) {
        if (safe && (rule.style.transitionProperty || rule.style.animationName || rule.style.animation || rule.style.transition)) safeRules.push(rule);
        if (rule.cssRules && rule.cssRules.length) walkRules(rule.cssRules, safe);
      } else if (rule.cssRules) {
        const cond = rule.conditionText || (rule.media && rule.media.mediaText) || "";
        if (/prefers-reduced-motion:\s*reduce/.test(cond)) continue;
        walkRules(rule.cssRules, safe || /prefers-reduced-motion:\s*no-preference/.test(cond));
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try { walkRules(sheet.cssRules, false); } catch {}
  }
  const motion = new Map();
  const noteMotion = (el, src) => {
    const transDur = seconds(src.transitionDuration);
    const animDur = seconds(src.animationDuration);
    const names = String(src.animationName || "").split(",").map((n) => n.trim()).filter((n) => n && n !== "none");
    const props = transDur > 0 ? String(src.transitionProperty || "").split(",").map((x) => x.trim()).filter(Boolean) : [];
    if (!props.length && !names.length) return;
    const m = motion.get(el) || { props: new Set(), names: new Set(), transDur: 0, animDur: 0, infinite: false };
    props.forEach((x) => m.props.add(x));
    names.forEach((n) => m.names.add(n));
    m.transDur = Math.max(m.transDur, transDur);
    m.animDur = Math.max(m.animDur, names.length ? animDur : 0);
    if (names.length && /infinite/.test(src.animationIterationCount || "")) m.infinite = true;
    motion.set(el, m);
  };
  let willChange = 0;
  const willChangeSample = [];
  for (const el of all) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const s = getComputedStyle(el);
    noteMotion(el, s);
    if (s.willChange && s.willChange !== "auto") {
      willChange++;
      if (willChangeSample.length < 4) willChangeSample.push(selector(el));
    }
  }
  for (const rule of safeRules) {
    let els = [];
    try { els = [...document.querySelectorAll(rule.selectorText.replace(/::?(before|after|hover|focus|focus-visible|focus-within|active)\b/g, ""))].slice(0, 200); } catch {}
    for (const el of els) noteMotion(el, rule.style);
  }
  const DEMO = '[data-demo], figure, [role=img], video, canvas, [class*="demo"], [class*="mockup"], [class*="preview"]';
  const LOADER = '[role=status], [role=progressbar], [aria-busy=true], [class*="spinner"], [class*="loader"], [class*="loading"], [class*="skeleton"]';
  const LOADER_NAME = /spin|rotate|load|progress|skeleton|caret|cursor/i;
  const layoutAnimations = [];
  const infiniteAnimations = [];
  const slowMotion = [];
  const revealEls = [];
  const REVEAL = /(^|[\s_-])(reveal|fade-?(in|up|down)|slide-?(in|up)|animate-(in|fade|slide)\S*|aos|wow|scroll-animate|in-?view|appear)([\s_-]|$)/i;
  for (const [el, m] of motion) {
    if (!visible(el) && getComputedStyle(el).opacity !== "0") continue;
    const moved = [...m.props].filter((x) => LAYOUT_PROP.test(x));
    const framed = [...m.names].flatMap((n) => (keyframes.get(n) || { layout: [] }).layout);
    if (moved.length || framed.length) layoutAnimations.push(`${selector(el)} (${moved.length ? "transition: " + moved.join(", ") : "animation: " + [...new Set(framed)].join(", ")})`);
    const inDemo = el.closest(DEMO) || el.closest(LOADER) || [...m.names].every((n) => LOADER_NAME.test(n)) && m.names.size > 0;
    if (m.infinite && m.animDur > 0 && !inDemo) infiniteAnimations.push(`${selector(el)} (${[...m.names].join(", ")})`);
    const slow = Math.max(m.transDur, m.infinite ? 0 : m.animDur);
    if (slow > 1 && !inDemo) slowMotion.push(`${selector(el)} (${Math.round(slow * 100) / 100}s)`);
    if ([...m.names].some((n) => (keyframes.get(n) || {}).fromHidden) && !m.infinite) revealEls.push(el);
  }
  for (const el of document.querySelectorAll("[data-aos], [data-animate], [data-reveal], [data-scroll], [data-sal], [data-sr], [class]")) {
    if (el.hasAttribute("data-aos") || el.hasAttribute("data-animate") || el.hasAttribute("data-reveal") || el.hasAttribute("data-scroll") || el.hasAttribute("data-sal") || el.hasAttribute("data-sr") || REVEAL.test(typeof el.className === "string" ? el.className : "")) revealEls.push(el);
  }
  const revealSections = blockList.filter((b) => revealEls.some((el) => b === el || b.contains(el)));
  const motionOut = {
    layoutAnimations: [...new Set(layoutAnimations)].slice(0, 8),
    infiniteAnimations: [...new Set(infiniteAnimations)].slice(0, 6),
    slowMotion: [...new Set(slowMotion)].slice(0, 6),
    willChange,
    willChangeSample,
    sections: blockList.length,
    revealSections: revealSections.length,
    revealSample: revealSections.slice(0, 4).map(selector),
  };

  // ---------- Layout shift while scrolling (recorded by openPage's init script) ----------
  let scrollCls = null;
  const shifts = window.__glowupShifts;
  if (shifts) {
    const from = window.__glowupScrollStart || 0;
    const during = shifts.filter((e) => e.t >= from);
    scrollCls = { value: Math.round(during.reduce((a, e) => a + e.v, 0) * 1000) / 1000, sources: [...new Set(during.flatMap((e) => e.nodes).filter((n) => n && n.nodeType === 1).map(selector))].slice(0, 5) };
  }

  const bodyText = document.body.innerText || "";
  return {
    url: location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    title: document.title,
    lang: document.documentElement.getAttribute("lang") || "",
    hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
    hasDescription: Boolean(document.querySelector('meta[name="description"]')),
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    pageHeight: document.documentElement.scrollHeight,
    lorem: /lorem ipsum|dolor sit amet/i.test(bodyText),
    copy: { vagueCtas: vagueCtas.slice(0, 8), vagueCtaCount: vagueCtas.length, unprovenClaims, vagueErrors },
    h1Glue,
    motion: motionOut,
    scrollCls,
    texts,
    interactive,
    images,
    fields,
    headings,
    paragraphs,
    spacing,
    radii,
    shadows,
    clipped,
    rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
    mobile: { zoomBlocked, smallInputs, crowded, overlays, touchBlockers, carousels },
    sectionGaps,
    seo,
    readability,
    a11y: { focusInvisible: focusInvisible.slice(0, 6), focusChecked: focusable.length, reducedMotion, animated },
    aiLook: { gradients, glass, bigRadius: bigRadius.length, bigRadiusSample: bigRadius.slice(0, 5), radiusElements: radii.length, emoji: emojiIn, cliches, identicalCards, heroPills: heroPillOut, statusDots: statusDots.slice(0, 5), accentBorders: accentBorders.slice(0, 6), iconTiles, gradientText: gradientText.slice(0, 4), glows: glows.slice(0, 4), arrowCtas: arrowCtas.slice(0, 6), capsLabels: capsLabels.slice(0, 6), numbered: numbered.slice(0, 6), accentWords: accentWords.slice(0, 4), middots: middots.slice(0, 5), centeredShare: Math.round(centeredShare * 100) },
  };
}

/**
 * Text snapshot of the page, also self-contained: run once in the normal render and once with
 * JavaScript disabled, then compared in analyze.mjs. `hidden` lists in-flow text blocks that are
 * still invisible after load and a full scroll (opacity 0, visibility hidden, moved off-screen).
 */
export function collectSnapshot() {
  const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
  const selector = (el) => {
    if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
    const cls = [...el.classList].filter((c) => !c.includes(":") && !c.includes("[")).slice(0, 2);
    const parent = el.parentElement ? el.parentElement.tagName.toLowerCase() + " > " : "";
    return parent + el.tagName.toLowerCase() + (cls.length ? "." + cls.join(".") : "");
  };
  const textOf = (root) => {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement;
      if (!p || p.tagName === "NOSCRIPT" || p.closest("script, style, template")) continue;
      if (n.textContent.trim()) out.push(n.textContent);
    }
    return norm(out.join(" "));
  };
  const main = document.querySelector("main") || document.body;
  const h1 = document.querySelector("h1");
  const faq = [...document.querySelectorAll("details")].slice(0, 30).map((d) => {
    const sum = d.querySelector("summary");
    const q = norm(sum ? sum.textContent : "");
    return { q, a: norm(d.textContent).slice(q.length).trim().slice(0, 300) };
  }).filter((f) => f.q);
  const SKIP = '[hidden], [aria-hidden="true"], [inert], details:not([open]), [role=dialog], [role=menu], [role=tooltip], [role=tabpanel], [role=listbox], dialog, template, noscript, svg, script, style, select';
  const hidden = [];
  const flagged = new Set();
  const docW = document.documentElement.scrollWidth;
  for (const el of document.body.querySelectorAll("*")) {
    if (hidden.length >= 12) break;
    if ([...flagged].some((f) => f.contains(el))) continue;
    const s = getComputedStyle(el);
    if (s.display === "none" || !["static", "relative", "sticky"].includes(s.position)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let how = null;
    if (s.opacity === "0") how = "opacity: 0";
    else if (s.visibility === "hidden" && (!el.parentElement || getComputedStyle(el.parentElement).visibility !== "hidden")) how = "visibility: hidden";
    else if (s.transform !== "none" && (r.right <= 0 || r.left >= docW || r.bottom + window.scrollY <= 0)) how = "moved off-screen";
    if (!how || el.closest(SKIP)) continue;
    const text = norm(el.textContent);
    if (text.length < 20) continue;
    flagged.add(el);
    hidden.push({ sel: selector(el), how, text: text.slice(0, 40) });
  }
  return {
    h1: norm(h1 ? h1.textContent : ""),
    text: textOf(document.body).slice(0, 80000),
    visibleText: norm(main.innerText || "").slice(0, 60000),
    faq,
    hidden,
    reducedMotion: Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  };
}
