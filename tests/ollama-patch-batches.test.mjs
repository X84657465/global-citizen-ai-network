import test from "node:test";
import assert from "node:assert/strict";
import { calculateNewFilePatchOutputTokenBudget, calculatePatchOutputTokenBudget, getMinimumPlannedOutputBytesForPath, splitPatchPathsIntoBatches, selectPatchBatchSourceFiles } from "../lib/ollama-patch-batches.mjs";

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

test("caps new-file generation budgets below the model truncation ceiling", () => {
  assert.equal(calculatePatchOutputTokenBudget(0, 4096), 4096);
  assert.equal(calculatePatchOutputTokenBudget(0, 2048), 2048);
  assert.equal(calculatePatchOutputTokenBudget(17758, 4096), 4096);
});

test("uses the full validated byte allowance as the bounded new-file token ceiling", () => {
  assert.equal(calculateNewFilePatchOutputTokenBudget(8192), 8192);
  assert.equal(calculateNewFilePatchOutputTokenBudget(4096), 4096);
  assert.equal(calculateNewFilePatchOutputTokenBudget(2048), 2048);
  assert.equal(calculateNewFilePatchOutputTokenBudget(1024), 2048);
  assert.equal(calculateNewFilePatchOutputTokenBudget(16384), 8192);
  for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateNewFilePatchOutputTokenBudget(value), /positive safe integer/);
  }
});

test("uses the strictest per-file output allowance independent of implementer task order", () => {
  const path = "src/generated.ts";
  const tasks = [
    { allowed_paths: [path], max_output_bytes: 8192 },
    { allowed_paths: [path.toUpperCase()], max_output_bytes: 4096 },
  ];
  assert.equal(getMinimumPlannedOutputBytesForPath(tasks, path), 4096);
  assert.equal(getMinimumPlannedOutputBytesForPath([...tasks].reverse(), path), 4096);
  assert.equal(getMinimumPlannedOutputBytesForPath([{ allowed_paths: ["src/other.ts"], max_output_bytes: 1024 }], path), null);
  assert.throws(() => getMinimumPlannedOutputBytesForPath([{ allowed_paths: [path], max_output_bytes: 0 }], path), /positive safe-integer/);
});

test("rejects invalid Ollama patch output budget inputs", () => {
  for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculatePatchOutputTokenBudget(value), /non-negative safe integer/);
  }
  for (const value of [0, 1023, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 24577]) {
    assert.throws(() => calculatePatchOutputTokenBudget(0, value), /maxOutputTokens/);
  }
});
