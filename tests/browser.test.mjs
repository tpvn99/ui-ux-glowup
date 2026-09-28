import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, resolveTarget } from "../skills/ui-ux-glowup/scripts/lib/browser.mjs";

test("parseArgs handles positionals, --flag value, --flag=value and booleans", () => {
  const a = parseArgs(["page.html", "out", "--json", "r.json", "--fail-under=30", "--fold"]);
  assert.deepEqual(a._, ["page.html", "out"]);
  assert.deepEqual(a.flags, { json: "r.json", "fail-under": "30", fold: true });
});

test("resolveTarget: URLs keep their URL and get a file-safe name", () => {
  assert.deepEqual(resolveTarget("https://www.linear.app/features"), { url: "https://www.linear.app/features", name: "linear-app-features" });
});

test("resolveTarget: files become file:// URLs named after the file", () => {
  const r = resolveTarget("some/dir/landing.html");
  assert.ok(r.url.startsWith("file://") && r.url.endsWith("/some/dir/landing.html"));
  assert.equal(r.name, "landing");
});
