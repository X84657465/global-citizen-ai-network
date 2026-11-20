import test from "node:test";
import assert from "node:assert/strict";
import { createFactoryStateStore, FACTORY_STATE_ISSUE_TITLE, MAX_STATE_ISSUE_BODY_CHARS } from "../lib/agent-factory-state-store.mjs";
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

test("serializes concurrent writes from one store instance and prevents duplicate state Issues", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const initial = createInitialFactoryState(1000);
  const first = recordSystemFailure(initial, "run-concurrent-first-1", "ERR_FIRST", "first", 2000).state;
  const second = recordSystemFailure(initial, "run-concurrent-second-1", "ERR_SECOND", "second", 3000).state;

  const results = await Promise.allSettled([
    store.write(0, first),
    store.write(0, second),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && /version conflict/.test(result.reason.message)).length, 1);
  assert.equal(fake.issues.length, 1);
  const persisted = await store.read();
  assert.equal(persisted.state.state_version, 1);
  assert.ok(["ERR_FIRST", "ERR_SECOND"].includes(persisted.state.system.last_error_code));
});

test("serializes concurrent writes across separate store instances for the same repository", async () => {
  const fake = fakeApi();
  const firstStore = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  // GitHub repository identifiers are case-insensitive; lock keys must be too.
  const secondStore = createFactoryStateStore(fake.client, { repository: "OWNER/REPO" });
  const initial = createInitialFactoryState(1000);
  const first = recordSystemFailure(initial, "run-instance-first-1", "ERR_FIRST", "first", 2000).state;
  const second = recordSystemFailure(initial, "run-instance-second-1", "ERR_SECOND", "second", 3000).state;

  const results = await Promise.allSettled([
    firstStore.write(0, first),
    secondStore.write(0, second),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && /version conflict/.test(result.reason.message)).length, 1);
  assert.equal(fake.issues.length, 1);
  const persisted = await firstStore.read();
  assert.equal(persisted.state.state_version, 1);
  assert.ok(["ERR_FIRST", "ERR_SECOND"].includes(persisted.state.system.last_error_code));
});

test("fails closed when multiple state Issues are present", async () => {
  const body = "Machine-managed V2 factory state. <!-- agent-factory-state:" + Buffer.from(JSON.stringify(createInitialFactoryState())).toString("base64") + " -->";
  const fake = fakeApi([{ number: 1, title: FACTORY_STATE_ISSUE_TITLE, body }, { number: 2, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /Multiple machine-managed/);
});
test("rejects unknown future state schemas instead of downgrading them as V1", async () => {
  const future = {
    schema_version: 3,
    task_failures: { "81": 1 },
    skipped_issue_numbers: [],
    future_scheduler_metadata: { partition: "north" },
  };
  const body = "Machine-managed state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(future)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });

  await assert.rejects(store.read(), /Unsupported factory state schema version; refusing downgrade/);
  assert.equal(fake.issues[0].body, body);
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

test("serializes concurrent V1 migrations across separate store instances", async () => {
  const legacy = {
    consecutive_failures: 1,
    cooldown_until: null,
    task_failures: { "81": 1 },
    skipped_issue_numbers: [],
    last_error: "legacy failure",
    updated_at: "2026-11-19T05:00:00.000Z",
  };
  const body = "Machine-managed scheduler state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(legacy)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const firstStore = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const secondStore = createFactoryStateStore(fake.client, { repository: "OWNER/REPO" });

  const results = await Promise.all([firstStore.migrate(), secondStore.migrate()]);

  assert.equal(results.every((result) => result.state.schema_version === 2), true);
  assert.equal(results.every((result) => result.state.state_version === 1), true);
  assert.equal(results.filter((result) => result.migrated === true).length, 1);
  assert.equal(results.filter((result) => result.migrated === false).length, 1);
  assert.equal(fake.issues.length, 1);
  assert.equal((await firstStore.read()).migrated, false);
  assert.equal((await secondStore.read()).state.tasks["81"].failures, 1);
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


test("rejects non-canonical base64 state payloads instead of accepting Buffer's permissive decoding", async () => {
  const nonCanonicalPayload = Buffer.from(JSON.stringify(createInitialFactoryState())).toString("base64") + "===";
  const body = "Machine-managed V2 factory state. <!-- agent-factory-state:" + nonCanonicalPayload + " -->";
  const fake = fakeApi([{ number: 104, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /invalid base64 JSON/);
});

test("fails closed when the state Issue marker is missing or its payload is malformed", async () => {
  const fake = fakeApi([
    { number: 101, title: FACTORY_STATE_ISSUE_TITLE, body: "machine-managed but marker missing" },
  ]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /state marker is missing/);

  const invalidJsonBody = "Machine-managed V2 factory state. <!-- agent-factory-state:" +
    Buffer.from("{not-json").toString("base64") + " -->";
  const malformed = fakeApi([
    { number: 102, title: FACTORY_STATE_ISSUE_TITLE, body: invalidJsonBody },
  ]);
  const malformedStore = createFactoryStateStore(malformed.client, { repository: "owner/repo" });
  await assert.rejects(malformedStore.read(), /invalid base64 JSON/);
});

test("fails closed when a configured state Issue number points to an unrelated Issue", async () => {
  const fake = fakeApi([{ number: 103, title: "Unrelated issue", body: "not factory state" }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo", issueNumber: 103 });
  await assert.rejects(store.read(), /does not identify the machine-managed state Issue/);
});

test("fails closed rather than silently truncating state Issue discovery after 100 full pages", async () => {
  const validBody = "Machine-managed V2 factory state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(createInitialFactoryState())).toString("base64") + " -->";
  let pageCalls = 0;
  const client = {
    request: async (path) => {
      if (!path.includes("/issues?")) throw new Error("unexpected request");
      pageCalls += 1;
      return Array.from({ length: 100 }, (_, index) => ({
        number: (pageCalls - 1) * 100 + index + 1,
        title: "Unrelated issue " + index,
        body: validBody,
      }));
    },
  };
  const store = createFactoryStateStore(client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /100-page safety limit/);
  assert.equal(pageCalls, 100);
});

test("rejects state writes that do not advance exactly one version", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const state = createInitialFactoryState(1000);
  await assert.rejects(store.write(0, state), /advance exactly one version/);
});

test("refuses to write an oversized durable state Issue before issuing POST or PATCH", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const state = recordSystemFailure(
    createInitialFactoryState(1000), "run-oversized-state-1", "TEST", "oversized fixture", 2000,
  ).state;
  state.processed_events = Array.from(
    { length: 500 },
    (_, index) => "oversized-event-" + String(index).padStart(4, "0") + "-" + "x".repeat(160),
  );
  const before = fake.issues.length;
  await assert.rejects(
    store.write(0, state),
    /exceeds the 60,000-character safety limit; refusing to write/,
  );
  assert.equal(fake.issues.length, before);
  assert.equal(MAX_STATE_ISSUE_BODY_CHARS, 60_000);
});


test("a rejected repository write does not poison the serialized write queue", async () => {
  const fake = fakeApi();
  const originalRequest = fake.client.request;
  let failNextRead = true;
  fake.client.request = async (path, options = {}) => {
    if (failNextRead && (options.method ?? "GET") === "GET" && path.includes("/issues?")) {
      failNextRead = false;
      throw new Error("simulated transient GitHub read failure");
    }
    return originalRequest(path, options);
  };

  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const first = recordSystemFailure(
    createInitialFactoryState(1000), "run-queue-first-1", "API_TIMEOUT", "first attempt", 2000,
  ).state;
  await assert.rejects(store.write(0, first), /transient GitHub read failure/);

  const second = recordSystemFailure(
    createInitialFactoryState(1000), "run-queue-second-1", "API_TIMEOUT", "second attempt", 3000,
  ).state;
  const result = await store.write(0, second);
  assert.equal(result.state.state_version, 1);
  assert.equal((await store.read()).state.system.last_error, "second attempt");
  assert.equal(fake.issues.length, 1);
});


test("rejects invalid UTF-8 bytes in an otherwise canonical base64 state payload", async () => {
  const invalidUtf8 = Buffer.concat([
    Buffer.from("{\"schema_version\":2,\"broken\":\""),
    Buffer.from([0xc3, 0x28]),
    Buffer.from("\"}"),
  ]).toString("base64");
  const body = "Machine-managed V2 factory state. <!-- agent-factory-state:" + invalidUtf8 + " -->";
  const fake = fakeApi([{ number: 105, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /invalid base64 JSON/);
});

test("migrates the configured production state-Issue path without creating a replacement Issue", async () => {
  const legacy = {
    consecutive_failures: 1,
    cooldown_until: null,
    task_failures: { "81": 1, "94": 1, "95": 3, "97": 2 },
    skipped_issue_numbers: [95],
    last_error: "previous worker failure",
    last_task_success_at: "2026-11-19T16:43:26.594Z",
    updated_at: "2026-11-20T04:09:57.622Z",
  };
  const body = "Machine-managed scheduler state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(legacy)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, {
    repository: "owner/repo",
    issueNumber: 100,
  });

  const migrated = await store.migrate();

  assert.equal(migrated.migrated, true);
  assert.equal(migrated.issue.number, 100);
  assert.equal(migrated.state.schema_version, 2);
  assert.equal(migrated.state.state_version, 1);
  assert.equal(migrated.state.system.consecutive_failures, 1);
  assert.equal(migrated.state.tasks["81"].failures, 1);
  assert.equal(migrated.state.tasks["94"].failures, 1);
  assert.equal(migrated.state.tasks["95"].status, "quarantined");
  assert.equal(migrated.state.tasks["97"].failures, 2);
  assert.equal(migrated.state.system.last_success_at, legacy.last_task_success_at);
  assert.equal(fake.issues.length, 1, "migration must update the existing state Issue, not create another");
  assert.equal((await store.read()).migrated, false);
});

test("rejects a successful-looking PATCH response that does not contain the requested durable state", async () => {
  const fake = fakeApi();
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const initial = recordSystemFailure(createInitialFactoryState(1000), "run-confirm-initial-1", "ERR_INITIAL", "initial", 2000).state;
  await store.write(0, initial);
  const currentBody = fake.issues[0].body;
  const next = recordSystemFailure(initial, "run-confirm-next-1", "ERR_NEXT", "next", 3000).state;
  const originalRequest = fake.client.request;
  fake.client.request = async (path, options = {}) => {
    if (/\/issues\/\d+$/.test(path) && options.method === "PATCH") {
      // Simulate a stale/misleading API response: HTTP succeeded but the
      // returned Issue still carries the previous durable payload.
      return { ...fake.issues[0], body: currentBody };
    }
    return originalRequest(path, options);
  };

  await assert.rejects(store.write(1, next), /does not confirm the requested state/);
  const persisted = await store.read();
  assert.equal(persisted.state.state_version, 1);
  assert.equal(persisted.state.system.last_error_code, "ERR_INITIAL");
});


test("repository write queue recovers across store instances after a rejected stale write", async () => {
  const fake = fakeApi();
  const firstStore = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const secondStore = createFactoryStateStore(fake.client, { repository: "OWNER/REPO" });
  const initial = createInitialFactoryState(1000);
  const first = recordSystemFailure(
    initial,
    "run-queue-recovery-first-1",
    "API_TIMEOUT",
    "first accepted write",
    2000,
  ).state;
  await firstStore.write(0, first);

  const stale = recordSystemFailure(
    initial,
    "run-queue-recovery-stale-1",
    "API_TIMEOUT",
    "stale write must fail",
    2500,
  ).state;
  await assert.rejects(secondStore.write(0, stale), /version conflict/);

  const next = recordSystemFailure(
    first,
    "run-queue-recovery-next-1",
    "API_TIMEOUT",
    "queue must continue after rejection",
    3000,
  ).state;
  const result = await firstStore.write(1, next);

  assert.equal(result.state.state_version, 2);
  assert.equal((await secondStore.read()).state.state_version, 2);
  assert.equal(fake.issues.length, 1);
});


test("preserves skipped-only V1 Issue numbers as quarantined tasks during migration", async () => {
  const legacy = {
    consecutive_failures: 0,
    cooldown_until: null,
    task_failures: { "81": 1 },
    skipped_issue_numbers: [95, "96"],
    updated_at: "2026-11-20T04:09:57.622Z",
  };
  const body = "Machine-managed scheduler state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(legacy)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  const migrated = await store.read();
  assert.equal(migrated.state.tasks["81"].status, "retry_wait");
  for (const issueNumber of ["95", "96"]) {
    assert.equal(migrated.state.tasks[issueNumber].status, "quarantined");
    assert.equal(migrated.state.tasks[issueNumber].quarantined, true);
    assert.equal(migrated.state.tasks[issueNumber].failures, 0);
  }
});

test("fails closed on malformed V1 skipped Issue history", async () => {
  const legacy = { task_failures: { "81": 1 }, skipped_issue_numbers: [0, "not-an-issue"] };
  const body = "Machine-managed scheduler state. <!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(legacy)).toString("base64") + " -->";
  const fake = fakeApi([{ number: 100, title: FACTORY_STATE_ISSUE_TITLE, body }]);
  const store = createFactoryStateStore(fake.client, { repository: "owner/repo" });
  await assert.rejects(store.read(), /invalid Issue number/);
  assert.equal(fake.issues[0].body, body, "invalid legacy state must not be rewritten");
});
