// Saved login sessions (Playwright storage state) hold live tokens: lock the file, keep it out of git,
// describe it without ever printing a value, and warn when it is readable by other users.
import { chmodSync, existsSync, realpathSync, readFileSync, statSync, appendFileSync, rmSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Never prints cookie names or values: counts, domains and the nearest expiry only. */
export function describeSession(file, now = Date.now()) {
  const s = JSON.parse(readFileSync(file, "utf8"));
  const cookies = s.cookies || [];
  const origins = (s.origins || []).map((o) => o.origin);
  const exp = cookies.map((c) => c.expires).filter((e) => e > 0);
  const soonest = exp.length ? Math.min(...exp) * 1000 : null;
  return {
    cookies: cookies.length,
    domains: [...new Set(cookies.map((c) => String(c.domain).replace(/^\./, "")))].slice(0, 6),
    storageOrigins: origins.length,
    nearestExpiryDays: soonest ? Math.round((soonest - now) / 86400000) : null,
    sessionOnly: cookies.length > 0 && exp.length === 0,
  };
}

export function isGitIgnored(file) {
  try { git(dirname(file), ["check-ignore", "-q", file]); return true; } catch { return false; }
}

/** chmod 600, add to .gitignore when inside a git repo and not already ignored. */
export function protectSession(file) {
  file = realpathSync(resolve(file));
  try { chmodSync(file, 0o600); } catch {}
  const mode = statSync(file).mode & 0o777;
  let inRepo = false, ignored = false, added = null;
  try {
    const root = git(dirname(file), ["rev-parse", "--show-toplevel"]);
    inRepo = true;
    ignored = isGitIgnored(file);
    if (!ignored) {
      const rel = relative(root, file).split(sep).join("/");
      appendFileSync(resolve(root, ".gitignore"), `\n# Saved login session (live tokens)\n/${rel}\n`);
      added = rel;
      ignored = isGitIgnored(file);
    }
  } catch {}
  return { file, mode: mode.toString(8), inRepo, ignored, added, ...describeSession(file) };
}

export function formatSession(p) {
  const lines = [`Session saved to ${p.file} (permissions ${p.mode}, owner only)`];
  lines.push(`Holds ${p.cookies} cookies${p.domains.length ? ` for ${p.domains.join(", ")}` : ""}${p.storageOrigins ? ` and storage for ${p.storageOrigins} origin(s)` : ""}; ${p.sessionOnly ? "session cookies only (end when the browser closes, may stop working soon)" : p.nearestExpiryDays != null ? `the nearest expiry is in ${p.nearestExpiryDays} day(s)` : "no expiry information"}.`);
  if (p.inRepo) lines.push(p.added ? `Added /${p.added} to .gitignore: it must never be committed.` : p.ignored ? "Already ignored by git." : "WARNING: not ignored by git; add it to .gitignore before committing.");
  else lines.push("Not in a git repository: don't copy this file anywhere or share it.");
  lines.push("It is a password in file form: delete it when you are done (node login.mjs --clear " + p.file + ").");
  return lines.join("\n");
}

/** Warns (once) when a state file other users can read is about to be used. */
let warned = false;
export function warnIfOpen(file) {
  if (warned || !file || process.platform === "win32" || !existsSync(file)) return null;
  const mode = statSync(file).mode & 0o077;
  if (!mode) return null;
  warned = true;
  const msg = `Warning: ${file} is readable by other users; run chmod 600 ${file}. It holds live session tokens.`;
  console.error(msg);
  return msg;
}

export function clearSession(file) {
  file = resolve(file);
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}
