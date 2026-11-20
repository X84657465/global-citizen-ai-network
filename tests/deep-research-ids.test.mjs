import test from "node:test";
import assert from "node:assert/strict";
import { nextResearchProjectId } from "../lib/deep-research-ids.mjs";

test("continues the existing research ID sequence without skipping numbers", () => {
  assert.equal(nextResearchProjectId(["DR-024", "DR-025", "DR-026"]), "DR-027");
  assert.equal(nextResearchProjectId([]), "DR-024");
});
test("uses the highest existing ID when records are sparse or out of order", () => {
  assert.equal(nextResearchProjectId(["DR-030", "DR-024", "DR-028"]), "DR-031");
});
test("keeps generated IDs unique when the next candidate is already present", () => {
  assert.equal(nextResearchProjectId(["DR-026", "DR-027"]), "DR-028");
});
test("rejects malformed identifiers and unsafe numeric overflow", () => {
  assert.throws(() => nextResearchProjectId("DR-026"), /must be an array/);
  assert.throws(() => nextResearchProjectId([null]), /must be a string/);
  assert.throws(() => nextResearchProjectId(["research-026"]), /DR-NNN format/);
  assert.throws(() => nextResearchProjectId(["DR-99999999999999999999"]), /safe numeric range/);
  assert.throws(() => nextResearchProjectId(["DR-9007199254740991"]), /No safe research project ID remains/);
});
