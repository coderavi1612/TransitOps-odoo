const express = require('express');
const vehiclesController = require('./vehicles.controller');
const { validateListVehicles, validateCreateVehicle, validateUpdateVehicle, validateDeleteVehicle } = require('./vehicles.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, requirePermission('vehicles', 'read'), validateListVehicles, vehiclesController.listVehicles);
router.get('/:id', authenticate, requirePermission('vehicles', 'read'), vehiclesController.getVehicle);

router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('vehicles', 'create'),
  validateCreateVehicle,
  vehiclesController.createVehicle
);

router.put(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('vehicles', 'update'),
  validateUpdateVehicle,
  vehiclesController.updateVehicle
);

router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('vehicles', 'delete'),
  validateDeleteVehicle,
  vehiclesController.deleteVehicle
);

module.exports = router;
