// Page inventory: every element that matters, so a redesign doesn't silently lose any of them.
// `collectInventory` runs in the browser (self-contained). `diffInventories` and `formatInventory`
// are pure and run in Node.

export function collectInventory() {
  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden";
  };
  const label = (el) => clean(el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || el.value || (el.querySelector("img[alt]") || {}).alt || "").slice(0, 60);
  const meta = (n) => (document.querySelector(`meta[name="${n}"], meta[property="${n}"]`) || {}).content || "";
  const host = (u) => {
    try {
      return new URL(u, location.href).host;
    } catch {
      return "";
    }
  };
  const uniq = (arr, key = (x) => JSON.stringify(x)) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = key(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const links = [...document.querySelectorAll("a[href]")];
  const SOCIAL = /(instagram|facebook|linkedin|tiktok|twitter|x\.com|youtube|pinterest|discord|threads\.net|snapchat|whatsapp|wa\.me|behance|dribbble|github)\./i;
  const LEGAL = /(mentions|l[ée]gal|privacy|confidentialit|cgv|cgu|terms|conditions|cookies|rgpd|gdpr|imprint|impressum)/i;
  const TRACKERS = {
    "Google Analytics / Tag Manager": /googletagmanager|google-analytics|gtag\/js/,
    "Meta Pixel": /connect\.facebook\.net|fbevents/,
    "Hotjar": /hotjar/,
    "Microsoft Clarity": /clarity\.ms/,
    "Plausible": /plausible\.io/,
    "Matomo": /matomo|piwik/,
    "TikTok Pixel": /analytics\.tiktok/,
    "LinkedIn Insight": /snap\.licdn/,
    "Crisp / Intercom / chat": /crisp\.chat|intercom|tawk\.to|zendesk/,
    "Stripe": /js\.stripe\.com/,
    "reCAPTCHA / hCaptcha": /recaptcha|hcaptcha/,
  };
  const scriptSrcs = [...document.scripts].map((s) => s.src + " " + s.textContent.slice(0, 400));

  const inv = {
    url: location.href,
    meta: {
      title: document.title,
      description: meta("description"),
      lang: document.documentElement.lang || "",
      favicon: Boolean(document.querySelector('link[rel~="icon"]')),
      ogImage: Boolean(meta("og:image")),
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href || "",
      structuredData: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
        try {
          const j = JSON.parse(s.textContent);
          return [].concat(j["@graph"] || j).map((x) => x["@type"]).flat().filter(Boolean);
        } catch {
          return ["(invalid JSON-LD)"];
        }
      }),
    },
    landmarks: ["header", "nav", "main", "aside", "footer"].map((t) => ({ tag: t, count: document.querySelectorAll(t === "header" ? "header, [role=banner]" : t === "footer" ? "footer, [role=contentinfo]" : t).length })).filter((l) => l.count),
    headings: [...document.querySelectorAll("h1, h2, h3, h4")].filter(visible).map((h) => ({ level: +h.tagName[1], text: clean(h.textContent).slice(0, 80) })),
    navigation: [...document.querySelectorAll("nav, header, [role=navigation]")]
      .flatMap((n) => [...n.querySelectorAll("a[href]")])
      .map((a) => ({ text: label(a), href: a.getAttribute("href") }))
      .filter((l) => l.text),
    ctas: uniq(
      [...document.querySelectorAll("button, a[href], [role=button], input[type=submit]")]
        .filter((el) => visible(el) && !el.closest("nav"))
        .filter((el) => {
          const s = getComputedStyle(el);
          const bg = s.backgroundColor;
          return el.tagName === "BUTTON" || el.type === "submit" || (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) || parseFloat(s.borderTopWidth) > 0;
        })
        .map((el) => ({ text: label(el), href: el.getAttribute("href") || "" }))
        .filter((c) => c.text),
      (c) => c.text.toLowerCase()
    ),
    forms: [...document.querySelectorAll("form")].map((f) => ({
      action: f.getAttribute("action") || "",
      fields: [...f.querySelectorAll("input:not([type=hidden]):not([type=submit]), select, textarea")].map((i) => ({
        type: i.tagName === "INPUT" ? i.type : i.tagName.toLowerCase(),
        name: i.name || i.id || "",
        label: clean(
          (i.labels && i.labels[0] && (() => {
            const c = i.labels[0].cloneNode(true);
            c.querySelectorAll("input, select, textarea, option").forEach((x) => x.remove());
            return c.textContent;
          })()) || i.getAttribute("aria-label") || i.placeholder || ""
        ).slice(0, 50),
        required: i.required,
      })),
      submit: label(f.querySelector("button[type=submit], button:not([type]), input[type=submit]") || document.createElement("i")),
    })),
    media: {
      images: [...document.images].filter(visible).map((i) => ({ alt: i.alt, src: (i.currentSrc || i.src).split("/").pop().split("?")[0].slice(0, 60) })),
      videos: [...document.querySelectorAll("video")].length,
      embeds: [...document.querySelectorAll("iframe")].map((f) => host(f.src) || "inline"),
      icons: document.querySelectorAll("svg").length,
      charts: [...document.querySelectorAll("canvas, svg")].filter((s) => s.tagName === "CANVAS" || s.querySelectorAll("path, rect, circle, polyline").length > 8).length,
    },
    components: {
      carousels: [...document.querySelectorAll('[class*="swiper"], [class*="carousel"], [class*="slider"], [class*="splide"], [class*="embla"], [class*="slick"]')].filter((el) => !el.parentElement.closest('[class*="swiper"], [class*="carousel"], [class*="slider"], [class*="splide"], [class*="embla"], [class*="slick"]')).length,
      accordions: document.querySelectorAll("details, [aria-expanded]").length,
      tabs: document.querySelectorAll("[role=tablist]").length,
      dialogs: document.querySelectorAll("dialog, [role=dialog], [aria-modal=true]").length,
      tables: [...document.querySelectorAll("table")].map((t) => [...t.querySelectorAll("th")].map((th) => clean(th.textContent)).join(" | ")),
      testimonials: document.querySelectorAll("blockquote, [class*=testimonial], [class*=review]").length,
      maps: [...document.querySelectorAll("iframe")].filter((f) => /maps\.|openstreetmap|mapbox/.test(f.src)).length,
    },
    contact: {
      phones: uniq(links.filter((a) => a.href.startsWith("tel:")).map((a) => a.href.slice(4))),
      emails: uniq(links.filter((a) => a.href.startsWith("mailto:")).map((a) => a.href.slice(7).split("?")[0])),
      social: uniq(links.filter((a) => SOCIAL.test(a.href)).map((a) => host(a.href).replace(/^www\./, ""))),
      address: /\b\d{5}\b|\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b|\b\d{5}(-\d{4})?\b/.test(document.body.innerText) && /\b(rue|avenue|bd|boulevard|street|st\.|road|rd\.|chemin|place|allée)\b/i.test(document.body.innerText),
    },
    legal: uniq(links.filter((a) => LEGAL.test(a.textContent + " " + a.href)).map((a) => clean(a.textContent).slice(0, 40)).filter(Boolean)),
    tracking: Object.entries(TRACKERS).filter(([, re]) => scriptSrcs.some((s) => re.test(s))).map(([k]) => k),
    counts: {
      words: clean((document.querySelector("main") || document.body).innerText).split(" ").length,
      internalLinks: links.filter((a) => host(a.href) === location.host).length,
      externalLinks: links.filter((a) => host(a.href) && host(a.href) !== location.host).length,
      sections: document.querySelectorAll("section").length,
    },
  };
  return inv;
}

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").replace(/[→›»«↗]/g, "").trim();

/** What exists in `before` but not in `after` (and what's new). Keys are normalized texts. */
export function diffInventories(before, after) {
  const missing = [];
  const added = [];
  const cmp = (category, a, b, key = norm) => {
    const bk = new Set(b.map(key));
    const ak = new Set(a.map(key));
    const seen = new Set();
    for (const x of a) if (key(x) && !bk.has(key(x)) && !seen.has(key(x))) seen.add(key(x)) && missing.push({ category, item: typeof x === "string" ? x : JSON.stringify(x) });
    seen.clear();
    for (const x of b) if (key(x) && !ak.has(key(x)) && !seen.has(key(x))) seen.add(key(x)) && added.push({ category, item: typeof x === "string" ? x : JSON.stringify(x) });
  };
  cmp("navigation link", before.navigation.map((l) => l.text), after.navigation.map((l) => l.text));
  cmp("call to action", before.ctas.map((c) => c.text), after.ctas.map((c) => c.text));
  cmp("heading", before.headings.map((h) => h.text), after.headings.map((h) => h.text));
  cmp("form field", before.forms.flatMap((f) => f.fields.map((x) => x.label || x.name || x.type)), after.forms.flatMap((f) => f.fields.map((x) => x.label || x.name || x.type)));
  cmp("phone", before.contact.phones, after.contact.phones, (x) => x.replace(/\D/g, ""));
  cmp("email", before.contact.emails, after.contact.emails);
  cmp("social link", before.contact.social, after.contact.social);
  cmp("legal link", before.legal, after.legal);
  cmp("tracking / third-party script", before.tracking, after.tracking);
  cmp("structured data", before.meta.structuredData, after.meta.structuredData);
  cmp("embed", before.media.embeds, after.media.embeds);
  cmp("table", before.components.tables, after.components.tables);
  const flags = [
    ["meta description", before.meta.description, after.meta.description],
    ["favicon", before.meta.favicon, after.meta.favicon],
    ["Open Graph image", before.meta.ogImage, after.meta.ogImage],
    ["canonical", before.meta.canonical, after.meta.canonical],
    ["postal address", before.contact.address, after.contact.address],
  ];
  for (const [name, a, b] of flags) if (a && !b) missing.push({ category: "page setting", item: name });
  const counts = [
    ["images", before.media.images.length, after.media.images.length],
    ["videos", before.media.videos, after.media.videos],
    ["charts", before.media.charts, after.media.charts],
    ["forms", before.forms.length, after.forms.length],
    ["carousels", before.components.carousels, after.components.carousels],
    ["accordions", before.components.accordions, after.components.accordions],
    ["testimonials", before.components.testimonials, after.components.testimonials],
    ["maps", before.components.maps, after.components.maps],
  ];
  const fewer = counts.filter(([, a, b]) => b < a).map(([name, a, b]) => ({ category: "count", item: `${name}: ${a} → ${b}` }));
  return { missing: [...missing, ...fewer], added };
}

/** Markdown checklist of everything on the page — to tick off during a redesign. */
export function formatInventory(inv) {
  const L = [`## Page inventory — ${inv.url}`, ""];
  const list = (title, items) => {
    if (!items.length) return;
    L.push(`**${title}**`);
    for (const i of items) L.push(`- [ ] ${i}`);
    L.push("");
  };
  list("Page settings", [
    `Title: ${inv.meta.title || "—"}`,
    `Meta description: ${inv.meta.description ? "yes" : "MISSING"}`,
    `Language: ${inv.meta.lang || "MISSING"} · Favicon: ${inv.meta.favicon ? "yes" : "MISSING"} · OG image: ${inv.meta.ogImage ? "yes" : "no"} · Canonical: ${inv.meta.canonical ? "yes" : "no"}`,
    ...(inv.meta.structuredData.length ? [`Structured data: ${inv.meta.structuredData.join(", ")}`] : []),
  ]);
  list("Landmarks", [inv.landmarks.map((l) => `${l.tag}${l.count > 1 ? ` ×${l.count}` : ""}`).join(" · ")]);
  list("Heading outline", inv.headings.map((h) => `${"  ".repeat(h.level - 1)}h${h.level} ${h.text}`));
  list("Navigation", [...new Set(inv.navigation.map((l) => l.text))]);
  list("Calls to action", inv.ctas.map((c) => c.text));
  list("Forms", inv.forms.map((f, i) => `Form ${i + 1}: ${f.fields.map((x) => `${x.label || x.name || x.type}${x.required ? "*" : ""}`).join(", ")} → "${f.submit || "submit"}"`));
  const m = inv.media;
  list("Media", [`${m.images.length} images (${m.images.filter((i) => !i.alt).length} without alt) · ${m.videos} videos · ${m.icons} SVG icons · ${m.charts} charts`, ...m.embeds.map((e) => `Embed: ${e}`)]);
  const c = inv.components;
  list("Components", [
    [c.carousels && `${c.carousels} carousel(s)`, c.accordions && `${c.accordions} accordion/expandable(s)`, c.tabs && `${c.tabs} tab group(s)`, c.dialogs && `${c.dialogs} dialog(s)`, c.testimonials && `${c.testimonials} testimonial/review block(s)`, c.maps && `${c.maps} map(s)`].filter(Boolean).join(" · ") || "none detected",
    ...c.tables.map((t) => `Table: ${t || "(no headers)"}`),
  ]);
  list("Contact & social", [
    ...inv.contact.phones.map((p) => `Phone ${p}`),
    ...inv.contact.emails.map((e) => `Email ${e}`),
    ...(inv.contact.address ? ["Postal address in the page"] : []),
    ...inv.contact.social.map((s) => `Social: ${s}`),
  ]);
  list("Legal", inv.legal);
  list("Tracking & third-party scripts (keep them wired)", inv.tracking);
  L.push(`_${inv.counts.words} words · ${inv.counts.internalLinks} internal / ${inv.counts.externalLinks} external links · ${inv.counts.sections} <section>s_`);
  return L.join("\n");
}

export function formatDiff(diff) {
  const L = [];
  if (!diff.missing.length) L.push("✓ Nothing from the original page is missing.");
  else {
    L.push(`✗ ${diff.missing.length} element(s) from the original are missing after the redesign:`);
    for (const m of diff.missing) L.push(`  - ${m.category}: ${m.item}`);
  }
  if (diff.added.length) {
    L.push("", `+ ${diff.added.length} new element(s):`);
    for (const a of diff.added.slice(0, 30)) L.push(`  - ${a.category}: ${a.item}`);
  }
  return L.join("\n");
}
