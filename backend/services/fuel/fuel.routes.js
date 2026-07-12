const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

async function attachFuelLookups(logs) {
  const rows = Array.isArray(logs) ? logs : [logs];
  const vehicleIds = [...new Set(rows.map((log) => log.vehicle_id).filter(Boolean))];
  const vehiclesRes = vehicleIds.length
    ? await supabaseAdmin.from('vehicles').select('*').in('id', vehicleIds)
    : { data: [] };
  const vehiclesById = new Map((vehiclesRes.data || []).map((vehicle) => [String(vehicle.id), vehicle]));
  const enriched = rows.map((log) => ({
    ...log,
    transit_ops_vehicle: log.vehicle_id ? vehiclesById.get(String(log.vehicle_id)) || null : null,
  }));
  return Array.isArray(logs) ? enriched : enriched[0];
}

// GET /api/fuel — List all fuel logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { vehicle_id, from_date, to_date } = req.query;

    let query = supabaseAdmin.from('fuel_logs').select('*').is('deleted_at', null);

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }

    if (from_date) {
      query = query.gte('date', from_date);
    }

    if (to_date) {
      query = query.lte('date', to_date);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('List fuel logs error:', error);
      return res.status(500).json({ error: 'Failed to fetch fuel logs' });
    }

    // Calculate totals
    const totals = {
      total_litres: data.reduce((sum, log) => sum + log.litres, 0),
      total_cost: data.reduce((sum, log) => sum + parseFloat(log.cost || 0), 0),
      avg_efficiency: data.filter((log) => log.fuel_efficiency).reduce((sum, log) => sum + log.fuel_efficiency, 0) / (data.filter((log) => log.fuel_efficiency).length || 1),
    };

    const fuelLogs = await attachFuelLookups(data || []);
    res.json({ fuel_logs: fuelLogs, count: fuelLogs.length, totals });
  } catch (err) {
    console.error('List fuel logs exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fuel/:id — Get fuel log details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('fuel_logs')
      .select('*')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Fuel log not found' });
    }

    res.json(await attachFuelLookups(data));
  } catch (err) {
    console.error('Get fuel log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/fuel — Create a new fuel log (Driver, Fleet Manager, Financial Analyst, Admin)
router.post(
  '/',
  authenticate,
  requireRole('driver', 'fleet_manager', 'financial_analyst', 'admin'),
  requirePermission('fuel', 'create'),
  async (req, res) => {
    const { vehicle_id, date, litres, cost, odometer, location } = req.body;

    if (!vehicle_id || !date || !litres || !cost) {
      return res.status(400).json({ error: 'vehicle_id, date, litres, and cost are required' });
    }

    if (litres <= 0 || cost <= 0) {
      return res.status(400).json({ error: 'litres and cost must be greater than 0' });
    }

    try {
      // Validate vehicle exists
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', vehicle_id)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Get previous fuel log to calculate efficiency
      const { data: prevLog } = await supabaseAdmin
        .from('fuel_logs')
        .select('odometer')
        .eq('vehicle_id', vehicle_id)
        .lt('date', date)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      let fuel_efficiency = null;
      if (odometer && prevLog && prevLog.odometer && odometer > prevLog.odometer) {
        fuel_efficiency = (odometer - prevLog.odometer) / litres;
      }

      // Create fuel log
      const { data: log, error: logError } = await supabaseAdmin
        .from('fuel_logs')
        .insert({
          vehicle_id,
          date,
          litres,
          cost,
          odometer,
          location: location || null,
          fuel_efficiency,
        })
        .select()
        .single();

      if (logError) {
        console.error('Fuel log creation error:', logError);
        return res.status(400).json({ error: logError.message });
      }

      // Update vehicle odometer if provided
      if (odometer) {
        await supabaseAdmin.from('vehicles').update({ odometer }).eq('id', vehicle_id);
      }

      res.status(201).json(await attachFuelLookups(log));
    } catch (err) {
      console.error('Create fuel log exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/fuel/:id — Update fuel log (Fleet Manager, Financial Analyst, Admin)
router.put(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'financial_analyst', 'admin'),
  requirePermission('fuel', 'update'),
  async (req, res) => {
    const { litres, cost, odometer } = req.body;

    try {
      const { data: log, error: logError } = await supabaseAdmin
        .from('fuel_logs')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (logError || !log) {
        return res.status(404).json({ error: 'Fuel log not found' });
      }

      // Recalculate efficiency if odometer changed
      let fuel_efficiency = log.fuel_efficiency;
      if (odometer && litres) {
        const { data: prevLog } = await supabaseAdmin
          .from('fuel_logs')
          .select('odometer')
          .eq('vehicle_id', log.vehicle_id)
          .lt('date', log.date)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (prevLog && prevLog.odometer && odometer > prevLog.odometer) {
          fuel_efficiency = (odometer - prevLog.odometer) / litres;
        }
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('fuel_logs')
        .update({
          litres: litres || log.litres,
          cost: cost || log.cost,
          odometer: odometer !== undefined ? odometer : log.odometer,
          fuel_efficiency,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      // Update vehicle odometer if changed
      if (odometer && odometer !== log.odometer) {
        await supabaseAdmin.from('vehicles').update({ odometer }).eq('id', log.vehicle_id);
      }

      res.json(updated);
    } catch (err) {
      console.error('Update fuel log exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/fuel/:id — Delete fuel log (Fleet Manager, Financial Analyst, Admin)
router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'financial_analyst', 'admin'),
  requirePermission('fuel', 'delete'),
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from('fuel_logs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', req.params.id);

      if (error) {
        console.error('Fuel log deletion error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Fuel log deleted successfully' });
    } catch (err) {
      console.error('Delete fuel log exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/fuel/vehicle/:vehicle_id/efficiency — Get average fuel efficiency for a vehicle
router.get('/vehicle/:vehicle_id/efficiency', authenticate, async (req, res) => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('fuel_logs')
      .select('fuel_efficiency, litres, odometer')
      .eq('vehicle_id', req.params.vehicle_id)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch fuel efficiency data' });
    }

    // Filter to only logs with valid efficiency values
    const validLogs = logs.filter((log) => log.fuel_efficiency && !isNaN(log.fuel_efficiency));

    if (validLogs.length === 0) {
      return res.json({
        vehicle_id: req.params.vehicle_id,
        avg_efficiency: 0,
        best_efficiency: 0,
        worst_efficiency: 0,
        total_logs: 0,
        message: 'No fuel efficiency data available',
      });
    }

    const avg_efficiency = validLogs.reduce((sum, log) => sum + log.fuel_efficiency, 0) / validLogs.length;
    const best_efficiency = Math.max(...validLogs.map((l) => l.fuel_efficiency));
    const worst_efficiency = Math.min(...validLogs.map((l) => l.fuel_efficiency));

    res.json({
      vehicle_id: req.params.vehicle_id,
      avg_efficiency: isNaN(avg_efficiency) ? 0 : avg_efficiency,
      best_efficiency: isNaN(best_efficiency) ? 0 : best_efficiency,
      worst_efficiency: isNaN(worst_efficiency) ? 0 : worst_efficiency,
      total_logs: validLogs.length,
    });
  } catch (err) {
    console.error('Get efficiency exception:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
