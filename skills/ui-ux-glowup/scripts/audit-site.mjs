#!/usr/bin/env node
// Audits a whole site: crawls internal links from a start page and audits each page
// (desktop + mobile), then reports per-page scores and the issues that repeat across pages
// — those are the ones to fix once, in shared components or global CSS.
//
// Usage:
//   node audit-site.mjs <start-url | index.html> [--max 10] [--depth 2] [--json site.json]
//                       [--pages "url1,url2,…"] [--storage-state state.json]
//                       [--allow ai-hero-pill,…] [--fast]
//
// Also checks the site files once: robots.txt and sitemap.xml (present, valid), llms.txt, AI crawlers
// blocked in robots.txt, hreflang links that do not point back.
//
// Stays on the same origin (or the same folder for local files), skips logout/delete links,
// anchors, mailto/tel and downloads.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { siteFindings } from "./lib/site.mjs";
import { loadPlaywright, resolveTarget, openPage, parseArgs, isMain, commonOptions, VIEWPORTS } from "./lib/browser.mjs";
import { saveJson } from "./lib/redact.mjs";
import { auditPage, auditOptions } from "./audit.mjs";
import { CRITERIA } from "./lib/analyze.mjs";

const SKIP = /(logout|log-out|signout|sign-out|deconnexion|déconnexion|delete|supprimer|remove|unsubscribe|\/api\/|\.(pdf|zip|png|jpe?g|webp|gif|svg|mp4|csv|xlsx?)$)/i;

/** Normalize a URL for de-duplication (no hash, no trailing slash). */
export function normalizeUrl(u) {
  const url = new URL(u);
  url.hash = "";
  const s = url.href;
  return s.endsWith("/") && url.pathname !== "/" ? s.slice(0, -1) : s;
}

/** Same site: same origin for http(s); same directory tree for file:// URLs. */
export function sameSite(start, candidate) {
  const a = new URL(start);
  const b = new URL(candidate);
  if (a.protocol === "file:") return b.protocol === "file:" && b.pathname.startsWith(a.pathname.slice(0, a.pathname.lastIndexOf("/") + 1));
  return a.origin === b.origin;
}

/** Read /robots.txt, /sitemap.xml (or the one robots.txt declares) and /llms.txt; null when missing. */
export async function fetchSiteFiles(startUrl) {
  const start = new URL(startUrl);
  const get = async (name) => {
    try {
      if (start.protocol === "file:") {
        const file = fileURLToPath(new URL(name, start));
        return existsSync(file) ? readFileSync(file, "utf8") : null;
      }
      const res = await fetch(/^https?:/.test(name) ? name : new URL("/" + name, start.origin), { redirect: "follow", signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      const text = await res.text();
      return name.endsWith(".xml") || !/<html|<!doctype/i.test(text.slice(0, 300)) ? text : name === "robots.txt" ? text : null;
    } catch {
      return null;
    }
  };
  const robots = await get("robots.txt");
  const declared = robots && (robots.match(/^\s*sitemap\s*:\s*(\S+)/im) || [])[1];
  const sitemap = (declared && start.protocol !== "file:" && (await get(declared))) || (await get("sitemap.xml"));
  return { robots, sitemap, llms: await get("llms.txt") };
}

async function collectLinks(browser, url, options) {
  const { page, close } = await openPage(browser, url, VIEWPORTS.desktop, { ...options, scroll: false });
  const links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.href));
  await close();
  return links;
}

/** Crawl and audit. Returns { pages: [{ url, total, errors, warns, result }], recurring }. */
export async function auditSite(start, { max = 10, depth = 2, pages, route, ...options } = {}) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const startUrl = resolveTarget(start).url;
  try {
    let queue = pages?.length ? pages.map((p) => ({ url: resolveTarget(p).url, depth: 0 })) : [{ url: startUrl, depth: 0 }];
    const seen = new Set(queue.map((q) => normalizeUrl(q.url)));
    const results = [];
    while (queue.length && results.length < max) {
      const { url, depth: d } = queue.shift();
      if (!pages?.length && d < depth) {
        for (const href of await collectLinks(browser, url, { route, ...options })) {
          let n;
          try {
            n = normalizeUrl(href);
          } catch {
            continue;
          }
          if (!/^(https?|file):/.test(n) || SKIP.test(n) || seen.has(n) || !sameSite(startUrl, n)) continue;
          seen.add(n);
          queue.push({ url: n, depth: d + 1 });
        }
      }
      const result = await auditPage(browser, url, { route, ...options });
      results.push({
        url,
        total: result.total,
        errors: result.findings.filter((f) => f.severity === "error").length,
        warns: result.findings.filter((f) => f.severity === "warn").length,
        result,
      });
    }
    const byRule = new Map();
    for (const p of results)
      for (const f of p.result.findings) {
        if (f.severity === "info") continue;
        const r = byRule.get(f.rule) || { rule: f.rule, severity: f.severity, criterion: f.criterion, message: f.message, pages: [] };
        r.pages.push(p.url);
        byRule.set(f.rule, r);
      }
    const recurring = [...byRule.values()].filter((r) => r.pages.length > 1).sort((a, b) => b.pages.length - a.pages.length);
    const site = siteFindings(await fetchSiteFiles(startUrl), results.map((p) => ({ url: p.url, hreflang: p.result.hreflang })));
    return { start, pages: results.sort((a, b) => a.total - b.total), recurring, site };
  } finally {
    await browser.close();
  }
}

export function formatSiteReport(site) {
  const short = (u) => {
    try {
      const x = new URL(u);
      return x.protocol === "file:" ? x.pathname.split("/").pop() : x.pathname + x.search || "/";
    } catch {
      return u;
    }
  };
  const lines = [`Site audit — ${site.start} (${site.pages.length} pages)`, ""];
  const avg = site.pages.reduce((s, p) => s + p.total, 0) / (site.pages.length || 1);
  lines.push(`Average score: ${avg.toFixed(1)}/${CRITERIA.length * 5}`, "");
  lines.push("Score  Err  Warn  Page");
  for (const p of site.pages) lines.push(`${String(p.total).padStart(5)}  ${String(p.errors).padStart(3)}  ${String(p.warns).padStart(4)}  ${short(p.url)}`);
  if (site.site?.length) {
    lines.push("", "Site files — robots.txt, sitemap.xml, llms.txt, AI crawlers, hreflang:");
    for (const f of site.site) lines.push(`${f.severity === "error" ? "✗" : "!"} ${f.rule} — ${f.message}${f.items.length ? ` (${f.items.join(", ")})` : ""}`);
  } else if (site.site) lines.push("", "Site files: robots.txt, sitemap.xml and llms.txt present and valid.");
  if (site.recurring.length) {
    lines.push("", "Recurring issues — fix once in shared components / global CSS:");
    for (const r of site.recurring) lines.push(`${r.severity === "error" ? "✗" : "!"} [${r.criterion}] ${r.rule} on ${r.pages.length}/${site.pages.length} pages — ${r.message.slice(0, 110)}`);
  }
  lines.push("", "Run audit.mjs on the worst pages for full details and selectors.");
  return lines.join("\n");
}

if (isMain(import.meta.url)) {
  const { _: [start], flags } = parseArgs(process.argv.slice(2));
  if (!start && !flags.pages) {
    console.error("Usage: node audit-site.mjs <start-url | index.html> [--max 10] [--depth 2] [--json site.json] [--pages a,b,c]");
    process.exit(1);
  }
  try {
    const pages = typeof flags.pages === "string" ? flags.pages.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const site = await auditSite(start || pages[0], { max: Number(flags.max) || 10, depth: flags.depth !== undefined ? Number(flags.depth) : 2, pages, ...commonOptions(flags), ...auditOptions(flags) });
    console.log(formatSiteReport(site));
    if (flags.json) saveJson(flags.json === true ? "site.json" : flags.json, site);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
