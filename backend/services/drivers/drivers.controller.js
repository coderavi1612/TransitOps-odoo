const driversService = require('./drivers.service');
const response = require('../../shared/utils/response');

class DriversController {
  async listDrivers(req, res) {
    try {
      const filters = req.query;
      const data = await driversService.listDrivers(filters, req.userRoles || [], req.user.email, req.token);
      return response.success(res, data);
    } catch (err) {
      console.error('List drivers error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getDriver(req, res) {
    try {
      const data = await driversService.getDriver(req.params.id, req.userRoles || [], req.user.email, req.token);
      return response.success(res, data);
    } catch (err) {
      console.error('Get driver error:', err);
      const isNotFound = err.message === 'Driver not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async createDriver(req, res) {
    try {
      const data = await driversService.createDriver(req.body, req.token);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create driver error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async updateDriver(req, res) {
    try {
      const data = await driversService.updateDriver(req.params.id, req.body, req.token);
      return response.success(res, data);
    } catch (err) {
      console.error('Update driver error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteDriver(req, res) {
    try {
      const data = await driversService.deleteDriver(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete driver error:', err);
      return response.error(res, err.message, 400);
    }
  }
}

module.exports = new DriversController();
