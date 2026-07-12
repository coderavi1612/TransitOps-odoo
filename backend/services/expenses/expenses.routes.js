const express = require('express');
const { supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_expense')
    .select('*, transit_ops_vehicle(registration_number, vehicle_name), transit_ops_expense_category(name, category_type), transit_ops_trip(name)')
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', authenticate, requireRole('fleet_manager', 'financial_analyst', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_expense')
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_expense')
    .select('*, transit_ops_vehicle(*), transit_ops_expense_category(*), transit_ops_trip(name)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Expense not found' });
  res.json(data);
});

router.put('/:id', authenticate, requireRole('fleet_manager', 'financial_analyst', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_expense')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authenticate, requireRole('fleet_manager', 'financial_analyst', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('transit_ops_expense')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Expense deleted' });
});

module.exports = router;
