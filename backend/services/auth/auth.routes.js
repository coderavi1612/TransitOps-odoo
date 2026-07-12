const express = require('express');
const authController = require('./auth.controller');
const { validateSignup, validateLogin, validateRefresh, validateAssignRole } = require('./auth.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');
const { authLimiter } = require('../../shared/middleware/rateLimit');

const router = express.Router();

// Apply rate limiting to authentication routes
router.post('/signup', authLimiter, validateSignup, authController.signup);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh', validateRefresh, authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

// Admin role management routes
router.post('/assign-role', authenticate, requireRole('admin'), validateAssignRole, authController.assignRole);
router.post('/revoke-role', authenticate, requireRole('admin'), validateAssignRole, authController.revokeRole);
router.delete('/remove-role', authenticate, requireRole('admin'), validateAssignRole, authController.revokeRole);

// Dev testing signup
router.post('/test-signup', validateSignup, authController.testSignup);

module.exports = router;
