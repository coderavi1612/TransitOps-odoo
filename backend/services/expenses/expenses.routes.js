const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

async function getExpenseCategory(expense_category_id, fallback) {
  if (!expense_category_id) {
    return { id: null, name: fallback || 'Misc', category_type: fallback || 'Misc' };
  }
  const { data } = await supabaseAdmin
    .from('transit_ops_expense_category')
    .select('*')
    .eq('id', expense_category_id)
    .single();
  return data || { id: expense_category_id, name: fallback || 'Misc', category_type: fallback || 'Misc' };
}

async function attachExpenseLookups(expenses) {
  const rows = Array.isArray(expenses) ? expenses : [expenses];
  const vehicleIds = [...new Set(rows.map((expense) => expense.vehicle_id).filter(Boolean))];
  const categoryIds = [...new Set(rows.map((expense) => expense.expense_category_id).filter(Boolean))];

  const [vehiclesRes, categoriesRes] = await Promise.all([
    vehicleIds.length ? supabaseAdmin.from('vehicles').select('*').in('id', vehicleIds) : { data: [] },
    categoryIds.length ? supabaseAdmin.from('transit_ops_expense_category').select('*').in('id', categoryIds) : { data: [] },
  ]);

  const vehiclesById = new Map((vehiclesRes.data || []).map((vehicle) => [String(vehicle.id), vehicle]));
  const categoriesById = new Map((categoriesRes.data || []).map((category) => [String(category.id), category]));

  const enriched = rows.map((expense) => ({
    ...expense,
    transit_ops_vehicle: expense.vehicle_id ? vehiclesById.get(String(expense.vehicle_id)) || null : null,
    transit_ops_expense_category: expense.expense_category_id
      ? categoriesById.get(String(expense.expense_category_id)) || { name: expense.expense_category, category_type: expense.expense_category }
      : { name: expense.expense_category, category_type: expense.expense_category },
  }));

  return Array.isArray(expenses) ? enriched : enriched[0];
}

// GET /api/expenses — List expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { vehicle_id, trip_id } = req.query;
    let query = supabaseAdmin.from('expenses').select('*').is('deleted_at', null);

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }
    if (trip_id) {
      query = query.eq('trip_id', trip_id);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(await attachExpenseLookups(data || []));
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
    const { vehicle_id, trip_id, expense_category, expense_category_id, amount, date, notes } = req.body;

    if (!vehicle_id || (!expense_category && !expense_category_id) || !amount || !date) {
      return res.status(400).json({ error: 'Missing required fields: vehicle_id, expense_category, amount, date' });
    }

    const category = await getExpenseCategory(expense_category_id, expense_category);
    const resolvedCategory = category.category_type || category.name || expense_category;
    const validCategories = ['Toll', 'Maintenance', 'Misc'];
    if (!validCategories.includes(resolvedCategory)) {
      return res.status(400).json({ error: `Invalid expense_category. Must be one of: ${validCategories.join(', ')}` });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .insert({
          vehicle_id,
          trip_id: trip_id || null,
          expense_category: resolvedCategory,
          expense_category_id: expense_category_id || null,
          amount,
          date,
          notes: notes || '',
        })
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(await attachExpenseLookups(data));
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
      .is('deleted_at', null)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Expense not found' });
    res.json(await attachExpenseLookups(data));
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
        .update({ deleted_at: new Date().toISOString() })
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
