const express = require('express');
const fuelController = require('./fuel.controller');
const { validateListFuel, validateCreateFuel, validateUpdateFuel } = require('./fuel.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, requirePermission('fuel', 'read'), validateListFuel, fuelController.listFuelLogs);
router.get('/:id', authenticate, requirePermission('fuel', 'read'), fuelController.getFuelLog);

router.post(
  '/',
  authenticate,
  requireRole('driver', 'dispatcher', 'financial_analyst', 'admin'),
  requirePermission('fuel', 'create'),
  validateCreateFuel,
  fuelController.createFuelLog
);

router.put(
  '/:id',
  authenticate,
  requireRole('financial_analyst', 'admin'),
  requirePermission('fuel', 'update'),
  validateUpdateFuel,
  fuelController.updateFuelLog
);

router.delete(
  '/:id',
  authenticate,
  requireRole('financial_analyst', 'admin'),
  requirePermission('fuel', 'delete'),
  fuelController.deleteFuelLog
);

router.get('/vehicle/:vehicle_id/efficiency', authenticate, fuelController.getVehicleEfficiency);

module.exports = router;
