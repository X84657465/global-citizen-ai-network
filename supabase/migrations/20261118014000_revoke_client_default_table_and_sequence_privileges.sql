-- Prevent future public-schema tables and sequences created by the migration
-- owner from inheriting client-role privileges. Existing objects are handled by
-- the explicit table grants/revokes in their respective migrations.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Supabase may also create public objects as supabase_admin. Cover that
-- owner explicitly so its default ACLs cannot re-grant client access.
alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all on sequences from anon, authenticated;
