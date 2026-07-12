require('dotenv').config();

const axios = require('axios');
const { supabaseAdmin } = require('./shared/supabase');

const baseURL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const api = axios.create({ baseURL: `${baseURL}/api`, validateStatus: () => true });
const created = {};

function assertResponse(response, label, expected = [200, 201]) {
  if (!expected.includes(response.status)) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(response.data)}`);
  }
  console.log(`✓ ${label}`);
  return response.data;
}

async function cleanup() {
  const rows = [
    ['documents', created.document],
    ['fuel_logs', created.fuel],
    ['expenses', created.expense],
    ['maintenance_logs', created.maintenance],
    ['trips', created.trip],
    ['drivers', created.driver],
    ['vehicles', created.vehicle],
  ];
  for (const [table, id] of rows) {
    if (id) await supabaseAdmin.from(table).delete().eq('id', id);
  }
}

async function run() {
  const email = process.env.DEV_ADMIN_EMAIL || 'admin@transitops.com';
  const password = process.env.DEV_ADMIN_PASSWORD || 'admin123';
  const login = assertResponse(await api.post('/auth/login', { email, password }), 'authentication');
  api.defaults.headers.common.Authorization = `Bearer ${login.session.access_token}`;

  const [regions, vehicleTypes, maintenanceTypes, expenseCategories] = await Promise.all([
    api.get('/config/regions'),
    api.get('/config/vehicle_types'),
    api.get('/config/maintenance_types'),
    api.get('/config/expense_categories'),
  ]);
  [regions, vehicleTypes, maintenanceTypes, expenseCategories].forEach((response, index) => assertResponse(response, `lookup ${index + 1}`));

  const suffix = Date.now();
  const vehicle = assertResponse(await api.post('/vehicles', {
    name: `E2E Vehicle ${suffix}`,
    vehicle_name: 'E2E Truck',
    registration_number: `MH12E2E${String(suffix).slice(-6)}`,
    vehicle_model: 'Test Model',
    manufacturer: 'TransitOps',
    capacity: 12000,
    odometer: 1200,
    acquisition_cost: 2500000,
    status: 'Available',
    region_id: regions.data[0].id,
    vehicle_type_id: vehicleTypes.data[0].id,
  }), 'vehicle create');
  created.vehicle = vehicle.id;

  const driver = assertResponse(await api.post('/drivers', {
    name: `E2E Driver ${suffix}`,
    phone: '+919876543210',
    email: `e2e-${suffix}@transitops.test`,
    license_number: `MH-E2E-${suffix}`,
    license_expiry_date: '2030-12-31',
    safety_score: 98,
    status: 'Available',
    region_id: regions.data[0].id,
  }), 'driver create');
  created.driver = driver.id;

  assertResponse(await api.put(`/drivers/${driver.id}`, { status: 'Off Duty' }), 'driver metric status update');
  assertResponse(await api.put(`/drivers/${driver.id}`, { status: 'Available' }), 'driver availability restore');
  assertResponse(await api.put(`/vehicles/${vehicle.id}`, { status: 'In Shop' }), 'vehicle shop status update');
  assertResponse(await api.put(`/vehicles/${vehicle.id}`, { status: 'Available' }), 'vehicle availability restore');

  const trip = assertResponse(await api.post('/trips', {
    name: `TRP-E2E-${suffix}`,
    source: regions.data[0].name,
    destination: 'Pune, Maharashtra',
    cargo_weight: 5000,
    planned_distance: 100,
    vehicle_id: vehicle.id,
    driver_id: driver.id,
    region_id: regions.data[0].id,
    planned_date: new Date().toISOString().slice(0, 10),
    notes: 'Automated end-to-end verification',
  }), 'trip draft create');
  created.trip = trip.id;
  const dispatched = assertResponse(await api.post(`/trips/${trip.id}/dispatch`), 'trip dispatch');
  if (Number(dispatched.start_odometer) !== 1200) throw new Error('Trip start odometer was not captured');
  assertResponse(await api.post(`/trips/${trip.id}/complete`, { end_odometer: 1300, fuel_consumed: 20 }), 'trip completion');

  const maintenance = assertResponse(await api.post('/maintenance', {
    vehicle_id: vehicle.id,
    maintenance_type_id: maintenanceTypes.data[0].id,
    scheduled_date: new Date().toISOString().slice(0, 10),
    cost: 3500,
    notes: 'E2E scheduled service',
  }), 'maintenance schedule');
  created.maintenance = maintenance.id;
  assertResponse(await api.post(`/maintenance/${maintenance.id}/open`), 'maintenance open');
  const vehicleInShop = assertResponse(await api.get(`/vehicles/${vehicle.id}`), 'maintenance vehicle status read');
  if (vehicleInShop.status !== 'In Shop') throw new Error('Maintenance did not set vehicle to In Shop');
  assertResponse(await api.post(`/maintenance/${maintenance.id}/close`, { cost: 3600, odometer: 1300 }), 'maintenance close');

  const fuel = assertResponse(await api.post('/fuel', {
    vehicle_id: vehicle.id,
    date: new Date().toISOString().slice(0, 10),
    litres: 25,
    cost: 2500,
    odometer: 1350,
    location: 'Pune',
  }), 'fuel transaction');
  created.fuel = fuel.id;

  const expense = assertResponse(await api.post('/expenses', {
    vehicle_id: vehicle.id,
    expense_category_id: expenseCategories.data[0].id,
    amount: 750,
    date: new Date().toISOString().slice(0, 10),
    notes: 'E2E expense',
  }), 'expense transaction');
  created.expense = expense.id;

  const form = new FormData();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=', 'base64');
  form.append('document_type', 'trip_sheet');
  form.append('document_number', `E2E-${suffix}`);
  form.append('notes', 'Automated upload test');
  form.append('file', new Blob([png], { type: 'image/png' }), 'e2e.png');
  const document = assertResponse(await api.post('/documents', form), 'document upload');
  created.document = document.id;
  assertResponse(await api.get(`/documents/${document.id}/download`, { responseType: 'arraybuffer' }), 'document download');
  assertResponse(await api.delete(`/documents/${document.id}`), 'document delete');

  assertResponse(await api.get('/dashboard/kpis'), 'dashboard KPIs');
  assertResponse(await api.get('/dashboard/vehicle-performance'), 'vehicle performance report');
  assertResponse(await api.get('/dashboard/reports/audit/export'), 'CSV report export');
  assertResponse(await api.get('/dashboard/reports/strategy/pdf', { responseType: 'arraybuffer' }), 'PDF report export');
  const settings = assertResponse(await api.get('/config/settings'), 'settings read');
  assertResponse(await api.put('/config/settings', {
    distance_unit: 'km',
    weight_unit: 'kg',
    currency: 'INR',
    notifications: settings.notifications,
  }), 'settings persistence');
}

(async () => {
  try {
    await run();
    console.log('All TransitOps end-to-end workflows passed.');
  } finally {
    await cleanup();
  }
})().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
