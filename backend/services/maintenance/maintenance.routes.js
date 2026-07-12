const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

// GET /api/maintenance — List all maintenance logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { vehicle_id, state } = req.query;

    let query = supabaseAdmin.from('maintenance_logs').select('*');

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

    res.json({ maintenance_logs: data, count: data.length });
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
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }

    res.json(data);
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
    const { vehicle_id, maintenance_type, scheduled_date, notes } = req.body;

    if (!vehicle_id || !maintenance_type) {
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
      const { data: log, error: logError } = await supabaseAdmin
        .from('maintenance_logs')
        .insert({
          vehicle_id,
          maintenance_type,
          scheduled_date,
          notes,
          state: 'Scheduled',
        })
        .select()
        .single();

      if (logError) {
        console.error('Maintenance creation error:', logError);
        return res.status(400).json({ error: logError.message });
      }

      res.status(201).json(log);
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
          cost: cost || 0,
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
    const { maintenance_type, scheduled_date, notes } = req.body;

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

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('maintenance_logs')
        .update({
          maintenance_type,
          scheduled_date,
          notes,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json(updated);
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
        .delete()
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
