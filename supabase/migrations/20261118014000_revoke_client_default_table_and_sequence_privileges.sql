-- Prevent future public-schema tables and sequences created by the migration
-- owner from inheriting client-role privileges. Existing objects are handled by
-- the explicit table grants/revokes in their respective migrations.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Supabase-managed supabase_admin defaults are platform-owned and cannot
-- be changed by the project migration role. Application schema migrations
-- must run as postgres; do not create application objects as supabase_admin.
