const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

if (!config.supabaseAnonKey) {
  console.warn('⚠  SUPABASE_ANON_KEY is not set. Auth features will not work until you add it to .env');
}

// Public client — used only for auth operations (signup, login, OAuth)
const supabase = config.supabaseAnonKey
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

// Admin client — used for all DB queries (auth is enforced by our JWT middleware, not Supabase RLS)
const supabaseAdmin = config.supabaseServiceRoleKey
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
  : null;

module.exports = { supabase, supabaseAdmin };
