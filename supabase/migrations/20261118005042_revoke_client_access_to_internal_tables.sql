-- Internal operational tables are accessed only by trusted server-side code.
-- RLS remains enabled as defense in depth; client roles receive no table privileges.
revoke all privileges on table
  public.audit_logs,
  public.platform_ai_controls,
  public.provider_invoice_imports
from anon, authenticated;

-- Keep service_role and postgres grants unchanged. Server-side routes and audited
-- reconciliation RPCs retain their existing privileged access path.
