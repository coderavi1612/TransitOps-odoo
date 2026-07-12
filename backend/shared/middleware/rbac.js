const { supabaseAdmin } = require('../supabase');

// TransitOps Role Permissions Matrix
const ROLE_PERMISSIONS = {
  admin: {
    vehicles: ['create', 'read', 'update', 'delete'],
    drivers: ['create', 'read', 'update', 'delete'],
    trips: ['create', 'read', 'update', 'delete'],
    maintenance: ['create', 'read', 'update', 'delete'],
    fuel: ['create', 'read', 'update', 'delete'],
    expenses: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    reports: ['read', 'export'],
    configuration: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
  },
  fleet_manager: {
    vehicles: ['create', 'read', 'update', 'delete'],
    drivers: ['read'],
    trips: ['read', 'update'], // Can cancel/update, but cannot create or dispatch
    maintenance: ['create', 'read', 'update', 'delete'],
    fuel: ['read'],
    expenses: ['create', 'read'], // Can view and add vehicle expenses, but cannot edit/delete
    dashboard: ['read'],
    reports: ['read', 'export'],
  },
  driver: {
    vehicles: ['read'],
    drivers: ['read'],
    trips: ['read', 'update'],
    maintenance: ['read'],
    fuel: ['create', 'read'],
    expenses: ['create', 'read'],
    dashboard: ['read'],
  },
  safety_officer: {
    vehicles: ['read'],
    drivers: ['create', 'read', 'update', 'delete'],
    trips: ['read'],
    maintenance: ['read'],
    fuel: [],
    expenses: [],
    dashboard: ['read'],
    reports: ['read'],
  },
  financial_analyst: {
    vehicles: ['read'],
    drivers: [],
    trips: ['read'],
    maintenance: ['read'],
    fuel: ['create', 'read', 'update', 'delete'],
    expenses: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    reports: ['read', 'export'],
  },
  dispatcher: {
    vehicles: ['read'],
    drivers: ['read'],
    trips: ['create', 'read', 'update', 'delete'],
    maintenance: ['read'],
    fuel: ['create', 'read'],
    expenses: ['create', 'read'],
    dashboard: ['read'],
    reports: ['read'],
  },
};

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // Fetch user roles from database
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id);

      if (roleError) {
        console.error('RBAC error:', roleError.message);
        return res.status(500).json({ error: 'Failed to verify roles', detail: roleError.message });
      }

      const userRoles = (roleData || []).map((r) => r.role);
      req.userRoles = userRoles;

      // Check if user has at least one allowed role
      const hasAccess = userRoles.some((r) => allowedRoles.includes(r));
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required_roles: allowedRoles,
          your_roles: userRoles,
          message: `This action requires one of: ${allowedRoles.join(', ')}`,
        });
      }

      // Attach user permissions to request
      const userPermissions = {};
      userRoles.forEach((role) => {
        Object.entries(ROLE_PERMISSIONS[role] || {}).forEach(([resource, actions]) => {
          if (!userPermissions[resource]) {
            userPermissions[resource] = [];
          }
          userPermissions[resource] = [...new Set([...userPermissions[resource], ...actions])];
        });
      });
      req.permissions = userPermissions;

      next();
    } catch (err) {
      console.error('RBAC exception:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      if (!req.permissions) {
        // Fetch user roles and load permissions
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', req.user.id);

        if (roleError) {
          console.error('RBAC error:', roleError.message);
          return res.status(500).json({ error: 'Failed to verify roles', detail: roleError.message });
        }

        const userRoles = (roleData || []).map((r) => r.role);
        req.userRoles = userRoles;

        const userPermissions = {};
        userRoles.forEach((role) => {
          Object.entries(ROLE_PERMISSIONS[role] || {}).forEach(([resName, actions]) => {
            if (!userPermissions[resName]) {
              userPermissions[resName] = [];
            }
            userPermissions[resName] = [...new Set([...userPermissions[resName], ...actions])];
          });
        });
        req.permissions = userPermissions;
      }

      if (!req.permissions[resource]) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: `${resource}:${action}`,
          message: `You do not have permission to ${action} ${resource}`,
        });
      }

      if (!req.permissions[resource].includes(action)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: `${resource}:${action}`,
          your_permissions: req.permissions[resource],
          message: `You can only ${req.permissions[resource].join(', ')} ${resource}`,
        });
      }

      next();
    } catch (err) {
      console.error('requirePermission exception:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

module.exports = { requireRole, requirePermission, ROLE_PERMISSIONS };
