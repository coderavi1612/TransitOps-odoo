const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listFuelSchema = z.object({
  query: z.object({
    vehicle_id: z.string().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const createFuelSchema = z.object({
  body: z.object({
    vehicle_id: z.string().uuid(),
    date: z.string().min(1),
    litres: z.number().positive(),
    cost: z.number().nonnegative(),
    odometer: z.number().nonnegative().optional(),
    location: z.string().optional(),
  }),
});

const updateFuelSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    date: z.string().optional(),
    litres: z.number().positive().optional(),
    cost: z.number().nonnegative().optional(),
    odometer: z.number().nonnegative().optional(),
    location: z.string().optional(),
  }),
});

module.exports = {
  validateListFuel: validate(listFuelSchema),
  validateCreateFuel: validate(createFuelSchema),
  validateUpdateFuel: validate(updateFuelSchema),
};
