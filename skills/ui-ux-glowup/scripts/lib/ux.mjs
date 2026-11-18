// UX audit: can people find the main action, fill the forms, understand the states, move around?
// collectUx runs in the page (self-contained); uxFindings is pure and unit-tested.

export function collectUx() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    const c = [...el.classList].slice(0, 2).join(".");
    return c ? s + "." + c : s;
  };
  const txt = (el) => (el.getAttribute("aria-label") || el.textContent || el.value || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const alpha = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(/[ ,/]+/).filter(Boolean);
    return p.length > 3 ? Number(p[3]) : 1;
  };
  const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return p.length > 3 && p[3] < 0.5 ? null : p.slice(0, 3); };
  const pageBg = rgb(getComputedStyle(document.body).backgroundColor) || rgb(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255];
  const far = (c) => { const x = rgb(c); return !!x && Math.hypot(x[0] - pageBg[0], x[1] - pageBg[1], x[2] - pageBg[2]) >= 60; };
  const filled = [];
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input[type="submit"]')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top >= innerHeight || r.height < 24) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (alpha(bg) >= 0.9 && far(bg)) filled.push({ sel: sel(el), label: txt(el) });
  }
  const fields = [];
  const forms = [];
  for (const f of document.forms) {
    if (!vis(f)) continue;
    const els = [...f.elements].filter((e) => vis(e) && e.name !== undefined && !["hidden", "submit", "button", "reset", "image"].includes(e.type));
    forms.push({
      sel: sel(f), fields: els.length, novalidate: f.noValidate,
      hasRequired: els.some((e) => e.required),
      announces: !!f.querySelector('[role="alert"], [aria-live], [aria-describedby]'),
    });
  }
  for (const e of document.querySelectorAll("input, textarea, select")) {
    if (!vis(e) || ["hidden", "submit", "button", "reset", "image", "checkbox", "radio"].includes(e.type)) continue;
    fields.push({
      sel: sel(e), type: e.type || e.tagName.toLowerCase(),
      id: [e.name, e.id, e.getAttribute("placeholder") || ""].join(" ").toLowerCase(),
      placeholder: !!e.getAttribute("placeholder"),
      labelled: !!(e.labels && e.labels.length) || !!e.getAttribute("aria-label") || !!e.getAttribute("aria-labelledby") || !!e.getAttribute("title"),
      autocomplete: e.getAttribute("autocomplete"),
    });
  }
  const emptyLists = [];
  for (const t of document.querySelectorAll("table")) {
    if (!vis(t)) continue;
    const rows = t.querySelectorAll("tbody tr").length;
    if (t.querySelector("thead") && rows === 0) emptyLists.push({ sel: sel(t), kind: "table" });
  }
  for (const l of document.querySelectorAll("ul, ol")) {
    if (vis(l) && !l.querySelector("li") && !l.closest("nav") && !(l.textContent || "").trim()) emptyLists.push({ sel: sel(l), kind: "list" });
  }
  const navs = [];
  const path = location.pathname;
  for (const n of document.querySelectorAll("nav, [role='navigation']")) {
    if (!vis(n)) continue;
    const links = [...n.querySelectorAll("a[href]")].filter(vis);
    if (!links.length) continue;
    const top = links.filter((a) => !a.closest("ul ul, li li, [role='menu']"));
    navs.push({
      sel: sel(n), links: top.length,
      anchorsOnly: links.every((a) => (a.getAttribute("href") || "").startsWith("#")),
      hasCurrent: links.some((a) => a.getAttribute("aria-current") || /\b(active|current|selected)\b/i.test(a.className) || (a.pathname === path && path !== "/" && a.origin === location.origin)),
      inHeader: !!n.closest("header"),
    });
  }
  const vh = innerHeight;
  const bodyText = (document.body.innerText || "").slice(0, 60000);
  const actionOf = (re) => {
    const els = [...document.querySelectorAll("a[href], button, [role=button], input[type=submit]")].filter((e) => vis(e) && re.test(txt(e)));
    if (!els.length) return null;
    const top = Math.min(...els.map((e) => e.getBoundingClientRect().top + scrollY));
    return { count: els.length, top: Math.round(top), screens: +(top / vh).toFixed(1), inHeader: els.some((e) => e.closest("header, nav")), label: txt(els[0]) };
  };
  const tables = [...document.querySelectorAll("table")].filter(vis).map((t) => ({
    sel: sel(t), rows: t.querySelectorAll("tbody tr, tr").length,
    sortable: !!t.querySelector("th[aria-sort], th button, th a[href]"),
    caption: !!t.querySelector("caption"),
  }));
  const radios = new Map();
  for (const r of document.querySelectorAll("input[type=radio], input[type=checkbox][name]")) if (vis(r) && r.name) radios.set(r.name, [...(radios.get(r.name) || []), r]);
  const groupsNoLegend = [...radios].filter(([, list]) => list.length >= 2 && list[0].type === "radio" && !list[0].closest("fieldset, [role=group], [role=radiogroup]")).map(([name]) => name);
  const invalidNotDescribed = [...document.querySelectorAll('[aria-invalid="true"]')].filter((e) => vis(e) && !e.getAttribute("aria-describedby") && !e.getAttribute("aria-errormessage")).map(sel);
  const extras = {
    buy: actionOf(/add to (cart|bag|basket)|buy( now)?|purchase|order now|ajouter au panier|acheter|commander/i),
    price: /(?:[$€£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|\$|£|USD|EUR|GBP))/.test(bodyText),
    shipping: /shipping|delivery|returns?|refund|livraison|retours?|expédition/i.test(bodyText),
    signup: actionOf(/sign ?up|get started|start (for free|building|now|(your )?(free )?trial)|try (it|for free|free)|(book|get|request|see) (a )?(demo|access)|join( the)? (waitlist|free)|create (an |your )?(free )?account|register|s'inscrire|essai gratuit|commencer|demander/i),
    login: actionOf(/log ?in|sign ?in|connexion|se connecter/i),
    pricingLink: (() => { const els = [...document.querySelectorAll("a[href]")].filter((e) => vis(e) && txt(e).length <= 30 && /^(pricing|plans?( (and|&) pricing)?|tarifs?|prices?)$/i.test(txt(e).replace(/[^\w&\s]/g, "").trim())); return els.length ? { count: els.length, top: Math.round(Math.min(...els.map((e) => e.getBoundingClientRect().top + scrollY))), screens: 0, inHeader: els.some((e) => e.closest("header, nav")), label: txt(els[0]) } : null; })(),
    book: actionOf(/(book|schedule|request|get|arrange)( a| an| your| my)?( free)? (consultation|appointment|quote|call|callback|visit|estimate|booking)|contact (us|sales)|get in touch|nous contacter|prendre rendez-vous|devis/i),
    contact: { tel: !!document.querySelector('a[href^="tel:"]'), mail: !!document.querySelector('a[href^="mailto:"]'), link: actionOf(/contact|get in touch|book|appointment|nous contacter|rendez-vous|call/i), address: !!document.querySelector("address") || /\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/.test(bodyText) || /\b[A-Z]{2}\s\d{5}\b/.test(bodyText) || /\b\d{1,4}\s+[A-Z][\w.' -]+(street|st\.|road|rd\.|avenue|ave\.|lane|rue|boulevard)\b/i.test(bodyText) },
    hours: /(mon|tue|wed|thu|fri|sat|sun|lun|mar|mer|jeu|ven|sam|dim)[a-z]*\.?\s*(to|[–-]|-)\s*(mon|tue|wed|thu|fri|sat|sun|lun|mar|mer|jeu|ven|sam|dim)[a-z]*\.?[^\n]{0,24}\d{1,2}[:h]\d{2}/i.test(bodyText) || /\b\d{1,2}[:h]\d{2}\s?[–-]\s?\d{1,2}[:h]\d{2}\b/.test(bodyText),
    tables, search: !!document.querySelector('input[type="search"], [role="search"]'), liveRegion: !!document.querySelector('[role="status"], [aria-live]'),
    article: (() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch { return {}; } }).flat();
      const has = (k) => ld.some((o) => o && (o[k] || (Array.isArray(o["@graph"]) && o["@graph"].some((g) => g[k]))));
      const head = ((document.querySelector("article") || document.body).innerText || "").slice(0, 2500);
      const dateText = /(january|february|march|april|may|june|july|august|september|october|november|december|janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)[a-zé.]*\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}|\b\d{4}-\d{2}-\d{2}\b/i.test(head);
      return { hasTime: !!document.querySelector("time[datetime], [itemprop=datePublished]") || has("datePublished") || dateText, hasAuthor: !!document.querySelector('[rel="author"], [itemprop="author"], .byline, .author') || has("author") || /\bby\s+[A-Z][a-z]+/.test(head), isArticle: !!document.querySelector("article") && document.querySelectorAll("article p").length >= 4 && ((document.querySelector("article").innerText || "").length >= 1800) };
    })(),
    groupsNoLegend, invalidNotDescribed, vh,
    authScreen: !!document.querySelector("input[type=password]") && forms.length === 1 && forms[0].fields <= 4,
    pricingPage: /pricing|plans?|tarifs?/i.test((document.querySelector("h1") || {}).textContent || ""),
  };
  const homeLink = [...document.querySelectorAll("a[href]")].some((a) => a.origin === location.origin && (a.pathname === "/" || a.pathname === "/index.html"));
  return {
    url: location.href, web: /^https?:$/.test(location.protocol), isHome: path === "/" || /index\.html$/.test(path),
    filled, fields, forms, emptyLists, navs, homeLink, extras,
  };
}

const TYPE_HINTS = [
  [/e-?mail|courriel/, "email", "email"],
  [/\b(phone|tel|mobile|t[ée]l[ée]phone)\b/, "tel", "tel"],
];
const AUTOCOMPLETE_HINTS = [
  [/e-?mail|courriel/, "email"],
  [/\b(phone|tel|mobile|t[ée]l[ée]phone)\b/, "tel"],
  [/first.?name|pr[ée]nom|given/, "given-name"],
  [/last.?name|family|\bnom\b/, "family-name"],
  [/zip|postal|code.?postal/, "postal-code"],
  [/\bcity\b|ville/, "address-level2"],
  [/street|address|adresse/, "street-address"],
];

export const IMPACT = {
  "no-primary-action": "high", "placeholder-as-label": "high", "errors-unsupported": "high", "invalid-not-described": "high",
  "no-buy-action": "high", "buy-no-price": "high", "no-signup-action": "high", "no-contact-method": "high", "primary-action-buried": "high", "broken-internal-link": "high",
  "competing-primary-actions": "medium", "missing-autocomplete": "medium", "wrong-input-type": "medium", "long-form": "medium", "empty-state-missing": "medium",
  "nav-no-current": "medium", "no-home-link": "medium", "no-shipping-info": "medium", "no-pricing-link": "medium", "no-hours-or-address": "medium",
  "table-no-search": "medium", "no-date": "medium", "radio-group-no-legend": "medium",
  "nav-too-many": "low", "table-no-sort": "low", "table-no-count": "low", "no-author": "low", "no-login-link": "low",
};
const IMPACT_RANK = { high: 0, medium: 1, low: 2 };
export const CONTEXTS = ["auto", "saas", "ecommerce", "showcase", "dashboard", "content", "app"];

/** What kind of site this looks like, from what is on the page. */
export function inferContext(d) {
  const x = d.extras;
  if (!x) return "app";
  if (x.authScreen) return "app";
  if (x.buy) return "ecommerce";
  if (x.signup) return "saas";
  if (x.book || x.contact.tel || x.hours || x.contact.address) return "showcase";
  if (x.pricingLink || x.login) return "saas";
  if (x.article.isArticle) return "content";
  if (x.tables.some((t) => t.rows >= 5)) return "dashboard";
  return "app";
}

export function uxFindings(d, { context = "auto" } = {}) {
  const out = [];
  const add = (rule, severity, message, fix, items = []) => out.push({ rule, severity, message, fix, items: items.slice(0, 4), impact: IMPACT[rule] || "medium", kind: "usability" });
  const ctx = context === "auto" ? inferContext(d) : context;
  const x = d.extras;

  if (d.filled.length === 0 && ["saas", "ecommerce", "showcase"].includes(ctx)) {
    add("no-primary-action", "warning", "No filled button or link above the fold: nothing says what to do first.", "Give the one main action a filled button in the first screen, with a verb + result label.");
  } else if (d.filled.length && new Set(d.filled.map((f) => f.label.toLowerCase())).size >= 4) {
    add("competing-primary-actions", "warning", `${d.filled.length} filled actions above the fold compete for attention.`, "Keep one filled primary; make the others outline or text links.", d.filled.map((f) => `${f.sel} "${f.label}"`));
  }

  const bare = d.fields.filter((f) => !f.labelled && f.placeholder);
  if (bare.length) add("placeholder-as-label", "error", `${bare.length} field(s) use the placeholder as the only label; it disappears while typing.`, "Add a visible <label for> above each field; keep the placeholder for an example only.", bare.map((f) => f.sel));

  const noAc = d.fields.filter((f) => f.autocomplete === null && f.type !== "search" && AUTOCOMPLETE_HINTS.some(([re]) => re.test(f.id)));
  const pwd = d.fields.filter((f) => f.type === "password" && f.autocomplete === null);
  if (noAc.length + pwd.length) add("missing-autocomplete", "warning", `${noAc.length + pwd.length} personal-data field(s) have no autocomplete attribute; browsers can't fill them.`, 'Add autocomplete (email, tel, given-name, postal-code, current-password / new-password).', [...noAc, ...pwd].map((f) => f.sel));

  const wrong = d.fields.filter((f) => f.type === "text" && TYPE_HINTS.some(([re, t]) => re.test(f.id) && t));
  if (wrong.length) add("wrong-input-type", "warning", `${wrong.length} email/phone field(s) are type="text": no suitable mobile keyboard, no built-in validation.`, 'Use type="email" or type="tel" (and inputmode where needed).', wrong.map((f) => f.sel));

  for (const f of d.forms) {
    if (f.fields > 7) add("long-form", "warning", `${f.sel} asks for ${f.fields} fields at once.`, "Ask only what is needed now; split into steps or make optional fields optional and last.", [f.sel]);
    if (f.novalidate && f.hasRequired && !f.announces) add("errors-unsupported", "warning", `${f.sel} disables browser validation and has no alert region: errors may never be shown or announced.`, 'Show each error next to its field with role="alert" or aria-describedby, in plain words saying how to fix it.', [f.sel]);
  }

  if (d.emptyLists.length) add("empty-state-missing", "warning", `${d.emptyLists.length} table/list is empty with no message: users can't tell loading from "nothing here".`, "Add an empty state: what this is, why it's empty, and the action that fills it (microcopy.md).", d.emptyLists.map((e) => `${e.kind} ${e.sel}`));

  const real = d.navs.filter((n) => !n.anchorsOnly && n.links >= 3);
  const flat = real.filter((n) => !n.hasCurrent);
  if (flat.length) add("nav-no-current", "warning", "Navigation doesn't show which page you're on.", 'Mark the current link with aria-current="page" and a visible style.', flat.map((n) => n.sel));
  const wide = d.navs.filter((n) => n.inHeader && n.links > 8);
  if (wide.length) add("nav-too-many", "warning", `Main navigation has ${wide[0].links} top-level links.`, "Group into 5–7 entries; move the rest to the footer or a submenu.", wide.map((n) => n.sel));

  if (x) {
    if (x.groupsNoLegend.length) add("radio-group-no-legend", "warning", `${x.groupsNoLegend.length} group(s) of radio buttons have no fieldset and legend: the question is lost for screen reader users.`, "Wrap the options in <fieldset> with a <legend> that asks the question.", x.groupsNoLegend);
    if (x.invalidNotDescribed.length) add("invalid-not-described", "error", "Fields marked invalid have no error message tied to them.", 'Give each error an id and point to it with aria-describedby (and keep the message visible next to the field).', x.invalidNotDescribed);
    if (ctx === "ecommerce") {
      if (!x.buy) add("no-buy-action", "error", "No add-to-cart or buy action on a page that sells.", "Put one filled add-to-cart button next to the price, above the fold on phones.");
      else {
        if (!x.price) add("buy-no-price", "error", "A buy action with no price on the page.", "Show the price next to the buy button, with the currency, before anything else asks for a decision.");
        if (x.buy.screens > 1.5) add("primary-action-buried", "warning", `The buy action sits ${x.buy.screens} screens down.`, "Bring it into the first screen, or add a sticky buy bar on phones.");
      }
      if (!x.shipping) add("no-shipping-info", "warning", "No delivery or returns information on the page.", "Say when it arrives, what it costs and how to return it, near the buy button.");
    }
    if (ctx === "saas") {
      if (!x.signup) add("no-signup-action", "error", "No sign-up, trial or get-started action found.", 'Add one primary action with a verb and a result, e.g. "Start free trial", in the header and the hero.');
      else if (x.signup.screens > 2 && !x.signup.inHeader) add("primary-action-buried", "warning", `The main action is ${x.signup.screens} screens down and not in the header.`, "Put it in the header and the first screen.");
      if (!x.pricingLink && !x.pricingPage) add("no-pricing-link", "warning", "No link to pricing or plans.", "Add Pricing to the main navigation: visitors who can't find the price leave.");
      if (!x.login && !x.signup) add("no-login-link", "warning", "No sign-in link for returning users.", "Add Sign in at the right of the header.");
    }
    if (ctx === "showcase") {
      if (!x.contact.tel && !x.contact.mail && !x.contact.link && !x.book) add("no-contact-method", "error", "No way to contact the business: no phone, email or contact link.", "Show the phone number (tel: link) and a contact or booking action in the header.");
      if (!x.hours && !x.contact.address) add("no-hours-or-address", "warning", "No opening hours or address.", "Say where you are and when you are open, in the first screen on phones.");
    }
    if (ctx === "dashboard" || ctx === "app") {
      const big = x.tables.filter((t) => t.rows >= 8);
      if (big.length && !x.search) add("table-no-search", "warning", `A table of ${big[0].rows} rows with no search or filter.`, "Add a search field above the table and one or two filters.", big.map((t) => t.sel));
      if (big.length && !big.some((t) => t.sortable)) add("table-no-sort", "warning", "A long table whose columns cannot be sorted.", "Make the key column headers sortable buttons with aria-sort.", big.map((t) => t.sel));
      if (big.length && !x.liveRegion) add("table-no-count", "warning", "A long table with no result count announced.", 'Show "N results" in a role="status" region that updates when filters change.', big.map((t) => t.sel));
    }
    if (ctx === "content" && x.article.isArticle) {
      if (!x.article.hasTime) add("no-date", "warning", "No publication date on an article.", "Show the date in a <time datetime> element under the title.");
      if (!x.article.hasAuthor) add("no-author", "warning", "No author on an article.", "Name the author (rel=author) near the title.");
    }
  }
  out.context = ctx;
  if (d.web && !d.isHome && !d.homeLink) add("no-home-link", "warning", "No link back to the home page (logo or menu).", "Make the logo a link to /.");
  const ranked = out.sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || (a.severity === "error" ? -1 : 0));
  ranked.context = ctx;
  return ranked;
}

export function formatUx(findings, viewport) {
  const ctx = findings.context ? `, as ${findings.context}` : "";
  if (!findings.length) return `UX audit (${viewport}${ctx}): no issue found by these checks.`;
  const lines = [`UX audit (${viewport}${ctx}): ${findings.length} issue(s), most impactful first`];
  for (const f of findings) {
    lines.push(`  ${f.severity === "error" ? "✗" : "!"} [${f.impact}] ${f.rule} — ${f.message}`);
    if (f.items.length) lines.push(`      ${f.items.join(" · ")}`);
    lines.push(`      → ${f.fix}`);
  }
  return lines.join("\n");
}
