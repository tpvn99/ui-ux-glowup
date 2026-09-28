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
    vagueLinks: interactive.filter((i) => /^(click here|here|read more|learn more|more|cliquez ici|en savoir plus)$/i.test(i.text)).length,
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
  };
}
