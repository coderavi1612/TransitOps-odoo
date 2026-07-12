const { supabaseAdmin } = require('../../shared/supabase');

class TripsRepository {
  async getTrips(filters = {}) {
    const { driver_id, page = 1, limit = 1000 } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('trips').select('*', { count: 'exact' }).is('deleted_at', null);

    if (driver_id) {
      query = query.eq('driver_id', driver_id);
    }

    query = query.order('created_at', { ascending: false });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getTripById(id) {
    return supabaseAdmin.from('trips').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async createTrip(data) {
    return supabaseAdmin.from('trips').insert(data).select().single();
  }

  async updateTrip(id, data) {
    return supabaseAdmin.from('trips').update(data).eq('id', id).select().single();
  }

  async softDeleteTrip(id) {
    return supabaseAdmin.from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async getVehicles(ids) {
    return supabaseAdmin.from('vehicles').select('*').in('id', ids);
  }

  async getDrivers(ids) {
    return supabaseAdmin.from('drivers').select('*').in('id', ids);
  }

  async getRegions(ids) {
    return supabaseAdmin.from('transit_ops_region').select('*').in('id', ids);
  }
}

module.exports = new TripsRepository();
