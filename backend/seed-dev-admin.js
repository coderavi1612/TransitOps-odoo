require('dotenv').config();
const { supabaseAdmin } = require('./shared/supabase');

const ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || 'admin@transitops.com';
const ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.DEV_ADMIN_NAME || 'TransitOps Admin';

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertProfile(userId) {
  const profile = {
    id: userId,
    full_name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    active: true,
  };

  const { error } = await supabaseAdmin.from('profiles').upsert(profile, { onConflict: 'id' });
  if (!error) return;

  const fallbackProfile = {
    id: userId,
    full_name: ADMIN_NAME,
    avatar_url: '',
  };
  const { error: fallbackError } = await supabaseAdmin
    .from('profiles')
    .upsert(fallbackProfile, { onConflict: 'id' });
  if (fallbackError) throw fallbackError;
}

async function upsertAdminRole(userId) {
  const role = {
    user_id: userId,
    role: 'admin',
    assigned_by: null,
  };

  const { error } = await supabaseAdmin.from('user_roles').upsert(role, { onConflict: 'user_id,role' });
  if (!error) return;

  const { error: fallbackError } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
  if (fallbackError) throw fallbackError;
}

async function seedAdmin() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to seed the development admin user.');
  }

  const existingUser = await findUserByEmail(ADMIN_EMAIL);
  const { data, error } = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: ADMIN_NAME },
      })
    : await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: ADMIN_NAME },
      });

  if (error) throw error;

  const user = data.user || existingUser;
  await upsertProfile(user.id);
  await upsertAdminRole(user.id);

  console.log(`Development admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

seedAdmin().catch((error) => {
  console.error('Failed to seed development admin:', error.message);
  process.exit(1);
});
