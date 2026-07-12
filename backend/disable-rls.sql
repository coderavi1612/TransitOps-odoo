-- Disable RLS for Development
-- Run this in Supabase SQL Editor to disable Row Level Security

-- Disable RLS on auth-related tables
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies (if any exist)
DROP POLICY IF EXISTS "User roles: read own" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin manage" ON public.user_roles;
DROP POLICY IF EXISTS "Profiles: read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.user_roles;

-- Verify RLS is disabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_roles', 'profiles');

-- Expected output:
-- schemaname | tablename  | rowsecurity
-- public     | user_roles | f
-- public     | profiles   | f
