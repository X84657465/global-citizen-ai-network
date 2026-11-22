import assert from "node:assert/strict";
import test from "node:test";
import { validateWorkstreamVersionContract, WORKSTREAM_IDS } from "../../lib/p/workstream-version-assurance.mjs";

const manifest = {
  overall: "0.3.134",
  tracks: Object.fromEntries(WORKSTREAM_IDS.map((id) => [id, {
    name: `Workstream ${id}`,
    version: id === "P" ? "0.1.3" : "0.1.0",
    status: "planned",
  }])),
};
const validInput = () => ({
  manifest: structuredClone(manifest),
  rootVersion: "0.3.134",
  packageVersion: "0.3.134",
  lockfileVersion: "0.3.134",
  lockfileRootVersion: "0.3.134",
  readme: "**Release:** `0.3.134` · A 線 Agent Factory V2 `2.0.84` ·",
  governance: "**Repository release baseline: 0.3.134**",
  workstreams: "**Planning baseline:** repository release 0.3.134",
  changelog: "## 0.3.134 — 2026-11-22\n\n- P governance validator.",
  pChangelog: "## P 0.1.3 — 2026-11-22\n\n- Enforce version contract.",
  trackChangelogs: Object.fromEntries(WORKSTREAM_IDS.slice(5).map((id) => [
    id,
    `## ${manifest.tracks[id].version} — 2026-11-22\n`,
  ])),});

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

test("rejects drift in package-lock root, README and governance release baselines", () => {
  const lockRoot = validInput();
  lockRoot.lockfileRootVersion = "0.3.126";
  assert.ok(validateWorkstreamVersionContract(lockRoot).errors.some((error) => error.includes("packages[\"\"] root")));
  const readme = validInput();
  readme.readme = "**Release:** `0.3.126` · A 線 Agent Factory V2 `2.0.84` ·";
  assert.ok(validateWorkstreamVersionContract(readme).errors.some((error) => error.includes("README")));
  const governance = validInput();
  governance.governance = "**Repository release baseline: 0.3.126**";
  assert.ok(validateWorkstreamVersionContract(governance).errors.some((error) => error.includes("governance release baseline")));
});

test("requires root changelog and P changelog to record their current versions", () => {
  const input = validInput();
  input.changelog = "## 0.3.126 — 2026-11-22";
  input.pChangelog = "## P 0.1.0 — 2026-11-22";
  const errors = validateWorkstreamVersionContract(input).errors;
  assert.ok(errors.some((error) => error.includes("CHANGELOG.md")));
  assert.ok(errors.some((error) => error.includes("P workstream changelog")));
});


test("rejects drift in the engineering workstream planning baseline", () => {
  const input = validInput();
  input.workstreams = "**Planning baseline:** repository release 0.3.133";
  assert.ok(validateWorkstreamVersionContract(input).errors.some((error) => error.includes("workstream planning baseline")));
});

test("rejects malformed registry and non-object manifest inputs", () => {
  assert.equal(validateWorkstreamVersionContract({}).valid, false);
  assert.equal(validateWorkstreamVersionContract({ manifest: null }).valid, false);
  const input = validInput();
  input.manifest.tracks.P.name = "";
  assert.ok(validateWorkstreamVersionContract(input).errors.some((error) => error.includes("Track P")));
});


test("requires an independently versioned F–P changelog entry for every track, including deferred L", () => {
  const input = validInput();
  for (const id of WORKSTREAM_IDS.slice(5)) {
    const incomplete = structuredClone(input);
    delete incomplete.trackChangelogs[id];
    assert.ok(validateWorkstreamVersionContract(incomplete).errors.some((error) => error.includes(`Track ${id} changelog`)), id);
    const stale = structuredClone(input);
    stale.trackChangelogs[id] = "## 0.0.9 — 2026-11-22\n";
    assert.ok(validateWorkstreamVersionContract(stale).errors.some((error) => error.includes(`Track ${id} changelog`)), id);
  }
});


test("requires the first/latest changelog entry to match the current version", () => {
  const input = validInput();
  input.changelog = "## 0.3.133 — 2026-11-22\\n\\n## 0.3.134 — 2026-11-22";
  input.pChangelog = "## P 0.1.2 — 2026-11-22\\n\\n## P 0.1.3 — 2026-11-22";
  const rootAndP = validateWorkstreamVersionContract(input).errors;
  assert.ok(rootAndP.some((error) => error.includes("CHANGELOG.md")));
  assert.ok(rootAndP.some((error) => error.includes("P workstream changelog")));
  for (const id of WORKSTREAM_IDS.slice(5)) {
    const stale = validInput();
    stale.trackChangelogs[id] = "## 0.0.9 — 2026-11-22\\n\\n## " + manifest.tracks[id].version + " — 2026-11-22";
    assert.ok(
      validateWorkstreamVersionContract(stale).errors.some((error) => error.includes("Track " + id + " changelog")),
      id,
    );
  }
});

test("rejects impossible calendar dates in current changelog headings", () => {
  const input = validInput();
  input.changelog = "## 0.3.134 — 2026-02-30";
  input.pChangelog = "## P 0.1.3 — 2026-02-30";
  input.trackChangelogs.F = "## 0.1.0 — 2026-02-30";
  const errors = validateWorkstreamVersionContract(input).errors;
  assert.ok(errors.some((error) => error.includes("CHANGELOG.md")));
  assert.ok(errors.some((error) => error.includes("P workstream changelog")));
  assert.ok(errors.some((error) => error.includes("Track F changelog")));
});
