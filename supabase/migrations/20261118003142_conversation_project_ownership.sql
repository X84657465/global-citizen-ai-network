-- Enforce project ownership at the database boundary, not only in the API.
-- This protects direct PostgREST clients and future server-side callers too.

create or replace function private.enforce_conversation_project_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_project_owner uuid;
  v_archived_at timestamptz;
begin
  if new.project_id is null then
    return new;
  end if;

  select p.owner_id, p.archived_at
    into v_project_owner, v_archived_at
  from public.projects p
  where p.id = new.project_id
  for key share;

  if not found
     or v_project_owner is distinct from new.owner_id
     or v_archived_at is not null then
    raise exception 'conversation project must be active and owned by the conversation owner'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_conversation_project_ownership() from public, anon, authenticated, service_role;

drop trigger if exists conversations_project_owner_guard on public.conversations;
create trigger conversations_project_owner_guard
before insert or update of project_id, owner_id on public.conversations
for each row execute function private.enforce_conversation_project_ownership();

comment on function private.enforce_conversation_project_ownership() is
  'Rejects conversation links to archived projects or projects owned by another member.';
