const { supabaseAdmin } = require('../../shared/supabase');

class DriversRepository {
  async getDrivers(filters = {}) {
    const { status, search, page = 1, limit = 1000 } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('drivers').select('*', { count: 'exact' }).is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getDriverById(id) {
    return supabaseAdmin.from('drivers').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async getDriverByEmail(email) {
    return supabaseAdmin.from('drivers').select('*').eq('email', email).is('deleted_at', null).single();
  }

  async createDriver(data) {
    return supabaseAdmin.from('drivers').insert(data).select().single();
  }

  async updateDriver(id, data) {
    return supabaseAdmin.from('drivers').update(data).eq('id', id).select().single();
  }

  async softDeleteDriver(id) {
    return supabaseAdmin.from('drivers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async getRegions(ids) {
    return supabaseAdmin.from('transit_ops_region').select('*').in('id', ids);
  }
}

module.exports = new DriversRepository();
