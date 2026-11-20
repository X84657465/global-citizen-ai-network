import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScratchPatchEvidence,
  scratchPatchEvidenceMatches,
} from "../lib/agent-scratch-evidence.mjs";

const files = [
  { path: "app/projects/projects-client.tsx", operation: "modify", content: "export const projects = true;\n" },
  { path: "tests/project-list.test.ts", operation: "add", content: "import test from 'node:test';\n" },
];

test("builds deterministic SHA-256 evidence for exact patch content", () => {
  const evidence = buildScratchPatchEvidence(files);
  assert.equal(evidence.length, 2);
  assert.equal(evidence[0].path, "app/projects/projects-client.tsx");
  assert.equal(evidence[0].sha256.length, 64);
  assert.equal(evidence[0].bytes, Buffer.byteLength(files[0].content, "utf8"));
  assert.equal(scratchPatchEvidenceMatches(evidence, files), true);
});

test("matches scratch evidence independent of file ordering", () => {
  const evidence = buildScratchPatchEvidence(files);
  assert.equal(scratchPatchEvidenceMatches([...evidence].reverse(), files), true);
});

test("rejects a patch whose content changed after scratch tests", () => {
  const evidence = buildScratchPatchEvidence(files);
  const changed = files.map((file) => ({ ...file }));
  changed[0].content += "// changed after tests\n";
  assert.equal(scratchPatchEvidenceMatches(evidence, changed), false);
});

test("rejects missing hashes, wrong byte counts, and mismatched operations", () => {
  const evidence = buildScratchPatchEvidence(files);
  assert.equal(scratchPatchEvidenceMatches(evidence.map((file) => {
    const copy = { ...file };
    delete copy.sha256;
    return copy;
  }), files), false);
  assert.equal(scratchPatchEvidenceMatches(evidence.map((file, index) => index === 0 ? { ...file, bytes: file.bytes + 1 } : file), files), false);
  assert.equal(scratchPatchEvidenceMatches(evidence.map((file, index) => index === 0 ? { ...file, operation: "add" } : file), files), false);
});

test("rejects empty and NUL-containing patch content", () => {
  assert.throws(() => buildScratchPatchEvidence([{ path: "app/a.ts", operation: "add", content: "" }]), /non-empty text/);
  assert.throws(() => buildScratchPatchEvidence([{ path: "app/a.ts", operation: "add", content: "bad\0content" }]), /non-empty text/);
});
