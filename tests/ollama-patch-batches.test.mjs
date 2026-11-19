import test from "node:test";
import assert from "node:assert/strict";
import { splitPatchPathsIntoBatches, selectPatchBatchSourceFiles } from "../lib/ollama-patch-batches.mjs";

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
