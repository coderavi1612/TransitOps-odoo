const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listTripsSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    search: z.string().optional(),
  }),
});

const createTripSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    source: z.string().min(1),
    destination: z.string().min(1),
    cargo_weight: z.number().nonnegative(),
    planned_distance: z.number().nonnegative(),
    vehicle_id: z.string().uuid(),
    driver_id: z.string().uuid(),
    planned_date: z.string().min(1),
    region_id: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
  }),
});

const updateTripSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().optional(),
    source: z.string().optional(),
    destination: z.string().optional(),
    cargo_weight: z.number().nonnegative().optional(),
    planned_distance: z.number().nonnegative().optional(),
    vehicle_id: z.string().uuid().optional(),
    driver_id: z.string().uuid().optional(),
    planned_date: z.string().optional(),
    region_id: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
    state: z.enum(['Draft', 'Dispatched', 'Completed', 'Cancelled']).optional(),
  }),
});

const completeTripSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    end_odometer: z.number().nonnegative(),
    fuel_consumed: z.number().nonnegative().optional(),
  }),
});

module.exports = {
  validateListTrips: validate(listTripsSchema),
  validateCreateTrip: validate(createTripSchema),
  validateUpdateTrip: validate(updateTripSchema),
  validateCompleteTrip: validate(completeTripSchema),
};
