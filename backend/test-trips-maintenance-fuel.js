require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Color output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.yellow}▶${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

// Test data
let tokens = {};
let userIds = {};
let vehicleId = null;
let driverId = null;
let tripId = null;
let maintenanceId = null;
let fuelLogId = null;

const testUsers = {
  admin: { email: `admin-${Date.now()}@transitops.local`, password: 'AdminPass123!', full_name: 'Admin User', role: 'admin' },
  fleet_manager: { email: `mgr-${Date.now()}@transitops.local`, password: 'MgrPass123!', full_name: 'Fleet Mgr', role: 'fleet_manager' },
  driver: { email: `driver-${Date.now()}@transitops.local`, password: 'DrvPass123!', full_name: 'Test Driver', role: 'driver' },
  safety_officer: { email: `safety-${Date.now()}@transitops.local`, password: 'SafPass123!', full_name: 'Safety Officer', role: 'safety_officer' },
  financial_analyst: { email: `analyst-${Date.now()}@transitops.local`, password: 'AnaPass123!', full_name: 'Analyst', role: 'financial_analyst' },
  dispatcher: { email: `dispatcher-${Date.now()}@transitops.local`, password: 'DispPass123!', full_name: 'Dispatcher User', role: 'dispatcher' },
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// SETUP: Create users and get tokens
// ============================================================================

async function setupUsers() {
  log.section('SETUP: Creating Test Users');
  let created = 0;

  for (const [role, userData] of Object.entries(testUsers)) {
    log.test(`Creating ${role}...`);
    try {
      const response = await axios.post(`${BASE_URL}/auth/test-signup`, userData);
      tokens[role] = response.data.session.access_token;
      userIds[role] = response.data.user.id;
      log.success(`${role} created`);
      created++;
    } catch (err) {
      log.error(`${role} failed: ${err.response?.data?.error || err.message}`);
    }
    await sleep(200);
  }

  log.info(`Setup complete: ${created}/${Object.keys(testUsers).length} users created\n`);
  return created === Object.keys(testUsers).length;
}

// ============================================================================
// VEHICLES: Create test vehicle
// ============================================================================

async function createVehicle() {
  log.section('VEHICLES: Create Test Vehicle');
  log.test('Creating vehicle (Fleet Manager)...');

  try {
    const response = await axios.post(
      `${BASE_URL}/vehicles`,
      {
        name: `Test Vehicle ${Date.now()}`,
        registration_number: `REG${Date.now()}`,
        vehicle_model: 'Toyota Hilux',
        manufacturer: 'Toyota',
        capacity: 2000,
        status: 'Available',
      },
      { headers: { Authorization: `Bearer ${tokens.fleet_manager}` } }
    );

    vehicleId = response.data.id;
    log.success(`Vehicle created: ${vehicleId}`);
    return true;
  } catch (err) {
    log.error(`Vehicle creation failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// ============================================================================
// DRIVERS: Create test driver
// ============================================================================

async function createDriver() {
  log.section('DRIVERS: Create Test Driver');
  log.test('Creating driver (Safety Officer)...');

  try {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    // Use the actual driver user's email for the profile
    const driverEmail = testUsers.driver.email;

    const response = await axios.post(
      `${BASE_URL}/drivers`,
      {
        name: 'Test Driver',
        phone: '+1234567890',
        email: driverEmail, // Use the actual driver user's email
        license_number: `LIC${Date.now()}`,
        license_expiry_date: futureDate.toISOString().split('T')[0],
        status: 'Available',
      },
      { headers: { Authorization: `Bearer ${tokens.safety_officer}` } }
    );

    driverId = response.data.id;
    log.success(`Driver created: ${driverId}`);
    return true;
  } catch (err) {
    log.error(`Driver creation failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// ============================================================================
// TRIPS TESTS
// ============================================================================

async function testTripCreate() {
  log.section('TRIPS: Create Trip');
  log.test('Creating trip (Fleet Manager)...');

  if (!vehicleId || !driverId) {
    log.error('Vehicle or Driver not created');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/trips`,
      {
        name: 'Abuja to Lagos Trip',
        source: 'Abuja',
        destination: 'Lagos',
        cargo_weight: 1000,
        planned_distance: 520,
        vehicle_id: vehicleId,
        driver_id: driverId,
        planned_date: new Date().toISOString().split('T')[0],
      },
      { headers: { Authorization: `Bearer ${tokens.dispatcher}` } }
    );

    tripId = response.data.id;
    log.success(`Trip created: ${tripId}, State: ${response.data.state}`);
    return true;
  } catch (err) {
    log.error(`Trip creation failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function testTripList() {
  log.section('TRIPS: List Trips');

  const roleTests = [
    { role: 'dispatcher', label: 'Dispatcher (should see all)' },
    { role: 'driver', label: 'Driver (should see own)' },
    { role: 'financial_analyst', label: 'Financial Analyst (should see all)' },
  ];

  let passed = 0;

  for (const { role, label } of roleTests) {
    log.test(`List trips as ${label}...`);
    try {
      const response = await axios.get(`${BASE_URL}/trips`, {
        headers: { Authorization: `Bearer ${tokens[role]}` },
      });

      log.success(`${role}: Got ${response.data.count} trip(s)`);
      passed++;
    } catch (err) {
      log.error(`${role} failed: ${err.response?.data?.error || err.message}`);
    }
    await sleep(200);
  }

  return passed === roleTests.length;
}

async function testTripDispatch() {
  log.section('TRIPS: Dispatch Trip');
  log.test('Dispatching trip (Fleet Manager)...');

  if (!tripId) {
    log.error('Trip not created');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/trips/${tripId}/dispatch`,
      {},
      { headers: { Authorization: `Bearer ${tokens.dispatcher}` } }
    );

    log.success(`Trip dispatched: ${response.data.state}`);
    return true;
  } catch (err) {
    log.error(`Dispatch failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function testTripComplete() {
  log.section('TRIPS: Complete Trip');
  log.test('Completing trip (Driver)...');

  if (!tripId) {
    log.error('Trip not dispatched');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/trips/${tripId}/complete`,
      {
        end_odometer: 5520,
        fuel_consumed: 85.5,
      },
      { headers: { Authorization: `Bearer ${tokens.driver}` } }
    );

    log.success(`Trip completed: ${response.data.state}, Distance: ${response.data.actual_distance}km`);
    return true;
  } catch (err) {
    log.error(`Complete failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// ============================================================================
// MAINTENANCE TESTS
// ============================================================================

async function testMaintenanceCreate() {
  log.section('MAINTENANCE: Create Maintenance Log');
  log.test('Creating maintenance (Fleet Manager)...');

  if (!vehicleId) {
    log.error('Vehicle not created');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/maintenance`,
      {
        vehicle_id: vehicleId,
        maintenance_type: 'Oil Change',
        scheduled_date: new Date().toISOString().split('T')[0],
        notes: 'Regular maintenance',
      },
      { headers: { Authorization: `Bearer ${tokens.fleet_manager}` } }
    );

    maintenanceId = response.data.id;
    log.success(`Maintenance created: ${maintenanceId}, State: ${response.data.state}`);
    return true;
  } catch (err) {
    log.error(`Maintenance creation failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function testMaintenanceOpen() {
  log.section('MAINTENANCE: Open Maintenance');
  log.test('Opening maintenance (Fleet Manager)...');

  if (!maintenanceId) {
    log.error('Maintenance not created');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/maintenance/${maintenanceId}/open`,
      {},
      { headers: { Authorization: `Bearer ${tokens.fleet_manager}` } }
    );

    log.success(`Maintenance opened: ${response.data.state}`);
    return true;
  } catch (err) {
    log.error(`Open failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function testMaintenanceClose() {
  log.section('MAINTENANCE: Close Maintenance');
  log.test('Closing maintenance (Fleet Manager)...');

  if (!maintenanceId) {
    log.error('Maintenance not opened');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/maintenance/${maintenanceId}/close`,
      { cost: 15000, odometer: 5520 },
      { headers: { Authorization: `Bearer ${tokens.fleet_manager}` } }
    );

    log.success(`Maintenance closed: ${response.data.state}`);
    return true;
  } catch (err) {
    log.error(`Close failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// ============================================================================
// FUEL TESTS
// ============================================================================

async function testFuelCreate() {
  log.section('FUEL: Create Fuel Log');
  log.test('Creating fuel log (Driver)...');

  if (!vehicleId) {
    log.error('Vehicle not created');
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/fuel`,
      {
        vehicle_id: vehicleId,
        date: new Date().toISOString().split('T')[0],
        litres: 85.5,
        cost: 42750,
        odometer: 5520,
      },
      { headers: { Authorization: `Bearer ${tokens.driver}` } }
    );

    fuelLogId = response.data.id;
    log.success(`Fuel log created: ${fuelLogId}, Efficiency: ${response.data.fuel_efficiency?.toFixed(2)}km/L`);
    return true;
  } catch (err) {
    log.error(`Fuel log creation failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function testFuelList() {
  log.section('FUEL: List Fuel Logs');
  log.test('Listing fuel logs (Financial Analyst)...');

  try {
    const response = await axios.get(`${BASE_URL}/fuel?vehicle_id=${vehicleId}`, {
      headers: { Authorization: `Bearer ${tokens.financial_analyst}` },
    });

    log.success(`Got ${response.data.count} fuel log(s)`);
    if (response.data.totals) {
      log.info(`  Total Litres: ${response.data.totals.total_litres.toFixed(2)}`);
      log.info(`  Total Cost: ₹${response.data.totals.total_cost.toFixed(2)}`);
      log.info(`  Avg Efficiency: ${response.data.totals.avg_efficiency.toFixed(2)}km/L`);
    }
    return true;
  } catch (err) {
    log.error(`List failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function testFuelEfficiency() {
  log.section('FUEL: Get Vehicle Efficiency');
  log.test('Getting vehicle fuel efficiency...');

  if (!vehicleId) {
    log.error('Vehicle not created');
    return false;
  }

  try {
    const response = await axios.get(`${BASE_URL}/fuel/vehicle/${vehicleId}/efficiency`, {
      headers: { Authorization: `Bearer ${tokens.financial_analyst}` },
    });

    log.success(`Vehicle efficiency report:`);
    log.info(`  Average: ${response.data.avg_efficiency.toFixed(2)}km/L`);
    log.info(`  Best: ${response.data.best_efficiency.toFixed(2)}km/L`);
    log.info(`  Worst: ${response.data.worst_efficiency.toFixed(2)}km/L`);
    log.info(`  Total Logs: ${response.data.total_logs}`);
    return true;
  } catch (err) {
    log.error(`Get efficiency failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// ============================================================================
// RBAC TESTS
// ============================================================================

async function testRBACRestrictions() {
  log.section('RBAC: Verify Access Control');

  const tests = [
    {
      label: 'Driver cannot create trip',
      method: 'post',
      url: `${BASE_URL}/trips`,
      role: 'driver',
      data: { name: 'Test', source: 'A', destination: 'B', cargo_weight: 100, planned_distance: 100, vehicle_id: vehicleId, driver_id: driverId },
      shouldFail: true,
    },
    {
      label: 'Safety Officer cannot dispatch trip',
      method: 'post',
      url: `${BASE_URL}/trips/${tripId}/dispatch`,
      role: 'safety_officer',
      shouldFail: true,
    },
    {
      label: 'Financial Analyst cannot create maintenance',
      method: 'post',
      url: `${BASE_URL}/maintenance`,
      role: 'financial_analyst',
      data: { vehicle_id: vehicleId, maintenance_type: 'Test', scheduled_date: '2026-07-15' },
      shouldFail: true,
    },
  ];

  let passed = 0;

  for (const test of tests) {
    log.test(test.label);
    try {
      const config = { headers: { Authorization: `Bearer ${tokens[test.role]}` } };
      let response;

      if (test.method === 'post') {
        response = await axios.post(test.url, test.data || {}, config);
      } else {
        response = await axios.get(test.url, config);
      }

      if (test.shouldFail) {
        log.error(`Should have been denied but succeeded!`);
      } else {
        log.success('Access allowed as expected');
        passed++;
      }
    } catch (err) {
      if (test.shouldFail && (err.response?.status === 403 || err.response?.status === 401)) {
        log.success('Correctly denied');
        passed++;
      } else {
        log.error(`Unexpected error: ${err.response?.data?.error || err.message}`);
      }
    }
    await sleep(200);
  }

  return passed === tests.length;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.cyan + 'TRANSITOPS: TRIPS, MAINTENANCE & FUEL TEST SUITE' + colors.reset);
  console.log(colors.cyan + '='.repeat(70) + colors.reset);

  const results = [];

  // Setup
  results.push(await setupUsers());
  await sleep(500);

  // Create resources
  results.push(await createVehicle());
  await sleep(500);

  results.push(await createDriver());
  await sleep(500);

  // Trips Tests
  results.push(await testTripCreate());
  await sleep(500);

  results.push(await testTripList());
  await sleep(500);

  results.push(await testTripDispatch());
  await sleep(500);

  results.push(await testTripComplete());
  await sleep(500);

  // Maintenance Tests
  results.push(await testMaintenanceCreate());
  await sleep(500);

  results.push(await testMaintenanceOpen());
  await sleep(500);

  results.push(await testMaintenanceClose());
  await sleep(500);

  // Fuel Tests
  results.push(await testFuelCreate());
  await sleep(500);

  results.push(await testFuelList());
  await sleep(500);

  results.push(await testFuelEfficiency());
  await sleep(500);

  // RBAC Tests
  results.push(await testRBACRestrictions());

  // Summary
  log.section('TEST SUMMARY');
  const passed = results.filter((r) => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`Passed: ${passed}/${total} (${percentage}%)\n`);

  if (passed === total) {
    log.success('ALL TESTS PASSED! ✨ System is ready.');
  } else {
    log.error(`${total - passed} test(s) failed.`);
  }

  log.info('='.repeat(70));
}

async function checkServer() {
  try {
    await axios.get(BASE_URL.replace('/api', ''));
    return true;
  } catch (err) {
    log.error(`Server not running at ${BASE_URL}`);
    log.info('Start with: npm start');
    return false;
  }
}

(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
  process.exit(0);
})();
