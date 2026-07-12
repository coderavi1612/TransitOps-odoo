-- WARNING: This will DELETE all tables in the public schema
-- Run this only if you want to reset the database completely

-- Disable foreign key constraints temporarily
ALTER TABLE IF EXISTS public.user_companies DROP CONSTRAINT IF EXISTS user_companies_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.user_companies DROP CONSTRAINT IF EXISTS user_companies_company_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.user_roles DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey CASCADE;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.companies DROP CONSTRAINT IF EXISTS companies_pkey CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS public.user_companies CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop all indexes
DROP INDEX IF EXISTS public.idx_profiles_email CASCADE;
DROP INDEX IF EXISTS public.idx_profiles_active CASCADE;
DROP INDEX IF EXISTS public.idx_user_roles_user_id CASCADE;
DROP INDEX IF EXISTS public.idx_user_roles_role CASCADE;
DROP INDEX IF EXISTS public.idx_user_companies_user_id CASCADE;
DROP INDEX IF EXISTS public.idx_companies_active CASCADE;

-- Verify all tables are deleted
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Should return empty result

-- Now you can run setup-auth-tables.sql to recreate them
