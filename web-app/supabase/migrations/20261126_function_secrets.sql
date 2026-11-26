-- ============================================================================
-- Edge-function secrets in Supabase Vault + pg_cron for the plan sweeper.
--
-- WHY: on the Coolify-hosted Supabase, environment variables edited by hand on
-- the edge-functions container are lost whenever Coolify redeploys the stack.
-- The RevenueCat secrets therefore live in Vault (encrypted at rest) and the
-- functions read them through `get_function_secret`, callable by service_role
-- only. An env variable with the same name still wins if it is ever set.
--
-- Store / rotate a secret (run as postgres):
--   select vault.create_secret('<value>', 'REVENUECAT_SECRET_API_KEY');          -- first time
--   select vault.update_secret(id, '<value>') from vault.secrets
--    where name = 'REVENUECAT_SECRET_API_KEY';                                   -- rotation
--
-- Run BEFORE 20261104_subscription_security.sql so that one can schedule its
-- hourly job (it only schedules when pg_cron exists). Idempotent.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.get_function_secret(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v TEXT;
BEGIN
  -- Allow-list: this must never become a way to read arbitrary Vault entries.
  IF p_name NOT IN ('REVENUECAT_WEBHOOK_AUTH_TOKEN', 'REVENUECAT_SECRET_API_KEY') THEN
    RAISE EXCEPTION 'secret % is not readable by functions', p_name USING ERRCODE = '42501';
  END IF;
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = p_name ORDER BY created_at DESC LIMIT 1;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_function_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_function_secret(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
