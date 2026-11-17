// Pure helpers for safeguard.mjs: sensitive files, secrets in text, which files a restore would leave behind.

const SENSITIVE_PATH = [
  /(^|\/)\.env(\.(?!example$|sample$|template$)[^/]*)?$/i,
  /(^|\/)state\.json$/i,
  /\.state\.json$/i,
  /(^|\/)storage-state[^/]*\.json$/i,
  /\.(pem|key|p12|pfx|keystore)$/i,
  /(^|\/)id_(rsa|ed25519|ecdsa)$/,
  /(^|\/)\.npmrc$/,
  /(^|\/)(credentials|secrets?)\.(json|ya?ml)$/i,
  /(^|\/)service-account[^/]*\.json$/i,
];

export function isSensitivePath(path) {
  return SENSITIVE_PATH.some((re) => re.test(path.replace(/\\/g, "/")));
}

const SECRET_PATTERNS = [
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["API key (sk-)", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ["Stripe live key", /\b[sr]k_live_[A-Za-z0-9]{16,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["Hardcoded secret", /\b(?:api[_-]?key|secret|token|passw(?:or)?d|client[_-]?secret)["']?\s*[:=]\s*["']([^"'\s]{12,})["']/i],
];
const PLACEHOLDER = /your[-_ ]|example|placeholder|changeme|xxxx|<[^>]+>|\$\{|process\.env|import\.meta|\[.*\]|\*{4}/i;

const mask = (s) => (s.length <= 8 ? "****" : s.slice(0, 4) + "…" + `(${s.length} chars)`);

/** Secrets found in one text, never returning the secret itself. */
export function scanSecrets(text) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    if (line.length > 2000) return;
    for (const [kind, re] of SECRET_PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      const value = m[1] || m[0];
      if (PLACEHOLDER.test(line) || PLACEHOLDER.test(value)) continue;
      found.push({ kind, line: i + 1, preview: mask(value) });
      break;
    }
  });
  return found;
}

/** Files present now that did not exist in the backup (a restore leaves them in place). */
export function newFilesSince(backupFiles, currentFiles) {
  const had = new Set(backupFiles);
  return currentFiles.filter((f) => !had.has(f));
}

export const IGNORE_LINES = [".env", ".env.*", "state.json", "*.state.json", ".glowup-backup/"];
