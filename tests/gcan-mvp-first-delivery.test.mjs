import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const master = read("../docs/GCAN_MASTER_GOVERNANCE_COORDINATION_CHARTER.md");
const charter = read("../docs/GCAN_MVP_FIRST_DELIVERY_CHARTER.md");
const coordination = read("../PROJECT_COORDINATION.md");
const readme = read("../README.md");
const homepage = read("../app/page.tsx");
const workspace = read("../app/workspace/workspace-client.tsx");
const workspaceGate = read("../app/workspace/page.tsx");
const chatApi = read("../app/api/ai/chat/route.ts");

test("MVP-first policy is linked from the master charter and coordination entry point", () => {
  assert.match(master, /## 24\. P0 MVP First/);
  assert.match(master, /GCAN_MVP_FIRST_DELIVERY_CHARTER\.md/);
  assert.match(coordination, /## 22\. P0 MVP First/);
  assert.match(coordination, /Factory 與 B MVP 並行/);
  assert.match(master, /A–P 全部 16 條工作線/);
  assert.match(coordination, /A–P 全線產品級 MVP/);
});

test("MVP-first charter defines a bounded scope, deadline, and exact-SHA acceptance", () => {
  assert.match(charter, /5 個工作日/);
  assert.match(charter, /PENDING/);
  assert.match(charter, /GPT3/);
  assert.match(charter, /成本預檢/);
  assert.match(charter, /資料隔離/);
  assert.match(charter, /Post-MVP/);
  assert.match(charter, /A–P 全工作線都必須各自交付產品級 MVP/);
  for (const track of "ABCDEFGHIJKLMNOP".split("")) assert.match(charter, new RegExp(`\\| ${track} —`));
});

test("README and homepage expose the MVP entry points and delivery status", () => {
  assert.match(readme, /P0 MVP First/);
  assert.match(readme, /GCAN_MVP_FIRST_DELIVERY_CHARTER\.md/);
  assert.match(homepage, /id="mvp-first"/);
  assert.match(homepage, /尚待本輪驗收/);
  assert.match(homepage, /GPT5 · OPS/);
  assert.match(homepage, /href="\/workspace"/);
});

test("existing MVP workspace remains protected by the authentication gate", () => {
  assert.match(workspaceGate, /auth\.getUser\(\)/);
  assert.match(workspaceGate, /redirect\("\/login"\)/);
  assert.match(workspace, /\/api\/conversations/);
  assert.match(workspace, /\/api\/projects/);
});

test("AI MVP path fails closed and retains idempotency and cost preflight controls", () => {
  assert.match(chatApi, /getAuthenticatedClient\(\)/);
  assert.match(chatApi, /isValidIdempotencyKey/);
  assert.match(chatApi, /estimateCostTwd/);
  assert.match(chatApi, /claim_ai_request/);
  assert.match(chatApi, /AI 服務尚未完成安全設定/);
});


test("homepage exposes a separate MVP product card for every A-P track", () => {
  const directory = homepage.match(/A–P 全線產品 MVP 交付目錄<\/b><span>[^<]*<\/span><\/div>\s*<div className=\{styles\.executionLiveGrid\}>([\s\S]*?)<\/div>/);
  assert.ok(directory, "MVP track directory grid is missing");

  const tracks = [...directory[1].matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(([, article]) => {
    const markers = [...article.matchAll(/<span>\s*([A-P]) ·/g)];
    assert.equal(markers.length, 1, "Each MVP article must have exactly one track marker");
    return markers[0][1];
  });
  assert.deepEqual(tracks.sort(), [..."ABCDEFGHIJKLMNOP"]);
});
