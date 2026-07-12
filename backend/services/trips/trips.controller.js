const tripsService = require('./trips.service');
const response = require('../../shared/utils/response');

class TripsController {
  async listTrips(req, res) {
    try {
      const filters = req.query;
      const data = await tripsService.listTrips(filters, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('List trips error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getTrip(req, res) {
    try {
      const data = await tripsService.getTrip(req.params.id, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('Get trip error:', err);
      const isNotFound = err.message === 'Trip not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async createTrip(req, res) {
    try {
      const data = await tripsService.createTrip(req.body);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create trip error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async updateTrip(req, res) {
    try {
      const data = await tripsService.updateTrip(req.params.id, req.body);
      return response.success(res, data);
    } catch (err) {
      console.error('Update trip error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async dispatchTrip(req, res) {
    try {
      const data = await tripsService.dispatchTrip(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Dispatch trip error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async completeTrip(req, res) {
    try {
      const data = await tripsService.completeTrip(req.params.id, req.body, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('Complete trip error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async cancelTrip(req, res) {
    try {
      const data = await tripsService.cancelTrip(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Cancel trip error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteTrip(req, res) {
    try {
      const data = await tripsService.deleteTrip(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete trip error:', err);
      return response.error(res, err.message, 400);
    }
  }
}

module.exports = new TripsController();
