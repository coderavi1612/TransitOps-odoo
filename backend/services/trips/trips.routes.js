const express = require('express');
const tripsController = require('./trips.controller');
const { validateListTrips, validateCreateTrip, validateUpdateTrip, validateCompleteTrip } = require('./trips.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, requirePermission('trips', 'read'), validateListTrips, tripsController.listTrips);
router.get('/:id', authenticate, requirePermission('trips', 'read'), tripsController.getTrip);

router.post(
  '/',
  authenticate,
  requireRole('dispatcher', 'admin'),
  requirePermission('trips', 'create'),
  validateCreateTrip,
  tripsController.createTrip
);

router.put(
  '/:id',
  authenticate,
  requireRole('dispatcher', 'admin'),
  requirePermission('trips', 'update'),
  validateUpdateTrip,
  tripsController.updateTrip
);

router.post(
  '/:id/dispatch',
  authenticate,
  requireRole('dispatcher', 'admin'),
  tripsController.dispatchTrip
);

router.post(
  '/:id/complete',
  authenticate,
  requirePermission('trips', 'update'),
  validateCompleteTrip,
  tripsController.completeTrip
);

router.post(
  '/:id/cancel',
  authenticate,
  requireRole('dispatcher', 'fleet_manager', 'admin'),
  tripsController.cancelTrip
);

router.delete(
  '/:id',
  authenticate,
  requireRole('dispatcher', 'admin'),
  requirePermission('trips', 'delete'),
  tripsController.deleteTrip
);

module.exports = router;
