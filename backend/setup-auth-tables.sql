-- TransitOps Auth Setup in Supabase
-- Aligned with TransitOps Fleet Management Schema
-- Roles: admin, fleet_manager, driver, safety_officer, financial_analyst

-- 1. Create profiles table (Supabase auth.users extension)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    company_id UUID,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create user_roles table (RBAC mapping to TransitOps roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN (
            'admin',              -- System Administrator - manage users, roles, config
            'fleet_manager',      -- Fleet Manager - control vehicles, assign trips, manage operations
            'driver',             -- Driver - view assigned trip details, maintain status
            'safety_officer',     -- Safety Officer - track licenses, safety scores, maintenance compliance
            'financial_analyst'   -- Financial Analyst - analyze fuel, expenses, ROI
        )
    ),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role)
);

-- 3. Create company/region mapping (optional for multi-tenant)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create user_company mapping (admin can belong to multiple companies)
CREATE TABLE IF NOT EXISTS public.user_companies (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, company_id)
);

-- 5. Disable RLS for development/testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies DISABLE ROW LEVEL SECURITY;

-- 6. Drop any existing RLS policies
DROP POLICY IF EXISTS "User roles: read own" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin manage" ON public.user_roles;
DROP POLICY IF EXISTS "Profiles: read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "Companies: read all" ON public.companies;
DROP POLICY IF EXISTS "User companies: manage own" ON public.user_companies;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_active ON public.companies(active);

-- 8. Verify tables created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'companies', 'user_companies')
ORDER BY tablename;
