import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const manifest = JSON.parse(read("../versions/manifest.json"));
const governance = read("../docs/engineering-governance.md");
const security = read("../docs/security/README.md");
const threatModel = read("../docs/security/threat-model.md");
const incidentRunbook = read("../docs/security/incident-response.md");
const releaseGates = read("../docs/security/release-gates.md");

test("release manifest declares the independent F security workstream", () => {
  assert.match(manifest.overall, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(manifest.tracks.F, {
    name: "Cyber Security & Defense",
    version: "0.1.5",
    status: "foundation",
    responsibility: "Cross-track threat modeling, security controls, adversarial validation, vulnerability response and incident readiness.",
  });
});

test("engineering governance recognizes A-P ownership and F cross-track review", () => {
  for (const token of ["sixteen defined workstream boundaries", "| F — Cyber Security & Defense |", "| G — Release, QA & Integration |", "| H — Observability & Cost Governance |", "F security controls apply to every track"]) {
    assert.ok(governance.includes(token), `missing governance requirement: ${token}`);
  }
});

test("security charter covers all workstreams and non-negotiable trust boundaries", () => {
  for (const token of ["A — Agent Factory V2", "B — GCAN Product", "C — Predictive Coding", "D — Deep Neural", "E — Deep Research", "F review", "G — Release, QA & Integration", "H — Observability & Cost Governance", "Treat user input", "human approval"]) {
    assert.ok(security.includes(token), `missing security charter requirement: ${token}`);
  }
});

test("threat model includes AI prompt injection, runner isolation and tenant isolation", () => {
  for (const token of ["Prompt-injection attacker", "Runner and code-execution controls", "Data and tenant isolation", "service-role", "untrusted"]) {
    assert.ok(threatModel.includes(token), `missing threat-model control: ${token}`);
  }
});

test("incident response and release gates require evidence and human authorization", () => {
  for (const token of ["Credential or account compromise", "Malicious Runner or code execution", "Recovery and return-to-service gates", "exact candidate SHA"]) {
    assert.ok(incidentRunbook.includes(token), `missing incident-response control: ${token}`);
  }
  for (const token of ["Automated checks", "Authorization and isolation", "AI and agent controls", "Human approval and release"]) {
    assert.ok(releaseGates.includes(token), `missing release gate: ${token}`);
  }
});
