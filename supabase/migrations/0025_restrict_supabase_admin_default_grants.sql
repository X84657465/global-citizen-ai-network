-- Supabase's managed supabase_admin role has permissive public-schema
-- default ACLs for browser roles. Application migrations run as postgres, but
-- any future public object created by supabase_admin would otherwise inherit
-- direct grants. Revoke those defaults while retaining service_role access.

alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated;
