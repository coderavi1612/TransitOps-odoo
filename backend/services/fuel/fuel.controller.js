const fuelService = require('./fuel.service');
const response = require('../../shared/utils/response');

class FuelController {
  async listFuelLogs(req, res) {
    try {
      const filters = req.query;
      const data = await fuelService.listFuelLogs(filters, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('List fuel logs error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getFuelLog(req, res) {
    try {
      const data = await fuelService.getFuelLog(req.params.id, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('Get fuel log error:', err);
      const isNotFound = err.message === 'Fuel log not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async createFuelLog(req, res) {
    try {
      const data = await fuelService.createFuelLog(req.body, req.userRoles || [], req.user.email);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create fuel log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async updateFuelLog(req, res) {
    try {
      const data = await fuelService.updateFuelLog(req.params.id, req.body);
      return response.success(res, data);
    } catch (err) {
      console.error('Update fuel log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteFuelLog(req, res) {
    try {
      const data = await fuelService.deleteFuelLog(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete fuel log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async getVehicleEfficiency(req, res) {
    try {
      const data = await fuelService.getVehicleEfficiency(req.params.vehicle_id);
      return response.success(res, data);
    } catch (err) {
      console.error('Get vehicle efficiency error:', err);
      return response.error(res, err.message, 400);
    }
  }
}

module.exports = new FuelController();
