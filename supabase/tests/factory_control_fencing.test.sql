begin;
select plan(7);

create temporary table factory_fencing_fixture (
  initial_token uuid, initial_fence bigint, competitor_denied boolean,
  initial_state_version bigint, takeover_token uuid, takeover_fence bigint,
  stale_assert_rejected boolean, stale_write_rejected boolean,
  takeover_state_version bigint, publication_reserved boolean,
  publication_recorded boolean, released boolean
) on commit drop;

do $test$
declare
  v_initial record;
  v_competitor record;
  v_state record;
  v_takeover record;
  v_publication record;
  v_stale_assert boolean;
  v_stale_write boolean;
  v_recorded boolean;
  v_released boolean;
  v_event_id uuid := 'd1000000-0000-4000-8000-000000000001';
  v_request_a uuid := 'd2000000-0000-4000-8000-000000000001';
  v_request_b uuid := 'd2000000-0000-4000-8000-000000000002';
  v_token_a uuid;
  v_token_b uuid;
  v_fence_a bigint;
  v_fence_b bigint;
  v_version_a bigint;
  v_version_b bigint;
  v_error text;
begin
  select * into v_initial from public.factory_acquire_lease(
    'test/repo/factory-worker', 'worker-a', v_request_a, 60000
  );
  if not v_initial.acquired or v_initial.fencing_token <> 1 or v_initial.lease_token is null then
    raise exception 'initial lease acquisition failed';
  end if;
  v_token_a := v_initial.lease_token;
  v_fence_a := v_initial.fencing_token;

  select * into v_competitor from public.factory_acquire_lease(
    'test/repo/factory-worker', 'worker-b', v_request_b, 60000
  );
  if v_competitor.acquired or v_competitor.reason <> 'lease_held' then
    raise exception 'active lease was not exclusive';
  end if;

  if not public.factory_assert_lease('test/repo/factory-worker','worker-a',v_request_a,v_token_a,v_fence_a) then
    raise exception 'current lease assertion failed';
  end if;

  select * into v_state from public.factory_persist_task_state(
    'test/repo/factory-worker','worker-a',v_request_a,v_token_a,v_fence_a,
    v_event_id,'{"stage":"intake","status":"queued"}'::jsonb
  );
  if not v_state.persisted or v_state.version <> 1 or v_state.replayed then
    raise exception 'initial durable state write failed';
  end if;
  v_version_a := v_state.version;

  update factory_control.leases
  set expires_at = clock_timestamp() - interval '1 second'
  where scope_key = 'test/repo/factory-worker';

  select * into v_takeover from public.factory_acquire_lease(
    'test/repo/factory-worker', 'worker-b', v_request_b, 60000
  );
  if not v_takeover.acquired or v_takeover.fencing_token <> v_fence_a + 1 then
    raise exception 'expired lease takeover did not advance the fencing token';
  end if;
  v_token_b := v_takeover.lease_token;
  v_fence_b := v_takeover.fencing_token;

  v_stale_assert := not public.factory_assert_lease(
    'test/repo/factory-worker','worker-a',v_request_a,v_token_a,v_fence_a
  );

  begin
    perform * from public.factory_persist_task_state(
      'test/repo/factory-worker','worker-a',v_request_a,v_token_a,v_fence_a,
      'd1000000-0000-4000-8000-000000000002','{"stage":"stale","status":"must_reject"}'::jsonb
    );
  exception when sqlstate '55000' then
    v_stale_write := true;
  end;
  if not coalesce(v_stale_write,false) then
    raise exception 'stale fencing token was allowed to write task state';
  end if;

  select * into v_state from public.factory_persist_task_state(
    'test/repo/factory-worker','worker-b',v_request_b,v_token_b,v_fence_b,
    'd1000000-0000-4000-8000-000000000003','{"stage":"recovered","status":"running"}'::jsonb
  );
  if not v_state.persisted or v_state.version <> 2 then
    raise exception 'new fencing generation could not persist state';
  end if;
  v_version_b := v_state.version;

  select * into v_publication from public.factory_reserve_publication(
    'test/repo/factory-worker','worker-b',v_request_b,v_token_b,v_fence_b,
    repeat('a',64),repeat('b',64),'{"branch":"factory/local-task/test"}'::jsonb
  );
  if not v_publication.reserved or v_publication.status <> 'reserved' then
    raise exception 'publication intent reservation failed';
  end if;

  v_recorded := public.factory_record_publication(
    'test/repo/factory-worker','worker-b',v_request_b,v_token_b,v_fence_b,
    repeat('a',64),'published','factory/local-task/test',683
  );
  if not v_recorded then raise exception 'publication result was not persisted'; end if;

  v_released := public.factory_release_lease(
    'test/repo/factory-worker','worker-b',v_request_b,v_token_b,v_fence_b
  );
  if not v_released then raise exception 'current lease release failed'; end if;

  insert into factory_fencing_fixture values (
    v_token_a,v_fence_a,not v_competitor.acquired,v_version_a,v_token_b,v_fence_b,
    v_stale_assert,v_stale_write,v_version_b,v_publication.reserved,v_recorded,v_released
  );
end;
$test$;

select ok(initial_token is not null and initial_fence = 1, 'first executor receives fencing generation one')
from factory_fencing_fixture;
select ok(competitor_denied, 'a second executor cannot acquire an unexpired lease')
from factory_fencing_fixture;
select ok(initial_state_version = 1, 'active lease can persist the first durable state event')
from factory_fencing_fixture;
select ok(takeover_token is not null and takeover_fence = initial_fence + 1, 'expired lease takeover increments the fencing token')
from factory_fencing_fixture;
select ok(stale_assert_rejected and stale_write_rejected, 'stale executor cannot assert or persist after takeover')
from factory_fencing_fixture;
select ok(takeover_state_version = 2 and publication_reserved and publication_recorded, 'new executor can persist recovered state and an idempotent publication record')
from factory_fencing_fixture;
select ok(released, 'current lease owner can release its lease')
from factory_fencing_fixture;

select * from finish();
rollback;
