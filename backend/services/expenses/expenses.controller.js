const expensesService = require('./expenses.service');
const response = require('../../shared/utils/response');

class ExpensesController {
  async listExpenses(req, res) {
    try {
      const filters = req.query;
      const data = await expensesService.listExpenses(filters, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('List expenses error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getExpense(req, res) {
    try {
      const data = await expensesService.getExpense(req.params.id, req.userRoles || [], req.user.email);
      return response.success(res, data);
    } catch (err) {
      console.error('Get expense error:', err);
      const isNotFound = err.message === 'Expense not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async createExpense(req, res) {
    try {
      const data = await expensesService.createExpense(req.body, req.userRoles || [], req.user.email);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create expense error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async updateExpense(req, res) {
    try {
      const data = await expensesService.updateExpense(req.params.id, req.body);
      return response.success(res, data);
    } catch (err) {
      console.error('Update expense error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteExpense(req, res) {
    try {
      const data = await expensesService.deleteExpense(req.params.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete expense error:', err);
      return response.error(res, err.message, 400);
    }
  }
}

module.exports = new ExpensesController();
