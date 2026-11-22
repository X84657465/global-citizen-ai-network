import assert from "node:assert/strict";
import test from "node:test";
import { validateWorkstreamVersionContract, WORKSTREAM_IDS } from "../../lib/p/workstream-version-assurance.mjs";

const manifest = {
  overall: "0.3.127",
  tracks: Object.fromEntries(WORKSTREAM_IDS.map((id) => [id, {
    name: `Workstream ${id}`,
    version: id === "H" || id === "P" ? "0.1.1" : "0.1.0",
    status: "planned",
  }])),
};
const validInput = () => ({
  manifest,
  rootVersion: "0.3.127",
  packageVersion: "0.3.127",
  lockfileVersion: "0.3.127",
  changelog: "## 0.3.127 — 2026-11-22\n\n- P governance validator.",
  pChangelog: "## P 0.1.1 — 2026-11-22\n\n- Enforce version contract.",
});

test("accepts a complete independently versioned A–P registry with synchronized repository metadata", () => {
  const result = validateWorkstreamVersionContract(validInput());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects missing or additional workstream registry entries", () => {
  const input = validInput();
  delete input.manifest.tracks.E;
  assert.equal(validateWorkstreamVersionContract(input).valid, false);
  const extra = validInput();
  extra.manifest.tracks.Q = { name: "Unregistered", version: "0.1.0" };
  assert.ok(validateWorkstreamVersionContract(extra).errors.some((error) => error.includes("exactly once")));
});

test("rejects non-numeric versions and mismatched repository release copies", () => {
  const input = validInput();
  input.manifest.tracks.F.version = "0.2.0-beta";
  input.packageVersion = "0.3.126";
  const errors = validateWorkstreamVersionContract(input).errors;
  assert.ok(errors.some((error) => error.includes("Track F")));
  assert.ok(errors.some((error) => error.includes("package.json version")));
});

test("requires root changelog and P changelog to record their current versions", () => {
  const input = validInput();
  input.changelog = "## 0.3.126 — 2026-11-22";
  input.pChangelog = "## P 0.1.0 — 2026-11-22";
  const errors = validateWorkstreamVersionContract(input).errors;
  assert.ok(errors.some((error) => error.includes("CHANGELOG.md")));
  assert.ok(errors.some((error) => error.includes("P workstream changelog")));
});

test("rejects malformed registry and non-object manifest inputs", () => {
  assert.equal(validateWorkstreamVersionContract({}).valid, false);
  assert.equal(validateWorkstreamVersionContract({ manifest: null }).valid, false);
  const input = validInput();
  input.manifest.tracks.P.name = "";
  assert.ok(validateWorkstreamVersionContract(input).errors.some((error) => error.includes("Track P")));
});
