// Site-level checks (pure): robots.txt, sitemap.xml, llms.txt, AI crawlers, hreflang reciprocity.

export const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

/** Parse robots.txt into { valid, groups: [{ agents, disallow, allow }], sitemaps }. */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  if (/<html|<!doctype/i.test(String(text).slice(0, 500))) return { valid: false, groups, sitemaps };
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap") sitemaps.push(value);
    else if (current && key === "disallow") current.disallow.push(value);
    else if (current && key === "allow") current.allow.push(value);
  }
  return { valid: groups.length > 0, groups, sitemaps };
}

/** AI crawlers that robots.txt shuts out of the whole site, by name or through "*". */
export function blockedAiBots(robots) {
  const blocksAll = (g) => g.disallow.includes("/") && !g.allow.includes("/");
  const out = [];
  for (const bot of AI_BOTS) {
    const own = robots.groups.find((g) => g.agents.some((a) => a.toLowerCase() === bot.toLowerCase()));
    const star = robots.groups.find((g) => g.agents.includes("*"));
    if (own ? blocksAll(own) : star && blocksAll(star)) out.push(own ? bot : `${bot} (through User-agent: *)`);
  }
  return out;
}

/** { valid, urls } for a sitemap or sitemap index. */
export function checkSitemap(xml) {
  const text = String(xml || "");
  const urls = (text.match(/<loc>\s*[^<\s][^<]*<\/loc>/g) || []).length;
  return { valid: /<(urlset|sitemapindex)[\s>]/.test(text) && urls > 0, urls };
}

/** Pairs where page A names page B as an alternate language but B does not name A back. */
export function hreflangNotReciprocal(pages) {
  const norm = (u) => String(u).replace(/#.*$/, "").replace(/\/+$/, "");
  const byUrl = new Map(pages.map((p) => [norm(p.url), new Set((p.hreflang || []).map((h) => norm(h.href)))]));
  const out = [];
  for (const [url, alternates] of byUrl)
    for (const alt of alternates) if (alt !== url && byUrl.has(alt) && !byUrl.get(alt).has(url)) out.push(`${url} → ${alt} (no link back)`);
  return out;
}

/**
 * Site findings from the fetched files. `files` values are the text, or null when the file is missing:
 * { robots, sitemap, llms }. `pages`: [{ url, hreflang }].
 */
export function siteFindings(files, pages = []) {
  const out = [];
  const add = (severity, rule, message, items = []) => out.push({ severity, rule, message, items });
  let robots = null;
  if (files.robots == null) add("warn", "robots-missing", "No robots.txt. Add one that allows crawling and points to the sitemap.");
  else {
    robots = parseRobots(files.robots);
    if (!robots.valid) add("error", "robots-invalid", "robots.txt has no User-agent group (or returns an HTML page): crawlers ignore it.");
    else {
      const blocked = blockedAiBots(robots);
      if (blocked.length) add("warn", "ai-bots-blocked", "robots.txt blocks AI crawlers: the site cannot be read, cited or recommended by those assistants (Google-Extended only controls Gemini training and grounding, not Google Search). Keep the block only if that is a decision.", blocked);
    }
  }
  if (files.sitemap == null) add("warn", "sitemap-missing", robots?.sitemaps.length ? "robots.txt declares a sitemap that could not be read." : "No sitemap.xml. Generate one and declare it in robots.txt (Sitemap: …).");
  else if (!checkSitemap(files.sitemap).valid) add("error", "sitemap-invalid", "sitemap.xml is not a valid <urlset> or <sitemapindex> with <loc> entries.");
  if (files.llms == null) add("warn", "llms-missing", "No llms.txt. It is an optional, emerging convention (a Markdown summary of the site for AI assistants); cheap to add, no guaranteed effect.");
  const pairs = hreflangNotReciprocal(pages);
  if (pairs.length) add("warn", "hreflang-not-reciprocal", "hreflang links must go both ways between language versions.", pairs.slice(0, 8));
  return out;
}
