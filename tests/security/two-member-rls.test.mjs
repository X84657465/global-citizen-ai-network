import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

const databaseUrl = process.env.SUPABASE_DB_URL;
const psql = process.env.PSQL_BIN || "psql";
const databaseTestOptions = { skip: !databaseUrl && "requires SUPABASE_DB_URL for a disposable local Supabase database" };

function sql(query, { expectFailure = false } = {}) {
  if (!databaseUrl) throw new Error("SUPABASE_DB_URL is required. Use a disposable local Supabase database; never point this test at production.");
  const result = spawnSync(psql, [
    databaseUrl,
    "-X",
    "-q",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    query,
  ], { encoding: "utf8", timeout: 30_000, env: { ...process.env, PGAPPNAME: "gcan-two-member-rls-test" } });

  if (expectFailure) {
    assert.notEqual(result.status, 0, "Expected the database to reject this operation.");
    return result.stderr || result.stdout;
  }
  assert.equal(result.status, 0, result.stderr || result.stdout || "psql command failed");
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
      ('${messageA}', '${conversationA}', '${a}', 'user', 'fixture-a'),
      ('${messageB}', '${conversationB}', '${b}', 'user', 'fixture-b');
    insert into public.ai_requests (id, owner_id, project_id, conversation_id, provider, model, feature)
    values
      ('${requestA}', '${a}', '${projectA}', '${conversationA}', 'fixture', 'fixture', 'rls-test'),
      ('${requestB}', '${b}', '${projectB}', '${conversationB}', 'fixture', 'fixture', 'rls-test');
    insert into public.contribution_tasks (id, title, description, category, status)
    values ('${task}', 'RLS fixture task', 'Disposable test fixture', 'security', 'published');
    insert into public.task_submissions (id, task_id, contributor_id, content)
    values
      ('${submissionA}', '${task}', '${a}', 'fixture-a'),
      ('${submissionB}', '${task}', '${b}', 'fixture-b');
    `;
  return { a, b, projectA, projectB, conversationA, conversationB, messageA, messageB, requestA, requestB, submissionA, submissionB, setup };
}

function asMember(userId, query) {
  return `
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', true);
    select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', true);
    ${query}
  `;
}

test("two ordinary members are isolated across profile, workspace, AI, and contribution rows", databaseTestOptions, () => {
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

test("cross-member reads and mutations cannot expose or alter another member's records", databaseTestOptions, () => {
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

test("profile role and account-status escalation is rejected by the database trigger", databaseTestOptions, () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, `update public.profiles set role = 'admin' where id = '${f.a}';`)}
    rollback;
  `, { expectFailure: true });
});

test("authenticated members cannot forge assistant or system messages", databaseTestOptions, () => {
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

test("authenticated members cannot write directly to financial or AI cost ledgers", databaseTestOptions, () => {
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

test("suspended and closed accounts cannot read member data; restricted accounts remain read-only", databaseTestOptions, () => {
  const f = fixture();
  const output = sql(`
    ${f.setup}
    update public.profiles set account_status = 'restricted' where id = '${f.a}';
    update public.profiles set account_status = 'suspended' where id = '${f.b}';
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
    update public.profiles set account_status = 'closed' where id = '${f.b}';
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

test("client cannot access service-only audit records", databaseTestOptions, () => {
  const f = fixture();
  sql(`
    ${f.setup}
    ${asMember(f.a, "select * from public.audit_logs;")}
    rollback;
  `, { expectFailure: true });
});
