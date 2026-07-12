require('dotenv').config();

const axios = require('axios');
const { supabaseAdmin } = require('./shared/supabase');

const baseURL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const api = axios.create({ baseURL: `${baseURL}/api`, validateStatus: () => true });
const suffix = Date.now();
const password = 'TransitOpsTest123!';
const roles = ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'dispatcher'];
const accounts = {};
const created = { users: [], vehicles: [], drivers: [], trips: [], maintenance: [], fuel: [], expenses: [] };
let assertions = 0;

function expectStatus(response, expected, label) {
  const statuses = Array.isArray(expected) ? expected : [expected];
  if (!statuses.includes(response.status)) {
    throw new Error(`${label}: expected ${statuses.join('/')}, received ${response.status} ${JSON.stringify(response.data)}`);
  }
  assertions += 1;
  console.log(`✓ ${label}`);
  return response.data;
}

function headers(role) {
  return { headers: { Authorization: `Bearer ${accounts[role].token}` } };
}

async function cleanup() {
  const tableRows = [
    ['fuel_logs', created.fuel], ['expenses', created.expenses], ['maintenance_logs', created.maintenance],
    ['trips', created.trips], ['drivers', created.drivers], ['vehicles', created.vehicles],
  ];
  for (const [table, ids] of tableRows) {
    if (ids.length) await supabaseAdmin.from(table).delete().in('id', ids);
  }
  for (const user of created.users) {
    try { await supabaseAdmin.auth.admin.signOut(user.token); } catch {}
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}

async function run() {
  for (const role of roles) {
    const email = `release-${role.replaceAll('_', '-')}-${suffix}@transitops.dev`;
    const response = await api.post('/auth/test-signup', { email, password, full_name: `Release ${role}`, role });
    const data = expectStatus(response, 201, `${role} account creation`);
    accounts[role] = { email, token: data.session.access_token, id: data.user.id };
    created.users.push({ id: data.user.id, token: data.session.access_token });
    const me = expectStatus(await api.get('/auth/me', headers(role)), 200, `${role} session and profile`);
    if (!me.roles.includes(role)) throw new Error(`${role} was not assigned correctly`);
    assertions += 1;
  }

  const [regionsResponse, typesResponse, maintenanceTypesResponse, categoriesResponse] = await Promise.all([
    api.get('/config/regions', headers('admin')), api.get('/config/vehicle_types', headers('admin')),
    api.get('/config/maintenance_types', headers('admin')), api.get('/config/expense_categories', headers('admin')),
  ]);
  const regions = expectStatus(regionsResponse, 200, 'region lookup');
  const types = expectStatus(typesResponse, 200, 'vehicle type lookup');
  const maintenanceTypes = expectStatus(maintenanceTypesResponse, 200, 'maintenance type lookup');
  const categories = expectStatus(categoriesResponse, 200, 'expense category lookup');
  if (regions.length !== 36) throw new Error(`Expected 36 India regions, found ${regions.length}`);
  assertions += 1;

  const vehicle = expectStatus(await api.post('/vehicles', {
    name: `Release Vehicle ${suffix}`, vehicle_name: 'Tata Ultra Test', registration_number: `MH12TT${String(suffix).slice(-6)}`,
    vehicle_model: 'Tata Ultra', manufacturer: 'Tata Motors', capacity: 12000, odometer: 50000,
    acquisition_cost: 2800000, status: 'Available', region_id: regions.find((r) => r.code === 'MH').id,
    vehicle_type_id: types[0].id,
  }, headers('fleet_manager')), 201, 'fleet manager creates vehicle');
  created.vehicles.push(vehicle.id);

  expectStatus(await api.post('/vehicles', { name: 'Denied' }, headers('driver')), 403, 'driver cannot create vehicle');
  expectStatus(await api.post('/vehicles', { name: 'Denied' }, headers('safety_officer')), 403, 'safety officer cannot create vehicle');
  expectStatus(await api.post('/vehicles', { name: 'Denied' }, headers('dispatcher')), 403, 'dispatcher cannot create vehicle');

  const driver = expectStatus(await api.post('/drivers', {
    name: 'Release Test Driver', phone: '+919900000001', email: accounts.driver.email,
    license_number: `MH14REL${String(suffix).slice(-7)}`, license_expiry_date: '2031-12-31', safety_score: 99,
    status: 'Available', region_id: regions.find((r) => r.code === 'MH').id,
  }, headers('safety_officer')), 201, 'safety officer creates driver');
  created.drivers.push(driver.id);
  expectStatus(await api.post('/drivers', { name: 'Denied' }, headers('fleet_manager')), 403, 'fleet manager cannot create driver');
  expectStatus(await api.get('/drivers', headers('financial_analyst')), 403, 'financial analyst cannot read drivers');

  const maintenance = expectStatus(await api.post('/maintenance', {
    vehicle_id: vehicle.id, maintenance_type_id: maintenanceTypes[0].id, scheduled_date: '2026-07-20', cost: 4500,
    notes: 'Release role test',
  }, headers('fleet_manager')), 201, 'fleet manager schedules maintenance');
  created.maintenance.push(maintenance.id);
  expectStatus(await api.post('/maintenance', { vehicle_id: vehicle.id }, headers('safety_officer')), 403, 'safety officer cannot schedule maintenance');

  const trip = expectStatus(await api.post('/trips', {
    name: `TRP-ROLE-${suffix}`, source: 'Mumbai, Maharashtra', destination: 'Nashik, Maharashtra', cargo_weight: 4000,
    planned_distance: 170, vehicle_id: vehicle.id, driver_id: driver.id, planned_date: '2026-07-14',
    region_id: regions.find((r) => r.code === 'MH').id,
  }, headers('dispatcher')), 201, 'dispatcher creates trip');
  created.trips.push(trip.id);
  expectStatus(await api.post(`/trips/${trip.id}/dispatch`, {}, headers('dispatcher')), 200, 'dispatcher dispatches trip');
  expectStatus(await api.post('/trips', {}, headers('financial_analyst')), 403, 'financial analyst cannot create trip');
  expectStatus(await api.get('/trips', headers('driver')), 200, 'driver reads assigned trips');
  expectStatus(await api.post(`/trips/${trip.id}/complete`, { end_odometer: 50170, fuel_consumed: 34 }, headers('driver')), 200, 'driver completes assigned trip');

  const driverFuel = expectStatus(await api.post('/fuel', {
    vehicle_id: vehicle.id, date: '2026-07-14', litres: 40, cost: 3640, odometer: 50170, location: 'Nashik HPCL',
  }, headers('driver')), 201, 'driver records fuel');
  created.fuel.push(driverFuel.id);
  const driverExpense = expectStatus(await api.post('/expenses', {
    vehicle_id: vehicle.id, trip_id: trip.id, expense_category_id: categories.find((c) => c.category_type === 'Toll').id,
    amount: 480, date: '2026-07-14', notes: 'Mumbai-Nashik toll',
  }, headers('driver')), 201, 'driver records trip expense');
  created.expenses.push(driverExpense.id);

  const analystFuel = expectStatus(await api.post('/fuel', {
    vehicle_id: vehicle.id, date: '2026-07-15', litres: 20, cost: 1820, odometer: 50200, location: 'Mumbai BPCL',
  }, headers('financial_analyst')), 201, 'financial analyst records fuel');
  created.fuel.push(analystFuel.id);
  expectStatus(await api.delete(`/fuel/${analystFuel.id}`, headers('financial_analyst')), 200, 'financial analyst deletes fuel');

  expectStatus(await api.get('/dashboard/reports/maintenance/export', headers('safety_officer')), 200, 'safety officer exports report');
  expectStatus(await api.get('/dashboard/reports/audit/export', headers('fleet_manager')), 200, 'fleet manager exports report');
  expectStatus(await api.get('/dashboard/reports/audit/export', headers('driver')), 403, 'driver cannot export management report');

  const form = new FormData();
  expectStatus(await api.post('/documents', form, headers('dispatcher')), 403, 'dispatcher cannot upload management document');
  expectStatus(await api.post('/documents', form, headers('admin')), 400, 'admin reaches document validation');
  expectStatus(await api.put('/config/settings', { distance_unit: 'km' }, headers('fleet_manager')), 403, 'fleet manager cannot change platform settings');

  console.log(`Role-based end-to-end suite passed ${assertions}/${assertions} assertions.`);
}

(async () => {
  try { await run(); } finally { await cleanup(); }
})().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
