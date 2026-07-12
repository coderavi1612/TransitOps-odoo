require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}▶ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

// TransitOps test users
const testUsers = {
  admin: {
    email: `admin-${Date.now()}@transitops.local`,
    password: 'AdminPass123!',
    full_name: 'Admin User',
    phone: '+1234567890',
    role: 'admin',
  },
  fleet_manager: {
    email: `manager-${Date.now()}@transitops.local`,
    password: 'ManagerPass123!',
    full_name: 'Fleet Manager',
    phone: '+1234567891',
    role: 'fleet_manager',
  },
  driver: {
    email: `driver-${Date.now()}@transitops.local`,
    password: 'DriverPass123!',
    full_name: 'John Driver',
    phone: '+1234567892',
    role: 'driver',
  },
  safety_officer: {
    email: `safety-${Date.now()}@transitops.local`,
    password: 'SafetyPass123!',
    full_name: 'Safety Officer',
    phone: '+1234567893',
    role: 'safety_officer',
  },
  financial_analyst: {
    email: `analyst-${Date.now()}@transitops.local`,
    password: 'AnalystPass123!',
    full_name: 'Financial Analyst',
    phone: '+1234567894',
    role: 'financial_analyst',
  },
};

let tokens = {};
let userIds = {};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test 1: Create all users
async function test1_CreateUsers() {
  log.section('Test 1: Create TransitOps Users');
  let passed = 0;

  for (const [role, userData] of Object.entries(testUsers)) {
    log.test(`Creating ${role}...`);
    try {
      const response = await axios.post(`${BASE_URL}/auth/test-signup`, userData);
      tokens[role] = response.data.session.access_token;
      userIds[role] = response.data.user.id;
      log.success(`${role} created: ${userData.email}`);
      passed++;
    } catch (err) {
      log.error(`${role} failed: ${err.response?.data?.error || err.message}`);
    }
    await sleep(200);
  }

  log.info(`Passed: ${passed}/${Object.keys(testUsers).length}`);
  return passed === Object.keys(testUsers).length;
}

// Test 2: Verify user profiles
async function test2_VerifyProfiles() {
  log.section('Test 2: Verify User Profiles & Roles');
  let passed = 0;

  for (const [role, _] of Object.entries(testUsers)) {
    if (!tokens[role]) continue;

    log.test(`Checking ${role} profile...`);
    try {
      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${tokens[role]}` },
      });

      log.success(`${role}: ${response.data.profile.email}`);
      log.info(`  Roles: ${response.data.roles.join(', ')}`);
      passed++;
    } catch (err) {
      log.error(`${role} profile failed: ${err.response?.data?.error || err.message}`);
    }
    await sleep(200);
  }

  log.info(`Passed: ${passed}/${Object.keys(testUsers).length}`);
  return passed === Object.keys(testUsers).length;
}

// Test 3: RBAC - Admin assigns role to fleet_manager
async function test3_AdminAssignsRole() {
  log.section('Test 3: RBAC - Admin Assigns Role');
  log.test('Admin assigning "safety_officer" role to fleet_manager...');

  try {
    const response = await axios.post(
      `${BASE_URL}/auth/assign-role`,
      {
        user_id: userIds.fleet_manager,
        role: 'safety_officer',
      },
      {
        headers: { Authorization: `Bearer ${tokens.admin}` },
      }
    );

    log.success(`Role assigned: ${response.data.assigned.role}`);
    return true;
  } catch (err) {
    log.error(`Failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 4: RBAC - Non-admin cannot assign role (should fail)
async function test4_NonAdminCannotAssignRole() {
  log.section('Test 4: RBAC - Non-Admin Cannot Assign Role (Should Fail)');
  log.test('Driver attempting to assign role (should be denied)...');

  try {
    await axios.post(
      `${BASE_URL}/auth/assign-role`,
      {
        user_id: userIds.financial_analyst,
        role: 'admin',
      },
      {
        headers: { Authorization: `Bearer ${tokens.driver}` },
      }
    );

    log.error('Non-admin should NOT have access!');
    return false;
  } catch (err) {
    if (err.response?.status === 403) {
      log.success(`Correctly blocked: ${err.response.data.error}`);
      return true;
    }
    log.error(`Unexpected error: ${err.message}`);
    return false;
  }
}

// Test 5: RBAC - Fleet Manager can perform fleet operations
async function test5_FleetManagerPermissions() {
  log.section('Test 5: RBAC - Fleet Manager Permissions');
  log.test('Verifying fleet_manager has proper permissions...');

  try {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.fleet_manager}` },
    });

    const roles = response.data.roles;
    const hasFleetManagerRole = roles.includes('fleet_manager');

    if (hasFleetManagerRole) {
      log.success('Fleet Manager role verified');
      log.info(`  Roles: ${roles.join(', ')}`);
      return true;
    } else {
      log.error('Fleet Manager role missing!');
      return false;
    }
  } catch (err) {
    log.error(`Failed: ${err.message}`);
    return false;
  }
}

// Test 6: RBAC - Driver restricted permissions
async function test6_DriverPermissions() {
  log.section('Test 6: RBAC - Driver Limited Permissions');
  log.test('Driver attempting admin operation (should fail)...');

  try {
    await axios.post(
      `${BASE_URL}/auth/assign-role`,
      {
        user_id: userIds.admin,
        role: 'driver',
      },
      {
        headers: { Authorization: `Bearer ${tokens.driver}` },
      }
    );

    log.error('Driver should NOT be able to assign roles!');
    return false;
  } catch (err) {
    if (err.response?.status === 403) {
      log.success(`Correctly denied: ${err.response.data.error}`);
      return true;
    }
    log.error(`Unexpected: ${err.message}`);
    return false;
  }
}

// Test 7: Missing authentication
async function test7_MissingAuth() {
  log.section('Test 7: Authentication - Missing Bearer Token');
  log.test('Accessing protected endpoint without token...');

  try {
    await axios.get(`${BASE_URL}/auth/me`);
    log.error('Should have failed without token!');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      log.success('Correctly rejected');
      return true;
    }
    log.error(`Unexpected: ${err.message}`);
    return false;
  }
}

// Test 8: Invalid token
async function test8_InvalidToken() {
  log.section('Test 8: Authentication - Invalid Token');
  log.test('Using malformed token...');

  try {
    await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.xyz' },
    });
    log.error('Should have rejected invalid token!');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      log.success('Correctly rejected invalid token');
      return true;
    }
    log.error(`Unexpected: ${err.message}`);
    return false;
  }
}

// Test 9: Admin revokes role
async function test9_AdminRevokesRole() {
  log.section('Test 9: RBAC - Admin Revokes Role');
  log.test('Admin revoking "safety_officer" role from fleet_manager...');

  try {
    const response = await axios.post(
      `${BASE_URL}/auth/revoke-role`,
      {
        user_id: userIds.fleet_manager,
        role: 'safety_officer',
      },
      {
        headers: { Authorization: `Bearer ${tokens.admin}` },
      }
    );

    log.success(`Role revoked: ${response.data.message}`);
    return true;
  } catch (err) {
    log.error(`Failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 10: Verify role revoked
async function test10_VerifyRevoked() {
  log.section('Test 10: Verify Role Revoked');
  log.test('Checking fleet_manager roles after revocation...');

  try {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.fleet_manager}` },
    });

    const roles = response.data.roles;
    const hasSafetyRole = roles.includes('safety_officer');

    if (!hasSafetyRole) {
      log.success(`Role successfully revoked. Current roles: ${roles.join(', ')}`);
      return true;
    } else {
      log.error('Role still present after revocation!');
      return false;
    }
  } catch (err) {
    log.error(`Failed: ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  log.info('='.repeat(70));
  log.info('TRANSITOPS AUTH SYSTEM - COMPREHENSIVE TEST SUITE');
  log.info('='.repeat(70));

  const results = [];

  results.push(await test1_CreateUsers());
  await sleep(500);

  results.push(await test2_VerifyProfiles());
  await sleep(500);

  results.push(await test3_AdminAssignsRole());
  await sleep(500);

  results.push(await test4_NonAdminCannotAssignRole());
  await sleep(500);

  results.push(await test5_FleetManagerPermissions());
  await sleep(500);

  results.push(await test6_DriverPermissions());
  await sleep(500);

  results.push(await test7_MissingAuth());
  await sleep(500);

  results.push(await test8_InvalidToken());
  await sleep(500);

  results.push(await test9_AdminRevokesRole());
  await sleep(500);

  results.push(await test10_VerifyRevoked());

  // Summary
  log.section('TEST SUMMARY');
  const passed = results.filter((r) => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`Passed: ${passed}/${total} (${percentage}%)\n`);

  if (passed === total) {
    log.success('ALL TESTS PASSED! ✨ Auth system is ready for production.');
  } else {
    log.error(`${total - passed} test(s) failed. Review logs above.`);
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
