const { supabase, supabaseAdmin } = require('../../shared/supabase');

class AuthRepository {
  async signUpUser(email, password, full_name) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name || '' } },
    });
  }

  async createUserAdmin(email, password, full_name) {
    return supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });
  }

  async createProfile(id, email, full_name, phone) {
    return supabaseAdmin.from('profiles').insert({
      id,
      full_name: full_name || '',
      email,
      phone: phone || null,
      active: true,
    });
  }

  async getProfile(userId) {
    return supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  }

  async assignUserRole(userId, role, assignedBy = null) {
    return supabaseAdmin.from('user_roles').upsert(
      { user_id: userId, role, assigned_by: assignedBy },
      { onConflict: 'user_id,role' }
    ).select().single();
  }

  async removeUserRole(userId, role) {
    return supabaseAdmin.from('user_roles').delete().match({
      user_id: userId,
      role,
    });
  }

  async getUserRoles(userId) {
    return supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
  }

  async signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async refreshSession(refresh_token) {
    return supabase.auth.refreshSession({ refresh_token });
  }

  async signOut(token) {
    return supabaseAdmin.auth.admin.signOut(token);
  }
}

module.exports = new AuthRepository();
