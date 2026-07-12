const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createSimplePdf(title, lines) {
  const safeLines = [title, '', ...lines].map(escapePdfText);
  const content = [
    'BT',
    '/F1 22 Tf',
    '50 770 Td',
    `(${safeLines[0]}) Tj`,
    '/F1 11 Tf',
    '0 -34 Td',
    ...safeLines.slice(1).map((line) => `0 -18 Td (${line}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}

// GET /api/dashboard/kpis
router.get('/kpis', authenticate, async (req, res) => {
  try {
    const { region, status, type } = req.query;
    const [vehiclesRes, driversRes, tripsRes, maintenanceRes, fuelRes, expensesRes] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance_logs').select('*'),
      supabase.from('fuel_logs').select('*'),
      supabase.from('expenses').select('*')
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (driversRes.error) throw driversRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (fuelRes.error) throw fuelRes.error;
    if (expensesRes.error) throw expensesRes.error;

    let vehicles = vehiclesRes.data || [];
    let drivers = driversRes.data || [];
    let trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];
    const expenses = expensesRes.data || [];

    if (region && region !== 'All') {
      vehicles = vehicles.filter((vehicle) => String(vehicle.region_id) === String(region));
      drivers = drivers.filter((driver) => String(driver.region_id) === String(region));
      trips = trips.filter((trip) => String(trip.region_id) === String(region));
    }

    if (status && status !== 'All') {
      vehicles = vehicles.filter((vehicle) => vehicle.status === status);
    }

    if (type && type !== 'All') {
      vehicles = vehicles.filter((vehicle) => String(vehicle.vehicle_type_id) === String(type));
      const vehicleIds = new Set(vehicles.map((vehicle) => String(vehicle.id)));
      trips = trips.filter((trip) => vehicleIds.has(String(trip.vehicle_id)));
    }

    // Calculations
    const activeVehicles = vehicles.filter(v => v.status !== 'Retired');
    const availableVehicles = vehicles.filter(v => v.status === 'Available');
    const vehiclesInMaintenance = vehicles.filter(v => v.status === 'In Shop');
    const retiredVehicles = vehicles.filter(v => v.status === 'Retired');

    const driversOnDuty = drivers.filter(d => d.status === 'On Trip');
    const driversAvailable = drivers.filter(d => d.status === 'Available');

    const activeTrips = trips.filter(t => t.state === 'Dispatched');
    const pendingTrips = trips.filter(t => t.state === 'Draft');
    const completedTrips = trips.filter(t => t.state === 'Completed');

    // Fleet Utilization %: (Vehicles On Trip / Active Vehicles) * 100
    const vehiclesOnTripCount = vehicles.filter(v => v.status === 'On Trip').length;
    const fleetUtilization = activeVehicles.length > 0 
      ? parseFloat(((vehiclesOnTripCount / activeVehicles.length) * 100).toFixed(2))
      : 0.0;

    // Fuel Efficiency: actual_distance / fuel_consumed for completed trips
    const completedTripsWithFuel = completedTrips.filter(t => t.fuel_consumed > 0 && t.actual_distance > 0);
    const totalDistance = completedTripsWithFuel.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
    const totalFuel = completedTripsWithFuel.reduce((sum, t) => sum + (t.fuel_consumed || 0), 0);
    const fuelEfficiency = totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : 0.0;

    // Operational Cost: Fuel Cost + Maintenance Cost + Toll Expense + Misc Expense
    const totalFuelCost = fuelLogs.reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
    const tollExpense = expenses.filter(e => e.expense_category === 'Toll').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const miscExpense = expenses.filter(e => e.expense_category === 'Misc').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const operationalCost = parseFloat((totalFuelCost + totalMaintenanceCost + tollExpense + miscExpense).toFixed(2));

    // Vehicle ROI: (Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost (average across active vehicles)
    // Revenue = total completed trips actual distance * 1.50 (standard rate)
    const activeVehiclesWithROI = activeVehicles.map(v => {
      const vFuelCost = fuelLogs.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
      const vMaintCost = maintenanceLogs.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
      const vTrips = completedTrips.filter(t => t.vehicle_id === v.id);
      const vDistance = vTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
      const vRevenue = vDistance * 1.50; // standard freight billing rate
      const acquisitionCost = parseFloat(v.acquisition_cost || 0) || 1.0; // avoid division by zero
      const roi = (vRevenue - (vMaintCost + vFuelCost)) / acquisitionCost;
      return roi;
    });
    const avgROI = activeVehiclesWithROI.length > 0
      ? parseFloat((activeVehiclesWithROI.reduce((sum, val) => sum + val, 0) / activeVehiclesWithROI.length).toFixed(4))
      : 0.0;

    // Maintenance Due (count of Scheduled logs)
    const maintenanceDue = maintenanceLogs.filter(m => m.state === 'Scheduled').length;

    // Expiring Licenses: Driver licenses expiring within 30 days (or expired)
    const expiringLicenses = drivers.filter(d => {
      if (!d.license_expiry_date) return false;
      const days = (new Date(d.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    res.json({
      active_vehicles: activeVehicles.length,
      available_vehicles: availableVehicles.length,
      vehicles_in_maintenance: vehiclesInMaintenance.length,
      retired_vehicles: retiredVehicles.length,
      drivers_on_duty: driversOnDuty.length,
      drivers_available: driversAvailable.length,
      active_trips: activeTrips.length,
      pending_trips: pendingTrips.length,
      completed_trips: completedTrips.length,
      fleet_utilization: fleetUtilization,
      fuel_efficiency: fuelEfficiency,
      operational_cost: operationalCost,
      vehicle_roi: avgROI,
      maintenance_due: maintenanceDue,
      expiring_licenses: expiringLicenses
    });
  } catch (err) {
    console.error('KPI dashboard error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/vehicle-performance
router.get('/vehicle-performance', authenticate, async (req, res) => {
  try {
    const [vehiclesRes, tripsRes, maintenanceRes, fuelRes] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance_logs').select('*'),
      supabase.from('fuel_logs').select('*'),
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (fuelRes.error) throw fuelRes.error;

    const trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];

    const vehicles = (vehiclesRes.data || []).map((vehicle) => {
      const vehicleTrips = trips.filter((trip) => String(trip.vehicle_id) === String(vehicle.id));
      const completedTrips = vehicleTrips.filter((trip) => trip.state === 'Completed');
      const dispatchedTrips = vehicleTrips.filter((trip) => trip.state === 'Dispatched');
      const vehicleFuel = fuelLogs.filter((log) => String(log.vehicle_id) === String(vehicle.id));
      const vehicleMaintenance = maintenanceLogs.filter((log) => String(log.vehicle_id) === String(vehicle.id));

      const totalDistance = completedTrips.reduce((sum, trip) => sum + Number(trip.actual_distance || 0), 0);
      const totalFuelConsumed = completedTrips.reduce((sum, trip) => sum + Number(trip.fuel_consumed || 0), 0);
      const loggedEfficiency = vehicleFuel
        .filter((log) => Number(log.fuel_efficiency) > 0)
        .map((log) => Number(log.fuel_efficiency));
      const fuelEfficiency = totalFuelConsumed > 0
        ? totalDistance / totalFuelConsumed
        : loggedEfficiency.length
          ? loggedEfficiency.reduce((sum, value) => sum + value, 0) / loggedEfficiency.length
          : 0;

      const utilizationRate = vehicleTrips.length > 0
        ? ((completedTrips.length + dispatchedTrips.length) / vehicleTrips.length) * 100
        : vehicle.status === 'On Trip'
          ? 100
          : 0;

      const fuelCost = vehicleFuel.reduce((sum, log) => sum + Number(log.cost || 0), 0);
      const maintenanceCost = vehicleMaintenance.reduce((sum, log) => sum + Number(log.cost || 0), 0);
      const revenue = totalDistance * 1.5;
      const acquisitionCost = Number(vehicle.acquisition_cost || 0) || 1;
      const roiContribution = (revenue - fuelCost - maintenanceCost) / acquisitionCost;

      return {
        ...vehicle,
        fuel_efficiency: Number(fuelEfficiency.toFixed(2)),
        utilization_rate: Number(utilizationRate.toFixed(2)),
        roi_contribution: Number(roiContribution.toFixed(4)),
      };
    });

    res.json({ vehicles, count: vehicles.length });
  } catch (err) {
    console.error('Vehicle performance error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/analytics
router.get('/analytics', authenticate, async (req, res) => {
  const { date_from, date_to, status } = req.query;

  try {
    let query = supabase.from('trips').select('*');

    if (date_from) query = query.gte('planned_date', date_from);
    if (date_to) query = query.lte('planned_date', date_to);
    if (status) query = query.eq('state', status);

    const { data: trips, error } = await query;
    if (error) throw error;

    const completed = trips.filter((t) => t.state === 'Completed');
    const fuelEfficiency = completed
      .filter((t) => t.fuel_consumed > 0 && t.actual_distance > 0)
      .map((t) => ({
        trip_id: t.id,
        trip_name: t.name,
        efficiency: parseFloat((t.actual_distance / t.fuel_consumed).toFixed(2)),
      }));

    res.json({
      total_trips: trips.length,
      completed_trips: completed.length,
      fuel_efficiency: fuelEfficiency,
    });
  } catch (err) {
    console.error('Analytics query error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/reports/strategy/pdf
router.get('/reports/strategy/pdf', authenticate, requireRole('admin', 'fleet_manager', 'financial_analyst', 'safety_officer'), async (req, res) => {
  try {
    const [vehiclesRes, driversRes, tripsRes, maintenanceRes, fuelRes, expensesRes] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance_logs').select('*'),
      supabase.from('fuel_logs').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (driversRes.error) throw driversRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (fuelRes.error) throw fuelRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const vehicles = vehiclesRes.data || [];
    const drivers = driversRes.data || [];
    const trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];
    const expenses = expensesRes.data || [];
    const completedTrips = trips.filter((trip) => trip.state === 'Completed');
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== 'Retired');
    const vehiclesOnTrip = vehicles.filter((vehicle) => vehicle.status === 'On Trip').length;
    const fleetUtilization = activeVehicles.length ? ((vehiclesOnTrip / activeVehicles.length) * 100).toFixed(1) : '0.0';
    const totalDistance = completedTrips.reduce((sum, trip) => sum + Number(trip.actual_distance || 0), 0);
    const totalFuelConsumed = completedTrips.reduce((sum, trip) => sum + Number(trip.fuel_consumed || 0), 0);
    const fuelEfficiency = totalFuelConsumed > 0 ? (totalDistance / totalFuelConsumed).toFixed(1) : '0.0';
    const operationalCost = [
      ...fuelLogs.map((log) => Number(log.cost || 0)),
      ...maintenanceLogs.map((log) => Number(log.cost || 0)),
      ...expenses.map((expense) => Number(expense.amount || 0)),
    ].reduce((sum, value) => sum + value, 0);
    const expiringLicenses = drivers.filter((driver) => {
      if (!driver.license_expiry_date) return false;
      const days = (new Date(driver.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const pdf = createSimplePdf('TransitOps Strategy Report', [
      `Generated: ${generatedAt}`,
      `Active Vehicles: ${activeVehicles.length}`,
      `Available Vehicles: ${vehicles.filter((vehicle) => vehicle.status === 'Available').length}`,
      `Vehicles In Maintenance: ${vehicles.filter((vehicle) => vehicle.status === 'In Shop').length}`,
      `Drivers Available: ${drivers.filter((driver) => driver.status === 'Available').length}`,
      `Active Trips: ${trips.filter((trip) => trip.state === 'Dispatched').length}`,
      `Completed Trips: ${completedTrips.length}`,
      `Fleet Utilization: ${fleetUtilization}%`,
      `Fuel Efficiency: ${fuelEfficiency} km/L`,
      `Operational Cost: INR ${operationalCost.toFixed(2)}`,
      `Maintenance Due: ${maintenanceLogs.filter((log) => log.state === 'Scheduled').length}`,
      `Licenses Expiring Within 30 Days: ${expiringLicenses}`,
      '',
      'Summary:',
      'This report summarizes live fleet, trip, fuel, maintenance, expense, and driver safety data.',
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transitops_strategy_report.pdf"');
    res.status(200).send(pdf);
  } catch (err) {
    console.error('Strategy PDF generation error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/reports/:reportName/export
router.get('/reports/:reportName/export', authenticate, requireRole('admin', 'fleet_manager', 'financial_analyst', 'safety_officer'), async (req, res) => {
  const { reportName } = req.params;
  const { date_from, date_to, status } = req.query;

  try {
    let headers = [];
    let rows = [];

    // Helper: format cells for CSV
    const escapeCell = (cell) => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper: date filter formatting
    const filterByDateRange = (list, dateField) => {
      return list.filter(item => {
        if (!item[dateField]) return true;
        const itemDate = new Date(item[dateField]);
        if (date_from && itemDate < new Date(date_from)) return false;
        if (date_to && itemDate > new Date(date_to)) return false;
        return true;
      });
    };

    switch (reportName.toLowerCase()) {
      case 'audit':
      case 'audit-dataset':
      case 'audit_dataset': {
        headers = ['Record Type', 'Record ID', 'Reference', 'Status', 'Date', 'Vehicle ID', 'Driver ID', 'Amount', 'Details'];
        const [vehiclesRes, driversRes, tripsRes, maintenanceRes, fuelRes, expensesRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('drivers').select('*'),
          supabase.from('trips').select('*'),
          supabase.from('maintenance_logs').select('*'),
          supabase.from('fuel_logs').select('*'),
          supabase.from('expenses').select('*'),
        ]);

        if (vehiclesRes.error) throw vehiclesRes.error;
        if (driversRes.error) throw driversRes.error;
        if (tripsRes.error) throw tripsRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;
        if (fuelRes.error) throw fuelRes.error;
        if (expensesRes.error) throw expensesRes.error;

        rows = [
          ...vehiclesRes.data.map((vehicle) => [
            'Vehicle',
            vehicle.id,
            vehicle.registration_number,
            vehicle.status,
            vehicle.created_at || '',
            vehicle.id,
            '',
            vehicle.acquisition_cost || '',
            `${vehicle.name || ''} ${vehicle.vehicle_model || ''}`.trim(),
          ]),
          ...driversRes.data.map((driver) => [
            'Driver',
            driver.id,
            driver.license_number,
            driver.status,
            driver.license_expiry_date || '',
            '',
            driver.id,
            '',
            `${driver.name || ''} safety score ${driver.safety_score || 0}`.trim(),
          ]),
          ...tripsRes.data.map((trip) => [
            'Trip',
            trip.id,
            trip.name,
            trip.state,
            trip.planned_date || trip.created_at || '',
            trip.vehicle_id,
            trip.driver_id,
            '',
            `${trip.source || ''} to ${trip.destination || ''}`.trim(),
          ]),
          ...maintenanceRes.data.map((log) => [
            'Maintenance',
            log.id,
            log.maintenance_type,
            log.state,
            log.scheduled_date || log.created_at || '',
            log.vehicle_id,
            '',
            log.cost || '',
            log.notes || '',
          ]),
          ...fuelRes.data.map((log) => [
            'Fuel',
            log.id,
            `${log.litres} L`,
            '',
            log.date || log.created_at || '',
            log.vehicle_id,
            '',
            log.cost || '',
            `Odometer ${log.odometer || ''}; efficiency ${log.fuel_efficiency || ''}`.trim(),
          ]),
          ...expensesRes.data.map((expense) => [
            'Expense',
            expense.id,
            expense.expense_category,
            '',
            expense.date || expense.created_at || '',
            expense.vehicle_id,
            '',
            expense.amount || '',
            expense.notes || '',
          ]),
        ];
        break;
      }
      case 'fleet-utilization':
      case 'fleet_utilization': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Model', 'Manufacturer', 'Capacity', 'Odometer', 'Status', 'Is Utilized (On Trip)'];
        const { data: vehicles, error } = await supabase.from('vehicles').select('*');
        if (error) throw error;
        
        let filtered = vehicles.filter(v => v.status !== 'Retired');
        if (status) filtered = filtered.filter(v => v.status === status);

        rows = filtered.map(v => [
          v.id,
          v.name,
          v.registration_number,
          v.vehicle_model,
          v.manufacturer || '',
          v.capacity,
          v.odometer || 0,
          v.status,
          v.status === 'On Trip' ? 'Yes' : 'No'
        ]);
        break;
      }
      case 'trips':
      case 'trip-report':
      case 'trip_report': {
        headers = ['Trip ID', 'Trip Name', 'Source', 'Destination', 'Cargo Weight', 'Planned Distance', 'Actual Distance', 'Fuel Consumed', 'State', 'Planned Date', 'Vehicle ID', 'Driver ID'];
        let query = supabase.from('trips').select('*');
        if (status) query = query.eq('state', status);
        const { data: trips, error } = await query;
        if (error) throw error;

        let filtered = trips;
        if (date_from) filtered = filtered.filter(t => t.planned_date >= date_from);
        if (date_to) filtered = filtered.filter(t => t.planned_date <= date_to);

        rows = filtered.map(t => [
          t.id,
          t.name,
          t.source,
          t.destination,
          t.cargo_weight,
          t.planned_distance,
          t.actual_distance || '',
          t.fuel_consumed || '',
          t.state,
          t.planned_date || '',
          t.vehicle_id,
          t.driver_id
        ]);
        break;
      }
      case 'driver-performance':
      case 'driver_performance': {
        headers = ['Driver ID', 'Driver Name', 'Phone', 'Email', 'License Number', 'License Expiry', 'Safety Score', 'Status', 'Total Trips Completed', 'Total Distance Driven'];
        const [driversRes, tripsRes] = await Promise.all([
          supabase.from('drivers').select('*'),
          supabase.from('trips').select('*').eq('state', 'Completed')
        ]);
        if (driversRes.error) throw driversRes.error;
        if (tripsRes.error) throw tripsRes.error;

        rows = driversRes.data.map(d => {
          const completedTrips = tripsRes.data.filter(t => t.driver_id === d.id);
          const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
          return [
            d.id,
            d.name,
            d.phone,
            d.email || '',
            d.license_number,
            d.license_expiry_date,
            d.safety_score || 100,
            d.status,
            completedTrips.length,
            totalDistance
          ];
        });
        break;
      }
      case 'vehicle-performance':
      case 'vehicle_performance': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Model', 'Manufacturer', 'Capacity', 'Odometer', 'Status', 'Total Trips Completed', 'Total Distance Driven'];
        const [vehiclesRes, tripsRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('trips').select('*').eq('state', 'Completed')
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (tripsRes.error) throw tripsRes.error;

        rows = vehiclesRes.data.map(v => {
          const completedTrips = tripsRes.data.filter(t => t.vehicle_id === v.id);
          const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
          return [
            v.id,
            v.name,
            v.registration_number,
            v.vehicle_model,
            v.manufacturer || '',
            v.capacity,
            v.odometer || 0,
            v.status,
            completedTrips.length,
            totalDistance
          ];
        });
        break;
      }
      case 'maintenance':
      case 'maintenance-report':
      case 'maintenance_report': {
        headers = ['Log ID', 'Vehicle ID', 'Maintenance Type', 'State', 'Scheduled Date', 'Open Date', 'Close Date', 'Cost', 'Odometer', 'Notes'];
        const { data: logs, error } = await supabase.from('maintenance_logs').select('*');
        if (error) throw error;

        let filtered = logs;
        if (status) filtered = filtered.filter(l => l.state === status);
        filtered = filterByDateRange(filtered, 'scheduled_date');

        rows = filtered.map(l => [
          l.id,
          l.vehicle_id,
          l.maintenance_type,
          l.state,
          l.scheduled_date || '',
          l.open_date || '',
          l.close_date || '',
          l.cost || 0,
          l.odometer || '',
          l.notes || ''
        ]);
        break;
      }
      case 'fuel-efficiency':
      case 'fuel_efficiency': {
        headers = ['Trip ID', 'Trip Name', 'Vehicle ID', 'Actual Distance', 'Fuel Consumed', 'Fuel Efficiency (km/L)'];
        const { data: trips, error } = await supabase.from('trips').select('*').eq('state', 'Completed');
        if (error) throw error;

        const filtered = trips.filter(t => t.fuel_consumed > 0 && t.actual_distance > 0);

        rows = filtered.map(t => [
          t.id,
          t.name,
          t.vehicle_id,
          t.actual_distance,
          t.fuel_consumed,
          parseFloat((t.actual_distance / t.fuel_consumed).toFixed(2))
        ]);
        break;
      }
      case 'expenses':
      case 'expense-report':
      case 'expense_report': {
        headers = ['Expense ID', 'Vehicle ID', 'Trip ID', 'Expense Category', 'Amount', 'Date', 'Notes'];
        const { data: expenses, error } = await supabase.from('expenses').select('*');
        if (error) throw error;

        let filtered = expenses;
        if (status) filtered = filtered.filter(e => e.expense_category === status);
        filtered = filterByDateRange(filtered, 'date');

        rows = filtered.map(e => [
          e.id,
          e.vehicle_id,
          e.trip_id || '',
          e.expense_category,
          e.amount,
          e.date,
          e.notes || ''
        ]);
        break;
      }
      case 'vehicle-roi':
      case 'vehicle_roi': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Acquisition Cost', 'Total Fuel Cost', 'Total Maintenance Cost', 'Derived Revenue', 'Net Return', 'ROI'];
        const [vehiclesRes, fuelRes, maintenanceRes, tripsRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('fuel_logs').select('*'),
          supabase.from('maintenance_logs').select('*'),
          supabase.from('trips').select('*').eq('state', 'Completed')
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (fuelRes.error) throw fuelRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;
        if (tripsRes.error) throw tripsRes.error;

        rows = vehiclesRes.data.map(v => {
          const vFuel = fuelRes.data.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
          const vMaint = maintenanceRes.data.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
          const vTrips = tripsRes.data.filter(t => t.vehicle_id === v.id);
          const vDistance = vTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
          const vRevenue = vDistance * 1.50; // standard freight billing rate
          const acquisitionCost = parseFloat(v.acquisition_cost || 0) || 1.0;
          const roi = (vRevenue - (vMaint + vFuel)) / acquisitionCost;
          const netReturn = vRevenue - (vMaint + vFuel);

          return [
            v.id,
            v.name,
            v.registration_number,
            v.acquisition_cost || 0,
            vFuel,
            vMaint,
            vRevenue.toFixed(2),
            netReturn.toFixed(2),
            roi.toFixed(4)
          ];
        });
        break;
      }
      case 'license-expiry':
      case 'license_expiry':
      case 'license_expiry_report': {
        headers = ['Driver ID', 'Driver Name', 'License Number', 'License Expiry', 'Days to Expiry', 'Status'];
        const { data: drivers, error } = await supabase.from('drivers').select('*');
        if (error) throw error;

        rows = drivers.map(d => {
          const days = Math.ceil((new Date(d.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          let statusLabel = 'Valid';
          if (days < 0) statusLabel = 'Expired';
          else if (days <= 30) statusLabel = 'Expiring Soon';
          return [
            d.id,
            d.name,
            d.license_number,
            d.license_expiry_date,
            days,
            statusLabel
          ];
        });
        break;
      }
      case 'operational-cost':
      case 'operational_cost': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Fuel Cost', 'Maintenance Cost', 'Toll Expense', 'Misc Expense', 'Total Operational Cost'];
        const [vehiclesRes, fuelRes, maintenanceRes, expensesRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('fuel_logs').select('*'),
          supabase.from('maintenance_logs').select('*'),
          supabase.from('expenses').select('*')
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (fuelRes.error) throw fuelRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;
        if (expensesRes.error) throw expensesRes.error;

        rows = vehiclesRes.data.map(v => {
          const vFuel = fuelRes.data.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
          const vMaint = maintenanceRes.data.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
          const vToll = expensesRes.data.filter(e => e.vehicle_id === v.id && e.expense_category === 'Toll').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
          const vMisc = expensesRes.data.filter(e => e.vehicle_id === v.id && e.expense_category === 'Misc').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
          const total = vFuel + vMaint + vToll + vMisc;
          return [
            v.id,
            v.name,
            v.registration_number,
            vFuel,
            vMaint,
            vToll,
            vMisc,
            total
          ];
        });
        break;
      }
      default:
        return res.status(400).json({ error: `Invalid report name: ${reportName}` });
    }

    const csvContent = [headers.join(',')];
    for (const row of rows) {
      csvContent.push(row.map(escapeCell).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportName}_report.csv"`);
    res.status(200).send(csvContent.join('\n'));
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
