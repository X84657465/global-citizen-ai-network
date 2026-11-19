begin;

select plan(5);

-- Two independent members and conversations. The fixture setup runs as the
-- database owner; the assertions below switch to the authenticated API role.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'message-owner-one@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'message-owner-two@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.conversations (id, owner_id, title) values
  ('72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'Owner one conversation'),
  ('72000000-0000-4000-8000-000000000002',
   '71000000-0000-4000-8000-000000000002', 'Owner two conversation');

-- Seed a message for the second member so the first member's SELECT policy
-- is tested against an existing row rather than an empty result.
insert into public.messages (id, conversation_id, owner_id, role, content) values
  ('73000000-0000-4000-8000-000000000002',
   '72000000-0000-4000-8000-000000000002',
   '71000000-0000-4000-8000-000000000002',
   'user', 'Private message belonging to owner two');

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
set local role authenticated;

-- A member must not be able to read another member's message, even when its
-- conversation UUID is known.
select set_config(
  'test.hidden_message_count',
  (select count(*)::text from public.messages
   where conversation_id = '72000000-0000-4000-8000-000000000002'),
  true
);

-- A member can append a user message to their own conversation.
insert into public.messages (id, conversation_id, owner_id, role, content) values
  ('73000000-0000-4000-8000-000000000001',
   '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001',
   'user', 'Valid message from owner one');

-- Record expected RLS denials without aborting the surrounding test
-- transaction. PostgreSQL reports row-security violations as 42501.
do $test$
begin
  begin
    insert into public.messages (conversation_id, owner_id, role, content)
    values ('72000000-0000-4000-8000-000000000002',
            '71000000-0000-4000-8000-000000000001',
            'user', 'Cross-owner conversation write');
    perform set_config('test.cross_owner_rejected', 'false', true);
  exception when insufficient_privilege then
    perform set_config('test.cross_owner_rejected', 'true', true);
  end;

  begin
    insert into public.messages (conversation_id, owner_id, role, content)
    values ('72000000-0000-4000-8000-000000000001',
            '71000000-0000-4000-8000-000000000001',
            'assistant', 'Forged assistant message');
    perform set_config('test.assistant_role_rejected', 'false', true);
  exception when insufficient_privilege then
    perform set_config('test.assistant_role_rejected', 'true', true);
  end;

  begin
    insert into public.messages (conversation_id, owner_id, role, content)
    values ('72000000-0000-4000-8000-000000000001',
            '71000000-0000-4000-8000-000000000002',
            'user', 'Forged owner identity');
    perform set_config('test.owner_mismatch_rejected', 'false', true);
  exception when insufficient_privilege then
    perform set_config('test.owner_mismatch_rejected', 'true', true);
  end;
end;
$test$;

reset role;

select is(
  (select count(*)::integer from public.messages
   where id = '73000000-0000-4000-8000-000000000001'
     and owner_id = '71000000-0000-4000-8000-000000000001'
     and role = 'user'),
  1,
  'authenticated members can append user messages to their own conversations'
);

select is(
  current_setting('test.hidden_message_count')::integer,
  0,
  'authenticated members cannot read another member message by guessing its conversation UUID'
);

select ok(
  current_setting('test.cross_owner_rejected') = 'true',
  'RLS rejects writes into another member conversation'
);

select ok(
  current_setting('test.assistant_role_rejected') = 'true',
  'RLS rejects client attempts to forge assistant messages'
);

select ok(
  current_setting('test.owner_mismatch_rejected') = 'true',
  'RLS rejects messages whose owner_id does not match the authenticated member'
);

select * from finish();
rollback;
