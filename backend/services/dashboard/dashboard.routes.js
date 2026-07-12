const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

// GET /api/dashboard/kpis
router.get('/kpis', authenticate, async (req, res) => {
  try {
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

    const vehicles = vehiclesRes.data || [];
    const drivers = driversRes.data || [];
    const trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];
    const expenses = expensesRes.data || [];

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
