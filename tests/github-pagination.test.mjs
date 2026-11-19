import test from "node:test";
import assert from "node:assert/strict";
import { collectGitHubPages } from "../lib/github-pagination.mjs";

test("collects ordered GitHub pages until a short page is returned", async () => {
  const calls = [];
  const result = await collectGitHubPages(async (page) => {
    calls.push(page);
    if (page === 1) return Array.from({ length: 3 }, (_, index) => "first-" + index);
    if (page === 2) return ["last"];
    throw new Error("Unexpected extra page request");
  }, { pageSize: 3, maxPages: 4 });
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(result, ["first-0", "first-1", "first-2", "last"]);
});

test("fails closed when the pagination safety limit is reached", async () => {
  await assert.rejects(
    () => collectGitHubPages(async () => [1, 2], { pageSize: 2, maxPages: 2 }),
    /refusing incomplete results/,
  );
});

test("rejects malformed API page responses and invalid pagination limits", async () => {
  await assert.rejects(() => collectGitHubPages(async () => ({ items: [] })), /unexpected shape/);
  await assert.rejects(() => collectGitHubPages(async () => [], { pageSize: 0 }), /positive integer/);
  await assert.rejects(() => collectGitHubPages(null), /function/);
});
