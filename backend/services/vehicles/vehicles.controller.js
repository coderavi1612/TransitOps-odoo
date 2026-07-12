const vehiclesService = require('./vehicles.service');
const response = require('../../shared/utils/response');

class VehiclesController {
  async listVehicles(req, res) {
    try {
      const filters = req.query;
      const data = await vehiclesService.listVehicles(filters, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('List vehicles error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getVehicle(req, res) {
    try {
      const data = await vehiclesService.getVehicle(req.params.id, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('Get vehicle error:', err);
      const isNotFound = err.message === 'Vehicle not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async createVehicle(req, res) {
    try {
      const data = await vehiclesService.createVehicle(req.body);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create vehicle error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async updateVehicle(req, res) {
    try {
      const data = await vehiclesService.updateVehicle(req.params.id, req.body);
      return response.success(res, data);
    } catch (err) {
      console.error('Update vehicle error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteVehicle(req, res) {
    try {
      const data = await vehiclesService.deleteVehicle(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete vehicle error:', err);
      return response.error(res, err.message, 400);
    }
  }
}

module.exports = new VehiclesController();
