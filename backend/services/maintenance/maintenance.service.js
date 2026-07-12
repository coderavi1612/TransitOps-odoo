const maintenanceRepository = require('./maintenance.repository');
const { supabaseAdmin } = require('../../shared/supabase');

class MaintenanceService {
  async attachMaintenanceLookups(logs) {
    const rows = Array.isArray(logs) ? logs : [logs];
    const vehicleIds = [...new Set(rows.map((log) => log.vehicle_id).filter(Boolean))];
    const typeIds = [...new Set(rows.map((log) => log.maintenance_type_id).filter(Boolean))];

    const [vehiclesRes, typesRes] = await Promise.all([
      vehicleIds.length ? maintenanceRepository.getVehicles(vehicleIds) : { data: [] },
      typeIds.length ? maintenanceRepository.getMaintenanceTypes(typeIds) : { data: [] },
    ]);

    const vehiclesById = new Map((vehiclesRes.data || []).map((v) => [String(v.id), v]));
    const typesById = new Map((typesRes.data || []).map((t) => [String(t.id), t]));

    const enriched = rows.map((log) => ({
      ...log,
      transit_ops_vehicle: log.vehicle_id ? vehiclesById.get(String(log.vehicle_id)) || null : null,
      transit_ops_maintenance_type: log.maintenance_type_id
        ? typesById.get(String(log.maintenance_type_id)) || { name: log.maintenance_type }
        : { name: log.maintenance_type },
    }));

    return Array.isArray(logs) ? enriched : enriched[0];
  }

  async listMaintenanceLogs(filters) {
    const { data, error } = await maintenanceRepository.getMaintenanceLogs(filters);
    if (error) throw new Error(error.message);

    const logs = await this.attachMaintenanceLookups(data || []);
    return { maintenance_logs: logs, count: logs.length };
  }

  async getMaintenanceLog(id) {
    const { data, error } = await maintenanceRepository.getMaintenanceById(id);
    if (error || !data) throw new Error('Maintenance log not found');
    return this.attachMaintenanceLookups(data);
  }

  async getMaintenanceTypeDetails(maintenance_type_id, fallback) {
    if (!maintenance_type_id) {
      return { id: null, name: fallback || 'General Repair' };
    }
    const { data } = await maintenanceRepository.getMaintenanceType(maintenance_type_id);
    return data || { id: maintenance_type_id, name: fallback || 'General Repair' };
  }

  async createMaintenanceLog(body) {
    const { vehicle_id, maintenance_type_id, maintenance_type, scheduled_date, notes, cost } = body;

    const typeObj = await this.getMaintenanceTypeDetails(maintenance_type_id, maintenance_type);
    const resolvedType = typeObj.name || maintenance_type || 'General Repair';

    const { data, error } = await supabaseAdmin.from('maintenance_logs').insert({
      vehicle_id,
      maintenance_type: resolvedType,
      maintenance_type_id: maintenance_type_id || null,
      scheduled_date,
      notes: notes || '',
      cost: cost || 0,
      state: 'Scheduled',
    }).select().single();

    if (error) throw new Error(error.message);

    // Update vehicle to 'In Shop'
    const { error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .update({ status: 'In Shop' })
      .eq('id', vehicle_id);
    if (vehicleError) throw new Error(vehicleError.message);

    return this.attachMaintenanceLookups(data);
  }

  async updateMaintenanceLog(id, body) {
    const { data: log, error: fetchErr } = await maintenanceRepository.getMaintenanceById(id);
    if (fetchErr || !log) throw new Error('Maintenance log not found');

    const updateData = { ...body };
    if (body.maintenance_type_id) {
      const typeObj = await this.getMaintenanceTypeDetails(body.maintenance_type_id, body.maintenance_type);
      updateData.maintenance_type = typeObj.name;
    }

    const { data, error } = await maintenanceRepository.updateMaintenanceLog(id, updateData);
    if (error) throw new Error(error.message);

    return this.attachMaintenanceLookups(data);
  }

  async openMaintenanceLog(id) {
    const { data: log, error: fetchErr } = await maintenanceRepository.getMaintenanceById(id);
    if (fetchErr || !log) throw new Error('Maintenance log not found');

    if (log.state !== 'Scheduled') {
      throw new Error(`Cannot open maintenance log in ${log.state} state`);
    }

    // Atomic: Open maintenance log and set vehicle to 'Maintenance'
    await supabaseAdmin.from('maintenance_logs').update({ state: 'Open', open_date: new Date().toISOString() }).eq('id', id);
    const { error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .update({ status: 'In Shop' })
      .eq('id', log.vehicle_id);
    if (vehicleError) throw new Error(vehicleError.message);

    const { data: updated } = await maintenanceRepository.getMaintenanceById(id);
    return this.attachMaintenanceLookups(updated);
  }

  async closeMaintenanceLog(id, body) {
    const { cost, odometer } = body;
    const { data: log, error: fetchErr } = await maintenanceRepository.getMaintenanceById(id);
    if (fetchErr || !log) throw new Error('Maintenance log not found');

    if (log.state !== 'Open') {
      throw new Error(`Cannot close maintenance log in ${log.state} state`);
    }

    // Atomic: Close log and reset vehicle to 'Available'
    await supabaseAdmin.from('maintenance_logs').update({
      state: 'Closed',
      close_date: new Date().toISOString(),
      cost,
    }).eq('id', id);

    const vehicleUpdate = { status: 'Available' };
    if (odometer) {
      vehicleUpdate.odometer = odometer;
    }
    await supabaseAdmin.from('vehicles').update(vehicleUpdate).eq('id', log.vehicle_id);

    const { data: updated } = await maintenanceRepository.getMaintenanceById(id);
    return this.attachMaintenanceLookups(updated);
  }

  async deleteMaintenanceLog(id) {
    const { error } = await maintenanceRepository.softDeleteMaintenanceLog(id);
    if (error) throw new Error(error.message);
    return { message: 'Maintenance log deleted' };
  }
}

module.exports = new MaintenanceService();
