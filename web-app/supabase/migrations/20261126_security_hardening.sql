-- 2026-11-26 · Security hardening before production.
--
-- award_user_experience / atomic_merge_user_stats are SECURITY DEFINER and only refuse a caller
-- whose auth.uid() differs from p_user_id. An anonymous caller (public anon key, shipped in the
-- APK) has auth.uid() = NULL, so the check was skipped and ANY user's gold / XP / level could be
-- rewritten by id. The app never calls them without a session, so anon loses EXECUTE; signed-in
-- users keep the own-row check, the server (service_role) keeps full access.
--
-- check_virgin_identity tells whether an email has an account (account enumeration). The client
-- only calls it while signed in (linking Google), so anon loses EXECUTE too.

REVOKE EXECUTE ON FUNCTION public.award_user_experience(uuid, integer, integer, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_user_experience(uuid, integer, integer, integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.atomic_merge_user_stats(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.atomic_merge_user_stats(uuid, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_virgin_identity(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_virgin_identity(text) TO authenticated, service_role;
