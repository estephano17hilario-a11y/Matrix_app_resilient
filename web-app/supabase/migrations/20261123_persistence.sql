-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-23 · Persistence hardening
--
-- 1. merge_user_settings(patch): atomic, server-side merge into the caller's
--    `settings` document. Replaces the client-side "read, merge, upsert" that lost
--    keys when two writers raced or when an offline-queued save replaced the whole
--    document with a partial one. `local_prefs` (per-key synced UI preferences) is
--    merged one level deeper so a device only ever overwrites the keys it changed.
-- 2. purge_old_tombstones(days): soft-deleted rows are only needed for a short
--    window (the client never does incremental sync), so old ones are removed.
--
-- Idempotent and additive: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.merge_user_settings(p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER            -- RLS on user_collections still applies to the caller
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'patch must be a JSON object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_collections AS uc (id, user_id, collection_name, data, deleted)
  VALUES ('config_' || v_uid::text, v_uid, 'settings', p_patch, FALSE)
  ON CONFLICT (id) DO UPDATE
    SET data = (uc.data || (p_patch - 'local_prefs'))
               || CASE
                    WHEN p_patch ? 'local_prefs' AND jsonb_typeof(p_patch -> 'local_prefs') = 'object'
                    THEN jsonb_build_object(
                           'local_prefs',
                           COALESCE(NULLIF(uc.data -> 'local_prefs', 'null'::jsonb), '{}'::jsonb)
                             || (p_patch -> 'local_prefs'))
                    ELSE '{}'::jsonb
                  END,
        deleted = FALSE
  RETURNING uc.data INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_user_settings(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_user_settings(JSONB) TO authenticated;

-- Tombstone cleanup. Not exposed to the API roles: run it from SQL / a cron job.
CREATE OR REPLACE FUNCTION public.purge_old_tombstones(p_days INT DEFAULT 30)
RETURNS BIGINT
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH gone AS (
    DELETE FROM public.user_collections
     WHERE deleted = TRUE
       AND updated_at < now() - make_interval(days => GREATEST(p_days, 7))
    RETURNING 1
  )
  SELECT count(*) FROM gone;
$$;

REVOKE ALL ON FUNCTION public.purge_old_tombstones(INT) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
