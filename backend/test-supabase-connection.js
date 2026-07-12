require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

async function testSupabaseConnection() {
  console.log('\n' + colors.blue + '='.repeat(60) + colors.reset);
  console.log(colors.blue + 'SUPABASE CONNECTION TEST' + colors.reset);
  console.log(colors.blue + '='.repeat(60) + colors.reset + '\n');

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables...\n');

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
  ];

  let allEnvVarsSet = true;

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      const masked = value.slice(0, 10) + '...' + value.slice(-5);
      log.success(`${envVar} = ${masked}`);
    } else {
      log.error(`${envVar} is NOT set`);
      allEnvVarsSet = false;
    }
  }

  if (!allEnvVarsSet) {
    console.log('\n' + colors.red + '✗ Missing required environment variables!' + colors.reset);
    console.log('Please check your .env file and ensure all Supabase variables are set.\n');
    process.exit(1);
  }

  // Step 2: Create Supabase clients
  console.log('\nStep 2: Creating Supabase clients...\n');

  let supabase = null;
  let supabaseAdmin = null;

  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    log.success('Public client created');
  } catch (err) {
    log.error(`Failed to create public client: ${err.message}`);
    process.exit(1);
  }

  try {
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    log.success('Admin client created');
  } catch (err) {
    log.error(`Failed to create admin client: ${err.message}`);
    process.exit(1);
  }

  // Step 3: Test connection to Supabase
  console.log('\nStep 3: Testing connection to Supabase...\n');

  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      log.warn(`Auth session check: ${authError.message}`);
    } else {
      log.success('Connected to Supabase Auth');
    }
  } catch (err) {
    log.error(`Connection failed: ${err.message}`);
    process.exit(1);
  }

  // Step 4: Check if auth tables exist
  console.log('\nStep 4: Checking if auth tables exist...\n');

  const tables = ['profiles', 'user_roles', 'companies', 'user_companies'];
  let tablesExist = 0;

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
      if (error && error.message.includes('does not exist')) {
        log.warn(`${table} - NOT FOUND (need to run setup-auth-tables.sql)`);
      } else if (error) {
        log.warn(`${table} - Error: ${error.message}`);
      } else {
        log.success(`${table} - EXISTS`);
        tablesExist++;
      }
    } catch (err) {
      log.error(`${table} - Connection error: ${err.message}`);
    }
  }

  if (tablesExist < tables.length) {
    console.log(
      `\n${colors.yellow}⚠ Some auth tables are missing!${colors.reset}`
    );
    console.log(
      'Follow these steps to create them:\n' +
      '1. Go to Supabase Dashboard → SQL Editor\n' +
      '2. Click "New Query"\n' +
      '3. Copy contents of setup-auth-tables.sql\n' +
      '4. Run the query\n'
    );
  }

  // Step 5: Check RLS status
  console.log('\nStep 5: Checking Row Level Security (RLS) status...\n');

  try {
    const { data: rls, error: rlsError } = await supabaseAdmin.rpc('list_rls_policies', {
      schema_name: 'public',
    });

    if (rlsError) {
      log.warn('Could not check RLS status directly');
      log.info('To disable RLS, run disable-rls.sql in Supabase SQL Editor');
    } else {
      log.success('RLS check completed');
    }
  } catch (err) {
    log.warn('RLS check skipped');
  }

  // Step 6: Summary
  console.log('\n' + colors.blue + '='.repeat(60) + colors.reset);
  console.log(colors.green + 'SUMMARY' + colors.reset);
  console.log(colors.blue + '='.repeat(60) + colors.reset + '\n');

  if (tablesExist === tables.length) {
    log.success('Supabase connection is healthy');
    log.success('All auth tables exist');
    log.info('Ready to test authentication!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Run tests: node test-auth-complete.js\n');
  } else {
    log.warn('Supabase connection works but auth tables need setup');
    console.log('\nNext steps:');
    console.log('1. Run setup-auth-tables.sql in Supabase SQL Editor');
    console.log('2. Run disable-rls.sql in Supabase SQL Editor');
    console.log('3. Then start the server: npm start\n');
  }
}

testSupabaseConnection().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
