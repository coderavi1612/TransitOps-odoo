-- Quick fix: Drop RLS from profiles and user_roles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles: read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "User roles: read own" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin manage" ON public.user_roles;
