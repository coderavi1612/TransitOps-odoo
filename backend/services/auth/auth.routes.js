const express = require('express');
const { supabase, supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, full_name, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: full_name || '' } },
  });

  if (error) return res.status(400).json({ error: error.message });

  if (role && data.user) {
    const { error: roleErr } = await supabaseAdmin.from('user_roles').insert({
      user_id: data.user.id,
      role,
    });
    if (roleErr) console.error('Role insert error:', roleErr.message);
  }

  res.json({ user: data.user, session: data.session });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  res.json({ session: data.session, user: data.user });
});

// GET /api/auth/google
router.get('/google', (req, res) => {
  const { data, error } = supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
    },
  });
  if (error) return res.status(500).json({ error: error.message });
  res.redirect(data.url);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code parameter' });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return res.status(400).json({ error: error.message });

  const { data: existingRoles } = await supabaseAdmin
    .from('user_roles')
    .select('id')
    .eq('user_id', data.user.id)
    .limit(1);

  if (!existingRoles || existingRoles.length === 0) {
    await supabaseAdmin.from('user_roles').insert({
      user_id: data.user.id,
      role: 'fleet_manager',
    });
  }

  res.json({ session: data.session, user: data.user });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', req.user.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  res.json({
    user: req.user,
    profile,
    roles: (roles || []).map((r) => r.role),
  });
});

// POST /api/auth/assign-role
router.post('/assign-role', authenticate, requireRole('admin'), async (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id || !role) {
    return res.status(400).json({ error: 'user_id and role are required' });
  }

  const validRoles = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id, role }, { onConflict: 'user_id,role' })
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ assigned: data[0] });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { error } = await supabase.auth.signOut();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Logged out' });
});

// POST /api/auth/test-signup — dev/test only: creates confirmed user via admin
router.post('/test-signup', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const { email, password, full_name, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  // Create user with admin client (auto-confirms email)
  const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || '' },
  });

  if (createErr) return res.status(400).json({ error: createErr.message });

  // Assign role
  if (role && userData.user) {
    const { error: roleErr } = await supabaseAdmin.from('user_roles').insert({
      user_id: userData.user.id,
      role,
    });
    if (roleErr) console.error('Role insert error:', roleErr.message);
  }

  // Sign in to get a session token
  const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr) return res.status(400).json({ error: signInErr.message });

  res.json({ user: userData.user, session: sessionData.session });
});

module.exports = router;
