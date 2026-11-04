-- ====================================================================================
-- SOCIAL + PROGRESSION (replaces the unapplied 20261029_progression_public.sql)
--
--  public_profiles     public card per user: name, avatar, ELO, rank, invite code
--  friendships         friend requests / friends (one row per pair)
--  daily_public_stats  per-day score, focus and HUD streak (friends only)
--  duels               friend duels (day / week / month) with stakes
--  duel_claims         idempotent reward bookkeeping (one row per prize)
--  friend_streaks      shared streaks: both must activate their HUD streak daily
--  friend_messages     nudges ("¡activa la racha!") and short messages
--
-- Every table has RLS. Clients only ever write their own rows; friendship is
-- checked with are_friends().
-- ====================================================================================

-- ── Public profiles (leaderboard + friend search) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.public_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_id TEXT,
    elo INTEGER NOT NULL DEFAULT 50 CHECK (elo >= 0),
    rank_index SMALLINT NOT NULL DEFAULT 0 CHECK (rank_index BETWEEN 0 AND 7),
    division SMALLINT CHECK (division BETWEEN 0 AND 2),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    hud_streak INTEGER NOT NULL DEFAULT 0,
    invite_code TEXT UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{8}$'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_profiles_elo ON public.public_profiles (elo DESC);
CREATE INDEX IF NOT EXISTS idx_public_profiles_name ON public.public_profiles (lower(display_name));

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are readable by signed-in users" ON public.public_profiles;
CREATE POLICY "Profiles are readable by signed-in users" ON public.public_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users write their own profile" ON public.public_profiles;
CREATE POLICY "Users write their own profile" ON public.public_profiles FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Friendships ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    addressee UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    CHECK (requester <> addressee)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_friendship_pair
    ON public.friendships ((LEAST(requester, addressee)), (GREATEST(requester, addressee)));

CREATE OR REPLACE FUNCTION public.are_friends(a UUID, b UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'ACCEPTED'
          AND ((f.requester = a AND f.addressee = b) OR (f.requester = b AND f.addressee = a))
    );
$$;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Friendship rows visible to both" ON public.friendships;
CREATE POLICY "Friendship rows visible to both" ON public.friendships FOR SELECT TO authenticated
    USING (requester = auth.uid() OR addressee = auth.uid());
DROP POLICY IF EXISTS "Users send friend requests" ON public.friendships;
CREATE POLICY "Users send friend requests" ON public.friendships FOR INSERT TO authenticated
    WITH CHECK (requester = auth.uid() AND status = 'PENDING');
DROP POLICY IF EXISTS "Addressee answers requests" ON public.friendships;
CREATE POLICY "Addressee answers requests" ON public.friendships FOR UPDATE TO authenticated
    USING (addressee = auth.uid()) WITH CHECK (addressee = auth.uid());
DROP POLICY IF EXISTS "Either side removes the friendship" ON public.friendships;
CREATE POLICY "Either side removes the friendship" ON public.friendships FOR DELETE TO authenticated
    USING (requester = auth.uid() OR addressee = auth.uid());

-- Opening a shared invite link makes both users friends right away.
CREATE OR REPLACE FUNCTION public.accept_invite(p_code TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    owner UUID;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT user_id INTO owner FROM public.public_profiles WHERE invite_code = upper(p_code);
    IF owner IS NULL THEN RAISE EXCEPTION 'INVITE_NOT_FOUND'; END IF;
    IF owner = auth.uid() THEN RAISE EXCEPTION 'INVITE_SELF'; END IF;
    INSERT INTO public.friendships (requester, addressee, status, responded_at)
    VALUES (owner, auth.uid(), 'ACCEPTED', NOW())
    ON CONFLICT ((LEAST(requester, addressee)), (GREATEST(requester, addressee)))
    DO UPDATE SET status = 'ACCEPTED', responded_at = NOW();
    RETURN owner;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

-- ── Daily public stats (friends only) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_public_stats (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    score REAL NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    focus_minutes INTEGER NOT NULL DEFAULT 0 CHECK (focus_minutes >= 0),
    hud_streak_active BOOLEAN NOT NULL DEFAULT FALSE,
    hud_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);
ALTER TABLE public.daily_public_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stats visible to self and friends" ON public.daily_public_stats;
CREATE POLICY "Stats visible to self and friends" ON public.daily_public_stats FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id));
DROP POLICY IF EXISTS "Users write their own stats" ON public.daily_public_stats;
CREATE POLICY "Users write their own stats" ON public.daily_public_stats FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Duels ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opponent UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    duration TEXT NOT NULL CHECK (duration IN ('DAY', 'WEEK', 'MONTH')),
    start_day DATE NOT NULL,
    end_day DATE NOT NULL,
    excluded_days DATE[] NOT NULL DEFAULT '{}',
    stake INTEGER NOT NULL DEFAULT 0 CHECK (stake BETWEEN 0 AND 100000),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED', 'FINISHED')),
    winner UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    CHECK (challenger <> opponent),
    CHECK (end_day >= start_day),
    CHECK (cardinality(excluded_days) <= 13)
);
CREATE INDEX IF NOT EXISTS idx_duels_challenger ON public.duels (challenger);
CREATE INDEX IF NOT EXISTS idx_duels_opponent ON public.duels (opponent);

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Duels visible to participants" ON public.duels;
CREATE POLICY "Duels visible to participants" ON public.duels FOR SELECT TO authenticated
    USING (challenger = auth.uid() OR opponent = auth.uid());
DROP POLICY IF EXISTS "Friends challenge each other" ON public.duels;
CREATE POLICY "Friends challenge each other" ON public.duels FOR INSERT TO authenticated
    WITH CHECK (challenger = auth.uid() AND status = 'PENDING' AND public.are_friends(challenger, opponent));
DROP POLICY IF EXISTS "Participants update their duel" ON public.duels;
CREATE POLICY "Participants update their duel" ON public.duels FOR UPDATE TO authenticated
    USING (challenger = auth.uid() OR opponent = auth.uid())
    WITH CHECK (challenger = auth.uid() OR opponent = auth.uid());

-- One row per prize actually paid, so no reward is ever granted twice.
CREATE TABLE IF NOT EXISTS public.duel_claims (
    duel_id UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('STAKE_PAID', 'STAKE_REFUND', 'DAY_WIN', 'FINAL_WIN')),
    day DATE NOT NULL DEFAULT '1900-01-01',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (duel_id, user_id, kind, day)
);
ALTER TABLE public.duel_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Claims visible to duel participants" ON public.duel_claims;
CREATE POLICY "Claims visible to duel participants" ON public.duel_claims FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.duels d WHERE d.id = duel_id AND (d.challenger = auth.uid() OR d.opponent = auth.uid())));
DROP POLICY IF EXISTS "Participants record their own claims" ON public.duel_claims;
CREATE POLICY "Participants record their own claims" ON public.duel_claims FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.duels d WHERE d.id = duel_id AND (d.challenger = auth.uid() OR d.opponent = auth.uid())));

-- ── Friend streaks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'ENDED')),
    started_on DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    CHECK (user_a <> user_b)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_streak_open
    ON public.friend_streaks ((LEAST(user_a, user_b)), (GREATEST(user_a, user_b))) WHERE status <> 'ENDED';

ALTER TABLE public.friend_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Streaks visible to both" ON public.friend_streaks;
CREATE POLICY "Streaks visible to both" ON public.friend_streaks FOR SELECT TO authenticated
    USING (user_a = auth.uid() OR user_b = auth.uid());
DROP POLICY IF EXISTS "Friends propose a streak" ON public.friend_streaks;
CREATE POLICY "Friends propose a streak" ON public.friend_streaks FOR INSERT TO authenticated
    WITH CHECK (requested_by = auth.uid() AND (user_a = auth.uid() OR user_b = auth.uid())
                AND status = 'PENDING' AND public.are_friends(user_a, user_b));
DROP POLICY IF EXISTS "Both update the streak" ON public.friend_streaks;
CREATE POLICY "Both update the streak" ON public.friend_streaks FOR UPDATE TO authenticated
    USING (user_a = auth.uid() OR user_b = auth.uid()) WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- ── Nudges and messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'MESSAGE' CHECK (kind IN ('NUDGE', 'MESSAGE')),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 200),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_friend_messages_inbox ON public.friend_messages (to_user, read_at, created_at DESC);

ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sender and recipient read messages" ON public.friend_messages;
CREATE POLICY "Sender and recipient read messages" ON public.friend_messages FOR SELECT TO authenticated
    USING (from_user = auth.uid() OR to_user = auth.uid());
DROP POLICY IF EXISTS "Friends message each other" ON public.friend_messages;
CREATE POLICY "Friends message each other" ON public.friend_messages FOR INSERT TO authenticated
    WITH CHECK (from_user = auth.uid() AND public.are_friends(from_user, to_user));
DROP POLICY IF EXISTS "Recipient marks as read" ON public.friend_messages;
CREATE POLICY "Recipient marks as read" ON public.friend_messages FOR UPDATE TO authenticated
    USING (to_user = auth.uid()) WITH CHECK (to_user = auth.uid());

-- ── Grants & realtime ──────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_profiles, public.friendships, public.daily_public_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.duels, public.friend_streaks, public.friend_messages TO authenticated;
GRANT SELECT, INSERT ON public.duel_claims TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['friendships', 'duels', 'friend_streaks', 'friend_messages'] LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
        END;
    END LOOP;
END $$;
