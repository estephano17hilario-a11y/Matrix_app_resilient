-- ============================================================================
-- Subscription security + account deletion (production hardening)
--
-- WHY: the old RLS policy "Users can update own data" let ANY logged-in client
-- run  update users set plan='PRO'  on its own row, i.e. free PRO for anyone.
-- From now on only the server (service_role / postgres) may change the
-- subscription columns; the RevenueCat webhook and the `sync-subscription`
-- edge function are the only writers.
--
-- ORDER OF DEPLOYMENT (important):
--   1. Deploy the edge functions `revenuecat-webhook` and `sync-subscription`
--      and set their secrets (see web-app/supabase/functions/README.md).
--   2. Configure the webhook in RevenueCat and send a test event.
--   3. Apply THIS migration. (Applying it before step 1-2 means purchases will
--      only unlock PRO locally on the device until the server is ready.)
--
-- Idempotent: safe to run more than once.
-- ============================================================================

BEGIN;

-- 1. Columns -----------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_source TEXT;          -- 'revenuecat' | 'manual' | NULL
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_product TEXT;         -- store product id of the active plan (weekly / monthly)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_synced_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_event_ms BIGINT;      -- newest RevenueCat event applied (ignores stale/out-of-order events)
-- "planExpiryDate" (BIGINT, epoch ms) already exists: NULL = no expiry (manual / lifetime).

-- 2. Audit trail of every subscription event ---------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id TEXT UNIQUE,                 -- RevenueCat event id => idempotent webhook
    app_user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    environment TEXT,
    product_id TEXT,
    expiration_at_ms BIGINT,
    event_timestamp_ms BIGINT,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON public.subscription_events (app_user_id, created_at DESC);
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;   -- no policies => service role only
REVOKE ALL ON public.subscription_events FROM anon, authenticated;

-- 3. Keep es_pro consistent with plan (replaces the old trigger body) ---------
CREATE OR REPLACE FUNCTION public.handle_user_plan_expiry_reset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan = 'FREE' THEN
    NEW.es_pro := FALSE;
    NEW."planExpiryDate" := NULL;
  ELSIF NEW.plan IN ('PRO', 'ELITE') THEN
    NEW.es_pro := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. THE GUARD: clients can never write subscription columns ------------------
-- Runs LAST (name sorts after the other BEFORE triggers) and silently restores
-- the stored values, so generic profile updates that carry a stale `plan` field
-- keep working instead of failing.
CREATE OR REPLACE FUNCTION public.zz_guard_user_plan_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.plan := 'FREE';
      NEW.es_pro := FALSE;
      NEW."planExpiryDate" := NULL;
      NEW.revenuecat_app_user_id := NULL;
      NEW.plan_source := NULL;
      NEW.plan_product := NULL;
      NEW.plan_synced_at := NULL;
      NEW.plan_event_ms := NULL;
    ELSE
      NEW.plan := OLD.plan;
      NEW.es_pro := OLD.es_pro;
      NEW."planExpiryDate" := OLD."planExpiryDate";
      NEW.revenuecat_app_user_id := OLD.revenuecat_app_user_id;
      NEW.plan_source := OLD.plan_source;
      NEW.plan_product := OLD.plan_product;
      NEW.plan_synced_at := OLD.plan_synced_at;
      NEW.plan_event_ms := OLD.plan_event_ms;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_guard_user_plan ON public.users;
CREATE TRIGGER zz_guard_user_plan
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.zz_guard_user_plan_columns();

-- 5. Safety net: automatic deactivation when a store subscription lapsed -------
-- The webhook (EXPIRATION) and the per-user sync normally do this. This sweeper
-- only exists for the case where a webhook was lost. 6h grace covers late renewals.
CREATE OR REPLACE FUNCTION public.expire_lapsed_plans()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.users
     SET plan = 'FREE', es_pro = FALSE, "planExpiryDate" = NULL, plan_product = NULL, plan_synced_at = NOW()
   WHERE plan IN ('PRO', 'ELITE')
     AND plan_source = 'revenuecat'
     AND "planExpiryDate" IS NOT NULL
     AND "planExpiryDate" < (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 6 * 3600 * 1000;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_lapsed_plans() FROM PUBLIC, anon, authenticated;

-- Schedule hourly if pg_cron exists (it ships with most self-hosted Supabase images).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-lapsed-plans';
    PERFORM cron.schedule('expire-lapsed-plans', '17 * * * *', 'SELECT public.expire_lapsed_plans()');
  ELSE
    RAISE NOTICE 'pg_cron not installed: lapsed plans are still downgraded by the webhook and by sync-subscription on app open.';
  END IF;
END $$;

-- 6. In-app account deletion (Google Play policy: mandatory) -------------------
-- Every user table references public.users / auth.users with ON DELETE CASCADE,
-- so removing the auth user removes all the user's data.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
