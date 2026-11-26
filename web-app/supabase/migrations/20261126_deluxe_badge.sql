-- ====================================================================================
-- DELUXE BADGE ON PUBLIC PROFILES (2026-11-26)
--
-- Friends can see who is a Deluxe (PRO) subscriber. The flag lives on public_profiles
-- (the only table friends can read) and is written ONLY by the server:
--   * clients cannot write the column (column-level grants below + guard trigger),
--   * it follows public.users.plan through a trigger, so purchases, RevenueCat webhook
--     events, manual grants and expire_lapsed_plans() all update it automatically.
--
-- Idempotent. Safe to run more than once. The app works without it (the badge simply
-- does not show): the client falls back to the old column list if the column is missing.
-- ====================================================================================

BEGIN;

ALTER TABLE public.public_profiles ADD COLUMN IF NOT EXISTS is_deluxe BOOLEAN NOT NULL DEFAULT FALSE;

-- Readable by signed-in users like the rest of the card; never writable by clients
-- (INSERT/UPDATE column grants from 20261119 are an explicit allow-list that excludes it).
GRANT SELECT (is_deluxe) ON public.public_profiles TO authenticated;

-- Whatever a client sends, the stored value is the server's: new rows start from the
-- user's real plan, updates keep the old value.
-- (Deliberately NOT security definer: current_user must be the caller's role to tell a client
--  from the server. A user can always read their own users row, which is all this needs.)
CREATE OR REPLACE FUNCTION public.guard_profile_deluxe() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF TG_OP = 'INSERT' THEN
            NEW.is_deluxe := COALESCE((SELECT u.plan IN ('PRO', 'ELITE') FROM public.users u WHERE u.id = NEW.user_id), FALSE);
        ELSE
            NEW.is_deluxe := OLD.is_deluxe;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_deluxe ON public.public_profiles;
CREATE TRIGGER guard_profile_deluxe BEFORE INSERT OR UPDATE ON public.public_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_deluxe();

-- users.plan changed (purchase, renewal, cancellation, expiry) => update the public card.
CREATE OR REPLACE FUNCTION public.sync_profile_deluxe() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.public_profiles
       SET is_deluxe = (NEW.plan IN ('PRO', 'ELITE'))
     WHERE user_id = NEW.id
       AND is_deluxe IS DISTINCT FROM (NEW.plan IN ('PRO', 'ELITE'));
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS sync_profile_deluxe ON public.users;
CREATE TRIGGER sync_profile_deluxe AFTER INSERT OR UPDATE OF plan ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_deluxe();

-- Backfill: everyone who is Deluxe right now.
UPDATE public.public_profiles p
   SET is_deluxe = TRUE
  FROM public.users u
 WHERE u.id = p.user_id
   AND u.plan IN ('PRO', 'ELITE')
   AND p.is_deluxe = FALSE;

COMMIT;

NOTIFY pgrst, 'reload schema';
