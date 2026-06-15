-- ====================================================================================
-- 💎 SUPABASE MATRIX KERNEL - SQL SCHEMA & RLS POLICIES
-- Architecture: High Security, Scalability, and Economy at Lowest Cost (Serverless)
-- ====================================================================================

-- 1. 🛡️ EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 🗄️ TABLES
-- Table: public.users (Extended profile data linked to auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    photo_url TEXT,
    plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'ELITE')),
    es_pro BOOLEAN DEFAULT FALSE,
    revenuecat_app_user_id TEXT UNIQUE, -- Added for RevenueCat sync
    archetype TEXT DEFAULT 'NEO',
    theme TEXT DEFAULT 'MATRIX',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- JSONB for flexible schemaless stats, highly optimized for reading
    stats JSONB DEFAULT '{"level": 1, "xp": 0}'::jsonb,
    onboarding JSONB DEFAULT '{"completedAt": 0}'::jsonb,
    "planExpiryDate" BIGINT
);

-- Table: public.projects (User goals, tasks, etc)
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    data JSONB DEFAULT '{}'::jsonb, -- Flexible payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: public.transactions (Economy & Payments System)
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL, -- Negative for spending, positive for earning/buying
    currency TEXT DEFAULT 'USD',
    type TEXT NOT NULL CHECK (type IN ('SUBSCRIPTION', 'COIN_PURCHASE', 'REWARD', 'PENALTY')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    revenuecat_transaction_id TEXT UNIQUE, -- For webhooks (RevenueCat)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: public.audit_logs (Strict tracking)
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 🚀 INDEXES (For massive performance savings)
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_revenuecat ON public.transactions(revenuecat_transaction_id);

-- 4. 🔒 ROW LEVEL SECURITY (RLS)
-- Enables strict protection so clients can query DB directly (saving Node.js hosting costs)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users Policy
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users 
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects Policy
CREATE POLICY "Users can manage own projects" ON public.projects 
    FOR ALL USING (auth.uid() = user_id);

-- Transactions Policy (Read-Only for users, backend/webhooks will use Service Key to insert/update)
CREATE POLICY "Users can view own transactions" ON public.transactions 
    FOR SELECT USING (auth.uid() = user_id);

-- Audit Logs Policy (Append-Only for users)
CREATE POLICY "Users can create logs" ON public.audit_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own logs" ON public.audit_logs 
    FOR SELECT USING (auth.uid() = user_id);

-- 5. ⚡ AUTOMATIC TRIGGERS
-- Trigger to create a public.user profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, photo_url, plan, es_pro)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url',
    'FREE',
    FALSE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public to prevent unauthorized calls to security definer function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to update 'updated_at' automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Trigger to automatically uppercase the plan column to avoid check constraint violations
CREATE OR REPLACE FUNCTION public.handle_user_plan_uppercase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan IS NOT NULL THEN
    NEW.plan := UPPER(NEW.plan);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_user_plan_uppercase
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_plan_uppercase();

-- Trigger function to reset plan expiry and align es_pro when plan is upgraded or downgraded
CREATE OR REPLACE FUNCTION public.handle_user_plan_expiry_reset()
RETURNS TRIGGER AS $$
BEGIN
  -- If the plan is being upgraded to PRO or ELITE from FREE (or if it's a new PRO/ELITE user),
  -- reset planExpiryDate to NULL to prevent accidental client-side reversion.
  IF (NEW.plan = 'PRO' OR NEW.plan = 'ELITE') AND (OLD.plan IS NULL OR OLD.plan = 'FREE') THEN
    NEW."planExpiryDate" := NULL;
    NEW.es_pro := TRUE;
  END IF;
  
  -- If the plan is set to FREE, ensure es_pro is FALSE
  IF NEW.plan = 'FREE' THEN
    NEW.es_pro := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_user_plan_expiry_reset
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_plan_expiry_reset();

