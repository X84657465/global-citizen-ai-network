import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidTimestamp, isWorkspaceMessage } from "../lib/workspace/message-validation.ts";

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const homeCss = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const eslintConfig = readFileSync(new URL("../eslint.config.mjs", import.meta.url), "utf8");

test("public homepage exposes the authenticated workspace and contribution entry points", () => {
  assert.match(homepage, /href="\/workspace"/);
  assert.match(homepage, /href="\/contribute"/);
  assert.match(homepage, /href="\/login"/);
});

test("hero primary action opens the workspace entry point", () => {
  assert.match(homepage, /<div className={styles\.heroActions}>[\s\S]*?<a href="#workstreams" className={styles\.primaryButton}>探索 A–E 五線工作台/);
});

test("primary homepage actions route visitors to the intended product destinations", () => {
  assert.match(homepage, /探索 A–E 五線工作台/);
  assert.match(homepage, /查看整體架構/);
  assert.match(homepage, /進入 B 線產品工作區/);
});

test("public homepage clearly discloses early-stage feature limitations", () => {
  assert.match(homepage, /早期建置與預覽階段/);
  assert.match(homepage, /示範數據/);
  assert.match(homepage, /尚未連接的 AI／搜尋服務/);
  assert.match(homepage, /尚未啟用的獎勵支付與分散式運算/);
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
  assert.match(workspaceClient, /isUuid\(\(project as ProjectOption\)\.id\)/);
  assert.match(workspaceClient, /title === "string"/);
  assert.match(workspaceClient, /archived_at === null/);
  assert.match(workspaceClient, /const parsedPending: unknown = await pendingResponse\.json\(\)/);
  assert.match(workspaceClient, /parsedPending && typeof parsedPending === "object" && !Array\.isArray\(parsedPending\)/);
});


test("workspace accepts pending recovery only when its envelope and original prompt are valid", () => {
  assert.match(workspaceClient, /typeof candidate\.unresolved === "boolean" && validPendingRecord/);
  assert.match(workspaceClient, /typeof \(pendingRecord as \{ content\?: unknown \}\)\.content === "string"/);
  assert.match(workspaceClient, /\[A-Za-z0-9\._:-\]\{8,128\}/);
  assert.match(workspaceClient, /\["queued", "running"\]\.includes/);
});

test("workspace bootstrap validates the essential conversation response before rendering history", () => {
  assert.match(workspaceClient, /conversations\?: unknown/);
  assert.match(workspaceClient, /Array\.isArray\(data\.conversations\)/);
  assert.match(workspaceClient, /isUuid\(\(item as Conversation\)\.id\)/);
  assert.match(workspaceClient, /typeof \(item as Conversation\)\.title === "string"/);
  assert.match(workspaceClient, /isValidTimestamp\(\(item as Conversation\)\.updated_at\)/);
  assert.match(workspaceClient, /對話資料格式無效/);
  assert.match(workspaceClient, /setConversations\(data\.conversations as Conversation\[\]\)/);
});


test("public homepage provides visible keyboard focus and respects reduced-motion preferences", () => {
  assert.ok(homeCss.includes(".page a:focus-visible"));
  assert.match(homeCss, /:focus-visible/);
  assert.ok(homeCss.includes(".page a:focus-visible{outline:3px solid"));
  assert.ok(homeCss.includes("@media(prefers-reduced-motion:reduce)"));
  assert.ok(homeCss.includes("align-items:flex-end;"));
  assert.ok(homeCss.includes("transition:none!important"));
  const normalizedHomeCss = homeCss.replace(/\s+/g, "");
  const reducedMotionStart = normalizedHomeCss.indexOf("@media(prefers-reduced-motion:reduce)");
  assert.notEqual(reducedMotionStart, -1);
  const reducedMotionCss = normalizedHomeCss.slice(reducedMotionStart);
  assert.ok(reducedMotionCss.includes(".pillarCard:hover"));
  assert.ok(reducedMotionCss.includes(".trackCard:hover"));
  assert.ok(reducedMotionCss.includes("transform:none"));
});

test("workspace validates every message API record before updating the active conversation", () => {
  assert.match(workspaceClient, /const parsed: unknown = await response\.json\(\)/);
  assert.match(workspaceClient, /!parsed \|\| typeof parsed !== "object" \|\| Array\.isArray\(parsed\)/);
  assert.match(workspaceClient, /!Array\.isArray\(data\.messages\) \|\| !data\.messages\.every\(isWorkspaceMessage\)/);
});

test("message validation accepts only safe user and assistant message records", () => {
  const validId = "8c3c5d8e-6d7b-4a7e-8b10-9d8c7b6a5f40";
  const validMessage = { id: validId, role: "user", content: "hello", created_at: "2026-11-19T10:00:00.000Z" };
  assert.equal(isWorkspaceMessage(validMessage), true);
  assert.equal(isWorkspaceMessage({ id: validId, role: "assistant", content: "reply", created_at: "2026-11-19T10:00:00.000Z" }), true);
  for (const invalid of [
    null,
    [],
    "message",
    { ...validMessage, role: "system" },
    { ...validMessage, role: "tool" },
    { ...validMessage, content: 42 },
    { ...validMessage, id: "not-a-uuid" },
    { role: "assistant", content: "missing database identity" },
    { ...validMessage, id: undefined },
    { ...validMessage, created_at: undefined },
    { ...validMessage, created_at: "not-a-date" },
    { ...validMessage, created_at: 1732000000 },
  ]) {
    assert.equal(isWorkspaceMessage(invalid), false);
  }
});

test("workspace rejects malformed UUIDs, blank conversation titles, and invalid timestamps", () => {
  assert.match(workspaceClient, /function isUuid\(value: unknown\): value is string/);
  assert.match(workspaceClient, /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[1-8\]\[0-9a-f\]\{3\}-\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}/i);
  assert.match(workspaceClient, /function isValidTimestamp\(value: unknown\): value is string/);
  assert.match(workspaceClient, /Number\.isFinite\(Date\.parse\(value\)\)/);
  assert.match(workspaceClient, /title\.trim\(\)\.length > 0/);
  assert.match(workspaceClient, /isValidTimestamp\(\(item as Conversation\)\.updated_at\)/);
  assert.match(workspaceClient, /isUuid\(\(item as Conversation\)\.project_id\)/);
});



test("public homepage skip link targets the main landmark and mission navigation resolves", () => {
  assert.ok(homepage.includes('href="#main-content">跳至主要內容</a>'));
  assert.ok(homepage.includes('<div className={styles.page}>'));
  assert.ok(homepage.includes('<main id="main-content" tabIndex={-1}>'));
  assert.ok(homepage.includes('<header className={styles.header}>'));
  assert.ok(homepage.includes('<footer className={styles.footer}>'));
  assert.ok(homepage.indexOf('<header className={styles.header}>') < homepage.indexOf('<main id="main-content"'));
  assert.ok(homepage.indexOf('</main>') < homepage.indexOf('<footer className={styles.footer}>'));
  assert.ok(homepage.includes('<section className={styles.pillarsSection} id="pillars">'));
  assert.ok(homepage.includes('<a href="#pillars">平台價值</a>'));
  assert.ok(!homepage.includes('<section className={styles.hero} id="main-content"'));
  assert.ok(homeCss.includes(".skipLink:focus-visible"));
  assert.ok(homeCss.replace(/\s+/g, "").includes(".skipLink:focus-visible{transform:translateY(0)}"));
});


test("build configuration scopes Next.js tracing and exports a named ESLint config", () => {
  assert.ok(nextConfig.includes("outputFileTracingRoot: process.cwd(),"));
  assert.ok(eslintConfig.includes("const eslintConfig = ["));
  assert.ok(eslintConfig.includes("export default eslintConfig;"));
  assert.ok(!eslintConfig.includes("export default ["));
});

const workspaceMessagesRoute = readFileSync(new URL("../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");

test("workspace message API scopes reads to the authenticated owner and returns only required fields", () => {
  assert.match(workspaceMessagesRoute, /\.eq\("conversation_id", id\)[\s\S]*?\.eq\("owner_id", auth\.user\.id\)/);
  assert.match(workspaceMessagesRoute, /\.select\("id,role,content,created_at"\)/);
  assert.doesNotMatch(workspaceMessagesRoute, /\.select\("id,role,content,model,created_at"\)/);
});

test("workspace message API forces authenticated ownership on client-created messages", () => {
  assert.match(workspaceMessagesRoute, /\.insert\(\{ conversation_id: id, owner_id: auth\.user\.id, role: "user", content \}\)/);
});


const messageRoute = readFileSync(new URL("../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");

test("message history API is authenticated, owner-scoped, bounded, and non-cacheable", () => {
  assert.match(messageRoute, /const auth = await getAuthenticatedClient\(\)/);
  assert.match(messageRoute, /\.eq\("conversation_id", id\)/);
  assert.match(messageRoute, /\.eq\("owner_id", auth\.user\.id\)/);
  assert.match(messageRoute, /\.select\("id,role,content,created_at"\)/);
  assert.match(messageRoute, /\.limit\(500\)/);
  assert.match(messageRoute, /Cache-Control": "no-store"/);
  assert.doesNotMatch(messageRoute, /\.select\([^\n]*model/);
});

test("message creation derives owner and role from the authenticated server context", () => {
  assert.match(messageRoute, /\.insert\(\{\s*conversation_id: id,\s*owner_id: auth\.user\.id,\s*role: "user",\s*content\s*\}\)/);
  assert.match(messageRoute, /readJsonBody\(request, 98304\)/);
  assert.match(messageRoute, /content\.length < 1 \|\| content\.length > 20000/);
  assert.match(messageRoute, /Cache-Control": "no-store"/);
  assert.doesNotMatch(messageRoute, /input\.role|input\.owner_id|input\.model/);
});


test("message history returns the newest bounded window in chronological order", () => {
  assert.match(messageRoute, /\.order\("created_at", \{ ascending: false \}\)[\s\S]*?\.order\("id", \{ ascending: false \}\)[\s\S]*?\.limit\(500\)/);
  assert.match(messageRoute, /messages: \[\.\.\.data\]\.reverse\(\)/);
  assert.doesNotMatch(messageRoute, /\.order\("created_at", \{ ascending: true \}\)[\s\S]*?\.limit\(500\)/);
});

test("homepage typography keeps body and supporting copy readable on desktop and mobile", () => {
  assert.match(homeCss, /\.heroLead\{font-size:clamp\(16px,1\.25vw,18px\)/);
  assert.match(homeCss, /\.sectionHeading>p,[\s\S]*?font-size:15px/);
  assert.match(homeCss, /\.pillarCard p\{font-size:13px/);
  assert.match(homeCss, /@media\(max-width:620px\)[\s\S]*?\.heroLead\{font-size:16px\}/);
});


test("workspace timestamps require a real timezone-qualified ISO-8601 instant", () => {
  for (const valid of [
    "2026-11-20T12:34:56Z",
    "2024-02-29T23:59:59.123456Z",
    "2026-11-20T12:34:56+08:00",
    "2026-11-20T12:34:56-05:30",
  ]) assert.equal(isValidTimestamp(valid), true, valid);

  for (const invalid of [
    "2026-11-20",
    "2026-11-20T12:34:56",
    "2026-11-20 12:34:56Z",
    "2026-02-29T12:00:00Z",
    "2026-11-31T12:00:00Z",
    "2026-11-20T24:00:00Z",
    "2026-11-20T12:60:00Z",
    "2026-11-20T12:00:60Z",
    "2026-11-20T12:00:00+14:01",
    "2026-11-20T12:00:00+15:00",
    "tomorrow",
    "",
    1732000000,
  ]) assert.equal(isValidTimestamp(invalid), false, String(invalid));
});
