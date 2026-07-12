require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const ws = require('ws');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: { transport: ws }
});

const SQL = `
-- Drop existing tables CASCADE to ensure clean reset
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.fuel_logs CASCADE;
DROP TABLE IF EXISTS public.maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.transit_ops_region CASCADE;
DROP TABLE IF EXISTS public.transit_ops_vehicle_type CASCADE;
DROP TABLE IF EXISTS public.transit_ops_maintenance_type CASCADE;
DROP TABLE IF EXISTS public.transit_ops_expense_category CASCADE;

-- 1. Configuration Tables
CREATE TABLE public.transit_ops_region (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.transit_ops_vehicle_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    default_capacity DOUBLE PRECISION CHECK (default_capacity > 0),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.transit_ops_maintenance_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.transit_ops_expense_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('Toll', 'Maintenance', 'Misc')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles Table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    vehicle_name VARCHAR(255),
    registration_number VARCHAR(255) NOT NULL UNIQUE,
    vehicle_model VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    capacity DOUBLE PRECISION NOT NULL CHECK (capacity > 0),
    vehicle_type_id UUID REFERENCES public.transit_ops_vehicle_type(id) ON DELETE SET NULL,
    region_id UUID REFERENCES public.transit_ops_region(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    odometer DOUBLE PRECISION DEFAULT 0.0 CHECK (odometer >= 0),
    acquisition_cost NUMERIC(15, 2) DEFAULT 0.0 CHECK (acquisition_cost >= 0),
    active_trip_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Drivers Table
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    license_number VARCHAR(255) NOT NULL UNIQUE,
    license_expiry_date DATE NOT NULL,
    safety_score DOUBLE PRECISION DEFAULT 100.0 CHECK (safety_score BETWEEN 0 AND 100),
    region_id UUID REFERENCES public.transit_ops_region(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
    active_trip_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Trips Table
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    cargo_weight DOUBLE PRECISION NOT NULL CHECK (cargo_weight > 0),
    planned_distance DOUBLE PRECISION NOT NULL CHECK (planned_distance > 0),
    start_odometer DOUBLE PRECISION CHECK (start_odometer >= 0),
    end_odometer DOUBLE PRECISION CHECK (end_odometer >= start_odometer),
    actual_distance DOUBLE PRECISION CHECK (actual_distance >= 0),
    fuel_consumed DOUBLE PRECISION CHECK (fuel_consumed >= 0),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    region_id UUID REFERENCES public.transit_ops_region(id) ON DELETE SET NULL,
    notes TEXT,
    state VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (state IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
    planned_date DATE,
    dispatch_datetime TIMESTAMP WITH TIME ZONE,
    completion_datetime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_trip_dates CHECK (dispatch_datetime IS NULL OR completion_datetime IS NULL OR dispatch_datetime <= completion_datetime)
);

-- Circular FK constraints
ALTER TABLE public.vehicles
    ADD CONSTRAINT fk_vehicle_active_trip
    FOREIGN KEY (active_trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;

ALTER TABLE public.drivers
    ADD CONSTRAINT fk_driver_active_trip
    FOREIGN KEY (active_trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;

-- 5. Maintenance Logs Table
CREATE TABLE public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(100) NOT NULL,
    maintenance_type_id UUID REFERENCES public.transit_ops_maintenance_type(id) ON DELETE SET NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Scheduled' CHECK (state IN ('Scheduled', 'Open', 'Closed')),
    scheduled_date DATE,
    open_date DATE,
    close_date DATE,
    cost NUMERIC(15, 2) DEFAULT 0.0 CHECK (cost >= 0),
    odometer DOUBLE PRECISION CHECK (odometer >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_maintenance_dates CHECK (
        (scheduled_date IS NULL OR open_date IS NULL OR scheduled_date <= open_date) AND
        (open_date IS NULL OR close_date IS NULL OR open_date <= close_date)
    )
);

-- 6. Fuel Logs Table
CREATE TABLE public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    litres DOUBLE PRECISION NOT NULL CHECK (litres > 0),
    cost NUMERIC(15, 2) NOT NULL CHECK (cost >= 0),
    odometer DOUBLE PRECISION CHECK (odometer >= 0),
    location TEXT,
    fuel_efficiency DOUBLE PRECISION CHECK (fuel_efficiency >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 7. Expenses Table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    expense_category VARCHAR(50) NOT NULL CHECK (expense_category IN ('Toll', 'Maintenance', 'Misc')),
    expense_category_id UUID REFERENCES public.transit_ops_expense_category(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 8. Documents Table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(255),
    notes TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(255),
    file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Filed',
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_region ON public.vehicles(region_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_region ON public.drivers(region_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_state ON public.trips(state) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance_logs(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON public.fuel_logs(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON public.expenses(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id) WHERE deleted_at IS NULL;

-- Triggers to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_maintenance_updated_at BEFORE UPDATE ON public.maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_fuel_updated_at BEFORE UPDATE ON public.fuel_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed lookup values
INSERT INTO public.transit_ops_region (name)
VALUES ('Maharashtra'), ('Karnataka'), ('Tamil Nadu'), ('Delhi'), ('All Over India')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.transit_ops_vehicle_type (name, default_capacity)
VALUES
  ('Cargo Van', 4500),
  ('Mini Truck', 2500),
  ('Light Commercial Vehicle (LCV)', 6000),
  ('Medium Truck', 12000),
  ('Heavy Truck', 25000),
  ('Trailer', 40000),
  ('Refrigerated Truck (Reefer)', 20000),
  ('Tanker', 30000)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.transit_ops_maintenance_type (name)
VALUES ('Routine Inspection'), ('Engine Repair'), ('Tire Rotation'), ('Oil & Fluids')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.transit_ops_expense_category (name, category_type)
VALUES ('Tolls', 'Toll'), ('Maintenance Bill', 'Maintenance'), ('Miscellaneous', 'Misc')
ON CONFLICT (name) DO NOTHING;
`;

const { Client } = require('pg');

async function setupTables() {
  console.log('🔧 Setting up TransitOps tables directly via PostgreSQL client...\n');

  const connectionString = process.env.DB_URL;
  if (!connectionString) {
    console.error('❌ Missing DB_URL in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL database');
    
    await client.query(SQL);
    console.log('⚡ SQL Schema and seeding executed successfully');

    // Verify tables were created
    console.log('\n✓ Checking if tables exist...\n');
    
    const tablesToCheck = [
      'vehicles',
      'drivers',
      'trips',
      'maintenance_logs',
      'fuel_logs',
      'expenses',
      'documents',
      'transit_ops_region',
      'transit_ops_vehicle_type',
      'transit_ops_maintenance_type',
      'transit_ops_expense_category',
    ];
    
    for (const table of tablesToCheck) {
      try {
        const res = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}');`);
        const exists = res.rows[0].exists;
        if (exists) {
          console.log(`✓ ${table} - EXISTS`);
        } else {
          console.log(`✗ ${table} - NOT FOUND`);
        }
      } catch (err) {
        console.log(`✗ ${table} - ERROR: ${err.message}`);
      }
    }

    console.log('\n============================================================');
    console.log('SETUP COMPLETE');
    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ Error setting up tables:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTables();
