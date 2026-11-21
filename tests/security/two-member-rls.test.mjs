import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

const databaseUrl = process.env.SUPABASE_DB_URL;
const psql = process.env.PSQL_BIN || "psql";
const databaseContainer = process.env.SUPABASE_DB_CONTAINER;
const docker = process.env.DOCKER_BIN || "docker";

function sql(query, { expectFailure = false, expectSqlState, expectMessage } = {}) {
  if (!databaseUrl) throw new Error("SUPABASE_DB_URL is required. Use a disposable local Supabase database; never point this test at production.");
  const command = databaseContainer ? docker : psql;
  const args = databaseContainer ? ["exec", "-e", "PGAPPNAME=gcan-two-member-rls-test", databaseContainer, "psql", "-U", "postgres", "-d", "postgres"] : [databaseUrl];
  args.push("-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-c", query);
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 30_000, env: process.env });

  const diagnostic = [
    result.error?.message,
    result.stderr,
    result.stdout,
    `command=${command}`,
    `args=${JSON.stringify(args.slice(0, -1))}`,
    result.signal ? `signal=${result.signal}` : "",
    result.status === null ? "process did not return an exit status" : "",
  ].filter(Boolean).join("\n");

  if (expectFailure) {
    assert.notEqual(result.status, 0, "Expected the database to reject this operation.");
    if (result.error) throw new Error(`Database subprocess could not execute: ${diagnostic}`);
    const failureOutput = result.stderr || result.stdout;
    if (expectSqlState) {
      assert.match(
        failureOutput,
        new RegExp("ERROR:\\s+" + expectSqlState + ":"),
        `Expected PostgreSQL SQLSTATE ${expectSqlState}; received a different failure: ${diagnostic}`,
      );
    }
    if (expectMessage) {
      assert.ok(
        failureOutput.includes(expectMessage),
        `Expected database rejection message "${expectMessage}"; received a different failure: ${diagnostic}`,
      );
    }
    return failureOutput;
  }
  assert.equal(result.status, 0, diagnostic || "psql command failed");
  return result.stdout.trim();
}

function fixture() {
  const a = randomUUID();
  const b = randomUUID();
  const projectA = randomUUID();
  const projectB = randomUUID();
  const conversationA = randomUUID();
  const conversationB = randomUUID();
  const messageA = randomUUID();
  const messageB = randomUUID();
  const requestA = randomUUID();
  const requestB = randomUUID();
  const submissionA = randomUUID();
  const submissionB = randomUUID();
  const task = randomUUID();

  const setup = `
    begin;
    insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('${a}', 'authenticated', 'authenticated', '${a}@rls.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
      ('${b}', 'authenticated', 'authenticated', '${b}@rls.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    insert into public.projects (id, owner_id, title) values
      ('${projectA}', '${a}', 'member-a project'),
      ('${projectB}', '${b}', 'member-b project');
    insert into public.conversations (id, owner_id, project_id, title) values
      ('${conversationA}', '${a}', '${projectA}', 'member-a conversation'),
      ('${conversationB}', '${b}', '${projectB}', 'member-b conversation');
    insert into public.messages (id, conversation_id, owner_id, role, content) values
      ('${messageA}', '${conversationA}', '${a}', 'user', 'Valid contribution fixture from member A.'),
      ('${messageB}', '${conversationB}', '${b}', 'user', 'Valid contribution fixture from member B.');
    insert into public.ai_requests (id, owner_id, project_id, conversation_id, provider, model, feature)
    values
      ('${requestA}', '${a}', '${projectA}', '${conversationA}', 'fixture', 'fixture', 'rls-test'),
      ('${requestB}', '${b}', '${projectB}', '${conversationB}', 'fixture', 'fixture', 'rls-test');
    insert into public.contribution_tasks (id, title, description, category, status)
    values ('${task}', 'RLS fixture task', 'Disposable test fixture', 'security', 'published');
    insert into public.task_submissions (id, task_id, contributor_id, content, status)
    values
      ('${submissionA}', '${task}', '${a}', 'Valid contribution fixture from member A.', 'submitted'),
      ('${submissionB}', '${task}', '${b}', 'Valid contribution fixture from member B.', 'rejected');
    -- The BEFORE INSERT trigger normalizes every new submission to submitted.
    -- Move B's fixture to rejected using the trusted test connection so the
    -- appeal and cross-member resubmission checks exercise their intended guards.
    update public.task_submissions set status = 'rejected' where id = '${submissionB}';
    insert into public.task_reviews (submission_id, reviewer_id, decision, rationale)
    values ('${submissionB}', '${b}', 'reject', 'Private review rationale belonging to member B.');
    `;
  return { a, b, projectA, projectB, conversationA, conversationB, messageA, messageB, requestA, requestB, submissionA, submissionB, task, setup };
}

function asMember(userId, query) {
  return `
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', true);
    select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', true);
    ${query}
  `;
}

test("two ordinary members are isolated across profile, workspace, AI, and contribution rows", () => {
  const f = fixture();
  const output = sql(`
    ${f.setup}
    ${asMember(f.a, `
      select
        (select count(*) from public.profiles) || ',' ||
        (select count(*) from public.projects) || ',' ||
        (select count(*) from public.conversations) || ',' ||
        (select count(*) from public.messages) || ',' ||
        (select count(*) from public.ai_requests) || ',' ||
        (select count(*) from public.task_submissions);
    `)}
    rollback;
  `);
  assert.match(output, /1,1,1,1,1,1$/, "member A should only see their own rows in every owner-scoped table");
});

test("cross-member reads and mutations cannot expose or alter another member's records", () => {
  const f = fixture();
  const output = sql(`
    ${f.setup}
    ${asMember(f.a, `
      with changed as (
        update public.projects set title = 'tampered'
        where id = '${f.projectB}' returning id
      )
      select
        (select count(*) from changed) || ',' ||
        (select count(*) from public.projects where id = '${f.projectB}') || ',' ||
        (select count(*) from public.messages where id = '${f.messageB}');
    `)}
    rollback;
  `);
  assert.match(output, /0,0,0$/, "cross-member update/read must affect and reveal zero rows");
});

test("member cannot attach a conversation to another member's project", () => {
  const f = fixture();
  const conversation = randomUUID();
  sql(`
    ${f.setup}
    ${asMember(f.a, `
      insert into public.conversations (id, owner_id, project_id, title)
      values ('${conversation}', '${f.a}', '${f.projectB}', 'cross-member project attachment');
    `)}
    rollback;
  `, { expectFailure: true, expectSqlState: "23514" });
});

test("member cannot insert a message into another member's conversation", () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, `
      insert into public.messages (conversation_id, owner_id, role, content)
      values ('${f.conversationB}', '${f.a}', 'user', 'cross-member conversation injection');
    `)}
    rollback;
  `, { expectFailure: true, expectSqlState: "42501" });
});

test("member cannot read another member's submission or review rationale", () => {
  const f = fixture();
  const output = sql(`
    ${f.setup}
    ${asMember(f.a, `
      select
        (select count(*) from public.task_submissions where id = '${f.submissionB}') || ',' ||
        (select count(*) from public.task_reviews where submission_id = '${f.submissionB}');
    `)}
    rollback;
  `);
  assert.match(output, /0,0$/, "member A must not see member B's submission or review rationale");
});

test("member cannot appeal another member's rejected submission", () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, `
      insert into public.task_appeals (submission_id, appellant_id, reason)
      values ('${f.submissionB}', '${f.a}', 'Attempt to appeal another member submission.');
    `)}
    rollback;
  `, {
    expectFailure: true,
    expectSqlState: "P0001",
    expectMessage: "only the submission owner can appeal",
  });
});

test("member cannot submit contribution work on behalf of another member", () => {
  const f = fixture();
  const submission = randomUUID();
  sql(`
    ${f.setup}
    ${asMember(f.a, `
      insert into public.task_submissions (id, task_id, contributor_id, content)
      values ('${submission}', '${f.task}', '${f.b}', 'forged contributor identity');
    `)}
    rollback;
  `, { expectFailure: true, expectSqlState: "42501" });
});

test("profile role and account-status escalation is rejected by the database trigger", () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, `update public.profiles set role = 'admin' where id = '${f.a}';`)}
    rollback;
  `, { expectFailure: true });
});

test("authenticated members cannot forge assistant or system messages", () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, `
      insert into public.messages (conversation_id, owner_id, role, content)
      values ('${f.conversationA}', '${f.a}', 'assistant', 'forged assistant');
    `)}
    rollback;
  `, { expectFailure: true });
});

test("authenticated members cannot write directly to financial or AI cost ledgers", () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, `
      insert into public.reward_ledger (owner_id, event_type, amount, currency, idempotency_key, reason)
      values ('${f.a}', 'earned', 100, 'TWD', 'rls-test-${f.a}', 'forbidden client write');
    `)}
    rollback;
  `, { expectFailure: true });
});

test("suspended and closed accounts cannot read member data; restricted accounts remain read-only", () => {
  const f = fixture();
  const output = sql(`
    ${f.setup}
    -- Account-status transitions are trusted server operations, not member writes.
    set local role service_role;
    select set_config('request.jwt.claim.sub', '', true);
    select set_config('request.jwt.claims', '{}', true);
    update public.profiles set account_status = 'restricted' where id = '${f.a}';
    update public.profiles set account_status = 'suspended' where id = '${f.b}';
    reset role;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '${f.a}', true);
    select set_config('request.jwt.claims', '{"sub":"${f.a}","role":"authenticated"}', true);
    select 'restricted:' || (select count(*) from public.projects);
    reset role;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '${f.b}', true);
    select set_config('request.jwt.claims', '{"sub":"${f.b}","role":"authenticated"}', true);
    select 'suspended:' || (select count(*) from public.projects);
    reset role;
    set local role service_role;
    select set_config('request.jwt.claim.sub', '', true);
    select set_config('request.jwt.claims', '{}', true);
    update public.profiles set account_status = 'closed' where id = '${f.b}';
    reset role;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '${f.b}', true);
    select set_config('request.jwt.claims', '{"sub":"${f.b}","role":"authenticated"}', true);
    select 'closed:' || (select count(*) from public.projects);
    rollback;
  `);
  assert.match(output, /restricted:1/);
  assert.match(output, /suspended:0/);
  assert.match(output, /closed:0/);
});

test("client cannot access service-only audit records", () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, "select * from public.audit_logs;")}
    rollback;
  `, { expectFailure: true });
});
