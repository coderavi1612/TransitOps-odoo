const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

async function attachVehicleLookups(vehicles) {
  const rows = Array.isArray(vehicles) ? vehicles : [vehicles];
  const typeIds = [...new Set(rows.map((v) => v.vehicle_type_id).filter(Boolean))];
  const regionIds = [...new Set(rows.map((v) => v.region_id).filter(Boolean))];

  const [typesRes, regionsRes] = await Promise.all([
    typeIds.length ? supabaseAdmin.from('transit_ops_vehicle_type').select('*').in('id', typeIds) : { data: [] },
    regionIds.length ? supabaseAdmin.from('transit_ops_region').select('*').in('id', regionIds) : { data: [] },
  ]);

  const typesById = new Map((typesRes.data || []).map((type) => [String(type.id), type]));
  const regionsById = new Map((regionsRes.data || []).map((region) => [String(region.id), region]));

  const enriched = rows.map((vehicle) => ({
    ...vehicle,
    transit_ops_vehicle_type: vehicle.vehicle_type_id ? typesById.get(String(vehicle.vehicle_type_id)) || null : null,
    transit_ops_region: vehicle.region_id ? regionsById.get(String(vehicle.region_id)) || null : null,
  }));

  return Array.isArray(vehicles) ? enriched : enriched[0];
}

// GET /api/vehicles — List all vehicles
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, region, type } = req.query;
    let query = supabaseAdmin.from('vehicles').select('*').is('deleted_at', null);

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }
    if (region && region !== 'All') {
      query = query.eq('region_id', region);
    }
    if (type && type !== 'All') {
      query = query.eq('vehicle_type_id', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('List vehicles error:', error);
      return res.status(500).json({ error: 'Failed to fetch vehicles' });
    }

    const vehicles = await attachVehicleLookups(data || []);
    res.json({ vehicles, count: vehicles.length });
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
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(await attachVehicleLookups(data));
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
    const {
      name,
      vehicle_name,
      registration_number,
      vehicle_model,
      manufacturer,
      capacity,
      status,
      odometer,
      acquisition_cost,
      vehicle_type_id,
      region_id,
    } = req.body;

    const resolvedVehicleModel = vehicle_model || vehicle_name;
    const resolvedVehicleName = vehicle_name || vehicle_model || name;

    if (!name || !registration_number || !resolvedVehicleModel || !capacity) {
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
          vehicle_name: resolvedVehicleName,
          registration_number,
          vehicle_model: resolvedVehicleModel,
          manufacturer: manufacturer || '',
          capacity,
          status: status || 'Available',
          odometer: odometer || 0,
          acquisition_cost: acquisition_cost || 0,
          vehicle_type_id: vehicle_type_id || null,
          region_id: region_id || null,
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

      res.status(201).json(await attachVehicleLookups(vehicle));
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
    const {
      name,
      vehicle_name,
      vehicle_model,
      manufacturer,
      capacity,
      status,
      odometer,
      acquisition_cost,
      vehicle_type_id,
      region_id,
    } = req.body;

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
          vehicle_name: vehicle_name !== undefined ? vehicle_name : vehicle.vehicle_name,
          vehicle_model: vehicle_model || vehicle.vehicle_model,
          manufacturer: manufacturer !== undefined ? manufacturer : vehicle.manufacturer,
          capacity: capacity || vehicle.capacity,
          status: status || vehicle.status,
          odometer: odometer !== undefined ? odometer : vehicle.odometer,
          acquisition_cost: acquisition_cost !== undefined ? acquisition_cost : vehicle.acquisition_cost,
          vehicle_type_id: vehicle_type_id !== undefined ? vehicle_type_id : vehicle.vehicle_type_id,
          region_id: region_id !== undefined ? region_id : vehicle.region_id,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json(await attachVehicleLookups(updated));
    } catch (err) {
      console.error('Update vehicle exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/vehicles/:id — Delete vehicle (Fleet Manager, Admin)
router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('vehicles', 'delete'),
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from('vehicles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', req.params.id);

      if (error) {
        console.error('Vehicle deletion error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Vehicle deleted' });
    } catch (err) {
      console.error('Delete vehicle exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
