const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_maintenance_log')
    .select('*, transit_ops_vehicle(registration_number, vehicle_name), transit_ops_maintenance_type(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', authenticate, requireRole('fleet_manager', 'safety_officer', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_maintenance_log')
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_maintenance_log')
    .select('*, transit_ops_vehicle(*), transit_ops_maintenance_type(name)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Maintenance log not found' });
  res.json(data);
});

router.put('/:id', authenticate, requireRole('fleet_manager', 'safety_officer', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_maintenance_log')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authenticate, requireRole('fleet_manager', 'safety_officer', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('transit_ops_maintenance_log')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Maintenance log deleted' });
});

// POST /api/maintenance/:id/open — triggers vehicle status change via DB trigger
router.post('/:id/open', authenticate, requireRole('fleet_manager', 'safety_officer', 'admin'), async (req, res) => {
  const { data: updated, error: updateErr } = await supabase
    .from('transit_ops_maintenance_log')
    .update({ state: 'Open', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  res.json(updated);
});

// POST /api/maintenance/:id/close
router.post('/:id/close', authenticate, requireRole('fleet_manager', 'safety_officer', 'admin'), async (req, res) => {
  const { data: updated, error: updateErr } = await supabase
    .from('transit_ops_maintenance_log')
    .update({ state: 'Closed', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });
  res.json(updated);
});

module.exports = router;
