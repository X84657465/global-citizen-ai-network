#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { randomInt, randomUUID } from "node:crypto";
import process from "node:process";

const databaseUrl = process.env.LOCAL_SUPABASE_DB_URL;
if (!databaseUrl || process.env.CONFIRM_LOCAL_SUPABASE !== "YES") {
  throw new Error("Refusing to run without LOCAL_SUPABASE_DB_URL and CONFIRM_LOCAL_SUPABASE=YES. Use only a disposable local Supabase database.");
}
const parsedUrl = new URL(databaseUrl);
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
  throw new Error("LOCAL_SUPABASE_DB_URL must use the PostgreSQL protocol.");
}
if (!allowedHosts.has(parsedUrl.hostname) || parsedUrl.hostname.endsWith(".supabase.co")) {
  throw new Error("Refusing non-local database host: " + parsedUrl.hostname);
}
if (parsedUrl.port !== "54322" || parsedUrl.pathname !== "/postgres" || parsedUrl.username !== "postgres") {
  throw new Error("Refusing database target outside the default local Supabase endpoint (postgres@127.0.0.1:54322/postgres).");
}

function startPsql(appName) {
  return spawn("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-At", "-d", databaseUrl], {
    env: { ...process.env, PGAPPNAME: appName },
    stdio: ["pipe", "pipe", "pipe"],
  });
}
function collect(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stdout.trim())
      : reject(new Error("psql exited " + code + ": " + (stderr || stdout))));
  });
}
function runSql(sql, appName) {
  const child = startPsql(appName);
  const result = collect(child);
  child.stdin.end(sql);
  return result;
}
function sqlLiteral(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function claimSql(input) {
  const promptLiteral = sqlLiteral(input.prompt);
  return "select disposition || ':' || reason || ':' || coalesce(claimed_request_id::text, '')\n" +
    "from public.claim_ai_request(\n" +
    "'" + input.owner + "'::uuid,\n" +
    "'" + input.conversation + "'::uuid,\n" +
    promptLiteral + ",\n" +
    "'" + input.key + "',\n" +
    "encode(sha256(convert_to('" + input.conversation + "' || E'\\n' || " + promptLiteral + ", 'UTF8')), 'hex')::char(64),\n" +
    "'" + input.request + "'::uuid,\n" +
    "'local-concurrency-test', 'fixture-model', 'chat', 0.01, 0.001\n);";
}
async function waitForOutput(child, marker, timeoutMs = 15000) {
  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (output.includes(marker)) return;
    if (child.exitCode !== null) throw new Error("psql exited before emitting marker " + marker);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for psql marker: " + marker);
}
async function waitUntilBlocked(appName, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = spawnSync("psql", [
      "-X", "-q", "-v", "ON_ERROR_STOP=1", "-At", "-d", databaseUrl,
      "-c", "select coalesce(wait_event_type, '') from pg_stat_activity where application_name = " +
        sqlLiteral(appName) + " and state = 'active'",
    ], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || "Unable to inspect pg_stat_activity");
    if (result.stdout.trim() === "Lock") return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error("PostgreSQL session never waited on a lock: " + appName);
}
async function concurrentPair(input) {
  const appName = "gcai-claim-" + randomUUID();
  const gateKey = randomInt(1000000, 2147483647);
  const gateChild = startPsql(appName + "-gate");
  const gateResultPromise = collect(gateChild);
  gateChild.stdin.write("select pg_advisory_lock(" + gateKey + ");\nselect 'gate-held';\n");
  let firstChild;
  let secondChild;
  let firstResultPromise;
  let secondResultPromise;
  try {
    await waitForOutput(gateChild, "gate-held");
    const firstSql = [
      "begin;",
      claimSql({ owner: input.owner, conversation: input.firstConversation, prompt: input.firstPrompt, key: input.firstKey, request: input.firstRequest }),
      "select pg_advisory_xact_lock(" + gateKey + ");",
      input.rollbackFirst ? "rollback;" : "commit;",
    ].join("\n");
    firstChild = startPsql(appName + "-first");
    firstResultPromise = collect(firstChild);
    firstChild.stdin.end(firstSql);
    await waitUntilBlocked(appName + "-first");

    secondChild = startPsql(appName + "-second");
    secondResultPromise = collect(secondChild);
    secondChild.stdin.end(claimSql({
      owner: input.owner, conversation: input.secondConversation, prompt: input.secondPrompt,
      key: input.secondKey, request: input.secondRequest,
    }));
    await waitUntilBlocked(appName + "-second");

    gateChild.stdin.write("select pg_advisory_unlock(" + gateKey + ");\n\\q\n");
    gateChild.stdin.end();
    await gateResultPromise;
    const results = await Promise.all([firstResultPromise, secondResultPromise]);
    return { firstResult: results[0], secondResult: results[1] };
  } finally {
    if (gateChild.exitCode === null) {
      try {
        gateChild.stdin.write("select pg_advisory_unlock(" + gateKey + ");\n\\q\n");
        gateChild.stdin.end();
      } catch {
        gateChild.kill("SIGTERM");
      }
    }
    if (firstChild && firstChild.exitCode === null) firstChild.kill("SIGTERM");
    if (secondChild && secondChild.exitCode === null) secondChild.kill("SIGTERM");
  }
}

const owner = randomUUID();
const conversationA = randomUUID();
const conversationB = randomUUID();
const fixtureEmail = "ai-claim-concurrency-" + owner + "@example.test";
const requestIds = Array.from({ length: 8 }, () => randomUUID());
const keyPrefix = "cc-" + owner.replaceAll("-", "").slice(0, 20);
const cases = [];
const controlsText = await runSql(
  "select jsonb_build_object('ai_enabled', ai_enabled, 'monthly_spend_cap', monthly_spend_cap::text, " +
  "'per_request_spend_cap', per_request_spend_cap::text, 'currency', currency, " +
  "'hard_stop_enabled', hard_stop_enabled)::text from public.platform_ai_controls where id = true;",
  "gcai-setup-" + owner,
);
if (!controlsText) throw new Error("platform_ai_controls singleton row is missing");
const oldControls = JSON.parse(controlsText);
function restoreSql() {
  return "update public.platform_ai_controls set ai_enabled = " + oldControls.ai_enabled +
    ", monthly_spend_cap = " + sqlLiteral(oldControls.monthly_spend_cap) + "::numeric" +
    ", per_request_spend_cap = " + sqlLiteral(oldControls.per_request_spend_cap) + "::numeric" +
    ", currency = " + sqlLiteral(oldControls.currency) +
    ", hard_stop_enabled = " + oldControls.hard_stop_enabled + " where id = true;\n" +
    "delete from public.ai_request_idempotency where owner_id = '" + owner + "'::uuid;\n" +
    "delete from public.ai_budget_reservations where owner_id = '" + owner + "'::uuid;\n" +
    "delete from public.messages where owner_id = '" + owner + "'::uuid;\n" +
    "delete from public.ai_requests where owner_id = '" + owner + "'::uuid;\n" +
    "delete from public.ai_user_limits where owner_id = '" + owner + "'::uuid;\n" +
    "delete from public.conversations where owner_id = '" + owner + "'::uuid;\n" +
    "delete from auth.users where id = '" + owner + "'::uuid;";
}
async function resolveFixtureRequest() {
  await runSql(
    "update public.ai_budget_reservations set status = 'released', settled_at = now() where owner_id = '" + owner + "'::uuid and status = 'reserved';\n" +
    "update public.ai_requests set status = 'failed', completed_at = now() where owner_id = '" + owner + "'::uuid and status in ('queued', 'running');\n" +
    "update public.ai_request_idempotency set state = 'failed', error_code = 'local_concurrency_fixture_resolved', updated_at = now(), expires_at = now() + interval '24 hours' where owner_id = '" + owner + "'::uuid and state = 'processing';",
    "gcai-resolve-" + owner,
  );
}
try {
  await runSql(
    "insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values (" +
    "'" + owner + "'::uuid, 'authenticated', 'authenticated', " + sqlLiteral(fixtureEmail) + ", '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());\n" +
    "insert into public.conversations (id, owner_id, title) values " +
    "('" + conversationA + "'::uuid, '" + owner + "'::uuid, 'AI concurrency fixture A'), " +
    "('" + conversationB + "'::uuid, '" + owner + "'::uuid, 'AI concurrency fixture B');\n" +
    "insert into public.ai_user_limits (owner_id, ai_enabled, daily_request_limit, monthly_request_limit, monthly_spend_limit, currency) " +
    "values ('" + owner + "'::uuid, true, 100, 1000, 100, 'TWD');\n" +
    "update public.platform_ai_controls set ai_enabled = true, monthly_spend_cap = 10000, per_request_spend_cap = 10, currency = 'TWD', hard_stop_enabled = true where id = true;",
    "gcai-fixture-" + owner,
  );

  const cross = await concurrentPair({
    owner, firstConversation: conversationA, secondConversation: conversationB,
    firstPrompt: "first cross-conversation prompt", secondPrompt: "second cross-conversation prompt",
    firstKey: keyPrefix + "-cross-a", secondKey: keyPrefix + "-cross-b",
    firstRequest: requestIds[0], secondRequest: requestIds[1],
  });
  if (!cross.firstResult.startsWith("claimed:reserved:") || !cross.secondResult.startsWith("processing:member_has_unresolved_request:")) {
    throw new Error("Cross-conversation race failed: " + JSON.stringify(cross));
  }
  cases.push("same member / different conversations: second claim waits and is rejected as unresolved");
  await resolveFixtureRequest();

  const samePrompt = "same idempotency payload";
  const sameKey = keyPrefix + "-same";
  const same = await concurrentPair({
    owner, firstConversation: conversationA, secondConversation: conversationA,
    firstPrompt: samePrompt, secondPrompt: samePrompt, firstKey: sameKey, secondKey: sameKey,
    firstRequest: requestIds[2], secondRequest: requestIds[3],
  });
  const sameRequestId = same.firstResult.split(":")[2];
  if (!same.firstResult.startsWith("claimed:reserved:") || same.secondResult !== "processing:request_in_progress:" + sameRequestId) {
    throw new Error("Same-key/same-payload race failed: " + JSON.stringify(same));
  }
  cases.push("same idempotency key / same payload: second session observes the first request");
  await resolveFixtureRequest();

  const diffKey = keyPrefix + "-different";
  const diff = await concurrentPair({
    owner, firstConversation: conversationA, secondConversation: conversationA,
    firstPrompt: "original idempotent payload", secondPrompt: "changed idempotent payload",
    firstKey: diffKey, secondKey: diffKey, firstRequest: requestIds[4], secondRequest: requestIds[5],
  });
  const diffRequestId = diff.firstResult.split(":")[2];
  if (!diff.firstResult.startsWith("claimed:reserved:") || diff.secondResult !== "conflict:idempotency_key_reused_with_different_payload:" + diffRequestId) {
    throw new Error("Same-key/different-payload race failed: " + JSON.stringify(diff));
  }
  cases.push("same idempotency key / different payload: second session receives conflict");
  await resolveFixtureRequest();

  const rollbackKey = keyPrefix + "-rollback";
  const retry = await concurrentPair({
    owner, firstConversation: conversationA, secondConversation: conversationA,
    firstPrompt: "retry after rollback", secondPrompt: "retry after rollback",
    firstKey: rollbackKey, secondKey: rollbackKey,
    firstRequest: requestIds[6], secondRequest: requestIds[7], rollbackFirst: true,
  });
  if (!retry.firstResult.startsWith("claimed:reserved:") || !retry.secondResult.startsWith("claimed:reserved:")) {
    throw new Error("Rollback/retry race failed: " + JSON.stringify(retry));
  }
  cases.push("first transaction rollback: waiting second session successfully claims");
  await resolveFixtureRequest();

  const integrity = await runSql(
    "select (select count(*) from public.ai_requests where owner_id = '" + owner + "'::uuid) || ':' || " +
    "(select count(*) from public.ai_budget_reservations where owner_id = '" + owner + "'::uuid) || ':' || " +
    "(select count(*) from public.ai_request_idempotency where owner_id = '" + owner + "'::uuid) || ':' || " +
    "(select count(*) from public.messages where owner_id = '" + owner + "'::uuid and role = 'user');",
    "gcai-integrity-" + owner,
  );
  if (integrity !== "4:4:4:4") throw new Error("Atomic side-effect invariant failed; expected 4:4:4:4, got " + integrity);
  cases.push("integrity: exactly four requests, reservations, idempotency rows, and original prompts");

  console.log("AI claim two-session concurrency integration test passed.");
  for (const item of cases) console.log("- " + item);
} finally {
  await runSql(restoreSql(), "gcai-cleanup-" + owner);
}
