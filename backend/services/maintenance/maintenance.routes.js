const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

async function getMaintenanceTypeName(maintenance_type_id, fallback) {
  if (!maintenance_type_id) return fallback;
  const { data } = await supabaseAdmin
    .from('transit_ops_maintenance_type')
    .select('*')
    .eq('id', maintenance_type_id)
    .single();
  return data?.name || fallback || String(maintenance_type_id);
}

async function attachMaintenanceLookups(logs) {
  const rows = Array.isArray(logs) ? logs : [logs];
  const vehicleIds = [...new Set(rows.map((log) => log.vehicle_id).filter(Boolean))];
  const typeIds = [...new Set(rows.map((log) => log.maintenance_type_id).filter(Boolean))];

  const [vehiclesRes, typesRes] = await Promise.all([
    vehicleIds.length ? supabaseAdmin.from('vehicles').select('*').in('id', vehicleIds) : { data: [] },
    typeIds.length ? supabaseAdmin.from('transit_ops_maintenance_type').select('*').in('id', typeIds) : { data: [] },
  ]);

  const vehiclesById = new Map((vehiclesRes.data || []).map((vehicle) => [String(vehicle.id), vehicle]));
  const typesById = new Map((typesRes.data || []).map((type) => [String(type.id), type]));

  const enriched = rows.map((log) => ({
    ...log,
    transit_ops_vehicle: log.vehicle_id ? vehiclesById.get(String(log.vehicle_id)) || null : null,
    transit_ops_maintenance_type: log.maintenance_type_id
      ? typesById.get(String(log.maintenance_type_id)) || { name: log.maintenance_type }
      : { name: log.maintenance_type },
  }));

  return Array.isArray(logs) ? enriched : enriched[0];
}

// GET /api/maintenance — List all maintenance logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { vehicle_id, state } = req.query;

    let query = supabaseAdmin.from('maintenance_logs').select('*').is('deleted_at', null);

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }

    if (state) {
      query = query.eq('state', state);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('List maintenance error:', error);
      return res.status(500).json({ error: 'Failed to fetch maintenance logs' });
    }

    const logs = await attachMaintenanceLookups(data || []);
    res.json({ maintenance_logs: logs, count: logs.length });
  } catch (err) {
    console.error('List maintenance exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance/:id — Get maintenance log details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('maintenance_logs')
      .select('*')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }

    res.json(await attachMaintenanceLookups(data));
  } catch (err) {
    console.error('Get maintenance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance — Create a new maintenance log (Fleet Manager, Safety Officer, Admin)
router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  requirePermission('maintenance', 'create'),
  async (req, res) => {
    const { vehicle_id, maintenance_type, maintenance_type_id, scheduled_date, notes, cost } = req.body;

    if (!vehicle_id || (!maintenance_type && !maintenance_type_id)) {
      return res.status(400).json({ error: 'vehicle_id and maintenance_type are required' });
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

      // Create maintenance log in Scheduled state
      const resolvedMaintenanceType = await getMaintenanceTypeName(maintenance_type_id, maintenance_type);
      const { data: log, error: logError } = await supabaseAdmin
        .from('maintenance_logs')
        .insert({
          vehicle_id,
          maintenance_type: resolvedMaintenanceType,
          maintenance_type_id: maintenance_type_id || null,
          scheduled_date,
          notes,
          cost: cost || 0,
          state: 'Scheduled',
        })
        .select()
        .single();

      if (logError) {
        console.error('Maintenance creation error:', logError);
        return res.status(400).json({ error: logError.message });
      }

      res.status(201).json(await attachMaintenanceLookups(log));
    } catch (err) {
      console.error('Create maintenance exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/maintenance/:id/open — Open maintenance (Fleet Manager, Safety Officer, Admin)
router.post(
  '/:id/open',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  async (req, res) => {
    try {
      const { data: log, error: logError } = await supabaseAdmin
        .from('maintenance_logs')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (logError || !log) {
        return res.status(404).json({ error: 'Maintenance log not found' });
      }

      if (log.state !== 'Scheduled') {
        return res.status(400).json({ error: `Cannot open maintenance in ${log.state} state` });
      }

      // Get vehicle
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', log.vehicle_id)
        .single();

      if (vehicle.status === 'Retired') {
        return res.status(400).json({ error: 'Cannot open maintenance for retired vehicles' });
      }

      // Update maintenance to Open
      await supabaseAdmin
        .from('maintenance_logs')
        .update({ state: 'Open', open_date: new Date().toISOString().split('T')[0] })
        .eq('id', log.id);

      // Update vehicle to In Shop
      await supabaseAdmin.from('vehicles').update({ status: 'In Shop' }).eq('id', log.vehicle_id);

      res.json({ message: 'Maintenance opened successfully', state: 'Open' });
    } catch (err) {
      console.error('Open maintenance exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/maintenance/:id/close — Close maintenance (Fleet Manager, Safety Officer, Admin)
router.post(
  '/:id/close',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  async (req, res) => {
    const { cost, odometer } = req.body;

    try {
      const { data: log, error: logError } = await supabaseAdmin
        .from('maintenance_logs')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (logError || !log) {
        return res.status(404).json({ error: 'Maintenance log not found' });
      }

      if (log.state !== 'Open') {
        return res.status(400).json({ error: `Cannot close maintenance in ${log.state} state` });
      }

      // Update maintenance to Closed
      const closeDate = new Date().toISOString().split('T')[0];
      await supabaseAdmin
        .from('maintenance_logs')
        .update({
          state: 'Closed',
          close_date: closeDate,
          cost: cost !== undefined ? cost : log.cost,
          odometer,
        })
        .eq('id', log.id);

      // Get vehicle
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', log.vehicle_id)
        .single();

      // Update vehicle: back to Available unless Retired
      const newStatus = vehicle.status === 'Retired' ? 'Retired' : 'Available';
      const updateData = { status: newStatus };
      if (odometer) {
        updateData.odometer = odometer;
      }

      await supabaseAdmin.from('vehicles').update(updateData).eq('id', log.vehicle_id);

      res.json({ message: 'Maintenance closed successfully', state: 'Closed' });
    } catch (err) {
      console.error('Close maintenance exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/maintenance/:id — Update maintenance log
router.put(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  requirePermission('maintenance', 'update'),
  async (req, res) => {
    const { maintenance_type, maintenance_type_id, scheduled_date, notes, cost } = req.body;

    try {
      const { data: log, error: logError } = await supabaseAdmin
        .from('maintenance_logs')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (logError || !log) {
        return res.status(404).json({ error: 'Maintenance log not found' });
      }

      // Can only update Scheduled logs
      if (log.state !== 'Scheduled') {
        return res.status(400).json({ error: 'Can only update maintenance in Scheduled state' });
      }

      const resolvedMaintenanceType = await getMaintenanceTypeName(
        maintenance_type_id,
        maintenance_type || log.maintenance_type
      );
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('maintenance_logs')
        .update({
          maintenance_type: resolvedMaintenanceType,
          maintenance_type_id: maintenance_type_id !== undefined ? maintenance_type_id : log.maintenance_type_id,
          scheduled_date,
          notes,
          cost: cost !== undefined ? cost : log.cost,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json(await attachMaintenanceLookups(updated));
    } catch (err) {
      console.error('Update maintenance exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/maintenance/:id — Delete a maintenance log (Fleet Manager, Safety Officer, Admin)
router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  requirePermission('maintenance', 'delete'),
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from('maintenance_logs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', req.params.id);

      if (error) {
        console.error('Maintenance deletion error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Maintenance log deleted' });
    } catch (err) {
      console.error('Delete maintenance exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
