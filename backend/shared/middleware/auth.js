const { supabaseAdmin } = require('../supabase');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  try {
    // Verify the JWT token using the public API
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error('Token verification error:', userError?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: userData.user.id,
      email: userData.user.email,
      role: userData.user.app_metadata?.role || userData.user.user_metadata?.role || null,
    };
    req.token = token;

    // Fetch user roles from database
    try {
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id);

      if (!roleError && roleData) {
        req.userRoles = roleData.map(r => r.role);
      } else {
        req.userRoles = [];
      }
    } catch (roleErr) {
      console.error('Role fetch error:', roleErr.message);
      req.userRoles = [];
    }

    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticate };
