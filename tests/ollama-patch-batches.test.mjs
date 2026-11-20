import test from "node:test";
import assert from "node:assert/strict";
import { calculatePatchOutputTokenBudget, splitPatchPathsIntoBatches, selectPatchBatchSourceFiles } from "../lib/ollama-patch-batches.mjs";

test("splits large patch plans into one-file batches without reordering paths", () => {
  const paths = ["app/a.tsx", "app/b.tsx", "tests/a.test.ts", "docs/a.md"];
  assert.deepEqual(splitPatchPathsIntoBatches(paths, 1), [
    ["app/a.tsx"], ["app/b.tsx"], ["tests/a.test.ts"], ["docs/a.md"],
  ]);
});

test("rejects duplicate paths regardless of case", () => {
  assert.throws(() => splitPatchPathsIntoBatches(["app/A.tsx", "app/a.tsx"], 1), /unique/);
});

test("selects only the current batch source files in requested order", () => {
  const context = [
    { path: "app/a.tsx", operation: "modify", content: "A" },
    { path: "app/b.tsx", operation: "modify", content: "B" },
  ];
  assert.deepEqual(selectPatchBatchSourceFiles(context, ["app/b.tsx"]), [context[1]]);
});

test("rejects missing source context for an approved path", () => {
  assert.throws(() => selectPatchBatchSourceFiles([], ["app/missing.tsx"]), /Missing source context/);
});


test("scales Ollama patch output tokens above the former truncation-prone floor", () => {
  assert.equal(calculatePatchOutputTokenBudget(0), 16384);
  assert.equal(calculatePatchOutputTokenBudget(17758), 23678);
  assert.equal(calculatePatchOutputTokenBudget(65536), 24576);
});

test("rejects invalid Ollama patch output budget inputs", () => {
  for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculatePatchOutputTokenBudget(value), /non-negative safe integer/);
  }
});
