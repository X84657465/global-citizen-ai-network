begin;

select plan(4);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'project-owner-one@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'project-owner-two@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.projects (id, owner_id, title, archived_at) values
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Owner one active project', null),
  ('62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', 'Owner two active project', null),
  ('62000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000001', 'Owner one archived project', now());

do $test$
declare
  v_cross_owner_rejected boolean := false;
  v_archived_rejected boolean := false;
begin
  insert into public.conversations (id, owner_id, project_id, title)
  values ('63000000-0000-4000-8000-000000000001',
          '61000000-0000-4000-8000-000000000001',
          '62000000-0000-4000-8000-000000000001',
          'Valid project-linked conversation');

  begin
    insert into public.conversations (id, owner_id, project_id, title)
    values ('63000000-0000-4000-8000-000000000002',
            '61000000-0000-4000-8000-000000000001',
            '62000000-0000-4000-8000-000000000002',
            'Cross-owner project link');
  exception when check_violation then
    v_cross_owner_rejected := true;
  end;

  begin
    insert into public.conversations (id, owner_id, project_id, title)
    values ('63000000-0000-4000-8000-000000000003',
            '61000000-0000-4000-8000-000000000001',
            '62000000-0000-4000-8000-000000000003',
            'Archived project link');
  exception when check_violation then
    v_archived_rejected := true;
  end;

  if not v_cross_owner_rejected or not v_archived_rejected then
    raise exception 'conversation project ownership guard did not reject every invalid association';
  end if;
end;
$test$;

select ok(
  exists (select 1 from pg_trigger where tgname = 'conversations_project_owner_guard' and not tgisinternal),
  'conversation project ownership trigger is installed'
);
select ok(
  to_regprocedure('private.enforce_conversation_project_ownership()') is not null
  and not has_function_privilege('authenticated', 'private.enforce_conversation_project_ownership()', 'EXECUTE'),
  'project ownership trigger function is private and not directly executable by members'
);
select ok(
  exists (select 1 from public.conversations
    where id = '63000000-0000-4000-8000-000000000001'
      and owner_id = '61000000-0000-4000-8000-000000000001'
      and project_id = '62000000-0000-4000-8000-000000000001'),
  'a conversation can be linked to its owner active project'
);
select ok(
  not exists (select 1 from public.conversations where id in (
    '63000000-0000-4000-8000-000000000002',
    '63000000-0000-4000-8000-000000000003'
  )),
  'cross-owner and archived project associations are rejected'
);

select * from finish();
rollback;
