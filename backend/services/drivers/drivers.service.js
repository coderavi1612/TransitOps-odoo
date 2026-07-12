const driversRepository = require('./drivers.repository');
const { supabaseAdmin } = require('../../shared/supabase');

class DriversService {
  async attachDriverLookups(drivers, token) {
    const rows = Array.isArray(drivers) ? drivers : [drivers];
    const regionIds = [...new Set(rows.map((driver) => driver.region_id).filter(Boolean))];
    const tripIds = [...new Set(rows.map((driver) => driver.active_trip_id).filter(Boolean))];

    const [regionsRes, tripsRes] = await Promise.all([
      regionIds.length ? driversRepository.getRegions(regionIds) : { data: [] },
      tripIds.length ? supabaseAdmin.from('trips').select('id, name, source, destination').in('id', tripIds) : { data: [] }
    ]);

    const regionsById = new Map((regionsRes.data || []).map((region) => [String(region.id), region]));
    const tripsById = new Map((tripsRes.data || []).map((trip) => [String(trip.id), trip]));

    const enriched = rows.map((driver) => {
      let avatar = driver.avatar_url;
      if (avatar && token) {
        avatar = avatar.includes('?') ? `${avatar}&token=${token}` : `${avatar}?token=${token}`;
      }
      return {
        ...driver,
        avatar_url: avatar,
        transit_ops_region: driver.region_id ? regionsById.get(String(driver.region_id)) || null : null,
        active_trip: driver.active_trip_id ? tripsById.get(String(driver.active_trip_id)) || null : null,
      };
    });

    return Array.isArray(drivers) ? enriched : enriched[0];
  }

  async listDrivers(filters, userRoles, userEmail, token) {
    // Row ownership: A driver can only view their own driver record
    if (userRoles.includes('driver')) {
      filters.email = userEmail;
    }

    let query = await driversRepository.getDrivers(filters);

    if (filters.email) {
      query = query.eq('email', filters.email);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const drivers = await this.attachDriverLookups(data || [], token);
    return { drivers, count: drivers.length };
  }

  async getDriver(id, userRoles, userEmail, token) {
    const { data, error } = await driversRepository.getDriverById(id);
    if (error || !data) throw new Error('Driver not found');

    // Row ownership: Drivers can only view their own details
    if (userRoles.includes('driver') && data.email !== userEmail) {
      throw new Error('Access denied: You can only view your own details');
    }

    return this.attachDriverLookups(data, token);
  }

  async createDriver(body, token) {
    const { data, error } = await driversRepository.createDriver(body);
    if (error) throw new Error(error.message);
    return this.attachDriverLookups(data, token);
  }

  async updateDriver(id, body, token) {
    const { data: driver, error: fetchErr } = await driversRepository.getDriverById(id);
    if (fetchErr || !driver) throw new Error('Driver not found');

    const { data, error } = await driversRepository.updateDriver(id, body);
    if (error) throw new Error(error.message);

    return this.attachDriverLookups(data, token);
  }

  async deleteDriver(id) {
    const { error } = await driversRepository.softDeleteDriver(id);
    if (error) throw new Error(error.message);
    return { message: 'Driver deleted' };
  }
}

module.exports = new DriversService();
