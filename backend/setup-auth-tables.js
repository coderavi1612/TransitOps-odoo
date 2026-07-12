require('dotenv').config();
const { Client } = require('pg');

const sql = `
-- Profile linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  res_user_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles for RBAC
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- No RLS
`;

const client = new Client({
  connectionString: 'postgresql://postgres:Ravi1612vyas@db.slwiyapceekzlpmcbgyk.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    await client.query(sql);
    console.log('SUCCESS: profiles + user_roles tables created, no RLS');
  } catch(e) {
    console.error('ERROR:', e.message);
  }

  const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_roles')");
  console.log('Tables found:', r.rows.map(r => r.table_name));

  // Check existing users
  const u = await client.query("SELECT id, email FROM auth.users LIMIT 5");
  console.log('Auth users:', u.rows.map(r => r.email));

  await client.end();
}
run();
