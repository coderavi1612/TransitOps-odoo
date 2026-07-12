const { supabaseAdmin } = require('../../shared/supabase');

class ExpensesRepository {
  async getExpenses(filters = {}) {
    const { vehicle_id, trip_id, page = 1, limit = 1000 } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('expenses').select('*', { count: 'exact' }).is('deleted_at', null);

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }
    if (trip_id) {
      query = query.eq('trip_id', trip_id);
    }

    query = query.order('date', { ascending: false });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getExpenseById(id) {
    return supabaseAdmin.from('expenses').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async createExpense(data) {
    return supabaseAdmin.from('expenses').insert(data).select().single();
  }

  async updateExpense(id, data) {
    return supabaseAdmin.from('expenses').update(data).eq('id', id).select().single();
  }

  async softDeleteExpense(id) {
    return supabaseAdmin.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async getVehicles(ids) {
    return supabaseAdmin.from('vehicles').select('*').in('id', ids);
  }

  async getExpenseCategory(id) {
    return supabaseAdmin.from('transit_ops_expense_category').select('*').eq('id', id).single();
  }

  async getExpenseCategories(ids) {
    return supabaseAdmin.from('transit_ops_expense_category').select('*').in('id', ids);
  }
}

module.exports = new ExpensesRepository();
