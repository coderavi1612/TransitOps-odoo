const authService = require('./auth.service');
const response = require('../../shared/utils/response');

class AuthController {
  async signup(req, res) {
    try {
      const { email, password, full_name, phone, role } = req.body;
      const data = await authService.signup(email, password, full_name, phone, role);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Signup error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async testSignup(req, res) {
    try {
      const { email, password, full_name, phone, role } = req.body;
      const data = await authService.testSignup(email, password, full_name, phone, role);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Test signup error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      return response.success(res, data);
    } catch (err) {
      console.error('Login error:', err);
      return response.error(res, err.message, 401);
    }
  }

  async refresh(req, res) {
    try {
      const { refresh_token } = req.body;
      const data = await authService.refresh(refresh_token);
      return response.success(res, data);
    } catch (err) {
      console.error('Refresh token error:', err);
      return response.error(res, err.message, 401);
    }
  }

  async getMe(req, res) {
    try {
      const data = await authService.getMe(req.user, req.token);
      return response.success(res, data);
    } catch (err) {
      console.error('Get me error:', err);
      return response.error(res, 'Failed to fetch user profile', 500);
    }
  }

  async assignRole(req, res) {
    try {
      const { user_id, role } = req.body;
      const data = await authService.assignRole(user_id, role, req.user.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Assign role error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async revokeRole(req, res) {
    try {
      const { user_id, role } = req.body;
      const data = await authService.revokeRole(user_id, role);
      return response.success(res, data);
    } catch (err) {
      console.error('Revoke role error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async logout(req, res) {
    try {
      const data = await authService.logout(req.token);
      return response.success(res, data);
    } catch (err) {
      console.error('Logout error:', err);
      return response.error(res, err.message, 500);
    }
  }
}

module.exports = new AuthController();
