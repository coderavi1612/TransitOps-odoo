require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Testing Table Access ===\n');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Service Role Key: ${supabaseServiceRoleKey ? '✓ Set' : '✗ Missing'}\n`);

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testTables() {
  const tables = ['vehicles', 'drivers', 'trips', 'maintenance_logs', 'fuel_logs', 'expenses'];
  
  console.log('Attempting to query tables...\n');

  for (const tableName of tables) {
    try {
      console.log(`Testing: ${tableName}`);
      const { data, error, status } = await supabase
        .from(tableName)
        .select('count()', { count: 'exact', head: true })
        .limit(0);

      if (error) {
        console.log(`  ✗ Error: ${JSON.stringify(error, null, 2)}`);
      } else {
        console.log(`  ✓ Success (${status})`);
      }
    } catch (err) {
      console.log(`  ✗ Exception: ${JSON.stringify(err, null, 2)}`);
    }
    console.log();
  }

  // Try direct SQL query
  console.log('\nTrying direct SQL query...\n');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 10"
    });
    
    if (error) {
      console.log(`RPC error: ${JSON.stringify(error, null, 2)}`);
    } else {
      console.log('Tables found:', data);
    }
  } catch (err) {
    console.log(`Exception: ${JSON.stringify(err, null, 2)}`);
  }
}

testTables();
