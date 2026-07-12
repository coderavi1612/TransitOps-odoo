require('dotenv').config();

const { DeleteObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { supabaseAdmin } = require('./shared/supabase');

const s3 = new S3Client({
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
  region: 'auto',
});

function isTestEmail(email = '') {
  const normalized = email.toLowerCase();
  if (normalized === (process.env.DEV_ADMIN_EMAIL || 'admin@transitops.com').toLowerCase()) return false;
  const [local, domain] = normalized.split('@');
  if (['transitops.local', 'transitops.dev', 'transit.local'].includes(domain)) return true;
  return /(^|[-_.])(test|e2e)([-_.0-9]|$)/.test(local || '') || /^(admin|mgr|driver|safety|analyst|dispatcher|fleetmanager)-\d+/.test(local || '');
}

async function removeWhereIn(table, column, values) {
  if (!values.length) return 0;
  const { data, error } = await supabaseAdmin.from(table).delete().in(column, values).select('id');
  if (error) throw error;
  return data?.length || 0;
}

async function run() {
  const [{ data: vehicles, error: vehicleError }, { data: drivers, error: driverError }, { data: trips, error: tripError }, { data: documents, error: documentError }] = await Promise.all([
    supabaseAdmin.from('vehicles').select('id, registration_number, name'),
    supabaseAdmin.from('drivers').select('id, email, license_number, name'),
    supabaseAdmin.from('trips').select('id, name, source, destination'),
    supabaseAdmin.from('documents').select('id, document_number, file_name, file_url'),
  ]);
  if (vehicleError) throw vehicleError;
  if (driverError) throw driverError;
  if (tripError) throw tripError;
  if (documentError) throw documentError;

  const testVehicles = (vehicles || []).filter((row) => /^REG\d{10,}$/i.test(row.registration_number || '') || /E2E|Test Vehicle/i.test(`${row.name} ${row.registration_number}`));
  const testDrivers = (drivers || []).filter((row) => isTestEmail(row.email) || /^LIC\d{10,}$/i.test(row.license_number || '') || /E2E|Test Driver/i.test(`${row.name} ${row.license_number}`));
  const testTrips = (trips || []).filter((row) => /E2E|ROLE|Mumbai|Nashik/i.test(`${row.name} ${row.source} ${row.destination}`));
  const testDocuments = (documents || []).filter((row) => /E2E/i.test(`${row.document_number} ${row.file_name} ${row.file_url}`));

  const vehicleIds = testVehicles.map((row) => row.id);
  const driverIds = testDrivers.map((row) => row.id);
  const tripIds = testTrips.map((row) => row.id);

  if (vehicleIds.length) await supabaseAdmin.from('vehicles').update({ active_trip_id: null }).in('id', vehicleIds);
  if (driverIds.length) await supabaseAdmin.from('drivers').update({ active_trip_id: null }).in('id', driverIds);

  const removed = {
    documents: 0,
    expenses: await removeWhereIn('expenses', 'vehicle_id', vehicleIds),
    fuel_logs: await removeWhereIn('fuel_logs', 'vehicle_id', vehicleIds),
    maintenance_logs: await removeWhereIn('maintenance_logs', 'vehicle_id', vehicleIds),
    trips: 0,
    drivers: 0,
    vehicles: 0,
    auth_users: 0,
  };

  const linkedTrips = (trips || []).filter((row) => tripIds.includes(row.id)).map((row) => row.id);
  removed.trips += await removeWhereIn('trips', 'id', linkedTrips);
  removed.trips += await removeWhereIn('trips', 'vehicle_id', vehicleIds);
  removed.trips += await removeWhereIn('trips', 'driver_id', driverIds);

  for (const document of testDocuments) {
    if (document.file_url && process.env.CF_R2_BUCKET_NAME) {
      const key = document.file_url.split('/').pop();
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: key }));
      } catch (error) {
        console.warn(`Could not remove test object ${key}: ${error.message}`);
      }
    }
    const { error } = await supabaseAdmin.from('documents').delete().eq('id', document.id);
    if (error) throw error;
    removed.documents += 1;
  }

  removed.drivers = await removeWhereIn('drivers', 'id', driverIds);
  removed.vehicles = await removeWhereIn('vehicles', 'id', vehicleIds);

  let page = 1;
  const testUsers = [];
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    testUsers.push(...data.users.filter((user) => isTestEmail(user.email)));
    if (data.users.length < 100) break;
    page += 1;
  }
  for (const user of testUsers) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    removed.auth_users += 1;
  }

  console.log('Removed identifiable test fixtures:', removed);
}

run().catch((error) => {
  console.error(`Test fixture cleanup failed: ${error.message}`);
  process.exit(1);
});
