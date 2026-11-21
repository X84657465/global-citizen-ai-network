import assert from "node:assert/strict";
import test from "node:test";
import {
  FP_WORKSTREAM_CONTRACTS,
  getWorkstreamContract,
  isFPWorkstream,
} from "../../lib/fp/integration-contract.ts";

test("registers exactly the F–P workstreams without taking ownership of A–E", () => {
  assert.deepEqual(
    FP_WORKSTREAM_CONTRACTS.map((item) => item.id),
    ["F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
  );
  assert.equal(isFPWorkstream("A"), false);
  assert.equal(isFPWorkstream("E"), false);
  assert.equal(isFPWorkstream("F"), true);
  assert.equal(isFPWorkstream("P"), true);
});

test("every F–P contract has unique identity and explicit integration boundaries", () => {
  const ids = FP_WORKSTREAM_CONTRACTS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const contract of FP_WORKSTREAM_CONTRACTS) {
    assert.ok(contract.name.length > 0);
    assert.ok(contract.responsibility.length > 0);
    assert.ok(contract.consumes.length > 0);
    assert.ok(contract.produces.length > 0);
    assert.equal(contract.maturity, "specified");
  }
});

test("the registry is a contract catalogue, not an implementation or privilege grant", () => {
  assert.equal(getWorkstreamContract("L").executionAuthority, "none");
  assert.equal(getWorkstreamContract("J").executionAuthority, "advisory");
  assert.equal(getWorkstreamContract("I").executionAuthority, "bounded");
  assert.ok(getWorkstreamContract("F").dependsOn.includes("A"));
  assert.ok(getWorkstreamContract("P").dependsOn.includes("M"));
});

test("unknown workstream identifiers are rejected", () => {
  assert.throws(() => getWorkstreamContract("A" as never), /Unknown F–P workstream/);
});
