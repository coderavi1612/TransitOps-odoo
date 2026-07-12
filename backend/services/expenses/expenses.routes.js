const express = require('express');
const expensesController = require('./expenses.controller');
const { validateListExpenses, validateCreateExpense, validateUpdateExpense } = require('./expenses.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

router.get('/', authenticate, requirePermission('expenses', 'read'), validateListExpenses, expensesController.listExpenses);
router.get('/:id', authenticate, requirePermission('expenses', 'read'), expensesController.getExpense);

router.post(
  '/',
  authenticate,
  requireRole('driver', 'dispatcher', 'financial_analyst', 'admin'),
  requirePermission('expenses', 'create'),
  validateCreateExpense,
  expensesController.createExpense
);

router.put(
  '/:id',
  authenticate,
  requireRole('financial_analyst', 'admin'),
  requirePermission('expenses', 'update'),
  validateUpdateExpense,
  expensesController.updateExpense
);

router.delete(
  '/:id',
  authenticate,
  requireRole('financial_analyst', 'admin'),
  requirePermission('expenses', 'delete'),
  expensesController.deleteExpense
);

module.exports = router;
