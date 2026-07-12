const authRepository = require('./auth.repository');

class AuthService {
  async signup(email, password, full_name, phone, role) {
    // Privilege Escalation Prevention: force role to 'driver' for public signup
    const assignedRole = 'driver';

    const { data: signUpData, error: signUpError } = await authRepository.signUpUser(email, password, full_name);
    if (signUpError) throw new Error(signUpError.message);

    const userId = signUpData.user.id;

    const { error: profileError } = await authRepository.createProfile(userId, email, full_name, phone);
    if (profileError) console.error('Profile insert error:', profileError.message);

    const { error: roleError } = await authRepository.assignUserRole(userId, assignedRole);
    if (roleError) console.error('Role insert error:', roleError.message);

    return {
      user: signUpData.user,
      session: signUpData.session,
      profile: { full_name, email, phone, role: assignedRole },
      roles: [assignedRole],
    };
  }

  async testSignup(email, password, full_name, phone, role) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Not available in production');
    }

    const { data: userData, error: createErr } = await authRepository.createUserAdmin(email, password, full_name);
    if (createErr) throw new Error(createErr.message);

    const userId = userData.user.id;

    const { error: profileError } = await authRepository.createProfile(userId, email, full_name, phone);
    if (profileError) console.error('Profile insert error:', profileError.message);

    if (role) {
      const { error: roleError } = await authRepository.assignUserRole(userId, role);
      if (roleError) console.error('Role insert error:', roleError.message);
    }

    const { data: sessionData, error: signInErr } = await authRepository.signIn(email, password);
    if (signInErr) throw new Error(signInErr.message);

    return {
      user: userData.user,
      session: sessionData.session,
      profile: { full_name, email, phone, role },
      roles: role ? [role] : [],
    };
  }

  async login(email, password) {
    const { data, error: signInErr } = await authRepository.signIn(email, password);
    if (signInErr) throw new Error(signInErr.message);

    const userId = data.user.id;

    const [profileRes, rolesRes] = await Promise.all([
      authRepository.getProfile(userId),
      authRepository.getUserRoles(userId),
    ]);

    return {
      session: data.session,
      user: data.user,
      profile: profileRes.data || null,
      roles: (rolesRes.data || []).map((r) => r.role),
    };
  }

  async refresh(refresh_token) {
    const { data, error } = await authRepository.refreshSession(refresh_token);
    if (error) throw new Error(error.message);

    return {
      session: data.session,
      user: data.user,
    };
  }

  async getMe(user, token) {
    const [profileRes, rolesRes] = await Promise.all([
      authRepository.getProfile(user.id),
      authRepository.getUserRoles(user.id),
    ]);

    return {
      user,
      profile: profileRes.data || null,
      roles: (rolesRes.data || []).map((r) => r.role),
    };
  }

  async assignRole(user_id, role, assignedBy) {
    const { data, error } = await authRepository.assignUserRole(user_id, role, assignedBy);
    if (error) throw new Error(error.message);

    return {
      message: `Role '${role}' assigned to user`,
      assigned: data,
    };
  }

  async revokeRole(user_id, role) {
    const { error } = await authRepository.removeUserRole(user_id, role);
    if (error) throw new Error(error.message);

    return {
      message: `Role '${role}' revoked from user`,
    };
  }

  async logout(token) {
    const { error } = await authRepository.signOut(token);
    if (error) throw new Error(error.message);
    return { message: 'Logged out successfully' };
  }
}

module.exports = new AuthService();
