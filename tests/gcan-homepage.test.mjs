import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  assert.match(homepage, /<div className={styles\.heroActions}>[\s\S]*?<Link href="\/workspace" className={styles\.primaryButton}>前往 AI 工作空間/);
});

test("primary homepage actions route visitors to the intended product destinations", () => {
  assert.match(homepage, /前往 AI 工作空間/);
  assert.match(homepage, /了解全球貢獻中心/);
  assert.match(homepage, /了解平台架構/);
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
  assert.match(homeCss, /outline: 3px solid/);
  assert.ok(homeCss.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(homeCss.includes("align-items: flex-end;"));
  assert.match(homeCss, /transition: none !important/);
  const reducedMotionCss = homeCss.slice(homeCss.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reducedMotionCss.includes(".pillarCard:hover"));
  assert.ok(reducedMotionCss.includes("transform: none;"));
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
  assert.ok(homepage.includes('<div className={styles.heroCopy} id="mission">'));
  assert.ok(homepage.includes('<a href="#mission">平台使命</a>'));
  assert.ok(!homepage.includes('<section className={styles.hero} id="main-content"'));
  assert.ok(homeCss.includes(".skipLink:focus-visible"));
  assert.ok(homeCss.includes("transform: translateY(0)"));
});


test("build configuration scopes Next.js tracing and exports a named ESLint config", () => {
  assert.ok(nextConfig.includes("outputFileTracingRoot: process.cwd(),"));
  assert.ok(eslintConfig.includes("const eslintConfig = ["));
  assert.ok(eslintConfig.includes("export default eslintConfig;"));
  assert.ok(!eslintConfig.includes("export default ["));
});
