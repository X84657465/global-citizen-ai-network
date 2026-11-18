-- The reconciliation RPC authenticates the actor with auth.uid() and
-- independently locks/rechecks the active admin profile. Expose only this
-- narrowly scoped function to authenticated callers; its body rejects every
-- non-admin and every actor-id mismatch. This is required because the later
-- least-privilege migration revoked all public-schema function grants.
grant execute on function public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)
  to authenticated;
