-- ====================================================================================
-- SOCIAL HARDENING (2026-11-19)
--
-- Closes the holes found while auditing the friends / duels / streaks layer:
--
--  1. friendships : the addressee could UPDATE `requester` and forge a friendship with
--                   ANY user (the policy only checked addressee = auth.uid()).
--  2. public_profiles : every signed-in user could read everybody's invite_code and then
--                   call accept_invite() => instant "friends" with anyone, no consent
--                   (friends can read each other's daily stats and send messages).
--  3. duels / friend_streaks : either participant could rewrite any column (opponent,
--                   stake, winner, other side of the streak, status jumps).
--  4. friend_messages : recipient could rewrite from_user/body; no rate limit (spam).
--  5. Default Supabase grants gave anon + authenticated TRUNCATE/TRIGGER/REFERENCES on
--     every social table (TRUNCATE ignores RLS) and anon full DML.
--
-- Idempotent. Only touches the social tables. Safe to run more than once.
-- ====================================================================================

BEGIN;

-- ── 0. Grants: least privilege ─────────────────────────────────────────────────────
REVOKE ALL ON public.public_profiles, public.friendships, public.daily_public_stats,
              public.duels, public.duel_claims, public.friend_streaks, public.friend_messages
    FROM anon, authenticated;

-- Profiles: everything readable EXCEPT invite_code (that column is owner-only via RPC).
GRANT SELECT (user_id, display_name, avatar_id, elo, rank_index, division, level, hud_streak, updated_at)
    ON public.public_profiles TO authenticated;
GRANT INSERT (user_id, display_name, avatar_id, elo, rank_index, division, level, hud_streak, updated_at)
    ON public.public_profiles TO authenticated;
GRANT UPDATE (user_id, display_name, avatar_id, elo, rank_index, division, level, hud_streak, updated_at)
    ON public.public_profiles TO authenticated;
GRANT DELETE ON public.public_profiles TO authenticated;

GRANT SELECT, DELETE ON public.friendships TO authenticated;
GRANT INSERT (requester, addressee) ON public.friendships TO authenticated;
GRANT UPDATE (status, responded_at) ON public.friendships TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_public_stats TO authenticated;

GRANT SELECT ON public.duels TO authenticated;
GRANT INSERT (challenger, opponent, duration, start_day, end_day, excluded_days, stake) ON public.duels TO authenticated;
GRANT UPDATE (status, winner, accepted_at, finished_at) ON public.duels TO authenticated;

GRANT SELECT, INSERT ON public.duel_claims TO authenticated;

GRANT SELECT ON public.friend_streaks TO authenticated;
GRANT INSERT (user_a, user_b, requested_by) ON public.friend_streaks TO authenticated;
GRANT UPDATE (status, started_on, ended_at) ON public.friend_streaks TO authenticated;

GRANT SELECT ON public.friend_messages TO authenticated;
GRANT INSERT (from_user, to_user, kind, body) ON public.friend_messages TO authenticated;
GRANT UPDATE (read_at) ON public.friend_messages TO authenticated;

-- ── 1. Invite codes: generated server-side, readable only by their owner ───────────
CREATE OR REPLACE FUNCTION public.my_invite_code() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
    uid UUID := auth.uid();
    code TEXT;
    alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    attempts INT := 0;
BEGIN
    IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT invite_code INTO code FROM public.public_profiles WHERE user_id = uid;
    IF code IS NOT NULL THEN RETURN code; END IF;
    LOOP
        attempts := attempts + 1;
        SELECT string_agg(substr(alphabet, 1 + (get_byte(b, i) % 32), 1), '')
          INTO code
          FROM (SELECT gen_random_bytes(8) AS b) x, generate_series(0, 7) AS i;
        BEGIN
            INSERT INTO public.public_profiles (user_id, invite_code) VALUES (uid, code)
            ON CONFLICT (user_id) DO UPDATE SET invite_code = COALESCE(public.public_profiles.invite_code, EXCLUDED.invite_code)
            RETURNING invite_code INTO code;
            RETURN code;
        EXCEPTION WHEN unique_violation THEN
            IF attempts >= 6 THEN RAISE; END IF;
        END;
    END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.my_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_invite_code() TO authenticated;

-- invite_code can never be chosen or changed by a client (RLS FOR ALL policy still applies).
CREATE OR REPLACE FUNCTION public.guard_profile_invite() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF TG_OP = 'INSERT' THEN NEW.invite_code := NULL;
        ELSE NEW.invite_code := OLD.invite_code;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_invite ON public.public_profiles;
CREATE TRIGGER guard_profile_invite BEFORE INSERT OR UPDATE ON public.public_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_invite();

-- Light sanity so a tampered client cannot publish absurd profile values.
ALTER TABLE public.public_profiles DROP CONSTRAINT IF EXISTS public_profiles_sane;
ALTER TABLE public.public_profiles ADD CONSTRAINT public_profiles_sane
    CHECK (elo <= 100000 AND level <= 10000 AND hud_streak BETWEEN 0 AND 100000
           AND char_length(coalesce(display_name, '')) <= 60 AND char_length(coalesce(avatar_id, '')) <= 80) NOT VALID;

-- ── 2. Friendships: only PENDING -> ACCEPTED, by the addressee; capped requests ────
CREATE OR REPLACE FUNCTION public.guard_friendship() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND current_user IN ('anon', 'authenticated') THEN
        IF NEW.requester <> OLD.requester OR NEW.addressee <> OLD.addressee OR NEW.created_at <> OLD.created_at THEN
            RAISE EXCEPTION 'FRIENDSHIP_IMMUTABLE' USING ERRCODE = '42501';
        END IF;
        IF NEW.status <> OLD.status AND NOT (OLD.status = 'PENDING' AND NEW.status = 'ACCEPTED') THEN
            RAISE EXCEPTION 'FRIENDSHIP_BAD_TRANSITION' USING ERRCODE = '42501';
        END IF;
    ELSIF TG_OP = 'INSERT' AND current_user IN ('anon', 'authenticated') THEN
        IF (SELECT count(*) FROM public.friendships WHERE requester = NEW.requester AND status = 'PENDING') >= 50 THEN
            RAISE EXCEPTION 'TOO_MANY_PENDING_REQUESTS' USING ERRCODE = '54000';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_friendship ON public.friendships;
CREATE TRIGGER guard_friendship BEFORE INSERT OR UPDATE ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION public.guard_friendship();

-- ── 3. Duels: immutable terms + legal state machine ────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_duel() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
    me UUID := auth.uid();
BEGIN
    IF current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;

    IF NEW.challenger <> OLD.challenger OR NEW.opponent <> OLD.opponent OR NEW.duration <> OLD.duration
       OR NEW.start_day <> OLD.start_day OR NEW.end_day <> OLD.end_day OR NEW.excluded_days <> OLD.excluded_days
       OR NEW.stake <> OLD.stake OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'DUEL_TERMS_IMMUTABLE' USING ERRCODE = '42501';
    END IF;

    IF NEW.status <> OLD.status THEN
        IF OLD.status = 'PENDING' AND NEW.status IN ('ACTIVE', 'DECLINED') AND me = OLD.opponent THEN NULL;
        ELSIF OLD.status = 'PENDING' AND NEW.status = 'CANCELLED' AND me = OLD.challenger THEN NULL;
        ELSIF OLD.status = 'ACTIVE' AND NEW.status = 'FINISHED' THEN
            -- A duel cannot be closed before its last day (+1 day of timezone tolerance).
            IF CURRENT_DATE + 1 < OLD.end_day THEN RAISE EXCEPTION 'DUEL_NOT_OVER' USING ERRCODE = '42501'; END IF;
        ELSE
            RAISE EXCEPTION 'DUEL_BAD_TRANSITION' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF NEW.winner IS DISTINCT FROM OLD.winner THEN
        IF NEW.status <> 'FINISHED' OR OLD.winner IS NOT NULL OR NEW.winner NOT IN (OLD.challenger, OLD.opponent) THEN
            RAISE EXCEPTION 'DUEL_BAD_WINNER' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_duel ON public.duels;
CREATE TRIGGER guard_duel BEFORE UPDATE ON public.duels
    FOR EACH ROW EXECUTE FUNCTION public.guard_duel();

-- ── 4. Friend streaks: fixed pair, only the invited side accepts ───────────────────
CREATE OR REPLACE FUNCTION public.guard_friend_streak() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
    me UUID := auth.uid();
BEGIN
    IF current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;

    IF NEW.user_a <> OLD.user_a OR NEW.user_b <> OLD.user_b OR NEW.requested_by <> OLD.requested_by OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'STREAK_PAIR_IMMUTABLE' USING ERRCODE = '42501';
    END IF;
    IF NEW.status <> OLD.status THEN
        IF OLD.status = 'PENDING' AND NEW.status = 'ACTIVE' AND me <> OLD.requested_by THEN NULL;
        ELSIF OLD.status IN ('PENDING', 'ACTIVE') AND NEW.status = 'ENDED' THEN NULL;
        ELSE RAISE EXCEPTION 'STREAK_BAD_TRANSITION' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_friend_streak ON public.friend_streaks;
CREATE TRIGGER guard_friend_streak BEFORE UPDATE ON public.friend_streaks
    FOR EACH ROW EXECUTE FUNCTION public.guard_friend_streak();

-- ── 5. Messages: rate limit (nudges must not become spam) ──────────────────────────
CREATE OR REPLACE FUNCTION public.guard_friend_message() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        NEW.body := btrim(NEW.body);
        NEW.read_at := NULL;
        IF char_length(NEW.body) = 0 THEN RAISE EXCEPTION 'EMPTY_MESSAGE' USING ERRCODE = '22023'; END IF;
        IF (SELECT count(*) FROM public.friend_messages
             WHERE from_user = NEW.from_user AND to_user = NEW.to_user AND created_at > NOW() - INTERVAL '1 hour') >= 20
           OR (SELECT count(*) FROM public.friend_messages
                WHERE from_user = NEW.from_user AND created_at > NOW() - INTERVAL '1 hour') >= 120 THEN
            RAISE EXCEPTION 'RATE_LIMITED' USING ERRCODE = '54000';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_friend_message ON public.friend_messages;
CREATE TRIGGER guard_friend_message BEFORE INSERT ON public.friend_messages
    FOR EACH ROW EXECUTE FUNCTION public.guard_friend_message();

COMMIT;

NOTIFY pgrst, 'reload schema';
