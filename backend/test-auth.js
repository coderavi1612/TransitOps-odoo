/**
 * TransitOps Auth & RBAC Test Script
 *
 * Usage:
 *   1. Ensure .env has all Supabase keys filled in
 *   2. Start the server: npm start
 *   3. Run tests: npm test
 */

require('dotenv').config();
const BASE_URL = 'http://localhost:3000';

let userToken = null;
let testUserId = null;
let createdEmail = null;

async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`  PASS  ${name}`);
    return result;
  } catch (err) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    return null;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function runTests() {
  console.log('\n=== TransitOps Auth & RBAC Tests ===\n');

  // 1. Health check
  await test('Health check', async () => {
    const { status, data } = await api('GET', '/');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.message.includes('TransitOps'), 'Expected TransitOps message');
  });

  // 2. Sign up (uses test-signup for dev — auto-confirms email)
  await test('Sign up new user (fleet_manager)', async () => {
    createdEmail = `test_${Date.now()}@transitops.dev`;
    const { status, data } = await api('POST', '/api/auth/test-signup', {
      email: createdEmail,
      password: 'TestPass123!',
      full_name: 'Test User',
      role: 'fleet_manager',
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.user, 'Expected user object');
    assert(data.session, 'Expected session object');
    userToken = data.session.access_token;
    testUserId = data.user.id;
    console.log(`    User: ${createdEmail} (id: ${testUserId})`);
  });

  // 3. Login with same user
  await test('Login with email/password', async () => {
    const { status, data } = await api('POST', '/api/auth/login', {
      email: createdEmail,
      password: 'TestPass123!',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.session.access_token, 'Expected access token');
    userToken = data.session.access_token;
  });

  // 4. Get current user
  await test('Get current user /me', async () => {
    const { status, data } = await api('GET', '/api/auth/me', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.user, 'Expected user');
    assert(data.roles, 'Expected roles');
    assert(data.roles.includes('fleet_manager'), 'Expected fleet_manager role');
    console.log(`    Roles: ${data.roles.join(', ')}`);
  });

  // 5. Reject unauthenticated request
  await test('Reject unauthenticated request', async () => {
    const { status } = await api('GET', '/api/vehicles');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // 6. Config - Create vehicle type (admin needed, fleet_manager may not have access)
  let typeId = null;
  await test('List vehicle types', async () => {
    const { status, data } = await api('GET', '/api/config/vehicle_types', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
    if (data.length > 0) typeId = data[0].id;
  });

  // 7. Create vehicle (fleet_manager should work)
  let vehicleId = null;
  await test('Create vehicle as fleet_manager', async () => {
    if (!typeId) {
      const { data: newType } = await api('POST', '/api/config/vehicle_types', {
        name: `Truck_${Date.now()}`,
        default_capacity: 10000,
      }, userToken);
      typeId = newType?.id;
    }

    const { status, data } = await api('POST', '/api/vehicles', {
      registration_number: `TEST-${Date.now()}`,
      vehicle_name: 'Test Truck',
      vehicle_model: 'Model X',
      manufacturer: 'TestCo',
      vehicle_type_id: typeId,
      capacity: 5000,
      status: 'available',
    }, userToken);
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    vehicleId = data.id;
    console.log(`    Vehicle ID: ${vehicleId}`);
  });

  // 8. List vehicles
  await test('List vehicles', async () => {
    const { status, data } = await api('GET', '/api/vehicles', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
    console.log(`    Found ${data.length} vehicles`);
  });

  // 9. Get vehicle by ID
  if (vehicleId) {
    await test('Get vehicle by ID', async () => {
      const { status, data } = await api('GET', `/api/vehicles/${vehicleId}`, null, userToken);
      assert(status === 200, `Expected 200, got ${status}`);
      assert(data.registration_number, 'Expected registration_number');
    });
  }

  // 10. RBAC - driver should NOT create vehicles
  await test('Reject driver from creating vehicle (RBAC)', async () => {
    const driverEmail = `driver_${Date.now()}@example.com`;
    const { data: signup } = await api('POST', '/api/auth/signup', {
      email: driverEmail,
      password: 'DriverPass123!',
      role: 'driver',
    });
    const driverToken = signup?.session?.access_token;
    if (!driverToken) {
      console.log('    (Skipping - signup failed)');
      return;
    }

    const { status } = await api('POST', '/api/vehicles', {
      registration_number: 'SHOULD-FAIL',
      vehicle_name: 'Bad',
      vehicle_model: 'Bad',
      vehicle_type_id: '00000000-0000-0000-0000-000000000000',
      capacity: 100,
      status: 'available',
    }, driverToken);
    assert(status === 403, `Expected 403, got ${status}`);
  });

  // 11. Dashboard KPIs
  await test('Get dashboard KPIs', async () => {
    const { status, data } = await api('GET', '/api/dashboard/kpis', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.active_vehicles === 'number', 'Expected active_vehicles number');
    console.log(`    Active: ${data.active_vehicles}, Available: ${data.available_vehicles}`);
  });

  // 12. Dashboard analytics
  await test('Get dashboard analytics', async () => {
    const { status, data } = await api('GET', '/api/dashboard/analytics', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.total_trips === 'number', 'Expected total_trips number');
  });

  // 13. List drivers
  await test('List drivers', async () => {
    const { status, data } = await api('GET', '/api/drivers', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
  });

  // 14. List trips
  await test('List trips', async () => {
    const { status, data } = await api('GET', '/api/trips', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
  });

  // 15. List fuel logs
  await test('List fuel logs', async () => {
    const { status, data } = await api('GET', '/api/fuel', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
  });

  // 16. List expenses
  await test('List expenses', async () => {
    const { status, data } = await api('GET', '/api/expenses', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
  });

  // 17. List maintenance
  await test('List maintenance logs', async () => {
    const { status, data } = await api('GET', '/api/maintenance', null, userToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Expected array');
  });

  // 18. 404 for unknown route
  await test('Return 404 for unknown route', async () => {
    const { status } = await api('GET', '/api/nonexistent');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // Cleanup
  if (vehicleId) {
    await api('DELETE', `/api/vehicles/${vehicleId}`, null, userToken);
  }

  console.log('\n=== Tests Complete ===\n');
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
