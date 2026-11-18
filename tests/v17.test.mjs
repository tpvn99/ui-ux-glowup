// v1.7 rules: no-JS render, H1 glue, JSON-LD validation, motion, copy, brand choices, site files.
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, score, checkJsonLd, missingShare, hreflangIssues, plain, BRAND_CHOICE_RULES } from "../skills/ui-ux-glowup/scripts/lib/analyze.mjs";
import { parseRobots, blockedAiBots, checkSitemap, hreflangNotReciprocal, siteFindings } from "../skills/ui-ux-glowup/scripts/lib/site.mjs";
import { formatReport } from "../skills/ui-ux-glowup/scripts/lib/report.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";
import { audit, auditOptions } from "../skills/ui-ux-glowup/scripts/audit.mjs";

let hasPlaywright = true;
try {
  await loadPlaywright();
} catch {
  hasPlaywright = false;
}
const skip = !hasPlaywright && "playwright not installed";
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const page = (over = {}) => ({
  url: "https://example.com/", viewport: { width: 1440, height: 900 }, title: "Page", lang: "en",
  hasViewportMeta: true, hasDescription: true, overflowX: 0, pageHeight: 2000, lorem: false,
  texts: [], interactive: [], images: [], fields: [],
  headings: [{ level: 1, text: "Title", fontSize: 56, letterSpacing: -1.5, lineHeight: 60 }],
  paragraphs: [{ sel: "p", fontSize: 16, lineHeight: 26, measure: 64 }],
  spacing: [8, 16, 24, 32], radii: [8], shadows: [],
  seo: { title: "A title that is long enough for search", description: "x".repeat(130), canonical: "https://example.com/", ogTitle: "t", ogImage: "i", favicon: true, jsonLd: 1, jsonLdRaw: [], robots: "", words: 400 },
  ...over,
});
const rulesOf = (d, opts) => new Map(analyze(d, d, opts).map((f) => [f.rule, f]));

test("no-js-content-missing: H1, more than 20% of the text or a FAQ question absent without JS", () => {
  const snapshot = { h1: "Customs clearance without the waiting", visibleText: "Customs clearance without the waiting we file import declarations for freight arriving in Rotterdam", faq: [{ q: "Which ports do you cover?", a: "Rotterdam" }], hidden: [], reducedMotion: true };
  const gone = rulesOf(page({ snapshot, noJs: { text: "Always readable", hidden: [] } })).get("no-js-content-missing");
  assert.equal(gone.severity, "error");
  assert.match(gone.items.join(" | "), /H1 .*% of the main text.*FAQ/);
  const same = rulesOf(page({ snapshot, noJs: { text: "Customs clearance without the waiting. We file import declarations for freight arriving in Rotterdam. Which ports do you cover?", hidden: [] } }));
  assert.ok(!same.has("no-js-content-missing"));
  assert.ok(!rulesOf(page({ snapshot })).has("no-js-content-missing"), "not judged when the no-JS render was skipped");
  assert.equal(missingShare("alpha beta gamma delta epsilon", "alpha beta gamma delta"), 0.2);
});

test("hidden-until-animated: text still invisible with no JS or reduced motion", () => {
  const block = { sel: "section.reveal", how: "opacity: 0", text: "Customs paperwork handled" };
  const f = rulesOf(page({ snapshot: { h1: "", visibleText: "", faq: [], hidden: [block], reducedMotion: true }, noJs: { text: "", hidden: [block] } })).get("hidden-until-animated");
  assert.equal(f.severity, "error");
  assert.equal(f.items.length, 1);
  assert.match(f.items[0], /reduced motion \+ no JS/);
  assert.ok(!rulesOf(page({ snapshot: { h1: "", visibleText: "", faq: [], hidden: [block], reducedMotion: false } })).has("hidden-until-animated"), "without reduced motion a hidden block may simply not have been scrolled to");
});

test("h1-word-glue: words in separate elements with no space in the HTML", () => {
  const glued = rulesOf(page({ h1Glue: { raw: "DesagentsIA", rendered: "Des agents IA", gapped: [] } })).get("h1-word-glue");
  assert.equal(glued.severity, "error");
  assert.ok(rulesOf(page({ h1Glue: { raw: "DesagentsIA", rendered: "DesagentsIA", gapped: ["Des|agents"] } })).has("h1-word-glue"), "CSS margins between inline-block words");
  assert.ok(!rulesOf(page({ h1Glue: { raw: "Des agents IA", rendered: "DES AGENTS IA", gapped: [] } })).has("h1-word-glue"), "text-transform is not glue");
});

test("JSON-LD: invalid block, unknown type, FAQ mismatch, rating without reviews", () => {
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
    { "@type": "Question", name: "Do you repair slate roofs?", acceptedAnswer: { "@type": "Answer", text: "<p>Yes. We replace single slates.</p>" } },
    { "@type": "Question", name: "Do you offer financing?", acceptedAnswer: { "@type": "Answer", text: "Yes." } },
    { "@type": "Question", name: "How fast can you come?", acceptedAnswer: { "@type": "Answer", text: "Within two hours, every day of the year, guaranteed." } },
  ] });
  const text = "Do you repair slate roofs? Yes. We replace single slates. How fast can you come? Usually the next working day.";
  const r = checkJsonLd(['{"@type":"Thing",}', '{"@type":"LocalBusines","aggregateRating":{"@type":"AggregateRating","ratingValue":"5"}}', faq], text, 0);
  assert.equal(r.invalid.length, 1);
  assert.deepEqual(r.unknownTypes, ["LocalBusines"]);
  assert.equal(r.faqMismatch.length, 2);
  assert.match(r.faqMismatch[0], /question not on the page: "Do you offer financing/);
  assert.match(r.faqMismatch[1], /answer differs/);
  assert.ok(r.ratingWithoutReviews);
  assert.ok(!checkJsonLd(['{"@type":"Product","aggregateRating":{"ratingValue":"4"}}'], "", 3).ratingWithoutReviews);
  const d = page({ snapshot: { text, h1: "", visibleText: "", faq: [], hidden: [] }, seo: { ...page().seo, jsonLdRaw: ['{"@type":"Thing",}', '{"@type":"LocalBusines","aggregateRating":{"ratingValue":"5"}}', faq], reviewsVisible: 0 } });
  const rules = rulesOf(d);
  assert.equal(rules.get("jsonld-invalid").severity, "error");
  assert.equal(rules.get("jsonld-unknown-type").severity, "warn");
  assert.equal(rules.get("faq-jsonld-mismatch").severity, "error");
  assert.equal(rules.get("rating-without-reviews").severity, "warn");
  assert.equal(plain("<b>Café</b> &amp; Thé — 12 %"), "café thé 12");
});

test("canonical vs og:url and hreflang consistency", () => {
  const d = page({ seo: { ...page().seo, canonical: "https://example.com/a", ogUrl: "https://example.com/b", hreflang: [{ lang: "fr", href: "https://example.com/fr" }, { lang: "english", href: "https://example.com/en" }] } });
  const rules = rulesOf(d);
  assert.ok(rules.has("canonical-og-mismatch"));
  assert.match(rules.get("hreflang").items.join(" | "), /invalid code "english".*no self-referencing.*no x-default.*lang="en"/);
  assert.deepEqual(hreflangIssues([{ lang: "en", href: "https://example.com/" }, { lang: "fr-FR", href: "https://example.com/fr" }, { lang: "x-default", href: "https://example.com/" }], "https://example.com/", "en"), []);
  assert.ok(!rulesOf(page({ seo: { ...page().seo, canonical: "https://example.com/a/", ogUrl: "https://example.com/a" } })).has("canonical-og-mismatch"));
});

test("motion rules: layout animation, reveal everywhere, infinite, slow, will-change, scroll CLS", () => {
  const motion = { layoutAnimations: ["div.panel (transition: height)"], infiniteAnimations: ["p.float (float)"], slowMotion: ["a.slow (1.5s)"], willChange: 12, willChangeSample: ["div"], sections: 5, revealSections: 4, revealSample: ["section.reveal"] };
  const rules = rulesOf(page({ motion, scrollCls: { value: 0.31, sources: ["p"] } }));
  for (const r of ["layout-animation", "ai-reveal-everywhere", "ai-infinite-animation", "ai-slow-motion", "ai-will-change-everywhere"]) assert.equal(rules.get(r)?.severity, "warn", r);
  assert.equal(rules.get("scroll-cls").severity, "error");
  assert.equal(rulesOf(page({ scrollCls: { value: 0.15, sources: [] } })).get("scroll-cls").severity, "warn");
  const calm = rulesOf(page({ motion: { layoutAnimations: [], infiniteAnimations: [], slowMotion: [], willChange: 10, willChangeSample: [], sections: 6, revealSections: 3, revealSample: [] }, scrollCls: { value: 0.1, sources: [] } }));
  for (const r of ["layout-animation", "ai-reveal-everywhere", "ai-infinite-animation", "ai-slow-motion", "ai-will-change-everywhere", "scroll-cls"]) assert.ok(!calm.has(r), r);
});

test("copy rules: vague CTA, unproven claim, vague error message are warnings", () => {
  const rules = rulesOf(page({ copy: { vagueCtas: ['a "En savoir plus"'], vagueCtaCount: 3, unprovenClaims: ['p "+500 clients"'], vagueErrors: ['p#email-error "Champ invalide"'] } }));
  for (const r of ["vague-cta", "unproven-claim", "vague-error-message"]) assert.equal(rules.get(r).severity, "warn", r);
  assert.match(rules.get("vague-cta").message, /See pricing.*Voir les tarifs/);
  assert.match(rules.get("unproven-claim").message, /Product decisions to confirm/);
  assert.equal(rulesOf(page({ copy: { vagueCtas: [], vagueCtaCount: 0, unprovenClaims: [], vagueErrors: [] } })).size, rulesOf(page()).size);
});

test("--allow: brand choices are reported as accepted and cost nothing", () => {
  const aiLook = { gradients: [], glass: 0, bigRadius: 0, radiusElements: 10, bigRadiusSample: [], identicalCards: [], emoji: [], cliches: [], centeredShare: 20, heroPills: ['a.badge "New"'], accentWords: ["h1 fast"], capsLabels: ["span A", "span B"], gradientText: ["span.grad"] };
  const plainRun = analyze(page({ aiLook }), page({ aiLook }));
  for (const r of BRAND_CHOICE_RULES) assert.equal(plainRun.find((f) => f.rule === r).severity, "warn", `${r} is never an error`);
  const allowed = analyze(page({ aiLook }), page({ aiLook }), { allow: [...BRAND_CHOICE_RULES, "ai-gradient-text"] });
  for (const r of BRAND_CHOICE_RULES) {
    const f = allowed.find((x) => x.rule === r);
    assert.ok(f.accepted && f.severity === "info");
    assert.match(f.message, /^accepted \(brand choice\)/);
  }
  assert.equal(allowed.find((f) => f.rule === "ai-gradient-text").severity, "warn", "only brand-choice rules can be allowed");
  assert.ok(score(allowed).total > score(plainRun).total);
  assert.match(formatReport({ target: "x", ...score(allowed), findings: allowed }), /accepted \(brand choice\)/);
  assert.deepEqual(auditOptions({ allow: "ai-hero-pill, ai-accent-word" }).allow, ["ai-hero-pill", "ai-accent-word"]);
});

test("the no-JS render runs on the first audit, and on a re-check only when it found something", () => {
  assert.equal(auditOptions({}).noJs, true);
  assert.equal(auditOptions({ fast: true }).noJs, false);
  assert.equal(auditOptions({}, { findings: [{ rule: "contrast" }] }).noJs, false);
  assert.equal(auditOptions({}, { findings: [{ rule: "hidden-until-animated" }] }).noJs, true);
  assert.equal(auditOptions({ deep: true }, { findings: [] }).noJs, true);
  assert.match(formatReport({ target: "x", scores: Object.fromEntries(["Hierarchy", "Typography", "Spacing", "Components", "Visuals", "Content", "Responsive", "Accessibility", "SEO"].map((c) => [c, 5])), total: 45, max: 45, findings: [], noJsChecked: false }), /No-JS render not checked/);
});

test("site files: robots.txt, sitemap.xml, llms.txt, AI crawlers, hreflang reciprocity", () => {
  const robots = parseRobots("User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nUser-agent: PerplexityBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /private/\nSitemap: https://example.com/sitemap.xml\n");
  assert.ok(robots.valid);
  assert.deepEqual(blockedAiBots(robots), ["GPTBot", "PerplexityBot"]);
  assert.deepEqual(blockedAiBots(parseRobots("User-agent: *\nDisallow: /")).length, 4);
  assert.equal(parseRobots("<!doctype html><html>").valid, false);
  assert.ok(checkSitemap("<urlset><url><loc>https://example.com/</loc></url></urlset>").valid);
  assert.equal(checkSitemap("<urlset></urlset>").valid, false);
  const pages = [{ url: "https://example.com/", hreflang: [{ lang: "fr", href: "https://example.com/fr" }] }, { url: "https://example.com/fr", hreflang: [] }];
  assert.equal(hreflangNotReciprocal(pages).length, 1);
  const all = new Map(siteFindings({ robots: "User-agent: GPTBot\nDisallow: /", sitemap: "<html>", llms: null }, pages).map((f) => [f.rule, f.severity]));
  assert.deepEqual(Object.fromEntries(all), { "ai-bots-blocked": "warn", "sitemap-invalid": "error", "llms-missing": "warn", "hreflang-not-reciprocal": "warn" });
  const none = new Map(siteFindings({ robots: null, sitemap: null, llms: "# Site" }).map((f) => [f.rule, f.severity]));
  assert.deepEqual(Object.fromEntries(none), { "robots-missing": "warn", "sitemap-missing": "warn" });
  assert.equal(siteFindings({ robots: "hello", sitemap: "<urlset><url><loc>https://a.b/</loc></url></urlset>", llms: "x" })[0].rule, "robots-invalid");
});

test("browser: content injected by JS and blocks that never appear (no-js.html)", { skip }, async () => {
  const r = await audit(fixture("no-js.html"));
  const rules = new Map(r.findings.map((f) => [f.rule, f]));
  assert.ok(r.noJsChecked);
  assert.match(rules.get("no-js-content-missing").items.join(" | "), /H1 "Customs clearance/);
  const stuck = rules.get("hidden-until-animated").items.join(" | ");
  assert.match(stuck, /section\.reveal \(opacity: 0; no JS\)/);
  assert.match(stuck, /section\.fade \(opacity: 0; reduced motion \+ no JS\)/);
  assert.ok(!/Always readable/.test(stuck));
  const fast = await audit(fixture("no-js.html"), { noJs: false });
  assert.equal(fast.noJsChecked, false);
  assert.ok(!fast.findings.some((f) => f.rule === "no-js-content-missing"));
});

test("browser: motion fixture triggers every motion rule and spares demos and loaders (motion.html)", { skip }, async () => {
  const r = await audit(fixture("motion.html"));
  const rules = new Map(r.findings.map((f) => [f.rule, f]));
  assert.match(rules.get("layout-animation").items.join(" | "), /div\.panel \(transition: height\).*p\.slide \(animation: margin-left\)|p\.slide \(animation: margin-left\).*div\.panel \(transition: height\)/);
  assert.equal(rules.get("ai-infinite-animation").items.length, 1, "the float outside the demo; not the one inside, not the spinner");
  assert.match(rules.get("ai-slow-motion").items[0], /a\.slow \(1\.5s\)/);
  assert.ok(rules.has("ai-will-change-everywhere"));
  assert.ok(rules.has("ai-reveal-everywhere"));
  assert.ok(rules.has("scroll-cls"), "late block shifts the layout while scrolling");
});

test("browser: vague CTAs, clichés in lists and buttons, unproven claims, generic errors, glued H1 (copy.html)", { skip }, async () => {
  const r = await audit(fixture("copy.html"));
  const rules = new Map(r.findings.map((f) => [f.rule, f]));
  const cta = rules.get("vague-cta").items.join(" | ");
  assert.match(cta, /En savoir plus/);
  assert.match(cta, /Découvrir/);
  assert.match(cta, /Read more/);
  assert.equal(rules.get("vague-cta").items.length, 3, "'Voir les tarifs' and the labelled 'Learn more' are fine");
  const cliche = rules.get("ai-cliche").items.join(" | ");
  for (const phrase of ["en quelques clics", "clé en main", "Unlock", "solution innovante", "Incontournable"]) assert.match(cliche, new RegExp(phrase, "i"), phrase);
  const claims = rules.get("unproven-claim").items.join(" | ");
  for (const phrase of ["N°1", "\\+500 clients", "98 % de clients"]) assert.match(claims, new RegExp(phrase), phrase);
  assert.equal(rules.get("unproven-claim").items.length, 3, "the figure with a linked study is sourced");
  assert.deepEqual(rules.get("vague-error-message").items.length, 1);
  assert.match(rules.get("vague-error-message").items[0], /Champ invalide/);
  assert.equal(rules.get("h1-word-glue").severity, "error");
});

test("browser: structured data is validated against the page (jsonld.html)", { skip }, async () => {
  const r = await audit(fixture("jsonld.html"));
  const rules = new Map(r.findings.map((f) => [f.rule, f]));
  for (const rule of ["jsonld-invalid", "jsonld-unknown-type", "faq-jsonld-mismatch", "rating-without-reviews", "canonical-og-mismatch", "hreflang"]) assert.ok(rules.has(rule), rule);
  assert.equal(rules.get("faq-jsonld-mismatch").items.length, 2, "the question that matches the closed <details> is fine");
});

test("browser: accepted brand choices keep their place in the report (ai-chrome.html)", { skip }, async () => {
  const strict = await audit(fixture("ai-chrome.html"), { noJs: false });
  const loose = await audit(fixture("ai-chrome.html"), { noJs: false, allow: ["ai-caps-label", "ai-accent-word"] });
  assert.ok(loose.findings.find((f) => f.rule === "ai-caps-label").accepted);
  assert.ok(loose.total > strict.total);
});

test("browser: site audit reads robots.txt, sitemap.xml and llms.txt next to local pages (site/)", { skip }, async () => {
  const { auditSite, formatSiteReport } = await import("../skills/ui-ux-glowup/scripts/audit-site.mjs");
  const site = await auditSite(fixture("site/index.html"), { max: 3 });
  assert.equal(site.pages.length, 2);
  const rules = Object.fromEntries(site.site.map((f) => [f.rule, f.severity]));
  assert.deepEqual(rules, { "ai-bots-blocked": "warn", "sitemap-invalid": "error", "llms-missing": "warn", "hreflang-not-reciprocal": "warn" });
  assert.match(formatSiteReport(site), /Site files/);
});

test("a hidden short heading is reported (a title is never too short to matter); a hidden tiny counter is not", { skip }, async () => {
  const bad = await audit(fixture("hidden-short-heading.html"), { fast: true });
  const f = bad.findings.find((x) => x.rule === "hidden-until-animated");
  assert.ok(f, JSON.stringify(bad.findings.map((x) => x.rule)));
  assert.match(f.items.join(), /h1/);
  const ok = await audit(fixture("hidden-counter.html"), { fast: true });
  assert.equal(ok.findings.some((x) => x.rule === "hidden-until-animated"), false);
});

test("false positives found on a real site: arrows are not emojis, a heading link may wrap, a scrolling nav is not a carousel", { skip }, async () => {
  const a = await audit(fixture("real-world.html"), { fast: true });
  const rules = a.findings.map((f) => f.rule);
  for (const bad of ["ai-emoji", "wrapped-control", "carousel-snap"]) assert.equal(rules.includes(bad), false, `${bad} in ${rules}`);
});
