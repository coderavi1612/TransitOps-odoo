const maintenanceService = require('./maintenance.service');
const response = require('../../shared/utils/response');

class MaintenanceController {
  async listMaintenanceLogs(req, res) {
    try {
      const filters = req.query;
      const data = await maintenanceService.listMaintenanceLogs(filters);
      return response.success(res, data);
    } catch (err) {
      console.error('List maintenance logs error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getMaintenanceLog(req, res) {
    try {
      const data = await maintenanceService.getMaintenanceLog(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Get maintenance log error:', err);
      return response.error(res, err.message, 404);
    }
  }

  async createMaintenanceLog(req, res) {
    try {
      const data = await maintenanceService.createMaintenanceLog(req.body);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create maintenance log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async updateMaintenanceLog(req, res) {
    try {
      const data = await maintenanceService.updateMaintenanceLog(req.params.id, req.body);
      return response.success(res, data);
    } catch (err) {
      console.error('Update maintenance log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async openMaintenanceLog(req, res) {
    try {
      const data = await maintenanceService.openMaintenanceLog(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Open maintenance log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async closeMaintenanceLog(req, res) {
    try {
      const data = await maintenanceService.closeMaintenanceLog(req.params.id, req.body);
      return response.success(res, data);
    } catch (err) {
      console.error('Close maintenance log error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteMaintenanceLog(req, res) {
    try {
      const data = await maintenanceService.deleteMaintenanceLog(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete maintenance log error:', err);
      return response.error(res, err.message, 400);
    }
  }
}

module.exports = new MaintenanceController();
