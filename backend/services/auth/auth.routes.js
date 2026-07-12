const express = require('express');
const { supabase, supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

// POST /api/auth/signup — Register new TransitOps user
router.post('/signup', async (req, res) => {
  const { email, password, full_name, phone, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  if (!['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role',
      valid_roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
    });
  }

  try {
    // Create user via Supabase auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name || '' } },
    });

    if (signUpError) return res.status(400).json({ error: signUpError.message });

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: signUpData.user.id,
      full_name: full_name || '',
      email,
      phone: phone || null,
      active: true,
    });

    if (profileError) console.error('Profile insert error:', profileError.message);

    // Assign role
    if (role && signUpData.user) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: signUpData.user.id,
        role,
        assigned_by: null, // Self-signup
      });
      if (roleError) console.error('Role insert error:', roleError.message);
    }

    res.json({
      user: signUpData.user,
      session: signUpData.session,
      profile: { full_name, email, phone, role },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login — Login with email/password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: error.message });

    // Fetch user profile and roles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);

    res.json({
      session: data.session,
      user: data.user,
      profile,
      roles: (roles || []).map((r) => r.role),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — Get current authenticated user
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id);

    res.json({
      user: req.user,
      profile,
      roles: (roles || []).map((r) => r.role),
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/auth/assign-role — Admin assigns role to user
router.post('/assign-role', authenticate, requireRole('admin'), async (req, res) => {
  const { user_id, role } = req.body;

  if (!user_id || !role) {
    return res.status(400).json({ error: 'user_id and role are required' });
  }

  const validRoles = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id, role, assigned_by: req.user.id },
        { onConflict: 'user_id,role' }
      )
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: `Role '${role}' assigned to user`,
      assigned: data[0],
    });
  } catch (err) {
    console.error('Assign role error:', err);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// POST /api/auth/revoke-role — Admin removes role from user
router.post('/revoke-role', authenticate, requireRole('admin'), async (req, res) => {
  const { user_id, role } = req.body;

  if (!user_id || !role) {
    return res.status(400).json({ error: 'user_id and role are required' });
  }

  try {
    const { error } = await supabaseAdmin.from('user_roles').delete().match({
      user_id,
      role,
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: `Role '${role}' revoked from user`,
    });
  } catch (err) {
    console.error('Revoke role error:', err);
    res.status(500).json({ error: 'Failed to revoke role' });
  }
});

// POST /api/auth/test-signup — Dev only: create pre-confirmed user
router.post('/test-signup', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const { email, password, full_name, phone, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // Create user with admin client (auto-confirms email)
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });

    if (createErr) return res.status(400).json({ error: createErr.message });

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userData.user.id,
      full_name: full_name || '',
      email,
      phone: phone || null,
      active: true,
    });

    if (profileError) console.error('Profile insert error:', profileError.message);

    // Assign role
    if (role && userData.user) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: userData.user.id,
        role,
        assigned_by: null,
      });
      if (roleError) console.error('Role insert error:', roleError.message);
    }

    // Sign in to get session
    const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) return res.status(400).json({ error: signInErr.message });

    res.json({
      user: userData.user,
      session: sessionData.session,
      profile: { full_name, email, phone, role },
    });
  } catch (err) {
    console.error('Test signup error:', err);
    res.status(500).json({ error: 'Test signup failed' });
  }
});

// POST /api/auth/logout — Logout user
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
