const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_trip')
    .select('*, transit_ops_vehicle(registration_number, vehicle_name), transit_ops_driver(name, license_number), transit_ops_region(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_trip')
    .insert({ ...req.body, state: 'Draft' })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_trip')
    .select('*, transit_ops_vehicle(*), transit_ops_driver(*), transit_ops_region(name)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Trip not found' });
  res.json(data);
});

router.put('/:id', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_trip')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('transit_ops_trip')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Trip deleted' });
});

// POST /api/trips/:id/dispatch — delegates to DB trigger via state update
router.post('/:id/dispatch', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { data: trip, error: tripErr } = await supabase
    .from('transit_ops_trip')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (tripErr || !trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.state !== 'Draft') return res.status(400).json({ error: `Cannot dispatch trip in state: ${trip.state}` });

  // Fetch vehicle odometer for start_odometer
  const { data: vehicle } = await supabase
    .from('transit_ops_vehicle')
    .select('odometer')
    .eq('id', trip.vehicle_id)
    .single();

  const { data: updated, error: updateErr } = await supabase
    .from('transit_ops_trip')
    .update({
      state: 'Dispatched',
      start_odometer: vehicle?.odometer || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  res.json(updated);
});

// POST /api/trips/:id/complete
router.post('/:id/complete', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { end_odometer, fuel_consumed } = req.body;
  if (!end_odometer) return res.status(400).json({ error: 'end_odometer is required' });

  const { data: updated, error: updateErr } = await supabase
    .from('transit_ops_trip')
    .update({
      state: 'Completed',
      end_odometer,
      fuel_consumed: fuel_consumed || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  res.json(updated);
});

// POST /api/trips/:id/cancel
router.post('/:id/cancel', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { data: updated, error: updateErr } = await supabase
    .from('transit_ops_trip')
    .update({ state: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  res.json(updated);
});

module.exports = router;
