const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

// GET /api/trips — List all trips (Fleet Manager, Safety Officer, Financial Analyst can see all)
router.get('/', authenticate, async (req, res) => {
  try {
    // Drivers can only see their assigned trips
    let query = supabaseAdmin.from('trips').select('*');

    // Initialize userRoles if not set
    const userRoles = req.userRoles || [];

    if (userRoles.includes('driver')) {
      // Get trips assigned to this driver
      const { data: driverData } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .eq('email', req.user.email)
        .single();

      if (!driverData) {
        return res.status(404).json({ error: 'Driver profile not found' });
      }

      query = query.eq('driver_id', driverData.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('List trips error:', error);
      return res.status(500).json({ error: 'Failed to fetch trips' });
    }

    res.json({ trips: data, count: data.length });
  } catch (err) {
    console.error('List trips exception:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/trips/:id — Get trip details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Driver can only see their own assigned trips
    const userRoles = req.userRoles || [];
    if (userRoles.includes('driver')) {
      const { data: driverData } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .eq('email', req.user.email)
        .single();

      if (!driverData || data.driver_id !== driverData.id) {
        return res.status(403).json({ error: 'You can only view your assigned trips' });
      }
    }

    res.json(data);
  } catch (err) {
    console.error('Get trip error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/trips — Create a new trip (Fleet Manager only)
router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('trips', 'create'),
  async (req, res) => {
    const { name, source, destination, cargo_weight, planned_distance, vehicle_id, driver_id, planned_date } = req.body;

    if (!name || !source || !destination || cargo_weight === undefined || !planned_distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Validate vehicle exists and is Available
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', vehicle_id)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // Validate driver exists and is Available
      const { data: driver, error: driverError } = await supabaseAdmin
        .from('drivers')
        .select('*')
        .eq('id', driver_id)
        .single();

      if (driverError || !driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      // Check cargo weight <= vehicle capacity
      if (cargo_weight > vehicle.capacity) {
        return res.status(400).json({
          error: `Cargo weight (${cargo_weight}) exceeds vehicle capacity (${vehicle.capacity})`,
        });
      }

      // Create trip in Draft state
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .insert({
          name,
          source,
          destination,
          cargo_weight,
          planned_distance,
          vehicle_id,
          driver_id,
          planned_date,
          state: 'Draft',
        })
        .select()
        .single();

      if (tripError) {
        console.error('Trip creation error:', tripError);
        return res.status(400).json({ error: tripError.message });
      }

      res.status(201).json(trip);
    } catch (err) {
      console.error('Create trip exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/trips/:id/dispatch — Dispatch a trip (Fleet Manager only)
router.post(
  '/:id/dispatch',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  async (req, res) => {
    try {
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      if (trip.state !== 'Draft') {
        return res.status(400).json({ error: `Cannot dispatch trip in ${trip.state} state` });
      }

      // Get vehicle and driver
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', trip.vehicle_id)
        .single();

      const { data: driver } = await supabaseAdmin
        .from('drivers')
        .select('*')
        .eq('id', trip.driver_id)
        .single();

      // Validate vehicle and driver status
      if (vehicle.status !== 'Available') {
        return res.status(400).json({ error: `Vehicle is ${vehicle.status} and cannot be dispatched` });
      }

      if (driver.status !== 'Available') {
        return res.status(400).json({ error: `Driver is ${driver.status} and cannot be dispatched` });
      }

      // Check license expiry
      const today = new Date().toISOString().split('T')[0];
      if (driver.license_expiry_date < today) {
        return res.status(400).json({ error: 'Driver license has expired' });
      }

      // Validate cargo vs capacity
      if (trip.cargo_weight > vehicle.capacity) {
        return res.status(400).json({ error: 'Cargo weight exceeds vehicle capacity' });
      }

      // Update trip to Dispatched
      const { error: updateTripError } = await supabaseAdmin
        .from('trips')
        .update({
          state: 'Dispatched',
          dispatch_datetime: new Date().toISOString(),
          start_odometer: vehicle.odometer,
        })
        .eq('id', trip.id);

      if (updateTripError) {
        return res.status(400).json({ error: updateTripError.message });
      }

      // Update vehicle to On Trip
      await supabaseAdmin
        .from('vehicles')
        .update({ status: 'On Trip', active_trip_id: trip.id })
        .eq('id', trip.vehicle_id);

      // Update driver to On Trip
      await supabaseAdmin
        .from('drivers')
        .update({ status: 'On Trip', active_trip_id: trip.id })
        .eq('id', trip.driver_id);

      res.json({ message: 'Trip dispatched successfully', state: 'Dispatched' });
    } catch (err) {
      console.error('Dispatch trip exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/trips/:id/complete — Complete a trip (Fleet Manager or Driver)
router.post(
  '/:id/complete',
  authenticate,
  async (req, res) => {
    const { end_odometer, fuel_consumed } = req.body;

    if (!end_odometer) {
      return res.status(400).json({ error: 'end_odometer is required' });
    }

    try {
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      // Check access: only trip driver or fleet manager/admin can complete
      const userRoles = req.userRoles || [];
      if (userRoles.includes('driver')) {
        const { data: driverData } = await supabaseAdmin
          .from('drivers')
          .select('id')
          .eq('email', req.user.email)
          .single();

        if (!driverData || trip.driver_id !== driverData.id) {
          return res.status(403).json({ error: 'You can only complete your assigned trips' });
        }
      } else if (!userRoles.includes('fleet_manager') && !userRoles.includes('admin')) {
        return res.status(403).json({ error: 'Only fleet managers can complete trips' });
      }

      if (trip.state !== 'Dispatched') {
        return res.status(400).json({ error: `Cannot complete trip in ${trip.state} state` });
      }

      // Get vehicle
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('id', trip.vehicle_id)
        .single();

      if (end_odometer < trip.start_odometer) {
        return res.status(400).json({ error: 'End odometer cannot be less than start odometer' });
      }

      const actual_distance = end_odometer - trip.start_odometer;

      // Update trip to Completed
      await supabaseAdmin
        .from('trips')
        .update({
          state: 'Completed',
          completion_datetime: new Date().toISOString(),
          end_odometer,
          actual_distance,
          fuel_consumed,
        })
        .eq('id', trip.id);

      // Update vehicle to Available
      await supabaseAdmin
        .from('vehicles')
        .update({ status: 'Available', active_trip_id: null, odometer: end_odometer })
        .eq('id', trip.vehicle_id);

      // Update driver to Available
      await supabaseAdmin
        .from('drivers')
        .update({ status: 'Available', active_trip_id: null })
        .eq('id', trip.driver_id);

      res.json({ message: 'Trip completed successfully', state: 'Completed', actual_distance });
    } catch (err) {
      console.error('Complete trip exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/trips/:id/cancel — Cancel a trip (Fleet Manager only)
router.post(
  '/:id/cancel',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  async (req, res) => {
    try {
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      if (trip.state === 'Completed' || trip.state === 'Cancelled') {
        return res.status(400).json({ error: `Cannot cancel trip in ${trip.state} state` });
      }

      // Update trip to Cancelled
      await supabaseAdmin.from('trips').update({ state: 'Cancelled' }).eq('id', trip.id);

      // If Dispatched, reset vehicle and driver
      if (trip.state === 'Dispatched') {
        await supabaseAdmin
          .from('vehicles')
          .update({ status: 'Available', active_trip_id: null })
          .eq('id', trip.vehicle_id);

        await supabaseAdmin
          .from('drivers')
          .update({ status: 'Available', active_trip_id: null })
          .eq('id', trip.driver_id);
      }

      res.json({ message: 'Trip cancelled successfully', state: 'Cancelled' });
    } catch (err) {
      console.error('Cancel trip exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
