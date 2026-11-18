import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceSource = readFileSync(
  new URL("../app/workspace/workspace-client.tsx", import.meta.url),
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

test("existing conversation history empty state remains available", () => {
  assert.match(workspaceSource, /對話紀錄/);
  assert.match(workspaceSource, /尚無已保存的對話/);
  assert.match(workspaceSource, /onClick=\{\(\) => \{ conversationLoadRef\.current \+= 1;/);
});
