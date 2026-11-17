import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("one release number in package.json, both plugin manifests, SKILL.md and VERSIONS.md", () => {
  const plugin = JSON.parse(read(".claude-plugin/plugin.json")).version;
  const found = {
    "package.json": JSON.parse(read("package.json")).version,
    "marketplace.json": JSON.parse(read(".claude-plugin/marketplace.json")).metadata.version,
    "SKILL.md": read("skills/ui-ux-glowup/SKILL.md").match(/^\s+version:\s*"?([\d.]+)/m)?.[1],
    "VERSIONS.md table": read("VERSIONS.md").match(/^\| ui-ux-glowup \| ([\d.]+) \|/m)?.[1],
    "VERSIONS.md latest entry": read("VERSIONS.md").match(/^### ([\d.]+) /m)?.[1],
  };
  for (const [file, v] of Object.entries(found)) assert.equal(v, plugin, `${file} says ${v}, plugin.json says ${plugin}`);
});

test("every script named in the README exists", () => {
  const readme = read("README.md");
  const named = [...new Set([...readme.matchAll(/scripts\/([a-z0-9-]+\.mjs)/g)].map((m) => m[1]))];
  assert.ok(named.length >= 10);
  for (const f of named) assert.doesNotThrow(() => read(`skills/ui-ux-glowup/scripts/${f}`), f);
});
