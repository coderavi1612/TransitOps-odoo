const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listMaintenanceSchema = z.object({
  query: z.object({
    vehicle_id: z.string().optional(),
    state: z.enum(['Scheduled', 'Open', 'Closed']).optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const createMaintenanceSchema = z.object({
  body: z.object({
    vehicle_id: z.string().uuid(),
    maintenance_type: z.string().optional(),
    maintenance_type_id: z.string().uuid().nullable().optional(),
    scheduled_date: z.string().min(1),
    notes: z.string().optional(),
    cost: z.number().nonnegative().optional(),
  }),
});

const updateMaintenanceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    maintenance_type: z.string().optional(),
    maintenance_type_id: z.string().uuid().nullable().optional(),
    scheduled_date: z.string().optional(),
    notes: z.string().optional(),
    cost: z.number().nonnegative().optional(),
  }),
});

const closeMaintenanceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    cost: z.number().nonnegative(),
    odometer: z.number().nonnegative().optional(),
  }),
});

module.exports = {
  validateListMaintenance: validate(listMaintenanceSchema),
  validateCreateMaintenance: validate(createMaintenanceSchema),
  validateUpdateMaintenance: validate(updateMaintenanceSchema),
  validateCloseMaintenance: validate(closeMaintenanceSchema),
};
