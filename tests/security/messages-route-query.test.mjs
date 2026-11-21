import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");

test("message history query is explicitly scoped to the authenticated owner", () => {
  const conversationFilter = route.indexOf('.eq("conversation_id", id)');
  const ownerFilter = route.indexOf('.eq("owner_id", auth.user.id)');
  assert.ok(conversationFilter >= 0, "conversation ID must be part of the message query");
  assert.ok(ownerFilter > conversationFilter, "authenticated owner filter must follow the conversation filter");
});

test("message history returns the newest bounded window in chronological order", () => {
  const createdOrder = route.indexOf('.order("created_at", { ascending: false })');
  const idOrder = route.indexOf('.order("id", { ascending: false })');
  const limit = route.indexOf(".limit(500)", idOrder);
  const reverse = route.indexOf("[...data].reverse()");
  assert.ok(createdOrder >= 0 && idOrder > createdOrder, "timestamp and ID must define deterministic descending order");
  assert.ok(limit > idOrder, "the descending query must be bounded to 500 messages");
  assert.ok(reverse > limit, "the newest bounded window must be reversed before returning chronological history");
});

test("message API selects only fields consumed by the workspace client", () => {
  const selections = [...route.matchAll(/\.select\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.deepEqual(selections, [
    "id,role,content,created_at",
    "id,role,content,created_at",
  ]);
  assert.ok(selections.every((selection) => !selection.split(",").includes("model")));
});
