import { test } from "node:test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { uxFindings, inferContext, IMPACT, CONTEXTS } from "../skills/ui-ux-glowup/scripts/lib/ux.mjs";
import { ux } from "../skills/ui-ux-glowup/scripts/ux.mjs";
import { loadPlaywright } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

let hasPlaywright = true;
try { await loadPlaywright(); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const fixture = (n) => fileURLToPath(new URL(`./fixtures/ctx/${n}`, import.meta.url));
const rules = (l) => [...l].map((f) => f.rule).sort();

const X = (o = {}) => ({ buy: null, price: false, shipping: false, signup: null, login: null, pricingLink: null, contact: { tel: false, mail: false, link: null, address: false }, hours: false, tables: [], search: false, liveRegion: false, article: { hasTime: false, hasAuthor: false, isArticle: false }, groupsNoLegend: [], invalidNotDescribed: [], authScreen: false, pricingPage: false, vh: 800, ...o });
const D = (x) => ({ url: "https://x.test/p", web: true, isHome: true, filled: [{ sel: "a", label: "Go" }], fields: [], forms: [], emptyLists: [], navs: [], homeLink: true, extras: x });

test("context is inferred from what the page offers", () => {
  assert.equal(inferContext(D(X({ buy: { screens: 0.5 }, price: true }))), "ecommerce");
  assert.equal(inferContext(D(X({ buy: { screens: 0.5 } }))), "ecommerce");
  assert.equal(inferContext(D(X({ contact: { tel: true, mail: false, link: null, address: false }, hours: true }))), "showcase");
  assert.equal(inferContext(D(X({ pricingLink: { top: 0 } }))), "saas");
  assert.equal(inferContext(D(X({ article: { hasTime: false, hasAuthor: false, isArticle: true } }))), "content");
  assert.equal(inferContext(D(X({ tables: [{ rows: 12 }] }))), "dashboard");
  assert.equal(inferContext(D(X({ authScreen: true, signup: { top: 0 }, pricingLink: null }))), "app");
  assert.ok(CONTEXTS.includes("auto") && CONTEXTS.length === 7);
});

test("each context asks for what a visitor of that kind of site needs", () => {
  assert.deepEqual(rules(uxFindings(D(X({ buy: { screens: 0.4 } })), { context: "ecommerce" })), ["buy-no-price", "no-shipping-info"]);
  assert.deepEqual(rules(uxFindings(D(X()), { context: "ecommerce" })), ["no-buy-action", "no-shipping-info"]);
  assert.deepEqual(rules(uxFindings(D(X({ signup: { screens: 4, inHeader: false } })), { context: "saas" })), ["no-pricing-link", "primary-action-buried"]);
  assert.deepEqual(rules(uxFindings(D(X({ pricingPage: true, signup: { screens: 0, inHeader: true } })), { context: "saas" })), []);
  assert.deepEqual(rules(uxFindings(D(X()), { context: "showcase" })), ["no-contact-method", "no-hours-or-address"]);
  assert.deepEqual(rules(uxFindings(D(X({ tables: [{ sel: "table", rows: 12, sortable: false }] })), { context: "dashboard" })), ["table-no-count", "table-no-search", "table-no-sort"]);
  assert.deepEqual(rules(uxFindings(D(X({ article: { hasTime: false, hasAuthor: false, isArticle: true } })), { context: "content" })), ["no-author", "no-date"]);
});

test("findings come most impactful first, with an impact on every rule", () => {
  const f = uxFindings(D(X()), { context: "showcase" });
  assert.equal(f[0].impact, "high"); assert.equal(f.context, "showcase");
  const order = f.map((x) => ["high", "medium", "low"].indexOf(x.impact));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for (const r of Object.keys(IMPACT)) assert.ok(["high", "medium", "low"].includes(IMPACT[r]), r);
  assert.ok(f.every((x) => x.kind === "usability" && x.fix.length > 15));
});

test("radio groups need a legend; invalid fields need a described error", () => {
  assert.deepEqual(rules(uxFindings(D(X({ groupsNoLegend: ["speed"], invalidNotDescribed: ["input#z"] })), { context: "app" })), ["invalid-not-described", "radio-group-no-legend"]);
});

test("real pages: the bad ones are flagged for their context, the good ones are clean", { skip }, async () => {
  const run = async (f, o = {}) => (await ux(fixture(f), o)).findings;
  assert.deepEqual(rules(await run("shop-bad.html")), ["buy-no-price", "no-shipping-info"]);
  assert.deepEqual(rules(await run("shop-good.html")), []);
  assert.ok(rules(await run("saas-bad.html")).includes("no-signup-action"));
  assert.deepEqual(rules(await run("saas-good.html")), []);
  assert.ok(rules(await run("showcase-bad.html")).includes("no-contact-method"));
  assert.deepEqual(rules(await run("showcase-good.html")), []);
  assert.deepEqual(rules(await run("table-bad.html")), ["table-no-count", "table-no-search", "table-no-sort"]);
  assert.deepEqual(rules(await run("table-good.html")), []);
  assert.deepEqual(rules(await run("article-bad.html")), ["no-author", "no-date"]);
  assert.deepEqual(rules(await run("article-good.html")), []);
  assert.deepEqual(rules(await run("form-bad.html")), ["invalid-not-described", "radio-group-no-legend"]);
});

test("--links finds internal links that lead nowhere", { skip }, async () => {
  const r = await ux(fixture("links.html"), { links: true });
  const broken = r.findings.find((f) => f.rule === "broken-internal-link");
  assert.ok(broken, JSON.stringify(rules(r.findings)));
  assert.equal(broken.impact, "high"); assert.match(broken.items.join(), /gone\.html/); assert.doesNotMatch(broken.items.join(), /ok\.html/);
  assert.equal((await ux(fixture("links.html"))).findings.some((f) => f.rule === "broken-internal-link"), false);
});

test("false positives found by the benchmark: a services site is not SaaS, white filter pills are not primary actions, a word in a label is not a pricing link", { skip }, async () => {
  const s = await ux(fixture("services.html"));
  assert.equal(s.context, "showcase"); assert.deepEqual(rules(s.findings), []);
  assert.deepEqual(rules((await ux(fixture("pills.html"))).findings), []);
  const l = await ux(fixture("pricing-label.html"));
  assert.notEqual(l.context, "saas"); assert.equal(l.findings.some((f) => f.rule === "no-signup-action" || f.rule === "no-pricing-link"), false);
});

test("a primary action is only demanded of pages that sell or convert", () => {
  assert.deepEqual(rules(uxFindings(D(X()), { context: "app" })), []);
  assert.deepEqual(rules(uxFindings(D(X()), { context: "content" })), []);
  assert.ok(rules(uxFindings({ ...D(X({ signup: { screens: 0, inHeader: true }, pricingLink: { top: 0 } })), filled: [] }, { context: "saas" })).includes("no-primary-action"));
});
