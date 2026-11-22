import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceSource = readFileSync(
  new URL("../app/workspace/workspace-client.tsx", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("workspace exposes a clearly labeled project navigation section", () => {
  assert.match(workspaceSource, /<strong style=\{\{ fontSize: 13 \}\}>我的專案<\/strong>/);
  assert.match(workspaceSource, /<nav aria-label="我的專案"/);
  assert.match(workspaceSource, /href="\/projects"/);
});

test("empty project state explains the value and links to create the first project", () => {
  assert.match(workspaceSource, /projects\.length === 0/);
  assert.match(workspaceSource, /還沒有建立專案/);
  assert.match(workspaceSource, /建立專案後，可以將相關對話整理在一起/);
  assert.match(workspaceSource, /建立第一個專案/);
});

test("project loading failure is not mislabeled as an empty account", () => {
  assert.match(workspaceSource, /setProjectsUnavailable\(!projectResponse\.ok\)/);
  assert.match(workspaceSource, /projectsUnavailable \?/);
  assert.match(workspaceSource, /目前無法載入專案清單/);
});

test("project network failure is isolated from conversation and pending-request loading", () => {
  assert.match(workspaceSource, /fetch\("\/api\/projects", \{ cache: "no-store" \}\)\.catch\(\(\) => null\)/);
  assert.match(workspaceSource, /projectResponse\?\.ok/);
  assert.match(workspaceSource, /setProjectsUnavailable\(projectUnavailable\)/);
});

test("malformed project responses are shown as unavailable, not as an empty project list", () => {
  assert.match(workspaceSource, /const parsedProjectData: unknown = await projectResponse\.json\(\)/);
  assert.match(workspaceSource, /Array\.isArray\(\(parsedProjectData as \{ projects\?: unknown \}\)\.projects\)/);
  assert.match(workspaceSource, /catch \{\s*projectUnavailable = true;\s*\}/);
  assert.match(workspaceSource, /setProjectsUnavailable\(projectUnavailable\)/);
});

test("project navigation uses validated, non-archived project records", () => {
  assert.match(workspaceSource, /filterWorkspaceProjects\(projectData\?\.projects\)/);
  assert.match(workspaceSource, /projects\.map\(project => <Link/);
  assert.match(workspaceSource, /aria-label=\{'管理專案：' \+ project\.title\}/);
});

test("existing conversation history and new-conversation actions remain available", () => {
  assert.match(workspaceSource, /對話紀錄/);
  assert.match(workspaceSource, /尚無已保存的對話/);
  assert.match(workspaceSource, /conversationLoadRef\.current \+= 1/);
  assert.match(workspaceSource, /setConversationId\(""\)/);
});

test("workspace navigation remains single-column and usable on mobile", () => {
  assert.match(globalStyles, /\.workspace-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+280px/);
  assert.match(globalStyles, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.workspace-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
