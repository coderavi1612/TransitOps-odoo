const vehiclesRepository = require('./vehicles.repository');

class VehiclesService {
  async attachVehicleLookups(vehicles) {
    const rows = Array.isArray(vehicles) ? vehicles : [vehicles];
    const typeIds = [...new Set(rows.map((v) => v.vehicle_type_id).filter(Boolean))];
    const regionIds = [...new Set(rows.map((v) => v.region_id).filter(Boolean))];

    const [typesRes, regionsRes] = await Promise.all([
      typeIds.length ? vehiclesRepository.getVehicleTypes(typeIds) : { data: [] },
      regionIds.length ? vehiclesRepository.getRegions(regionIds) : { data: [] },
    ]);

    const typesById = new Map((typesRes.data || []).map((type) => [String(type.id), type]));
    const regionsById = new Map((regionsRes.data || []).map((region) => [String(region.id), region]));

    const enriched = rows.map((vehicle) => ({
      ...vehicle,
      transit_ops_vehicle_type: vehicle.vehicle_type_id ? typesById.get(String(vehicle.vehicle_type_id)) || null : null,
      transit_ops_region: vehicle.region_id ? regionsById.get(String(vehicle.region_id)) || null : null,
    }));

    return Array.isArray(vehicles) ? enriched : enriched[0];
  }

  async listVehicles(filters, userRoles, userEmail) {
    // Row ownership: Drivers can only see vehicles they have driven (via assigned trips)
    if (userRoles.includes('driver')) {
      const { data: driverData } = await require('../drivers/drivers.repository').getDriverByEmail(userEmail);
      if (driverData) {
        const { data: tripsData } = await require('../trips/trips.repository').getTrips({ driver_id: driverData.id });
        const vehicleIds = [...new Set((tripsData || []).map(t => t.vehicle_id).filter(Boolean))];
        filters.ids = vehicleIds;
      } else {
        filters.ids = [];
      }
    }

    let query = await vehiclesRepository.getVehicles(filters);
    
    if (filters.ids) {
      if (filters.ids.length === 0) {
        return { vehicles: [], count: 0 };
      }
      query = query.in('id', filters.ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const vehicles = await this.attachVehicleLookups(data || []);
    return { vehicles, count: vehicles.length };
  }

  async getVehicle(id, userRoles, userEmail) {
    const { data, error } = await vehiclesRepository.getVehicleById(id);
    if (error || !data) throw new Error('Vehicle not found');

    // Row ownership check for drivers
    if (userRoles.includes('driver')) {
      const { data: driverData } = await require('../drivers/drivers.repository').getDriverByEmail(userEmail);
      if (driverData) {
        const { data: tripsData } = await require('../trips/trips.repository').getTrips({ driver_id: driverData.id });
        const vehicleIds = (tripsData || []).map(t => t.vehicle_id);
        if (!vehicleIds.includes(data.id)) {
          throw new Error('Access denied: You are not authorized to view this vehicle');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    return this.attachVehicleLookups(data);
  }

  async createVehicle(body) {
    const { registration_number, vehicle_name, vehicle_model, name } = body;
    const resolvedVehicleModel = vehicle_model || vehicle_name;
    const resolvedVehicleName = vehicle_name || vehicle_model || name;

    const { data: existing } = await vehiclesRepository.checkRegistrationExists(registration_number);
    if (existing && existing.length > 0) {
      throw new Error('Registration number already exists');
    }

    const { data, error } = await vehiclesRepository.createVehicle({
      ...body,
      vehicle_name: resolvedVehicleName,
      vehicle_model: resolvedVehicleModel,
    });

    if (error) throw new Error(error.message);
    return this.attachVehicleLookups(data);
  }

  async updateVehicle(id, body) {
    const { data: vehicle, error: fetchErr } = await vehiclesRepository.getVehicleById(id);
    if (fetchErr || !vehicle) throw new Error('Vehicle not found');

    const { data, error } = await vehiclesRepository.updateVehicle(id, body);
    if (error) throw new Error(error.message);

    return this.attachVehicleLookups(data);
  }

  async deleteVehicle(id) {
    const { error } = await vehiclesRepository.softDeleteVehicle(id);
    if (error) throw new Error(error.message);
    return { message: 'Vehicle deleted' };
  }
}

module.exports = new VehiclesService();
