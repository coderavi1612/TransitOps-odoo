require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const SQL = `
-- 1. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255) NOT NULL UNIQUE,
    vehicle_model VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    capacity DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    odometer DOUBLE PRECISION DEFAULT 0.0,
    acquisition_cost NUMERIC(15, 2) DEFAULT 0.0,
    active_trip_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Drivers Table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    license_number VARCHAR(255) NOT NULL UNIQUE,
    license_expiry_date DATE NOT NULL,
    safety_score DOUBLE PRECISION DEFAULT 100.0,
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
    active_trip_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    cargo_weight DOUBLE PRECISION NOT NULL,
    planned_distance DOUBLE PRECISION NOT NULL,
    start_odometer DOUBLE PRECISION,
    end_odometer DOUBLE PRECISION,
    actual_distance DOUBLE PRECISION,
    fuel_consumed DOUBLE PRECISION,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (state IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
    planned_date DATE,
    dispatch_datetime TIMESTAMP WITH TIME ZONE,
    completion_datetime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Maintenance Logs Table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Scheduled' CHECK (state IN ('Scheduled', 'Open', 'Closed')),
    scheduled_date DATE,
    open_date DATE,
    close_date DATE,
    cost NUMERIC(15, 2) DEFAULT 0.0,
    odometer DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fuel Logs Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    litres DOUBLE PRECISION NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    odometer DOUBLE PRECISION,
    fuel_efficiency DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    expense_category VARCHAR(50) NOT NULL CHECK (expense_category IN ('Toll', 'Maintenance', 'Misc')),
    amount NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON public.vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_license ON public.drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_trips_state ON public.trips(state);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON public.fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON public.expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);

-- 8. Disable RLS for development
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
`;

async function setupTables() {
  console.log('🔧 Setting up TransitOps tables...\n');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: SQL });
    
    if (error) {
      // RPC method doesn't exist, try alternative approach
      console.log('ℹ RPC method not available, using direct SQL execution...\n');
      
      // Split SQL by semicolon and execute each statement
      const statements = SQL.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.rpc('exec', {
            sql: statement.trim()
          }).catch(() => ({ error: null })); // Continue on error
          
          if (execError && !execError.message.includes('Does not exist')) {
            console.warn(`⚠️  Warning: ${execError.message}`);
          }
        }
      }
    }

    // Verify tables were created
    console.log('\n✓ Checking if tables exist...\n');
    
    const tablesToCheck = ['vehicles', 'drivers', 'trips', 'maintenance_logs', 'fuel_logs', 'expenses'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase.from(table).select('count()', { count: 'exact' }).limit(0);
        if (!error) {
          console.log(`✓ ${table} - EXISTS`);
        } else {
          console.log(`✗ ${table} - NOT FOUND: ${error.message}`);
        }
      } catch (err) {
        console.log(`✗ ${table} - ERROR: ${err.message}`);
      }
    }

    console.log('\n============================================================');
    console.log('SETUP COMPLETE');
    console.log('============================================================\n');
    console.log('⚠️  Important: You must manually run the SQL in Supabase:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Open your project > SQL Editor');
    console.log('   3. Create a new query and paste the contents of setup-transit-tables.sql');
    console.log('   4. Click "Run"\n');

  } catch (err) {
    console.error('❌ Error setting up tables:', err.message);
    console.log('\n⚠️  To manually create tables, run the SQL from setup-transit-tables.sql in Supabase SQL Editor');
    process.exit(1);
  }
}

setupTables();
