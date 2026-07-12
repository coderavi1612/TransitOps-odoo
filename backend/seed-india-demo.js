require('dotenv').config();

const { DeleteObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { supabaseAdmin } = require('./shared/supabase');

const regions = [
  ['Andhra Pradesh', 'AP', 'State'], ['Arunachal Pradesh', 'AR', 'State'], ['Assam', 'AS', 'State'], ['Bihar', 'BR', 'State'],
  ['Chhattisgarh', 'CG', 'State'], ['Goa', 'GA', 'State'], ['Gujarat', 'GJ', 'State'], ['Haryana', 'HR', 'State'],
  ['Himachal Pradesh', 'HP', 'State'], ['Jharkhand', 'JH', 'State'], ['Karnataka', 'KA', 'State'], ['Kerala', 'KL', 'State'],
  ['Madhya Pradesh', 'MP', 'State'], ['Maharashtra', 'MH', 'State'], ['Manipur', 'MN', 'State'], ['Meghalaya', 'ML', 'State'],
  ['Mizoram', 'MZ', 'State'], ['Nagaland', 'NL', 'State'], ['Odisha', 'OD', 'State'], ['Punjab', 'PB', 'State'],
  ['Rajasthan', 'RJ', 'State'], ['Sikkim', 'SK', 'State'], ['Tamil Nadu', 'TN', 'State'], ['Telangana', 'TS', 'State'],
  ['Tripura', 'TR', 'State'], ['Uttar Pradesh', 'UP', 'State'], ['Uttarakhand', 'UK', 'State'], ['West Bengal', 'WB', 'State'],
  ['Andaman and Nicobar Islands', 'AN', 'Union Territory'], ['Chandigarh', 'CH', 'Union Territory'],
  ['Dadra and Nagar Haveli and Daman and Diu', 'DN', 'Union Territory'], ['Delhi', 'DL', 'Union Territory'],
  ['Jammu and Kashmir', 'JK', 'Union Territory'], ['Ladakh', 'LA', 'Union Territory'], ['Lakshadweep', 'LD', 'Union Territory'],
  ['Puducherry', 'PY', 'Union Territory'],
];

const vehicleFixtures = [
  ['MH12AB1234', 'Tata Prima 5530.S', 'Tata Motors', 35000, 84210, 4800000, 'Maharashtra', 'Heavy Truck'],
  ['KA01MN4321', 'Ashok Leyland AVTR 2820', 'Ashok Leyland', 28000, 62860, 3850000, 'Karnataka', 'Heavy Truck'],
  ['DL01RT9087', 'Tata Ultra T.16', 'Tata Motors', 16000, 44210, 2650000, 'Delhi', 'Medium Truck'],
  ['TN09CX2468', 'BharatBenz 3528C', 'BharatBenz', 35000, 71350, 4550000, 'Tamil Nadu', 'Heavy Truck'],
  ['GJ01FV7788', 'Eicher Pro 6048', 'Eicher', 40000, 96340, 5200000, 'Gujarat', 'Trailer'],
  ['WB23LP1122', 'Mahindra Furio 16', 'Mahindra', 16000, 38760, 2400000, 'West Bengal', 'Medium Truck'],
  ['TS09QR5566', 'Volvo FM 420', 'Volvo', 40000, 115480, 7800000, 'Telangana', 'Trailer'],
  ['UP32JK3344', 'Tata 709', 'Tata Motors', 7500, 52600, 1650000, 'Uttar Pradesh', 'Light Commercial Vehicle (LCV)'],
];

const driverFixtures = [
  ['Rajesh Kumar', '+919810012345', 'india.demo.rajesh@transitops.com', 'MH1420110012345', 'Maharashtra', 97],
  ['Ananya Reddy', '+919845012346', 'india.demo.ananya@transitops.com', 'KA0120140056789', 'Karnataka', 96],
  ['Mohammed Imran', '+919899912347', 'india.demo.imran@transitops.com', 'DL0420120098765', 'Delhi', 94],
  ['Suresh Babu', '+919600012348', 'india.demo.suresh@transitops.com', 'TN0920100043210', 'Tamil Nadu', 95],
  ['Harsh Patel', '+919825012349', 'india.demo.harsh@transitops.com', 'GJ0120130076543', 'Gujarat', 93],
  ['Arindam Das', '+919831012350', 'india.demo.arindam@transitops.com', 'WB2320150011223', 'West Bengal', 98],
  ['Lakshmi Naik', '+919866612351', 'india.demo.lakshmi@transitops.com', 'TS0920160055667', 'Telangana', 96],
  ['Vivek Singh', '+919415012352', 'india.demo.vivek@transitops.com', 'UP3220120033445', 'Uttar Pradesh', 92],
];

const s3 = new S3Client({
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: { accessKeyId: process.env.CF_R2_ACCESS_KEY_ID, secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY },
  region: 'auto',
});

function ensure(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function makePdf(title, reference, lines) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('TransitOps India', { x: 50, y: 780, size: 22, font: bold, color: rgb(0.79, 0.38, 0.15) });
  page.drawText(title, { x: 50, y: 735, size: 18, font: bold });
  page.drawText(`Reference: ${reference}`, { x: 50, y: 705, size: 11, font });
  lines.forEach((line, index) => page.drawText(line, { x: 50, y: 660 - index * 24, size: 11, font }));
  page.drawText('Amounts are in Indian Rupees (INR). Distances are in kilometres.', { x: 50, y: 80, size: 9, font });
  return Buffer.from(await pdf.save());
}

async function removePreviousDemo() {
  const registrations = vehicleFixtures.map((row) => row[0]);
  const licenses = driverFixtures.map((row) => row[3]);
  const { data: oldVehicles } = await supabaseAdmin.from('vehicles').select('id').in('registration_number', registrations);
  const { data: oldDrivers } = await supabaseAdmin.from('drivers').select('id').in('license_number', licenses);
  const vehicleIds = (oldVehicles || []).map((row) => row.id);
  const driverIds = (oldDrivers || []).map((row) => row.id);
  if (vehicleIds.length) await supabaseAdmin.from('vehicles').update({ active_trip_id: null }).in('id', vehicleIds);
  if (driverIds.length) await supabaseAdmin.from('drivers').update({ active_trip_id: null }).in('id', driverIds);
  if (vehicleIds.length) {
    for (const table of ['expenses', 'fuel_logs', 'maintenance_logs', 'trips']) await supabaseAdmin.from(table).delete().in('vehicle_id', vehicleIds);
    await supabaseAdmin.from('vehicles').delete().in('id', vehicleIds);
  }
  if (driverIds.length) {
    await supabaseAdmin.from('trips').delete().in('driver_id', driverIds);
    await supabaseAdmin.from('drivers').delete().in('id', driverIds);
  }
  const { data: oldDocs } = await supabaseAdmin.from('documents').select('id,file_url').like('document_number', 'IND-DEMO-%');
  for (const doc of oldDocs || []) {
    if (doc.file_url) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: doc.file_url.split('/').pop() })); } catch (error) { console.warn(error.message); }
    }
    await supabaseAdmin.from('documents').delete().eq('id', doc.id);
  }
}

async function run() {
  ensure(await supabaseAdmin.from('transit_ops_region').upsert(regions.map(([name, code, region_type]) => ({ name, code, region_type, active: true })), { onConflict: 'name' }), 'regions');
  await supabaseAdmin.from('transit_ops_region').delete().eq('name', 'All Over India');
  await removePreviousDemo();

  const regionRows = ensure(await supabaseAdmin.from('transit_ops_region').select('id,name'), 'region lookup');
  const typeRows = ensure(await supabaseAdmin.from('transit_ops_vehicle_type').select('id,name'), 'vehicle type lookup');
  const categoryRows = ensure(await supabaseAdmin.from('transit_ops_expense_category').select('id,name,category_type'), 'expense category lookup');
  const maintenanceTypes = ensure(await supabaseAdmin.from('transit_ops_maintenance_type').select('id,name'), 'maintenance type lookup');
  const regionByName = new Map(regionRows.map((row) => [row.name, row.id]));
  const typeByName = new Map(typeRows.map((row) => [row.name, row.id]));

  const vehicles = ensure(await supabaseAdmin.from('vehicles').insert(vehicleFixtures.map(([registration_number, model, manufacturer, capacity, odometer, acquisition_cost, region, type]) => ({
    name: `${registration_number} ${model}`,
    vehicle_name: model,
    registration_number,
    vehicle_model: model,
    manufacturer,
    capacity,
    odometer,
    acquisition_cost,
    region_id: regionByName.get(region),
    vehicle_type_id: typeByName.get(type) || typeRows[0]?.id || null,
    status: 'Available',
  }))).select(), 'vehicle fixtures');

  const drivers = ensure(await supabaseAdmin.from('drivers').insert(driverFixtures.map(([name, phone, email, license_number, region, safety_score]) => ({
    name, phone, email, license_number, region_id: regionByName.get(region), safety_score,
    license_expiry_date: '2030-12-31', status: 'Available',
  }))).select(), 'driver fixtures');

  const tripDefinitions = [
    ['TRP-IND-1001', 0, 0, 'Mumbai, Maharashtra', 'Pune, Maharashtra', 8000, 150, 'Completed', '2026-06-18', 84200, 84350, 28],
    ['TRP-IND-1002', 1, 1, 'Bengaluru, Karnataka', 'Chennai, Tamil Nadu', 12000, 350, 'Completed', '2026-06-24', 62500, 62850, 70],
    ['TRP-IND-1003', 2, 2, 'New Delhi, Delhi', 'Jaipur, Rajasthan', 6500, 280, 'Dispatched', '2026-07-12', 44210, null, null],
    ['TRP-IND-1004', 3, 3, 'Chennai, Tamil Nadu', 'Coimbatore, Tamil Nadu', 15000, 510, 'Draft', '2026-07-15', null, null, null],
    ['TRP-IND-1005', 4, 4, 'Ahmedabad, Gujarat', 'Surat, Gujarat', 18000, 265, 'Completed', '2026-07-02', 96070, 96335, 52],
    ['TRP-IND-1006', 5, 5, 'Kolkata, West Bengal', 'Bhubaneswar, Odisha', 9000, 440, 'Cancelled', '2026-07-08', null, null, null],
  ];
  const trips = ensure(await supabaseAdmin.from('trips').insert(tripDefinitions.map(([name, vi, di, source, destination, cargo_weight, planned_distance, state, planned_date, start_odometer, end_odometer, fuel_consumed]) => ({
    name, source, destination, cargo_weight, planned_distance, state, planned_date,
    vehicle_id: vehicles[vi].id, driver_id: drivers[di].id, region_id: vehicles[vi].region_id,
    start_odometer, end_odometer, actual_distance: end_odometer == null ? null : end_odometer - start_odometer,
    fuel_consumed, notes: '[INDIA_DEMO] National freight movement',
    dispatch_datetime: ['Completed', 'Dispatched'].includes(state) ? `${planned_date}T03:30:00Z` : null,
    completion_datetime: state === 'Completed' ? `${planned_date}T14:30:00Z` : null,
  }))).select(), 'trip fixtures');
  const activeTrip = trips.find((trip) => trip.name === 'TRP-IND-1003');
  await supabaseAdmin.from('vehicles').update({ status: 'On Trip', active_trip_id: activeTrip.id }).eq('id', activeTrip.vehicle_id);
  await supabaseAdmin.from('drivers').update({ status: 'On Trip', active_trip_id: activeTrip.id }).eq('id', activeTrip.driver_id);

  const maintenanceByName = new Map(maintenanceTypes.map((row) => [row.name, row]));
  const maintenanceFixtures = [
    [0, 'Oil & Fluids', 'Closed', '2026-06-10', 12500, 'Engine oil and filters replaced'],
    [1, 'Routine Inspection', 'Closed', '2026-06-20', 6800, 'Quarterly safety inspection'],
    [3, 'Engine Repair', 'Open', '2026-07-11', 48000, 'Turbocharger pressure diagnosis'],
    [6, 'Tire Rotation', 'Scheduled', '2026-07-18', 9200, 'Front axle tyre rotation'],
  ];
  ensure(await supabaseAdmin.from('maintenance_logs').insert(maintenanceFixtures.map(([vi, type, state, scheduled_date, cost, notes]) => ({
    vehicle_id: vehicles[vi].id, maintenance_type: type, maintenance_type_id: maintenanceByName.get(type)?.id || null,
    state, scheduled_date, open_date: state === 'Open' || state === 'Closed' ? scheduled_date : null,
    close_date: state === 'Closed' ? scheduled_date : null, cost, odometer: vehicles[vi].odometer, notes: `[INDIA_DEMO] ${notes}`,
  }))), 'maintenance fixtures');
  await supabaseAdmin.from('vehicles').update({ status: 'In Shop' }).eq('id', vehicles[3].id);

  const fuelFixtures = [[0, 180, 16470], [1, 220, 20130], [2, 110, 10065], [3, 245, 22420], [4, 280, 25620], [5, 135, 12350], [6, 310, 28380], [7, 95, 8690]];
  ensure(await supabaseAdmin.from('fuel_logs').insert(fuelFixtures.map(([vi, litres, cost], index) => ({
    vehicle_id: vehicles[vi].id, date: `2026-07-${String(index + 2).padStart(2, '0')}`, litres, cost,
    odometer: vehicles[vi].odometer, location: `${vehicleFixtures[vi][6]} HPCL`, fuel_efficiency: Number((3.5 + index * 0.18).toFixed(2)),
  }))), 'fuel fixtures');

  const categoryByType = new Map(categoryRows.map((row) => [row.category_type, row]));
  const expenseFixtures = [[0, 'Toll', 1450, 'Mumbai-Pune Expressway toll'], [1, 'Toll', 2350, 'NH48 toll plazas'], [2, 'Misc', 1200, 'Delhi loading permit'], [3, 'Maintenance', 48000, 'Authorised workshop advance'], [4, 'Toll', 980, 'Ahmedabad-Surat toll'], [5, 'Misc', 750, 'Parking and handling']];
  ensure(await supabaseAdmin.from('expenses').insert(expenseFixtures.map(([vi, type, amount, notes], index) => ({
    vehicle_id: vehicles[vi].id, trip_id: trips[index]?.id || null, expense_category: type,
    expense_category_id: categoryByType.get(type)?.id || null, amount, date: `2026-07-${String(index + 3).padStart(2, '0')}`,
    notes: `[INDIA_DEMO] ${notes}`,
  }))), 'expense fixtures');

  const docs = [
    ['invoice', 'IND-DEMO-INV-1042', 'Freight Invoice', ['Route: Mumbai to Pune', 'Taxable value: INR 42,500', 'GST: INR 7,650']],
    ['eway_bill', 'IND-DEMO-EWB-291000123456', 'E-Way Bill', ['Origin: Bengaluru, Karnataka', 'Destination: Chennai, Tamil Nadu', 'Validity: 3 days']],
    ['puc', 'IND-DEMO-PUC-MH12-2026', 'Pollution Under Control Certificate', ['Vehicle: MH12AB1234', 'Emission test: Passed', 'Valid until: 31 December 2026']],
  ];
  for (const [document_type, reference, title, lines] of docs) {
    const key = `${reference.toLowerCase()}.pdf`;
    const body = await makePdf(title, reference, lines);
    await s3.send(new PutObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: key, Body: body, ContentType: 'application/pdf' }));
    ensure(await supabaseAdmin.from('documents').insert({ document_type, document_number: reference, notes: '[INDIA_DEMO] Generated India demo document', file_name: `${reference}.pdf`, file_size: body.length, mime_type: 'application/pdf', file_url: `${process.env.CF_R2_ENDPOINT}/${process.env.CF_R2_BUCKET_NAME}/${key}`, status: 'Filed' }), `document ${reference}`);
  }

  console.log(`India demo ready: ${regions.length} regions, ${vehicles.length} vehicles, ${drivers.length} drivers, ${trips.length} trips, ${docs.length} documents.`);
}

run().catch((error) => {
  console.error(`India demo seed failed: ${error.message}`);
  process.exit(1);
});
