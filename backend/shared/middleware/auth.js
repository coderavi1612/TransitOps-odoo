const { supabase } = require('../supabase');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.app_metadata?.role || data.user.user_metadata?.role || null,
  };
  req.token = token;
  next();
}

module.exports = { authenticate };
