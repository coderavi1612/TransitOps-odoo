-- Database Setup for TransitOps (PostgreSQL)

-- 1. Drop existing objects if they exist
DROP TABLE IF EXISTS transit_ops_expense CASCADE;
DROP TABLE IF EXISTS transit_ops_fuel_log CASCADE;
DROP TABLE IF EXISTS transit_ops_maintenance_log CASCADE;
DROP TABLE IF EXISTS transit_ops_vehicle_document CASCADE;
DROP TABLE IF EXISTS transit_ops_trip CASCADE;
DROP TABLE IF EXISTS transit_ops_driver CASCADE;
DROP TABLE IF EXISTS transit_ops_vehicle CASCADE;
DROP TABLE IF EXISTS ir_attachment CASCADE;
DROP TABLE IF EXISTS res_groups_users_rel CASCADE;
DROP TABLE IF EXISTS res_users CASCADE;
DROP TABLE IF EXISTS res_groups CASCADE;
DROP TABLE IF EXISTS transit_ops_expense_category CASCADE;
DROP TABLE IF EXISTS transit_ops_maintenance_type CASCADE;
DROP TABLE IF EXISTS transit_ops_vehicle_type CASCADE;
DROP TABLE IF EXISTS transit_ops_region CASCADE;

DROP FUNCTION IF EXISTS transit_ops_trip_validation_and_lifecycle_fn() CASCADE;
DROP FUNCTION IF EXISTS transit_ops_maintenance_lifecycle_fn() CASCADE;
DROP FUNCTION IF EXISTS transit_ops_fuel_efficiency_fn() CASCADE;

-- 2. Configuration Models
CREATE TABLE transit_ops_region (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transit_ops_vehicle_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    default_capacity DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transit_ops_maintenance_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transit_ops_expense_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category_type VARCHAR(100) NOT NULL CHECK (category_type IN ('Toll', 'Maintenance', 'Misc')),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Core RBAC / Users Models
CREATE TABLE res_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE res_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    login VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    email VARCHAR(255),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE res_groups_users_rel (
    user_id INTEGER NOT NULL REFERENCES res_users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES res_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- 4. Odoo Attachments Simulation
CREATE TABLE ir_attachment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    mimetype VARCHAR(100),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Vehicles Model
CREATE TABLE transit_ops_vehicle (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    vehicle_name VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    registration_number VARCHAR(255) NOT NULL UNIQUE,
    vehicle_type_id INTEGER NOT NULL REFERENCES transit_ops_vehicle_type(id),
    region_id INTEGER REFERENCES transit_ops_region(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
    capacity DOUBLE PRECISION NOT NULL,
    odometer DOUBLE PRECISION DEFAULT 0.0,
    acquisition_cost NUMERIC(15, 2) DEFAULT 0.0,
    active_trip_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vehicle Documents
CREATE TABLE transit_ops_vehicle_document (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES transit_ops_vehicle(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('Registration', 'Insurance', 'Permit', 'Inspection', 'Other')),
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    attachment_id INTEGER NOT NULL REFERENCES ir_attachment(id),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Drivers Model
CREATE TABLE transit_ops_driver (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES res_users(id) ON DELETE SET NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    license_number VARCHAR(255) NOT NULL UNIQUE,
    license_expiry_date DATE NOT NULL,
    safety_score DOUBLE PRECISION DEFAULT 100.0,
    status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
    region_id INTEGER REFERENCES transit_ops_region(id) ON DELETE SET NULL,
    active_trip_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Trips Model
CREATE TABLE transit_ops_trip (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    cargo_weight DOUBLE PRECISION NOT NULL,
    planned_distance DOUBLE PRECISION NOT NULL,
    start_odometer DOUBLE PRECISION,
    end_odometer DOUBLE PRECISION,
    actual_distance DOUBLE PRECISION,
    fuel_consumed DOUBLE PRECISION,
    vehicle_id INTEGER NOT NULL REFERENCES transit_ops_vehicle(id),
    driver_id INTEGER NOT NULL REFERENCES transit_ops_driver(id),
    region_id INTEGER REFERENCES transit_ops_region(id) ON DELETE SET NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (state IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
    planned_date DATE,
    dispatch_datetime TIMESTAMP WITH TIME ZONE,
    completion_datetime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Add circular Foreign Keys
ALTER TABLE transit_ops_vehicle
    ADD CONSTRAINT fk_vehicle_active_trip
    FOREIGN KEY (active_trip_id) REFERENCES transit_ops_trip(id) ON DELETE SET NULL;

ALTER TABLE transit_ops_driver
    ADD CONSTRAINT fk_driver_active_trip
    FOREIGN KEY (active_trip_id) REFERENCES transit_ops_trip(id) ON DELETE SET NULL;

-- 10. Maintenance Logs
CREATE TABLE transit_ops_maintenance_log (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES transit_ops_vehicle(id) ON DELETE CASCADE,
    maintenance_type_id INTEGER NOT NULL REFERENCES transit_ops_maintenance_type(id),
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

-- 11. Fuel Logs
CREATE TABLE transit_ops_fuel_log (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES transit_ops_vehicle(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    litres DOUBLE PRECISION NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    odometer DOUBLE PRECISION,
    fuel_efficiency DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Expenses Table
CREATE TABLE transit_ops_expense (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES transit_ops_vehicle(id) ON DELETE CASCADE,
    trip_id INTEGER REFERENCES transit_ops_trip(id) ON DELETE SET NULL,
    expense_category_id INTEGER NOT NULL REFERENCES transit_ops_expense_category(id),
    amount NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================================
-- TRIGGERS & FUNCTIONS FOR BUSINESS LOGIC ENFORCEMENT
-- =========================================================================

-- A. Trip Validation and Status Updates Trigger Function
CREATE OR REPLACE FUNCTION transit_ops_trip_validation_and_lifecycle_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_capacity DOUBLE PRECISION;
    v_status VARCHAR(50);
    d_status VARCHAR(50);
    d_expiry DATE;
BEGIN
    IF NEW.state = 'Dispatched' AND (OLD.state IS NULL OR OLD.state != 'Dispatched') THEN
        SELECT capacity, status INTO v_capacity, v_status FROM transit_ops_vehicle WHERE id = NEW.vehicle_id;
        SELECT status, license_expiry_date INTO d_status, d_expiry FROM transit_ops_driver WHERE id = NEW.driver_id;

        IF NEW.cargo_weight > v_capacity THEN
            RAISE EXCEPTION 'Cargo weight (%) exceeds vehicle capacity (%)', NEW.cargo_weight, v_capacity;
        END IF;

        IF v_status = 'Retired' THEN
            RAISE EXCEPTION 'Vehicle is Retired and cannot be dispatched';
        ELSIF v_status = 'In Shop' THEN
            RAISE EXCEPTION 'Vehicle is In Shop (undergoing maintenance) and cannot be dispatched';
        END IF;

        IF v_status = 'On Trip' AND (OLD.vehicle_id IS NULL OR OLD.vehicle_id != NEW.vehicle_id OR OLD.state != 'Dispatched') THEN
            RAISE EXCEPTION 'Vehicle is already assigned to an active trip';
        END IF;

        IF d_status = 'Suspended' THEN
            RAISE EXCEPTION 'Driver is Suspended and cannot be dispatched';
        ELSIF d_status = 'Off Duty' THEN
            RAISE EXCEPTION 'Driver is Off Duty and cannot be dispatched';
        END IF;

        IF d_status = 'On Trip' AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id OR OLD.state != 'Dispatched') THEN
            RAISE EXCEPTION 'Driver is already assigned to an active trip';
        END IF;

        IF d_expiry < CURRENT_DATE THEN
            RAISE EXCEPTION 'Driver license has expired on % and cannot be dispatched', d_expiry;
        END IF;

        UPDATE transit_ops_vehicle SET status = 'On Trip', active_trip_id = NEW.id WHERE id = NEW.vehicle_id;
        UPDATE transit_ops_driver SET status = 'On Trip', active_trip_id = NEW.id WHERE id = NEW.driver_id;
        NEW.dispatch_datetime := COALESCE(NEW.dispatch_datetime, CURRENT_TIMESTAMP);
    END IF;

    IF NEW.state = 'Completed' AND (OLD.state IS NULL OR OLD.state != 'Completed') THEN
        IF NEW.end_odometer IS NULL THEN
            RAISE EXCEPTION 'Completing a trip requires end odometer';
        END IF;

        IF NEW.start_odometer IS NOT NULL AND NEW.end_odometer < NEW.start_odometer THEN
            RAISE EXCEPTION 'End odometer (%) cannot be less than start odometer (%)', NEW.end_odometer, NEW.start_odometer;
        END IF;

        IF NEW.start_odometer IS NOT NULL THEN
            NEW.actual_distance := NEW.end_odometer - NEW.start_odometer;
            UPDATE transit_ops_vehicle SET odometer = NEW.end_odometer WHERE id = NEW.vehicle_id;
        END IF;

        UPDATE transit_ops_vehicle SET status = 'Available', active_trip_id = NULL WHERE id = NEW.vehicle_id;
        UPDATE transit_ops_driver SET status = 'Available', active_trip_id = NULL WHERE id = NEW.driver_id;
        NEW.completion_datetime := COALESCE(NEW.completion_datetime, CURRENT_TIMESTAMP);
    END IF;

    IF NEW.state = 'Cancelled' AND (OLD.state IS NULL OR OLD.state != 'Cancelled') THEN
        UPDATE transit_ops_vehicle SET status = 'Available', active_trip_id = NULL WHERE id = NEW.vehicle_id;
        UPDATE transit_ops_driver SET status = 'Available', active_trip_id = NULL WHERE id = NEW.driver_id;
    END IF;

    IF NEW.state = 'Draft' AND OLD.state = 'Dispatched' THEN
        UPDATE transit_ops_vehicle SET status = 'Available', active_trip_id = NULL WHERE id = OLD.vehicle_id;
        UPDATE transit_ops_driver SET status = 'Available', active_trip_id = NULL WHERE id = OLD.driver_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transit_ops_trip_validation_and_lifecycle
BEFORE INSERT OR UPDATE OF state, vehicle_id, driver_id, start_odometer, end_odometer, cargo_weight
ON transit_ops_trip
FOR EACH ROW
EXECUTE FUNCTION transit_ops_trip_validation_and_lifecycle_fn();


-- B. Maintenance Status Updates Trigger Function
CREATE OR REPLACE FUNCTION transit_ops_maintenance_lifecycle_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    IF NEW.state = 'Open' AND (OLD.state IS NULL OR OLD.state != 'Open') THEN
        SELECT status INTO v_status FROM transit_ops_vehicle WHERE id = NEW.vehicle_id;
        IF v_status = 'Retired' THEN
            RAISE EXCEPTION 'Cannot open maintenance for a retired vehicle';
        END IF;

        UPDATE transit_ops_vehicle SET status = 'In Shop' WHERE id = NEW.vehicle_id;
        NEW.open_date := COALESCE(NEW.open_date, CURRENT_DATE);
    END IF;

    IF NEW.state = 'Closed' AND (OLD.state IS NULL OR OLD.state != 'Closed') THEN
        UPDATE transit_ops_vehicle
        SET status = CASE WHEN status = 'Retired' THEN 'Retired' ELSE 'Available' END
        WHERE id = NEW.vehicle_id;
        NEW.close_date := COALESCE(NEW.close_date, CURRENT_DATE);

        IF NEW.odometer IS NOT NULL THEN
            UPDATE transit_ops_vehicle SET odometer = NEW.odometer WHERE id = NEW.vehicle_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transit_ops_maintenance_lifecycle
BEFORE INSERT OR UPDATE OF state
ON transit_ops_maintenance_log
FOR EACH ROW
EXECUTE FUNCTION transit_ops_maintenance_lifecycle_fn();


-- C. Fuel efficiency calculation trigger function
CREATE OR REPLACE FUNCTION transit_ops_fuel_efficiency_fn()
RETURNS TRIGGER AS $$
DECLARE
    prev_odometer DOUBLE PRECISION;
BEGIN
    IF NEW.odometer IS NOT NULL AND NEW.litres > 0 THEN
        SELECT odometer INTO prev_odometer
        FROM transit_ops_fuel_log
        WHERE vehicle_id = NEW.vehicle_id
          AND date <= NEW.date
          AND id != COALESCE(NEW.id, -1)
        ORDER BY date DESC, id DESC
        LIMIT 1;

        IF prev_odometer IS NOT NULL AND NEW.odometer > prev_odometer THEN
            NEW.fuel_efficiency := (NEW.odometer - prev_odometer) / NEW.litres;
        END IF;

        UPDATE transit_ops_vehicle SET odometer = NEW.odometer WHERE id = NEW.vehicle_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transit_ops_fuel_efficiency
BEFORE INSERT OR UPDATE OF odometer, litres, date
ON transit_ops_fuel_log
FOR EACH ROW
EXECUTE FUNCTION transit_ops_fuel_efficiency_fn();


-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

INSERT INTO transit_ops_region (name, active) VALUES
('North', true), ('South', true), ('East', true), ('West', true)
ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active;

INSERT INTO transit_ops_vehicle_type (name, default_capacity, active) VALUES
('Van', 1500.00, true), ('Light Truck', 3500.00, true), ('Heavy Truck', 15000.00, true)
ON CONFLICT (name) DO UPDATE SET default_capacity = EXCLUDED.default_capacity, active = EXCLUDED.active;

INSERT INTO transit_ops_maintenance_type (name, active) VALUES
('Routine Inspection', true), ('Engine Repair', true), ('Tire Replacement', true), ('Oil Change', true)
ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active;

INSERT INTO transit_ops_expense_category (name, category_type, active) VALUES
('Toll', 'Toll', true), ('Maintenance', 'Maintenance', true), ('Misc', 'Misc', true)
ON CONFLICT (name) DO UPDATE SET category_type = EXCLUDED.category_type, active = EXCLUDED.active;

INSERT INTO res_groups (name, active) VALUES
('System Administrator', true), ('Fleet Manager', true), ('Driver', true), ('Safety Officer', true), ('Financial Analyst', true)
ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active;

INSERT INTO res_users (name, login, password_hash, email, active) VALUES
('Administrator', 'admin', '$2b$12$Zp40o4sTux6WnNn2w7x56uhj9YJg9V9aZq6f6d6r.pS6R1x5f5C1e', 'admin@transitops.com', true)
ON CONFLICT (login) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, active = EXCLUDED.active;

INSERT INTO res_groups_users_rel (user_id, group_id)
SELECT u.id, g.id
FROM res_users u, res_groups g
WHERE u.login = 'admin' AND g.name = 'System Administrator'
ON CONFLICT DO NOTHING;


-- =========================================================================
-- SUPABASE AUTH INTEGRATION
-- =========================================================================

-- Profile linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  res_user_id INTEGER REFERENCES res_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE public.app_role AS ENUM (
  'fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'admin'
);

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- NO ROW LEVEL SECURITY — RBAC handled by backend middleware
-- =========================================================================


-- =========================================================================
-- DASHBOARD VIEWS
-- =========================================================================

CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*)::INT FROM transit_ops_vehicle WHERE status != 'Retired') AS active_vehicles,
  (SELECT COUNT(*)::INT FROM transit_ops_vehicle WHERE status = 'Available') AS available_vehicles,
  (SELECT COUNT(*)::INT FROM transit_ops_vehicle WHERE status = 'In Shop') AS vehicles_in_maintenance,
  (SELECT COUNT(*)::INT FROM transit_ops_vehicle WHERE status = 'Retired') AS retired_vehicles,
  (SELECT COUNT(*)::INT FROM transit_ops_driver WHERE status = 'On Trip') AS drivers_on_duty,
  (SELECT COUNT(*)::INT FROM transit_ops_driver WHERE status = 'Available') AS drivers_available,
  (SELECT COUNT(*)::INT FROM transit_ops_trip WHERE state = 'Dispatched') AS active_trips,
  (SELECT COUNT(*)::INT FROM transit_ops_trip WHERE state = 'Draft') AS pending_trips,
  (SELECT COUNT(*)::INT FROM transit_ops_trip WHERE state = 'Completed') AS completed_trips;
