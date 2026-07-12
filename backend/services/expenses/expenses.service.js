const expensesRepository = require('./expenses.repository');
const { supabaseAdmin } = require('../../shared/supabase');

class ExpensesService {
  async getDriverVehicleIds(email) {
    const { data: driverData } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (!driverData) return [];

    const { data: tripsData } = await supabaseAdmin
      .from('trips')
      .select('vehicle_id')
      .eq('driver_id', driverData.id)
      .is('deleted_at', null);

    return [...new Set((tripsData || []).map((t) => t.vehicle_id).filter(Boolean))];
  }

  async attachExpenseLookups(expenses) {
    const rows = Array.isArray(expenses) ? expenses : [expenses];
    const vehicleIds = [...new Set(rows.map((expense) => expense.vehicle_id).filter(Boolean))];
    const categoryIds = [...new Set(rows.map((expense) => expense.expense_category_id).filter(Boolean))];

    const [vehiclesRes, categoriesRes] = await Promise.all([
      vehicleIds.length ? expensesRepository.getVehicles(vehicleIds) : { data: [] },
      categoryIds.length ? expensesRepository.getExpenseCategories(categoryIds) : { data: [] },
    ]);

    const vehiclesById = new Map((vehiclesRes.data || []).map((vehicle) => [String(vehicle.id), vehicle]));
    const categoriesById = new Map((categoriesRes.data || []).map((category) => [String(category.id), category]));

    const enriched = rows.map((expense) => ({
      ...expense,
      transit_ops_vehicle: expense.vehicle_id ? vehiclesById.get(String(expense.vehicle_id)) || null : null,
      transit_ops_expense_category: expense.expense_category_id
        ? categoriesById.get(String(expense.expense_category_id)) || { name: expense.expense_category, category_type: expense.expense_category }
        : { name: expense.expense_category, category_type: expense.expense_category },
    }));

    return Array.isArray(expenses) ? enriched : enriched[0];
  }

  async listExpenses(filters, userRoles, userEmail) {
    // Row ownership: Drivers can only see expenses of vehicles they drove
    if (userRoles.includes('driver')) {
      const allowedVehicleIds = await this.getDriverVehicleIds(userEmail);
      filters.vehicle_ids = allowedVehicleIds;
    }

    let query = await expensesRepository.getExpenses(filters);

    if (filters.vehicle_ids) {
      if (filters.vehicle_ids.length === 0) {
        return { expenses: [], count: 0 };
      }
      query = query.in('vehicle_id', filters.vehicle_ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const expenses = await this.attachExpenseLookups(data || []);
    return { expenses, count: expenses.length };
  }

  async getExpense(id, userRoles, userEmail) {
    const { data, error } = await expensesRepository.getExpenseById(id);
    if (error || !data) throw new Error('Expense not found');

    // Row ownership check for drivers
    if (userRoles.includes('driver')) {
      const allowedVehicleIds = await this.getDriverVehicleIds(userEmail);
      if (!allowedVehicleIds.includes(data.vehicle_id)) {
        throw new Error('Access denied: You are not authorized to view this expense');
      }
    }

    return this.attachExpenseLookups(data);
  }

  async getExpenseCategoryDetails(expense_category_id, fallback) {
    if (!expense_category_id) {
      return { id: null, name: fallback || 'Misc', category_type: fallback || 'Misc' };
    }
    const { data } = await expensesRepository.getExpenseCategory(expense_category_id);
    return data || { id: expense_category_id, name: fallback || 'Misc', category_type: fallback || 'Misc' };
  }

  async createExpense(body, userRoles, userEmail) {
    const { vehicle_id, trip_id, expense_category_id, expense_category, amount, date, notes } = body;

    // Row ownership check for drivers
    if (userRoles.includes('driver')) {
      const allowedVehicleIds = await this.getDriverVehicleIds(userEmail);
      if (!allowedVehicleIds.includes(vehicle_id)) {
        throw new Error('Access denied: You are not authorized to create expenses for this vehicle');
      }
    }

    const category = await this.getExpenseCategoryDetails(expense_category_id, expense_category);
    const resolvedCategory = category.category_type || category.name || expense_category || 'Misc';
    const validCategories = ['Toll', 'Maintenance', 'Misc'];
    if (!validCategories.includes(resolvedCategory)) {
      throw new Error(`Invalid expense_category. Must be one of: ${validCategories.join(', ')}`);
    }

    const { data, error } = await expensesRepository.createExpense({
      vehicle_id,
      trip_id: trip_id || null,
      expense_category: resolvedCategory,
      expense_category_id: expense_category_id || null,
      amount,
      date,
      notes: notes || '',
    });

    if (error) throw new Error(error.message);
    return this.attachExpenseLookups(data);
  }

  async updateExpense(id, body) {
    const { data: expense, error: fetchErr } = await expensesRepository.getExpenseById(id);
    if (fetchErr || !expense) throw new Error('Expense not found');

    const updateData = { ...body };
    if (body.expense_category_id) {
      const category = await this.getExpenseCategoryDetails(body.expense_category_id, body.expense_category);
      const resolvedCategory = category.category_type || category.name || body.expense_category || 'Misc';
      const validCategories = ['Toll', 'Maintenance', 'Misc'];
      if (!validCategories.includes(resolvedCategory)) {
        throw new Error(`Invalid expense_category. Must be one of: ${validCategories.join(', ')}`);
      }
      updateData.expense_category = resolvedCategory;
    }

    const { data, error } = await expensesRepository.updateExpense(id, updateData);
    if (error) throw new Error(error.message);

    return this.attachExpenseLookups(data);
  }

  async deleteExpense(id) {
    const { error } = await expensesRepository.softDeleteExpense(id);
    if (error) throw new Error(error.message);
    return { message: 'Expense deleted' };
  }
}

module.exports = new ExpensesService();
