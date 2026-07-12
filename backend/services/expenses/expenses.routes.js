const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

// GET /api/expenses — List expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { vehicle_id, trip_id } = req.query;
    let query = supabaseAdmin.from('expenses').select('*');

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }
    if (trip_id) {
      query = query.eq('trip_id', trip_id);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/expenses — Create expense
router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'financial_analyst', 'admin'),
  requirePermission('expenses', 'create'),
  async (req, res) => {
    const { vehicle_id, trip_id, expense_category, amount, date, notes } = req.body;

    if (!vehicle_id || !expense_category || !amount || !date) {
      return res.status(400).json({ error: 'Missing required fields: vehicle_id, expense_category, amount, date' });
    }

    const validCategories = ['Toll', 'Maintenance', 'Misc'];
    if (!validCategories.includes(expense_category)) {
      return res.status(400).json({ error: `Invalid expense_category. Must be one of: ${validCategories.join(', ')}` });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .insert({
          vehicle_id,
          trip_id: trip_id || null,
          expense_category,
          amount,
          date,
          notes: notes || '',
        })
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      console.error('Create expense error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/expenses/:id — Get details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Expense not found' });
    res.json(data);
  } catch (err) {
    console.error('Get expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/expenses/:id — Update expense
router.put(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'financial_analyst', 'admin'),
  requirePermission('expenses', 'update'),
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      console.error('Update expense error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/expenses/:id — Delete expense
router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'financial_analyst', 'admin'),
  requirePermission('expenses', 'delete'),
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from('expenses')
        .delete()
        .eq('id', req.params.id);

      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: 'Expense deleted' });
    } catch (err) {
      console.error('Delete expense error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
