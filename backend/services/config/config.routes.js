const express = require('express');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');
const { z } = require('zod');

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

const settingsSchema = z.object({
  distance_unit: z.literal('km').default('km'),
  weight_unit: z.enum(['kg', 'tonne']).default('kg'),
  currency: z.literal('INR').default('INR'),
  notifications: z.object({
    pushAlerts: z.boolean(),
    emailSummaries: z.boolean(),
    smsDispatch: z.boolean(),
    slackSync: z.boolean(),
  }),
});

router.get('/settings', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('transit_ops_settings')
    .select('*')
    .eq('id', 'global')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/settings', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid settings', detail: parsed.error.flatten() });
  }
  const { data, error } = await supabase
    .from('transit_ops_settings')
    .upsert({
      id: 'global',
      ...parsed.data,
      updated_by: req.user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

const roleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  active: z.boolean().default(true),
});

const roleKeyByName = {
  'System Administrator': 'admin',
  'Fleet Manager': 'fleet_manager',
  Driver: 'driver',
  'Safety Officer': 'safety_officer',
  'Financial Analyst': 'financial_analyst',
  'Trip Dispatcher': 'dispatcher',
};

// Role catalogue. Runtime permissions remain enforced by the RBAC middleware.
router.get('/roles', authenticate, async (req, res) => {
  const [{ data, error }, { data: userRoles, error: countError }] = await Promise.all([
    supabase.from('res_groups').select('*').order('name'),
    supabase.from('user_roles').select('role'),
  ]);
  if (error) return res.status(500).json({ error: error.message });
  if (countError) return res.status(500).json({ error: countError.message });
  const counts = (userRoles || []).reduce((result, row) => {
    result[row.role] = (result[row.role] || 0) + 1;
    return result;
  }, {});
  res.json((data || []).map((role) => ({
    ...role,
    key: roleKeyByName[role.name] || null,
    users: counts[roleKeyByName[role.name]] || 0,
  })));
});

router.post('/roles', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role', detail: parsed.error.flatten() });
  const { data, error } = await supabase.from('res_groups').insert(parsed.data).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/roles/:id', authenticate, requireRole('admin'), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role', detail: parsed.error.flatten() });
  const { data, error } = await supabase
    .from('res_groups')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
