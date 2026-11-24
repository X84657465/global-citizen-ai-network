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
const trackIds = [..."ABCDEFGHIJKLMNOP"];
const acceptanceStages = "PLANNED → IMPLEMENTED → TESTED → VERIFIED → ACCEPTED → RELEASED";

function mvpSection() {
  const section = homepage.match(/<section\b([^>]*\bid="mvp-first"[^>]*)>([\s\S]*?)<\/section>/);
  assert.ok(section, "Homepage MVP section is missing");
  return { attributes: section[1], content: section[2] };
}

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
});

test("the charter lists exactly one complete acceptance entry for each A-P track", () => {
  const directory = charter.match(/^### A–P 產品級 MVP 交付目錄[^\n]*\n+((?:\|[^\n]*\n)+)/m);
  assert.ok(directory, "Charter MVP acceptance table is missing");
  const rows = directory[1].trimEnd().split("\n").slice(2);
  const tracks = rows.map((row) => {
    const [track, value, outcome, ...extra] = row.slice(1, -1).split("|").map((cell) => cell.trim());
    const label = track.match(/^([A-P]) — \S/);
    assert.ok(label, `Missing track identifier or product name: ${row}`);
    assert.ok(value && outcome && extra.length === 0, `Track ${label[1]} needs a product value and an acceptance outcome`);
    return label[1];
  });
  assert.deepEqual(tracks.sort(), trackIds);
});

test("portfolio governance keeps the same ordered acceptance stages for every track", () => {
  for (const document of [charter, master]) {
    assert.ok(document.includes(acceptanceStages), "Missing or out-of-order portfolio acceptance stages");
  }
});

test("README links to the charter from its independent A-P MVP guidance", () => {
  assert.match(readme, /P0 MVP First/);
  const portfolio = readme.match(/^### A–P 全線都要有自己的產品級 MVP\n+([\s\S]*?)(?=^---$)/m)?.[1] ?? "";
  assert.match(portfolio, /16 條工作線/);
  assert.match(portfolio, /\[[^\]]+\]\(docs\/GCAN_MVP_FIRST_DELIVERY_CHARTER\.md\)/);
});

test("primary navigation targets a unique MVP section with an accessible heading", () => {
  const { attributes, content } = mvpSection();
  const navigation = homepage.match(/<nav\b[^>]*aria-label="主要導覽"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  assert.match(navigation, /<a\b[^>]*href="#mvp-first"[^>]*>\s*MVP 首版\s*<\/a>/);
  assert.equal([...homepage.matchAll(/\bid="mvp-first"/g)].length, 1);

  const titleId = attributes.match(/\baria-labelledby="([\w-]+)"/)?.[1];
  assert.ok(titleId, "The MVP section needs an accessible name");
  assert.match(content, new RegExp(`<h2\\b[^>]*\\bid="${titleId}"[^>]*>\\s*[^<\\s]`));
  assert.equal([...homepage.matchAll(new RegExp(`\\bid="${titleId}"`, "g"))].length, 1);
});

test("MVP cards direct visitors to the matching journey and evidence destinations", () => {
  const { content } = mvpSection();
  const cards = [...content.matchAll(/<article\b[^>]*>\s*<span>\d{2} · ([A-Z ]+)<\/span>([\s\S]*?)<\/article>/g)];
  const destinations = cards.map(([, name, card]) => [name, card.match(/<a\b[^>]*href="([^"]+)"/)?.[1]]);
  const repository = "https://github.com/X84657465/global-citizen-ai-network";
  assert.deepEqual(destinations, [
    ["ACCOUNT", "/login"],
    ["WORKSPACE", "/workspace"],
    ["AI SERVICE", `${repository}/tree/main/app/api/ai/chat`],
    ["DELIVERY", `${repository}/actions`],
  ]);
  assert.ok(content.includes(`href="${repository}/blob/main/docs/GCAN_MVP_FIRST_DELIVERY_CHARTER.md"`));
  assert.ok(content.includes(`href="${repository}/blob/main/PROJECT_COORDINATION.md"`));
});

test("MVP section shows pending acceptance and all five delivery roles", () => {
  const { content } = mvpSection();
  assert.match(content, /<span>ACCEPTANCE STATE<\/span>\s*<b>尚待本輪驗收<\/b>/);
  assert.match(content, /不代表已實作或已上線/);
  const roles = [...content.matchAll(/<article\b[^>]*>\s*<span>(GPT\d+) ·/g)].map(([, role]) => role);
  assert.deepEqual(roles.sort(), ["GPT1", "GPT2", "GPT3", "GPT4", "GPT5"]);
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
  const { content } = mvpSection();
  const directory = content.match(/A–P 全線產品 MVP 交付目錄<\/b><span>[^<]*<\/span><\/div>\s*<div\b[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(directory, "MVP track directory grid is missing");

  const tracks = [...directory[1].matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].map(([, article]) => {
    const markers = [...article.matchAll(/<span>\s*([A-P]) ·/g)];
    assert.equal(markers.length, 1, "Each MVP article must have exactly one track marker");
    const track = markers[0][1];
    assert.match(article, /<b>\s*[^<\s][^<]*<\/b>/, `Track ${track} needs a product name`);
    assert.match(article, /<p>\s*[^<\s][^<]*<\/p>/, `Track ${track} needs a delivery description`);
    return track;
  });
  assert.deepEqual(tracks.sort(), trackIds);
});
