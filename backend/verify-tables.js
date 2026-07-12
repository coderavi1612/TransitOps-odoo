require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ws = require('ws');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: { transport: ws }
});

async function listTables() {
  console.log('============================================================');
  console.log('VERIFYING TRANSIT TABLES IN SUPABASE');
  console.log('============================================================\n');

  // Try querying all transit and auth tables
  const tables = [
    // Auth tables
    { name: 'profiles', type: 'auth' },
    { name: 'user_roles', type: 'auth' },
    // Transit tables
    { name: 'vehicles', type: 'transit' },
    { name: 'drivers', type: 'transit' },
    { name: 'trips', type: 'transit' },
    { name: 'maintenance_logs', type: 'transit' },
    { name: 'fuel_logs', type: 'transit' },
    { name: 'expenses', type: 'transit' },
  ];

  let authCount = 0;
  let transitCount = 0;
  
  for (const table of tables) {
    try {
      const { data, error, status } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .limit(0);

      if (error) {
        console.log(`${table.name.padEnd(20)} ✗ (${error.message || 'Unknown error'})`);
      } else {
        console.log(`${table.name.padEnd(20)} ✓ EXISTS`);
        if (table.type === 'auth') authCount++;
        else transitCount++;
      }
    } catch (err) {
      console.log(`${table.name.padEnd(20)} ✗ (${err.message})`);
    }
  }

  console.log('\n============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`Auth tables:    ${authCount}/2`);
  console.log(`Transit tables: ${transitCount}/6`);

  if (transitCount === 6) {
    console.log('\n✓ All transit tables created successfully!');
    console.log('  Ready to run: node test-trips-maintenance-fuel.js');
  } else if (transitCount === 0) {
    console.log('\n✗ NO transit tables found!');
    console.log('  You must run setup-transit-tables.sql in Supabase SQL Editor');
    console.log('  Go to: https://supabase.com/dashboard');
    console.log('  1. Click SQL Editor');
    console.log('  2. Create New Query');
    console.log('  3. Paste setup-transit-tables.sql');
    console.log('  4. Click Run');
  } else {
    console.log(`\n⚠  Partial setup: ${transitCount}/6 transit tables exist`);
    console.log('  Re-run setup-transit-tables.sql to complete setup');
  }
  console.log();
}

listTables();
