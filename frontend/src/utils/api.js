// Local sessionStorage state tables for dummy simulation
const initMockDB = () => {
  if (!sessionStorage.getItem('mock_initialized')) {
    const defaultVehicles = [
      { id: 1, name: 'Atlas-01', registration_number: 'SA-7614-TR', vehicle_name: 'Atlas Prime G2', manufacturer: 'Atlas Trucks', vehicle_model: '2025', capacity: 15000, odometer: 12450, acquisition_cost: 45000, status: 'Available', vehicle_type_id: 1, region_id: 1, transit_ops_vehicle_type: { name: 'Heavy Truck' }, transit_ops_region: { name: 'North' } },
      { id: 2, name: 'Swift-02', registration_number: 'SA-2290-VN', vehicle_name: 'Swift Cargo EV', manufacturer: 'Linen Motors', vehicle_model: '2026', capacity: 4500, odometer: 8120, acquisition_cost: 32000, status: 'On Trip', vehicle_type_id: 2, region_id: 2, transit_ops_vehicle_type: { name: 'Van' }, transit_ops_region: { name: 'South' } },
      { id: 3, name: 'Sentry-03', registration_number: 'SA-9011-CR', vehicle_name: 'Urban Sentry X', manufacturer: 'EcoFlow', vehicle_model: '2024', capacity: 1200, odometer: 21400, acquisition_cost: 18000, status: 'In Shop', vehicle_type_id: 3, region_id: 3, transit_ops_vehicle_type: { name: 'Car' }, transit_ops_region: { name: 'East' } }
    ];

    const defaultDrivers = [
      { id: 1, name: 'Marcus Sterling', phone: '+1 (555) 012-9842', email: 'm.sterling@sahara.com', license_number: 'A-99812-HGV', license_expiry_date: '2027-10-12', safety_score: 98, status: 'Available', region_id: 1, transit_ops_region: { name: 'North' } },
      { id: 2, name: 'Elena Rodriguez', phone: '+1 (555) 019-3321', email: 'e.rodriguez@sahara.com', license_number: 'B-77211-CDL', license_expiry_date: '2028-02-04', safety_score: 95, status: 'On Trip', region_id: 2, transit_ops_region: { name: 'South' } },
      { id: 3, name: 'Albert Hoffman', phone: '+1 (555) 022-7741', email: 'a.hoffman@sahara.com', license_number: 'B-88319-CDL', license_expiry_date: '2025-08-19', safety_score: 87, status: 'Off Duty', region_id: 3, transit_ops_region: { name: 'East' } },
      { id: 4, name: 'Julian Vance', phone: '+1 (555) 091-8843', email: 'j.vance@sahara.com', license_number: 'A-11002-HGV', license_expiry_date: '2026-11-22', safety_score: 62, status: 'Suspended', region_id: 4, transit_ops_region: { name: 'West' } }
    ];

    const defaultTrips = [
      { id: 1, name: 'TRP-8842', source: 'North Region Hub', destination: 'Las Vegas', cargo_weight: 12400, planned_distance: 297, start_odometer: 12153, state: 'Dispatched', vehicle_id: 2, driver_id: 2, region_id: 1, transit_ops_vehicle: { registration_number: 'SA-2290-VN', vehicle_name: 'Swift Cargo EV' }, transit_ops_driver: { name: 'Elena Rodriguez' }, transit_ops_region: { name: 'North' } },
      { id: 2, name: 'TRP-8839', source: 'South Region Hub', destination: 'San Diego', cargo_weight: 8200, planned_distance: 410, start_odometer: 7710, end_odometer: 8120, actual_distance: 410, state: 'Completed', vehicle_id: 1, driver_id: 1, region_id: 2, transit_ops_vehicle: { registration_number: 'SA-7614-TR', vehicle_name: 'Atlas Prime G2' }, transit_ops_driver: { name: 'Marcus Sterling' }, transit_ops_region: { name: 'South' } }
    ];

    const defaultMaintenance = [
      { id: 1, vehicle_id: 3, maintenance_type_id: 2, state: 'Open', scheduled_date: '2026-07-12', cost: 840.50, notes: 'Transmission fluid flush & filter replacement', transit_ops_vehicle: { registration_number: 'SA-9011-CR', vehicle_name: 'Urban Sentry X' }, transit_ops_maintenance_type: { name: 'Engine Repair' } },
      { id: 2, vehicle_id: 1, maintenance_type_id: 3, state: 'Closed', scheduled_date: '2026-06-22', cost: 125.00, notes: 'Front tire realignment and safety tread depth analysis', transit_ops_vehicle: { registration_number: 'SA-7614-TR', vehicle_name: 'Atlas Prime G2' }, transit_ops_maintenance_type: { name: 'Tire Rotation' } }
    ];

    const defaultFuel = [
      { id: 1, vehicle_id: 1, date: '2026-07-10', litres: 82.0, cost: 113.16, odometer: 12450, fuel_efficiency: 14.2, transit_ops_vehicle: { registration_number: 'SA-7614-TR' } }
    ];

    const defaultExpenses = [
      { id: 1, vehicle_id: 1, amount: 12.50, date: '2026-07-11', notes: 'Interstate Passage Automated toll fee', transit_ops_expense_category: { name: 'Tolls', category_type: 'Toll' }, transit_ops_vehicle: { registration_number: 'SA-7614-TR' } }
    ];

    sessionStorage.setItem('mock_vehicles', JSON.stringify(defaultVehicles));
    sessionStorage.setItem('mock_drivers', JSON.stringify(defaultDrivers));
    sessionStorage.setItem('mock_trips', JSON.stringify(defaultTrips));
    sessionStorage.setItem('mock_maintenance', JSON.stringify(defaultMaintenance));
    sessionStorage.setItem('mock_fuel', JSON.stringify(defaultFuel));
    sessionStorage.setItem('mock_expenses', JSON.stringify(defaultExpenses));
    sessionStorage.setItem('mock_initialized', 'true');
  }
};

const getTable = (key) => JSON.parse(sessionStorage.getItem(`mock_${key}`) || '[]');
const saveTable = (key, data) => sessionStorage.setItem(`mock_${key}`, JSON.stringify(data));

// Fetch helper with mock database fallback
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export async function apiFetch(method, path, body = null) {
  const token = localStorage.getItem('transitops_token');
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Intercept if using dummy token
  if (token && token.startsWith('dummy_token')) {
    initMockDB();
    return handleMockRequest(method, path, body);
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const res = await fetch(`${BASE_URL}${cleanPath}`, options);
    const contentType = res.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { message: await res.text() };
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    // If backend isn't responding, fallback to local mock simulation
    console.warn(`Connection error on ${method} ${path}, falling back to mock database.`);
    initMockDB();
    return handleMockRequest(method, path, body);
  }
}

// Client-side simulation of Odoo routes and PG Triggers
function handleMockRequest(method, path, body) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Config tables
  if (cleanPath.startsWith('/api/config/regions')) {
    return [
      { id: 1, name: 'North', active: true },
      { id: 2, name: 'South', active: true },
      { id: 3, name: 'East', active: true },
      { id: 4, name: 'West', active: true }
    ];
  }
  if (cleanPath.startsWith('/api/config/vehicle_types')) {
    return [
      { id: 1, name: 'Heavy Truck', default_capacity: 15000 },
      { id: 2, name: 'Van', default_capacity: 4500 },
      { id: 3, name: 'Car', default_capacity: 1200 }
    ];
  }
  if (cleanPath.startsWith('/api/config/maintenance_types')) {
    return [
      { id: 1, name: 'Routine Inspection' },
      { id: 2, name: 'Engine Repair' },
      { id: 3, name: 'Tire Rotation' },
      { id: 4, name: 'Oil & Fluids' }
    ];
  }
  if (cleanPath.startsWith('/api/config/expense_categories')) {
    return [
      { id: 1, name: 'Tolls', category_type: 'Toll' },
      { id: 2, name: 'Fuel', category_type: 'Misc' },
      { id: 3, name: 'Maintenance Bill', category_type: 'Maintenance' }
    ];
  }
  if (cleanPath.startsWith('/api/config/roles')) {
    return [
      { id: 1, name: 'System Administrator', active: true, access: 'Owner', users: 1 },
      { id: 2, name: 'Fleet Manager', active: true, access: 'Owner', users: 4 },
      { id: 3, name: 'Trip Dispatcher', active: true, access: 'Standard', users: 12 },
      { id: 4, name: 'Auditor / Viewer', active: true, access: 'Restricted', users: 3 }
    ];
  }

  // Dashboard KPIs
  if (cleanPath.startsWith('/api/dashboard/kpis')) {
    const vehicles = getTable('vehicles');
    const drivers = getTable('drivers');
    const trips = getTable('trips');
    return {
      active_vehicles: vehicles.filter(v => v.status !== 'Retired').length,
      available_vehicles: vehicles.filter(v => v.status === 'Available').length,
      vehicles_in_maintenance: vehicles.filter(v => v.status === 'In Shop').length,
      retired_vehicles: vehicles.filter(v => v.status === 'Retired').length,
      drivers_on_duty: drivers.filter(d => d.status === 'On Trip').length,
      drivers_available: drivers.filter(d => d.status === 'Available').length,
      active_trips: trips.filter(t => t.state === 'Dispatched').length,
      pending_trips: trips.filter(t => t.state === 'Draft').length,
      completed_trips: trips.filter(t => t.state === 'Completed').length
    };
  }

  if (cleanPath.startsWith('/api/dashboard/analytics')) {
    return {
      total_trips: getTable('trips').length,
      completed_trips: getTable('trips').filter(t => t.state === 'Completed').length,
      fuel_efficiency: getTable('fuel').map(f => ({ trip_name: 'Fuel Log', efficiency: f.fuel_efficiency }))
    };
  }

  // Vehicles CRUD
  if (cleanPath === '/api/vehicles') {
    return getTable('vehicles');
  }
  if (cleanPath.startsWith('/api/vehicles/') && method === 'PUT') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('vehicles');
    const index = table.findIndex(v => v.id === id);
    if (index !== -1) {
      table[index] = { ...table[index], ...body };
      saveTable('vehicles', table);
      return table[index];
    }
  }
  if (cleanPath === '/api/vehicles' && method === 'POST') {
    const table = getTable('vehicles');
    const newVehicle = {
      id: Date.now(),
      ...body,
      transit_ops_vehicle_type: { name: body.vehicle_type_id === 1 ? 'Heavy Truck' : body.vehicle_type_id === 2 ? 'Van' : 'Car' },
      transit_ops_region: { name: body.region_id === 1 ? 'North' : 'South' }
    };
    table.push(newVehicle);
    saveTable('vehicles', table);
    return newVehicle;
  }
  if (cleanPath.startsWith('/api/vehicles/') && method === 'DELETE') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('vehicles');
    saveTable('vehicles', table.filter(v => v.id !== id));
    return { message: 'Vehicle deleted' };
  }

  // Drivers CRUD
  if (cleanPath === '/api/drivers') {
    return getTable('drivers');
  }
  if (cleanPath === '/api/drivers' && method === 'POST') {
    const table = getTable('drivers');
    const newDriver = {
      id: Date.now(),
      ...body,
      transit_ops_region: { name: body.region_id === 1 ? 'North' : 'South' }
    };
    table.push(newDriver);
    saveTable('drivers', table);
    return newDriver;
  }
  if (cleanPath.startsWith('/api/drivers/') && method === 'PUT') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('drivers');
    const index = table.findIndex(d => d.id === id);
    if (index !== -1) {
      table[index] = { ...table[index], ...body };
      saveTable('drivers', table);
      return table[index];
    }
  }
  if (cleanPath.startsWith('/api/drivers/') && method === 'DELETE') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('drivers');
    saveTable('drivers', table.filter(d => d.id !== id));
    return { message: 'Driver deleted' };
  }

  // Trips CRUD & State Modifiers
  if (cleanPath === '/api/trips') {
    return getTable('trips');
  }
  if (cleanPath === '/api/trips' && method === 'POST') {
    const table = getTable('trips');
    const newTrip = {
      id: Date.now(),
      ...body,
      state: 'Draft',
      transit_ops_vehicle: getTable('vehicles').find(v => v.id === body.vehicle_id),
      transit_ops_driver: getTable('drivers').find(d => d.id === body.driver_id),
      transit_ops_region: { name: body.region_id === 1 ? 'North' : 'South' }
    };
    table.push(newTrip);
    saveTable('trips', table);
    return newTrip;
  }
  if (cleanPath.endsWith('/dispatch') && method === 'POST') {
    const id = parseInt(cleanPath.split('/')[3]);
    const table = getTable('trips');
    const index = table.findIndex(t => t.id === id);
    if (index !== -1) {
      table[index].state = 'Dispatched';
      table[index].start_odometer = table[index].transit_ops_vehicle?.odometer || 0;
      saveTable('trips', table);
      
      // PostgreSQL Trigger Simulation: Update vehicle/driver to 'On Trip'
      const vTable = getTable('vehicles');
      const vIdx = vTable.findIndex(v => v.id === table[index].vehicle_id);
      if (vIdx !== -1) {
        vTable[vIdx].status = 'On Trip';
        saveTable('vehicles', vTable);
      }

      const dTable = getTable('drivers');
      const dIdx = dTable.findIndex(d => d.id === table[index].driver_id);
      if (dIdx !== -1) {
        dTable[dIdx].status = 'On Trip';
        saveTable('drivers', dTable);
      }
      return table[index];
    }
  }
  if (cleanPath.endsWith('/complete') && method === 'POST') {
    const id = parseInt(cleanPath.split('/')[3]);
    const table = getTable('trips');
    const index = table.findIndex(t => t.id === id);
    if (index !== -1) {
      table[index].state = 'Completed';
      table[index].end_odometer = body.end_odometer;
      table[index].actual_distance = body.end_odometer - (table[index].start_odometer || 0);
      saveTable('trips', table);

      // Trigger Simulation: Restore vehicle/driver to 'Available', update odometer
      const vTable = getTable('vehicles');
      const vIdx = vTable.findIndex(v => v.id === table[index].vehicle_id);
      if (vIdx !== -1) {
        vTable[vIdx].status = 'Available';
        vTable[vIdx].odometer = body.end_odometer;
        saveTable('vehicles', vTable);
      }

      const dTable = getTable('drivers');
      const dIdx = dTable.findIndex(d => d.id === table[index].driver_id);
      if (dIdx !== -1) {
        dTable[dIdx].status = 'Available';
        saveTable('drivers', dTable);
      }
      return table[index];
    }
  }
  if (cleanPath.endsWith('/cancel') && method === 'POST') {
    const id = parseInt(cleanPath.split('/')[3]);
    const table = getTable('trips');
    const index = table.findIndex(t => t.id === id);
    if (index !== -1) {
      table[index].state = 'Cancelled';
      saveTable('trips', table);

      // Trigger Simulation: Restore vehicle/driver to 'Available'
      const vTable = getTable('vehicles');
      const vIdx = vTable.findIndex(v => v.id === table[index].vehicle_id);
      if (vIdx !== -1) {
        vTable[vIdx].status = 'Available';
        saveTable('vehicles', vTable);
      }

      const dTable = getTable('drivers');
      const dIdx = dTable.findIndex(d => d.id === table[index].driver_id);
      if (dIdx !== -1) {
        dTable[dIdx].status = 'Available';
        saveTable('drivers', dTable);
      }
      return table[index];
    }
  }

  // Maintenance CRUD & State Modifiers
  if (cleanPath === '/api/maintenance') {
    return getTable('maintenance');
  }
  if (cleanPath === '/api/maintenance' && method === 'POST') {
    const table = getTable('maintenance');
    const newLog = {
      id: Date.now(),
      ...body,
      state: 'Scheduled',
      transit_ops_vehicle: getTable('vehicles').find(v => v.id === body.vehicle_id),
      transit_ops_maintenance_type: { name: body.maintenance_type_id === 2 ? 'Engine Repair' : 'Routine Inspection' }
    };
    table.push(newLog);
    saveTable('maintenance', table);
    return newLog;
  }
  if (cleanPath.endsWith('/open') && method === 'POST') {
    const id = parseInt(cleanPath.split('/')[3]);
    const table = getTable('maintenance');
    const index = table.findIndex(m => m.id === id);
    if (index !== -1) {
      table[index].state = 'Open';
      saveTable('maintenance', table);

      // Trigger Simulation: Set vehicle status to 'In Shop'
      const vTable = getTable('vehicles');
      const vIdx = vTable.findIndex(v => v.id === table[index].vehicle_id);
      if (vIdx !== -1) {
        vTable[vIdx].status = 'In Shop';
        saveTable('vehicles', vTable);
      }
      return table[index];
    }
  }
  if (cleanPath.endsWith('/close') && method === 'POST') {
    const id = parseInt(cleanPath.split('/')[3]);
    const table = getTable('maintenance');
    const index = table.findIndex(m => m.id === id);
    if (index !== -1) {
      table[index].state = 'Closed';
      saveTable('maintenance', table);

      // Trigger Simulation: Set vehicle status back to 'Available'
      const vTable = getTable('vehicles');
      const vIdx = vTable.findIndex(v => v.id === table[index].vehicle_id);
      if (vIdx !== -1) {
        vTable[vIdx].status = 'Available';
        saveTable('vehicles', vTable);
      }
      return table[index];
    }
  }
  if (cleanPath.startsWith('/api/maintenance/') && method === 'DELETE') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('maintenance');
    saveTable('maintenance', table.filter(m => m.id !== id));
    return { message: 'Deleted' };
  }

  // Fuel Logs CRUD
  if (cleanPath === '/api/fuel') {
    return getTable('fuel');
  }
  if (cleanPath === '/api/fuel' && method === 'POST') {
    const table = getTable('fuel');
    const newLog = {
      id: Date.now(),
      ...body,
      fuel_efficiency: 14.2, // Mocked trigger calculation
      transit_ops_vehicle: getTable('vehicles').find(v => v.id === body.vehicle_id)
    };
    table.push(newLog);
    saveTable('fuel', table);

    // Trigger Simulation: update vehicle odometer
    const vTable = getTable('vehicles');
    const vIdx = vTable.findIndex(v => v.id === body.vehicle_id);
    if (vIdx !== -1) {
      vTable[vIdx].odometer = body.odometer;
      saveTable('vehicles', vTable);
    }
    return newLog;
  }
  if (cleanPath.startsWith('/api/fuel/') && method === 'DELETE') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('fuel');
    saveTable('fuel', table.filter(f => f.id !== id));
    return { message: 'Deleted' };
  }

  // Expenses CRUD
  if (cleanPath === '/api/expenses') {
    return getTable('expenses');
  }
  if (cleanPath === '/api/expenses' && method === 'POST') {
    const table = getTable('expenses');
    const newExp = {
      id: Date.now(),
      ...body,
      transit_ops_expense_category: { name: body.expense_category_id === 1 ? 'Tolls' : 'Maintenance Bill', category_type: body.expense_category_id === 1 ? 'Toll' : 'Maintenance' },
      transit_ops_vehicle: getTable('vehicles').find(v => v.id === body.vehicle_id)
    };
    table.push(newExp);
    saveTable('expenses', table);
    return newExp;
  }
  if (cleanPath.startsWith('/api/expenses/') && method === 'DELETE') {
    const id = parseInt(cleanPath.split('/').pop());
    const table = getTable('expenses');
    saveTable('expenses', table.filter(e => e.id !== id));
    return { message: 'Deleted' };
  }

  return null;
}

export const api = {
  get: (path) => apiFetch('GET', path),
  post: (path, body) => apiFetch('POST', path, body),
  put: (path, body) => apiFetch('PUT', path, body),
  delete: (path) => apiFetch('DELETE', path),
};
