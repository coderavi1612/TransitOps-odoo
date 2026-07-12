const tripsRepository = require('./trips.repository');
const { supabaseAdmin } = require('../../shared/supabase');

class TripsService {
  async attachTripLookups(trips) {
    const rows = Array.isArray(trips) ? trips : [trips];
    const vehicleIds = [...new Set(rows.map((t) => t.vehicle_id).filter(Boolean))];
    const driverIds = [...new Set(rows.map((t) => t.driver_id).filter(Boolean))];
    const regionIds = [...new Set(rows.map((t) => t.region_id).filter(Boolean))];

    const [vehiclesRes, driversRes, regionsRes] = await Promise.all([
      vehicleIds.length ? tripsRepository.getVehicles(vehicleIds) : { data: [] },
      driverIds.length ? tripsRepository.getDrivers(driverIds) : { data: [] },
      regionIds.length ? tripsRepository.getRegions(regionIds) : { data: [] },
    ]);

    const vehiclesById = new Map((vehiclesRes.data || []).map((v) => [String(v.id), v]));
    const driversById = new Map((driversRes.data || []).map((d) => [String(d.id), d]));
    const regionsById = new Map((regionsRes.data || []).map((r) => [String(r.id), r]));

    const enriched = rows.map((trip) => ({
      ...trip,
      transit_ops_vehicle: trip.vehicle_id ? vehiclesById.get(String(trip.vehicle_id)) || null : null,
      transit_ops_driver: trip.driver_id ? driversById.get(String(trip.driver_id)) || null : null,
      transit_ops_region: trip.region_id ? regionsById.get(String(trip.region_id)) || null : null,
    }));

    return Array.isArray(trips) ? enriched : enriched[0];
  }

  async listTrips(filters, userRoles, userEmail) {
    // Row ownership: Drivers can only see their own assigned trips
    if (userRoles.includes('driver')) {
      const { data: driverData } = await require('../drivers/drivers.repository').getDriverByEmail(userEmail);
      if (driverData) {
        filters.driver_id = driverData.id;
      } else {
        return { trips: [], count: 0 };
      }
    }

    const { data, error } = await tripsRepository.getTrips(filters);
    if (error) throw new Error(error.message);

    const trips = await this.attachTripLookups(data || []);
    return { trips, count: trips.length };
  }

  async getTrip(id, userRoles, userEmail) {
    const { data, error } = await tripsRepository.getTripById(id);
    if (error || !data) throw new Error('Trip not found');

    // Row ownership check for drivers
    if (userRoles.includes('driver')) {
      const { data: driverData } = await require('../drivers/drivers.repository').getDriverByEmail(userEmail);
      if (!driverData || data.driver_id !== driverData.id) {
        throw new Error('Access denied: You can only view your assigned trips');
      }
    }

    return this.attachTripLookups(data);
  }

  async createTrip(body) {
    if (body.vehicle_id) {
      const { data: vehicle } = await supabaseAdmin.from('vehicles').select('capacity').eq('id', body.vehicle_id).single();
      if (vehicle && body.cargo_weight && Number(body.cargo_weight) > Number(vehicle.capacity)) {
        throw new Error(`Cargo weight (${body.cargo_weight} kg) exceeds vehicle capacity (${vehicle.capacity} kg)`);
      }
    }

    const { data, error } = await tripsRepository.createTrip({
      ...body,
      state: 'Draft',
    });
    if (error) throw new Error(error.message);
    return this.attachTripLookups(data);
  }

  async updateTrip(id, body) {
    const { data: trip, error: fetchErr } = await tripsRepository.getTripById(id);
    if (fetchErr || !trip) throw new Error('Trip not found');

    const { data, error } = await tripsRepository.updateTrip(id, body);
    if (error) throw new Error(error.message);

    return this.attachTripLookups(data);
  }

  async dispatchTrip(id) {
    const { data: trip, error: fetchErr } = await tripsRepository.getTripById(id);
    if (fetchErr || !trip) throw new Error('Trip not found');

    if (trip.state !== 'Draft') {
      throw new Error(`Cannot dispatch trip in ${trip.state} state`);
    }

    const [{ data: vehicle, error: vehicleFetchError }, { data: driver, error: driverFetchError }] = await Promise.all([
      supabaseAdmin.from('vehicles').select('id, status, odometer, capacity').eq('id', trip.vehicle_id).is('deleted_at', null).single(),
      supabaseAdmin.from('drivers').select('id, status').eq('id', trip.driver_id).is('deleted_at', null).single(),
    ]);
    if (vehicleFetchError || !vehicle) throw new Error('Assigned vehicle was not found');
    if (driverFetchError || !driver) throw new Error('Assigned driver was not found');
    if (vehicle.status !== 'Available') throw new Error(`Vehicle is ${vehicle.status} and cannot be dispatched`);
    if (driver.status !== 'Available') throw new Error(`Driver is ${driver.status} and cannot be dispatched`);

    if (trip.cargo_weight && vehicle.capacity && Number(trip.cargo_weight) > Number(vehicle.capacity)) {
      throw new Error(`Cargo weight (${trip.cargo_weight} kg) exceeds vehicle capacity (${vehicle.capacity} kg)`);
    }

    const dispatchTime = new Date().toISOString();
    const { error: tripUpdateErr } = await supabaseAdmin
      .from('trips')
      .update({ state: 'Dispatched', dispatch_datetime: dispatchTime, start_odometer: Number(vehicle.odometer || 0) })
      .eq('id', id);
    if (tripUpdateErr) throw new Error(tripUpdateErr.message);

    // Update vehicle to 'On Trip'
    const { error: vehicleUpdateError } = await supabaseAdmin
      .from('vehicles')
      .update({ status: 'On Trip', active_trip_id: id })
      .eq('id', trip.vehicle_id);
    if (vehicleUpdateError) throw new Error(vehicleUpdateError.message);

    // Update driver to 'On Trip'
    const { error: driverUpdateError } = await supabaseAdmin
      .from('drivers')
      .update({ status: 'On Trip', active_trip_id: id })
      .eq('id', trip.driver_id);
    if (driverUpdateError) throw new Error(driverUpdateError.message);

    const { data: updatedTrip } = await tripsRepository.getTripById(id);
    return this.attachTripLookups(updatedTrip);
  }

  async completeTrip(id, body, userRoles, userEmail) {
    const { end_odometer, fuel_consumed } = body;
    const { data: trip, error: fetchErr } = await tripsRepository.getTripById(id);
    if (fetchErr || !trip) throw new Error('Trip not found');

    // Row ownership / Role checks
    if (userRoles.includes('driver')) {
      const { data: driverData } = await require('../drivers/drivers.repository').getDriverByEmail(userEmail);
      if (!driverData || trip.driver_id !== driverData.id) {
        throw new Error('Access denied: You can only complete your own assigned trips');
      }
    }

    if (trip.state !== 'Dispatched') {
      throw new Error(`Cannot complete trip in ${trip.state} state`);
    }

    const startOdometer = Number(trip.start_odometer || 0);
    if (end_odometer < startOdometer) {
      throw new Error('End odometer cannot be less than start odometer');
    }

    const actual_distance = end_odometer - startOdometer;

    // Atomic completion updates
    await supabaseAdmin
      .from('trips')
      .update({
        state: 'Completed',
        completion_datetime: new Date().toISOString(),
        end_odometer,
        actual_distance,
        fuel_consumed,
      })
      .eq('id', id);

    // Reset vehicle to 'Available' and set odometer
    await supabaseAdmin
      .from('vehicles')
      .update({ status: 'Available', active_trip_id: null, odometer: end_odometer })
      .eq('id', trip.vehicle_id);

    // Reset driver to 'Available'
    await supabaseAdmin
      .from('drivers')
      .update({ status: 'Available', active_trip_id: null })
      .eq('id', trip.driver_id);

    return { message: 'Trip completed successfully', state: 'Completed', actual_distance };
  }

  async cancelTrip(id) {
    const { data: trip, error: fetchErr } = await tripsRepository.getTripById(id);
    if (fetchErr || !trip) throw new Error('Trip not found');

    if (trip.state === 'Completed' || trip.state === 'Cancelled') {
      throw new Error(`Cannot cancel trip in ${trip.state} state`);
    }

    // Cancel trip update
    await supabaseAdmin.from('trips').update({ state: 'Cancelled' }).eq('id', id);

    // If it was already dispatched, free up vehicle and driver
    if (trip.state === 'Dispatched') {
      await supabaseAdmin
        .from('vehicles')
        .update({ status: 'Available', active_trip_id: null })
        .eq('id', trip.vehicle_id);

      await supabaseAdmin
        .from('drivers')
        .update({ status: 'Available', active_trip_id: null })
        .eq('id', trip.driver_id);
    }

    return { message: 'Trip cancelled successfully', state: 'Cancelled' };
  }

  async deleteTrip(id) {
    const { error } = await tripsRepository.softDeleteTrip(id);
    if (error) throw new Error(error.message);
    return { message: 'Trip deleted' };
  }
}

module.exports = new TripsService();
