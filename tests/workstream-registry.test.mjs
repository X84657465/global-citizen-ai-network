import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../versions/manifest.json", import.meta.url), "utf8"));
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const architecture = readFileSync(new URL("../docs/engineering-workstreams.md", import.meta.url), "utf8");
const governance = readFileSync(new URL("../docs/engineering-governance.md", import.meta.url), "utf8");
const expected = "ABCDEFGHIJKLMNOP".split("");

test("manifest defines exactly the sixteen A-P workstreams", () => {
  assert.deepEqual(Object.keys(manifest.tracks).sort(), expected);
});

test("README names every A-P line and explains its role", () => {
  for (const id of expected) {
    assert.ok(readme.includes(`| ${id} |`), `README missing track ${id}`);
  }
  assert.ok(readme.includes("主要作用"));
  assert.ok(readme.includes("A–P 全線工程索引"));
});

test("G-P remain explicitly non-operational until accepted", () => {
  for (const id of "GHIJKLMNOP") {
    assert.equal(manifest.tracks[id].status, "planned");
    assert.equal(manifest.tracks[id].version, "0.1.0");
  }
  assert.equal(manifest.tracks.F.status, "implementation-candidate");
  assert.match(architecture, /no operational capability is implied/i);
});

test("governance and architecture define all track responsibilities and safety gates", () => {
  for (const id of expected) {
    assert.ok(governance.includes(`| ${id} |`), `governance missing track ${id}`);
    assert.ok(architecture.includes(`| ${id} |`), `architecture missing track ${id}`);
  }
  for (const gate of ["exact SHA", "human approval", "rollback", "Runner", "F controls"]) {
    assert.ok(architecture.toLowerCase().includes(gate.toLowerCase()), `architecture missing ${gate}`);
  }
});
