const fuelRepository = require('./fuel.repository');
const { supabaseAdmin } = require('../../shared/supabase');

class FuelService {
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

  async attachFuelLookups(logs) {
    const rows = Array.isArray(logs) ? logs : [logs];
    const vehicleIds = [...new Set(rows.map((log) => log.vehicle_id).filter(Boolean))];

    const { data: vehiclesData } = vehicleIds.length
      ? await fuelRepository.getVehicles(vehicleIds)
      : { data: [] };

    const vehiclesById = new Map((vehiclesData || []).map((v) => [String(v.id), v]));

    const enriched = rows.map((log) => ({
      ...log,
      transit_ops_vehicle: log.vehicle_id ? vehiclesById.get(String(log.vehicle_id)) || null : null,
    }));

    return Array.isArray(logs) ? enriched : enriched[0];
  }

  async listFuelLogs(filters, userRoles, userEmail) {
    // Row ownership: Drivers can only view fuel logs of vehicles they drove
    if (userRoles.includes('driver')) {
      const allowedVehicleIds = await this.getDriverVehicleIds(userEmail);
      filters.vehicle_ids = allowedVehicleIds;
    }

    let query = await fuelRepository.getFuelLogs(filters);

    if (filters.vehicle_ids) {
      if (filters.vehicle_ids.length === 0) {
        return { fuel_logs: [], count: 0, totals: { total_litres: 0, total_cost: 0, avg_efficiency: 0 } };
      }
      query = query.in('vehicle_id', filters.vehicle_ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const logs = await this.attachFuelLookups(data || []);

    // Calculate totals
    const total_litres = logs.reduce((acc, log) => acc + Number(log.litres || 0), 0);
    const total_cost = logs.reduce((acc, log) => acc + Number(log.cost || 0), 0);
    const validEfficiencies = logs.map((log) => log.fuel_efficiency).filter((eff) => typeof eff === 'number' && eff > 0);
    const avg_efficiency = validEfficiencies.length
      ? validEfficiencies.reduce((acc, val) => acc + val, 0) / validEfficiencies.length
      : 0;

    return {
      fuel_logs: logs,
      count: logs.length,
      totals: { total_litres, total_cost, avg_efficiency },
    };
  }

  async getFuelLog(id, userRoles, userEmail) {
    const { data, error } = await fuelRepository.getFuelLogById(id);
    if (error || !data) throw new Error('Fuel log not found');

    // Row ownership for drivers
    if (userRoles.includes('driver')) {
      const allowedVehicleIds = await this.getDriverVehicleIds(userEmail);
      if (!allowedVehicleIds.includes(data.vehicle_id)) {
        throw new Error('Access denied: You are not authorized to view this log');
      }
    }

    return this.attachFuelLookups(data);
  }

  async createFuelLog(body, userRoles, userEmail) {
    const { vehicle_id, date, litres, cost, odometer, location } = body;

    // Row ownership for drivers
    if (userRoles.includes('driver')) {
      const allowedVehicleIds = await this.getDriverVehicleIds(userEmail);
      if (!allowedVehicleIds.includes(vehicle_id)) {
        throw new Error('Access denied: You are not authorized to create logs for this vehicle');
      }
    }

    // 1. Calculate fuel efficiency based on odometer diff
    let fuel_efficiency = null;
    if (odometer) {
      // Find the most recent previous fuel log for this vehicle
      const { data: prevLogs } = await supabaseAdmin
        .from('fuel_logs')
        .select('odometer')
        .eq('vehicle_id', vehicle_id)
        .lt('date', date)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(1);

      if (prevLogs && prevLogs.length > 0 && prevLogs[0].odometer) {
        const diffDistance = odometer - prevLogs[0].odometer;
        if (diffDistance > 0) {
          fuel_efficiency = diffDistance / litres;
        }
      }
    }

    const { data, error } = await fuelRepository.createFuelLog({
      vehicle_id,
      date,
      litres,
      cost,
      odometer: odometer || null,
      location: location || '',
      fuel_efficiency,
    });

    if (error) throw new Error(error.message);
    return this.attachFuelLookups(data);
  }

  async updateFuelLog(id, body) {
    const { data: log, error: fetchErr } = await fuelRepository.getFuelLogById(id);
    if (fetchErr || !log) throw new Error('Fuel log not found');

    const { data, error } = await fuelRepository.updateFuelLog(id, body);
    if (error) throw new Error(error.message);

    return this.attachFuelLookups(data);
  }

  async deleteFuelLog(id) {
    const { error } = await fuelRepository.softDeleteFuelLog(id);
    if (error) throw new Error(error.message);
    return { message: 'Fuel log deleted' };
  }

  async getVehicleEfficiency(vehicle_id) {
    const { data, error } = await supabaseAdmin
      .from('fuel_logs')
      .select('fuel_efficiency')
      .eq('vehicle_id', vehicle_id)
      .is('deleted_at', null)
      .not('fuel_efficiency', 'is', null);

    if (error) throw new Error(error.message);

    const values = (data || []).map((log) => log.fuel_efficiency).filter(Boolean);
    if (values.length === 0) {
      return { avg_efficiency: 0, best_efficiency: 0, worst_efficiency: 0, total_logs: 0 };
    }

    const avg_efficiency = values.reduce((a, b) => a + b, 0) / values.length;
    const best_efficiency = Math.max(...values);
    const worst_efficiency = Math.min(...values);

    return { avg_efficiency, best_efficiency, worst_efficiency, total_logs: values.length };
  }
}

module.exports = new FuelService();
