const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listVehiclesSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    region: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const createVehicleSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    vehicle_name: z.string().optional(),
    registration_number: z.string().min(1),
    vehicle_model: z.string().optional(),
    manufacturer: z.string().optional(),
    capacity: z.number().nonnegative(),
    status: z.enum(['Available', 'On Trip', 'In Shop', 'Retired']).optional(),
    odometer: z.number().nonnegative().optional(),
    acquisition_cost: z.number().nonnegative().optional(),
    vehicle_type_id: z.string().uuid().nullable().optional(),
    region_id: z.string().uuid().nullable().optional(),
  }),
});

const updateVehicleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().optional(),
    vehicle_name: z.string().optional(),
    vehicle_model: z.string().optional(),
    manufacturer: z.string().optional(),
    capacity: z.number().nonnegative().optional(),
    status: z.enum(['Available', 'On Trip', 'In Shop', 'Retired']).optional(),
    odometer: z.number().nonnegative().optional(),
    acquisition_cost: z.number().nonnegative().optional(),
    vehicle_type_id: z.string().uuid().nullable().optional(),
    region_id: z.string().uuid().nullable().optional(),
  }),
});

const deleteVehicleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = {
  validateListVehicles: validate(listVehiclesSchema),
  validateCreateVehicle: validate(createVehicleSchema),
  validateUpdateVehicle: validate(updateVehicleSchema),
  validateDeleteVehicle: validate(deleteVehicleSchema),
};
