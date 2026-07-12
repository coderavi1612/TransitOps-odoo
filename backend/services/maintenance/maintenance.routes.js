const express = require('express');
const maintenanceController = require('./maintenance.controller');
const { validateListMaintenance, validateCreateMaintenance, validateUpdateMaintenance, validateCloseMaintenance } = require('./maintenance.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, requirePermission('maintenance', 'read'), validateListMaintenance, maintenanceController.listMaintenanceLogs);
router.get('/:id', authenticate, requirePermission('maintenance', 'read'), maintenanceController.getMaintenanceLog);

router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('maintenance', 'create'),
  validateCreateMaintenance,
  maintenanceController.createMaintenanceLog
);

router.put(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('maintenance', 'update'),
  validateUpdateMaintenance,
  maintenanceController.updateMaintenanceLog
);

router.post(
  '/:id/open',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  maintenanceController.openMaintenanceLog
);

router.post(
  '/:id/close',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  validateCloseMaintenance,
  maintenanceController.closeMaintenanceLog
);

router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'admin'),
  requirePermission('maintenance', 'delete'),
  maintenanceController.deleteMaintenanceLog
);

module.exports = router;
