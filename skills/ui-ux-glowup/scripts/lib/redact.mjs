// Nothing the scripts write (JSON, reports, snapshots) may carry a secret: tokens in URLs, credentials in
// links, API keys in text. Values are replaced, never partially shown.
import { writeFileSync } from "node:fs";
import { SECRET_PATTERNS, PLACEHOLDER } from "./safeguard.mjs";

const SENSITIVE_PARAM = /^(token|access[_-]?token|id[_-]?token|refresh[_-]?token|api[_-]?key|apikey|key|secret|client[_-]?secret|sig|signature|auth|authorization|session|sessionid|sid|password|passwd|pwd|code|jwt|bearer|otp|csrf|xsrf|credential)s?$/i;
const MASK = "REDACTED";

/** Query values of sensitive names, long opaque values, and user:password@ in URLs or hrefs. */
export function redactUrl(text) {
  return String(text)
    .replace(/(\/\/)[^/\s:@]+:[^/\s@]+@/g, `$1${MASK}@`)
    .replace(/([?&;#])([^=&#;\s"'<>]+)=([^&#;\s"'<>]*)/g, (m, sep, name, value) => {
      if (SENSITIVE_PARAM.test(name) && value) return `${sep}${name}=${MASK}`;
      if (/^[A-Za-z0-9_\-+/=.]{32,}$/.test(value) && !/^[a-z]+$/i.test(value)) return `${sep}${name}=${MASK}`;
      return m;
    });
}

/** Known secret shapes (AWS, GitHub, sk-, Stripe, Google, Slack, private keys, secret = "...") replaced in free text. */
export function redactSecrets(text) {
  let out = String(text);
  for (const [kind, re] of SECRET_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    out = out.replace(g, (m, captured) => {
      if (PLACEHOLDER.test(m) || (captured && PLACEHOLDER.test(captured))) return m;
      return captured ? m.replace(captured, `${MASK}:${kind.toLowerCase().replace(/[^a-z]+/g, "-")}`) : `${MASK}:${kind.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    });
  }
  return out;
}

export const redactText = (t) => redactSecrets(redactUrl(t));

export function redactDeep(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  return value;
}

/** JSON.stringify of the redacted value, written to a file. */
export function saveJson(file, value) {
  writeFileSync(file, JSON.stringify(redactDeep(value), null, 2));
}
