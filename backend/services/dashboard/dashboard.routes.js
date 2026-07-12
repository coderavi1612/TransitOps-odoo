const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');

const router = express.Router();

// GET /api/dashboard/kpis
router.get('/kpis', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('v_dashboard_kpis').select('*').single();
  if (error) {
    // Fallback: compute manually
    const [vehicles, drivers, trips] = await Promise.all([
      supabase.from('transit_ops_vehicle').select('status'),
      supabase.from('transit_ops_driver').select('status'),
      supabase.from('transit_ops_trip').select('state'),
    ]);

    const vStatuses = (vehicles.data || []).map((v) => v.status);
    const dStatuses = (drivers.data || []).map((d) => d.status);
    const tStates = (trips.data || []).map((t) => t.state);

    return res.json({
      active_vehicles: vStatuses.filter((s) => s !== 'Retired').length,
      available_vehicles: vStatuses.filter((s) => s === 'Available').length,
      vehicles_in_maintenance: vStatuses.filter((s) => s === 'In Shop').length,
      retired_vehicles: vStatuses.filter((s) => s === 'Retired').length,
      drivers_on_duty: dStatuses.filter((s) => s === 'On Trip').length,
      drivers_available: dStatuses.filter((s) => s === 'Available').length,
      active_trips: tStates.filter((s) => s === 'Dispatched').length,
      pending_trips: tStates.filter((s) => s === 'Draft').length,
      completed_trips: tStates.filter((s) => s === 'Completed').length,
    });
  }

  res.json(data);
});

// GET /api/dashboard/analytics
router.get('/analytics', authenticate, async (req, res) => {
  const { vehicle_type_id, region_id, status, date_from, date_to } = req.query;

  let query = supabase.from('transit_ops_trip').select('*, transit_ops_vehicle(*), transit_ops_driver(*)');

  if (date_from) query = query.gte('planned_date', date_from);
  if (date_to) query = query.lte('planned_date', date_to);
  if (status) query = query.eq('state', status);

  const { data: trips, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const completed = trips.filter((t) => t.state === 'Completed');
  const fuelEfficiency = completed
    .filter((t) => t.fuel_consumed > 0 && t.actual_distance > 0)
    .map((t) => ({
      trip_id: t.id,
      trip_name: t.name,
      efficiency: (t.actual_distance / t.fuel_consumed).toFixed(2),
    }));

  res.json({
    total_trips: trips.length,
    completed_trips: completed.length,
    fuel_efficiency: fuelEfficiency,
  });
});

module.exports = router;
