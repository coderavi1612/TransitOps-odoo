const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

const tables = [
  { name: 'transit_ops_region', label: 'regions', allow: ['admin'] },
  { name: 'transit_ops_vehicle_type', label: 'vehicle_types', allow: ['admin'] },
  { name: 'transit_ops_maintenance_type', label: 'maintenance_types', allow: ['admin'] },
  { name: 'transit_ops_expense_category', label: 'expense_categories', allow: ['admin'] },
];

tables.forEach(({ name, label, allow }) => {
  router.get(`/${label}`, authenticate, async (req, res) => {
    const { data, error } = await supabase.from(name).select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.post(`/${label}`, authenticate, requireRole(...allow), async (req, res) => {
    const { data, error } = await supabase.from(name).insert(req.body).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  });

  router.put(`/${label}/:id`, authenticate, requireRole(...allow), async (req, res) => {
    const { data, error } = await supabase.from(name).update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  router.delete(`/${label}/:id`, authenticate, requireRole(...allow), async (req, res) => {
    const { error } = await supabase.from(name).delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: `${label} deleted` });
  });
});

// Roles
router.get('/roles', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('res_groups').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
