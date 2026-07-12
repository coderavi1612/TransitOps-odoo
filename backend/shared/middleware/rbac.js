const { supabaseAdmin } = require('../supabase');

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Use service_role client to bypass RLS — we already verified the JWT in authenticate()
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id);

    if (error) {
      console.error('RBAC error:', error.message);
      return res.status(500).json({ error: 'Failed to verify roles', detail: error.message });
    }

    const roles = (data || []).map((r) => r.role);
    req.userRoles = roles;

    const hasAccess = roles.some((r) => allowedRoles.includes(r));
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        your_roles: roles,
      });
    }

    next();
  };
}

module.exports = { requireRole };
