import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("public homepage exposes the authenticated workspace and contribution entry points", () => {
  assert.match(homepage, /href="\/workspace"/);
  assert.match(homepage, /href="\/contribute"/);
  assert.match(homepage, /href="\/login"/);
});

test("hero primary action opens the workspace entry point", () => {
  assert.match(homepage, /<div className={styles\.heroActions}>[\s\S]*?<Link href="\/workspace" className={styles\.primaryButton}>前往 AI 工作空間/);
});

test("primary homepage actions route visitors to the intended product destinations", () => {
  assert.match(homepage, /前往 AI 工作空間/);
  assert.match(homepage, /了解全球貢獻中心/);
  assert.match(homepage, /開始探索平台/);
});

test("public homepage clearly discloses early-stage feature limitations", () => {
  assert.match(homepage, /早期 MVP 建置階段/);
  assert.match(homepage, /尚未開放現金獎勵或分散式運算/);
  assert.match(homepage, /正式 AI 服務依供應商與預算設定啟用/);
});

test("public homepage does not fabricate member activity or reward counters", () => {
  assert.doesNotMatch(homepage, /\b(?:1,?000|10,?000)\s*\+?\s*(?:members|contributors|tasks completed)\b/i);
  assert.doesNotMatch(homepage, /NT\$\s*[\d,]+\s*(?:earned|rewards? paid)/i);
});


const workspaceClient = readFileSync(new URL("../app/workspace/workspace-client.tsx", import.meta.url), "utf8");

test("workspace conversation loading ignores stale responses and handles network or JSON failures", () => {
  assert.match(workspaceClient, /const loadId = \+\+conversationLoadRef\.current/);
  assert.match(workspaceClient, /if \(loadId !== conversationLoadRef\.current\) return/);
  assert.match(workspaceClient, /catch \(reason\) \{[\s\S]*?setError\(reason instanceof Error \? reason\.message : "無法載入訊息/);
});

test("workspace preserves the original idempotency key when an AI request outcome is ambiguous", () => {
  assert.match(workspaceClient, /if \(data\.retryWithSameKey !== true\)/);
  assert.match(workspaceClient, /storePendingKey\(activeId, key\)/);
  assert.match(workspaceClient, /storePendingContent\(activeId, content\)/);
  assert.match(workspaceClient, /setPendingConversationId\(activeId\)/);
});


test("workspace bootstrap keeps conversations available when optional project or pending APIs fail", () => {
  assert.match(workspaceClient, /Promise\.allSettled\(\[/);
  assert.match(workspaceClient, /pendingResult\.status === "fulfilled"/);
  assert.match(workspaceClient, /projectResult\.status === "fulfilled"/);
  assert.match(workspaceClient, /pendingAvailable && pendingData\.unresolved === false/);
  assert.match(workspaceClient, /Do not clear local pending keys on a failed or malformed server/);
});


test("workspace bootstrap validates optional API JSON shapes before using project or pending data", () => {
  assert.match(workspaceClient, /const parsedProjects: unknown = await projectResult\.value\.json\(\)/);
  assert.match(workspaceClient, /Array\.isArray\(candidateProjects\)/);
  assert.match(workspaceClient, /typeof \(project as ProjectOption\)\.id === "string"/);
  assert.match(workspaceClient, /const parsedPending: unknown = await pendingResponse\.json\(\)/);
  assert.match(workspaceClient, /parsedPending && typeof parsedPending === "object" && !Array\.isArray\(parsedPending\)/);
});
