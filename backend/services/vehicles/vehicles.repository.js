const { supabaseAdmin } = require('../../shared/supabase');

class VehiclesRepository {
  async getVehicles(filters = {}) {
    const { status, region, type, search, page = 1, limit = 1000, sortBy = 'created_at', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('vehicles').select('*', { count: 'exact' }).is('deleted_at', null);

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }
    if (region && region !== 'All') {
      query = query.eq('region_id', region);
    }
    if (type && type !== 'All') {
      query = query.eq('vehicle_type_id', type);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,vehicle_name.ilike.%${search}%,registration_number.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getVehicleById(id) {
    return supabaseAdmin.from('vehicles').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async checkRegistrationExists(regNum, excludeId = null) {
    let query = supabaseAdmin.from('vehicles').select('id').eq('registration_number', regNum);
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    return query.limit(1);
  }

  async createVehicle(data) {
    return supabaseAdmin.from('vehicles').insert(data).select().single();
  }

  async updateVehicle(id, data) {
    return supabaseAdmin.from('vehicles').update(data).eq('id', id).select().single();
  }

  async softDeleteVehicle(id) {
    return supabaseAdmin.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async getVehicleTypes(ids) {
    return supabaseAdmin.from('transit_ops_vehicle_type').select('*').in('id', ids);
  }

  async getRegions(ids) {
    return supabaseAdmin.from('transit_ops_region').select('*').in('id', ids);
  }
}

module.exports = new VehiclesRepository();
