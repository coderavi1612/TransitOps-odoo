const { supabaseAdmin } = require('../../shared/supabase');

class MaintenanceRepository {
  async getMaintenanceLogs(filters = {}) {
    const { vehicle_id, state, page = 1, limit = 1000 } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('maintenance_logs').select('*', { count: 'exact' }).is('deleted_at', null);

    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }
    if (state) {
      query = query.eq('state', state);
    }

    query = query.order('scheduled_date', { ascending: false });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getMaintenanceById(id) {
    return supabaseAdmin.from('maintenance_logs').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async getMaintenanceType(id) {
    return supabaseAdmin.from('transit_ops_maintenance_type').select('*').eq('id', id).single();
  }

  async createMaintenanceLog(data) {
    return supabaseAdmin.from('maintenance_logs').insert(data).select().single();
  }

  async updateMaintenanceLog(id, data) {
    return supabaseAdmin.from('maintenance_logs').update(data).eq('id', id).select().single();
  }

  async softDeleteMaintenanceLog(id) {
    return supabaseAdmin.from('maintenance_logs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async getVehicles(ids) {
    return supabaseAdmin.from('vehicles').select('*').in('id', ids);
  }

  async getMaintenanceTypes(ids) {
    return supabaseAdmin.from('transit_ops_maintenance_type').select('*').in('id', ids);
  }
}

module.exports = new MaintenanceRepository();
