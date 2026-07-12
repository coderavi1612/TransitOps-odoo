const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_fuel_log')
    .select('*, transit_ops_vehicle(registration_number, vehicle_name)')
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_fuel_log')
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_fuel_log')
    .select('*, transit_ops_vehicle(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Fuel log not found' });
  res.json(data);
});

router.put('/:id', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_fuel_log')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authenticate, requireRole('fleet_manager', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('transit_ops_fuel_log')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Fuel log deleted' });
});

module.exports = router;
