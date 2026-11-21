import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../versions/manifest.json", import.meta.url), "utf8"));
const architecture = readFileSync(new URL("../docs/engineering-workstreams.md", import.meta.url), "utf8");
const governance = readFileSync(new URL("../docs/engineering-governance.md", import.meta.url), "utf8");

const expectedTracks = "ABCDEFGHIJKLMNOP".split("");

test("workstream manifest defines every A-P track exactly once", () => {
  assert.deepEqual(Object.keys(manifest.tracks).sort(), expectedTracks);
});

test("G and H remain implementation candidates while I-P remain planned", () => {
  for (const track of ["G", "H"]) {
    assert.equal(manifest.tracks[track].status, "implementation-candidate", track + " must not claim operational acceptance");
    assert.match(manifest.tracks[track].version, /^\d+\.\d+\.\d+$/);
    assert.ok(manifest.tracks[track].responsibility.length > 20, track + " must have a concrete responsibility");
  }
  for (const track of "IJKLMNOP") {
    assert.equal(manifest.tracks[track].status, "planned", track + " must remain planned until implementation evidence exists");
    assert.ok(manifest.tracks[track].responsibility.length > 20, track + " must have a concrete responsibility");
    assert.equal(manifest.tracks[track].version, "0.1.0");
  }
  assert.match(architecture, /no operational capability is implied/i);
});

test("cross-track boundaries and staged acceptance gates are documented", () => {
  for (const track of expectedTracks) {
    assert.match(architecture, new RegExp("Track " + track + "\\b|\\| " + track + " \\|"));
  }
  for (const stage of ["Stage 0", "Stage 1", "Stage 2", "Stage 3", "Stage 4"]) {
    assert.ok(architecture.includes(stage), "missing " + stage);
  }
  for (const gate of ["exact SHA", "human approval", "rollback", "Runner", "F controls"]) {
    assert.ok(architecture.toLowerCase().includes(gate.toLowerCase()), "missing gate: " + gate);
  }
});

test("engineering governance links the sixteen-track roadmap and preserves numeric version policy", () => {
  assert.ok(governance.includes("A–P"));
  assert.ok(governance.includes("MAJOR.MINOR.PATCH"));
  assert.ok(governance.toLowerCase().includes("no automatic approval"));
});
