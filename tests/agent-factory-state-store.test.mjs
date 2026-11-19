import test from "node:test";
import assert from "node:assert/strict";
import { createFactoryStateStore, FACTORY_STATE_ISSUE_TITLE } from "../lib/agent-factory-state-store.mjs";
import { createInitialFactoryState, recordSystemFailure } from "../lib/agent-factory-state-machine.mjs";

function fakeApi(initialIssues = []) {
  const issues = structuredClone(initialIssues); let nextNumber = 100;
  return {
    issues,
    client: { request: async (path, options = {}) => {
      if (path.includes("/issues?")) {
        const page = Number(/page=(\d+)/.exec(path)?.[1] ?? 1);
        return page === 1 ? structuredClone(issues) : [];
      }
      if (path.endsWith("/issues") && options.method === "POST") {
        const created = { number: nextNumber++, title: options.body.title, body: options.body.body }; issues.push(created); return created;
      }
      const match = /\/issues\/(\d+)$/.exec(path);
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