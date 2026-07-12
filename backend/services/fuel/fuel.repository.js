const { supabaseAdmin } = require('../../shared/supabase');

class FuelRepository {
  async getFuelLogs(filters = {}) {
    const { vehicle_id, from_date, to_date, page = 1, limit = 1000 } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('fuel_logs').select('*', { count: 'exact' }).is('deleted_at', null);

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }
    if (from_date) {
      query = query.gte('date', from_date);
    }
    if (to_date) {
      query = query.lte('date', to_date);
    }

    query = query.order('date', { ascending: false });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getFuelLogById(id) {
    return supabaseAdmin.from('fuel_logs').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async createFuelLog(data) {
    return supabaseAdmin.from('fuel_logs').insert(data).select().single();
  }

  async updateFuelLog(id, data) {
    return supabaseAdmin.from('fuel_logs').update(data).eq('id', id).select().single();
  }

  async softDeleteFuelLog(id) {
    return supabaseAdmin.from('fuel_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async getVehicles(ids) {
    return supabaseAdmin.from('vehicles').select('*').in('id', ids);
  }
}

module.exports = new FuelRepository();
