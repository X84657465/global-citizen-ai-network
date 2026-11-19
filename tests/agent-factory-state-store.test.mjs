import test from "node:test";
import assert from "node:assert/strict";
import { createFactoryStateStore, FACTORY_STATE_ISSUE_TITLE } from "../lib/agent-factory-state-store.mjs";
import { createInitialFactoryState, recordSystemFailure } from "../lib/agent-factory-state-machine.mjs";

function fakeApi(initialIssues = []) {
  const issues = structuredClone(initialIssues); let nextNumber = 100;
  return {
    issues,
    client: { request: async (path, options = {}) => {
      const parsed = new URL(path, "https://api.github.com");
      if (parsed.pathname.endsWith("/issues") && (options.method ?? "GET") === "GET") {
        const page = Number(parsed.searchParams.get("page") ?? 1);
        return page === 1 ? structuredClone(issues) : [];
      }
      if (parsed.pathname.endsWith("/issues") && options.method === "POST") {
        const created = { number: nextNumber++, title: options.body.title, body: options.body.body }; issues.push(created); return created;
      }
      const match = /\/issues\/(\d+)$/.exec(path);
      if (match && (options.method ?? "GET") === "GET") {
        const issue = issues.find((item) => item.number === Number(match[1]));
        if (!issue) throw new Error("not found");
        return structuredClone(issue);
      }
      if (match && options.method === "PATCH") {
        const issue = issues.find((item) => item.number === Number(match[1]));
        if (!issue) throw new Error("not found"); issue.body = options.body.body; return issue;
      }
      throw new Error("unexpected fake API call: " + path);
    } },
  };
}

test("initializes a versioned state when no state Issue exists", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const read = await store.read();
  assert.equal(read.issue, null); assert.equal(read.state.state_version, 0);
});

test("creates and then updates one machine-managed Issue", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  let state = createInitialFactoryState(1000);
  state = recordSystemFailure(state, "run-123456-attempt-1", "DOCKER_DOWN", "offline", 2000).state;
  const created = await store.write(0, state);
  assert.equal(created.issue.title, FACTORY_STATE_ISSUE_TITLE);
  const read = await store.read();
  assert.equal(read.state.state_version, 1);
  const next = recordSystemFailure(read.state, "run-123457-attempt-1", "DOCKER_DOWN", "offline", 3000).state;
  await store.write(1, next);
  assert.equal((await store.read()).state.state_version, 2);
});

test("rejects stale state writers instead of overwriting a newer version", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const state = recordSystemFailure(createInitialFactoryState(1000), "run-123456-attempt-1", "ERR", "fail", 2000).state;
  await store.write(0, state);
  const stale = recordSystemFailure(createInitialFactoryState(1000), "run-999999-attempt-1", "ERR", "stale", 3000).state;
  await assert.rejects(store.write(0, stale), /version conflict/);
});

test("fails closed when multiple state Issues are present", async () => {
  const body = "Machine-managed V2 factory state. <!-- agent-factory-state:" + Buffer.from(JSON.stringify(createInitialFactoryState())).toString("base64") + " -->";
  const fake = fakeApi([{ number: 1, title: FACTORY_STATE_ISSUE_TITLE, body }, { number: 2, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /Multiple machine-managed/);
});
test("migrates the existing Issue #100 V1 payload without losing failure and quarantine counters", async () => {
  const legacy = { consecutive_failures: 2, cooldown_until: null, task_failures: { "81": 1, "95": 3 }, skipped_issue_numbers: [95], last_error: "old failure", updated_at: "2026-11-19T05:00:00.000Z" };
  const body = "Machine-managed scheduler state. <!-- agent-factory-state:" + Buffer.from(JSON.stringify(legacy)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const migrated = await store.read();
  assert.equal(migrated.state.schema_version, 2);
  assert.equal(migrated.state.system.consecutive_failures, 2);
  assert.equal(migrated.state.tasks["81"].failures, 1);
  assert.equal(migrated.state.tasks["95"].quarantined, true);
  assert.equal(migrated.state.tasks["95"].status, "quarantined");
});
test("persists a V1-to-V2 migration on the existing state Issue", async () => {
  const legacy = { consecutive_failures: 1, cooldown_until: null, task_failures: { "81": 1 }, skipped_issue_numbers: [], last_error: "old", updated_at: "2026-11-19T05:00:00.000Z" };
  const body = "Machine-managed scheduler state. <!-- agent-factory-state:" + Buffer.from(JSON.stringify(legacy)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  assert.equal((await store.read()).migrated, true);
  const result = await store.migrate();
  assert.equal(result.migrated, true);
  assert.equal(result.state.schema_version, 2);
  assert.equal(result.state.state_version, 1);
  assert.equal((await store.read()).migrated, false);
});

test("uses a supplied state Issue number without scanning the full issue list", async () => {
  const body = "Machine-managed V2 factory state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(createInitialFactoryState())).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo", issueNumber: 100 });
  const result = await store.read();
  assert.equal(result.issue.number, 100);
  assert.equal(store.getStateIssueNumber(), 100);
});


test("recovers an ambiguous state Issue creation after GitHub persisted the Issue but lost the response", async () => {
  const fake = fakeApi();
  const originalRequest = fake.client.request;
  let losePostResponse = true;
  fake.client.request = async (path, options = {}) => {
    const result = await originalRequest(path, options);
    if (path.endsWith("/issues") && options.method === "POST" && losePostResponse) {
      losePostResponse = false;
      throw new Error("simulated connection reset after GitHub created the Issue");
    }
    return result;
  };
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const next = recordSystemFailure(
    createInitialFactoryState(1000),
    "run-create-ambiguous-1",
    "API_TIMEOUT",
    "response lost after persistence",
    2000,
  ).state;
  const result = await store.write(0, next);
  assert.equal(result.recovered, true);
  assert.equal(result.issue.number, 100);
  assert.equal(fake.issues.length, 1);
  assert.equal((await store.read()).state.state_version, 1);
});

test("recovers an ambiguous state Issue update after GitHub persisted the PATCH but lost the response", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const initial = recordSystemFailure(
    createInitialFactoryState(1000),
    "run-patch-initial-1",
    "API_TIMEOUT",
    "initial",
    2000,
  ).state;
  await store.write(0, initial);
  const originalRequest = fake.client.request;
  let losePatchResponse = true;
  fake.client.request = async (path, options = {}) => {
    const result = await originalRequest(path, options);
    if (/\/issues\/\d+$/.test(path) && options.method === "PATCH" && losePatchResponse) {
      losePatchResponse = false;
      throw new Error("simulated connection reset after GitHub persisted the PATCH");
    }
    return result;
  };
  const next = recordSystemFailure(
    initial,
    "run-patch-ambiguous-2",
    "API_TIMEOUT",
    "response lost after update",
    3000,
  ).state;
  const result = await store.write(1, next);
  assert.equal(result.recovered, true);
  assert.equal(result.state.state_version, 2);
  assert.equal((await store.read()).state.state_version, 2);
  assert.equal(fake.issues.length, 1);
});
