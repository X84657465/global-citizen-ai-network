-- Strengthen project ownership validation against concurrent project archival.
-- FOR SHARE conflicts with the NO KEY UPDATE lock used when archived_at changes.
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
  for share;

  if not found
     or v_project_owner is distinct from new.owner_id
     or v_archived_at is not null then
    raise exception 'conversation project must be active and owned by the conversation owner'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

comment on function private.enforce_conversation_project_ownership() is
  'Rejects conversation links to archived or foreign-owned projects while locking the project row against concurrent archival.';
