const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

// GET /api/vehicles — List all vehicles
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin.from('vehicles').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('List vehicles error:', error);
      return res.status(500).json({ error: 'Failed to fetch vehicles' });
    }

    res.json({ vehicles: data || [], count: (data || []).length });
  } catch (err) {
    console.error('List vehicles exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vehicles/:id — Get vehicle details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Get vehicle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vehicles — Create vehicle (Fleet Manager, Admin)
router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('vehicles', 'create'),
  async (req, res) => {
    const { name, registration_number, vehicle_model, manufacturer, capacity } = req.body;

    if (!name || !registration_number || !vehicle_model || !capacity) {
      return res.status(400).json({ error: 'Missing required fields: name, registration_number, vehicle_model, capacity' });
    }

    try {
      // Check registration number uniqueness
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('registration_number', registration_number)
        .limit(1);

      if (checkError) {
        console.error('Vehicle uniqueness check error:', {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
        });
        return res.status(500).json({ 
          error: 'Database error during uniqueness check',
          details: checkError.message 
        });
      }

      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Registration number already exists' });
      }

      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .insert({
          name,
          registration_number,
          vehicle_model,
          manufacturer: manufacturer || '',
          capacity,
          status: 'Available',
          odometer: 0,
        })
        .select()
        .single();

      if (vehicleError) {
        console.error('Vehicle creation error:', {
          message: vehicleError.message,
          code: vehicleError.code,
          details: vehicleError.details,
        });
        return res.status(400).json({ 
          error: 'Vehicle creation failed',
          details: vehicleError.message 
        });
      }

      res.status(201).json(vehicle);
    } catch (err) {
      console.error('Create vehicle exception:', err.message);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
);

// PUT /api/vehicles/:id — Update vehicle (Fleet Manager, Admin)
router.put(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('vehicles', 'update'),
  async (req, res) => {
    const { name, vehicle_model, manufacturer, capacity, status } = req.body;

    try {
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('vehicles')
        .update({
          name: name || vehicle.name,
          vehicle_model: vehicle_model || vehicle.vehicle_model,
          manufacturer: manufacturer !== undefined ? manufacturer : vehicle.manufacturer,
          capacity: capacity || vehicle.capacity,
          status: status || vehicle.status,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json(updated);
    } catch (err) {
      console.error('Update vehicle exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
