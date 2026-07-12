const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listDriversSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    search: z.string().optional(),
  }),
});

const createDriverSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    license_number: z.string().min(1),
    license_expiry_date: z.string().min(1),
    status: z.enum(['Available', 'On Trip', 'Off Duty', 'Suspended']).optional(),
    safety_score: z.number().min(0).max(100).optional(),
    region_id: z.string().uuid().nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
  }),
});

const updateDriverSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    license_number: z.string().optional(),
    license_expiry_date: z.string().optional(),
    status: z.enum(['Available', 'On Trip', 'Off Duty', 'Suspended']).optional(),
    safety_score: z.number().min(0).max(100).optional(),
    region_id: z.string().uuid().nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
  }),
});

const deleteDriverSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = {
  validateListDrivers: validate(listDriversSchema),
  validateCreateDriver: validate(createDriverSchema),
  validateUpdateDriver: validate(updateDriverSchema),
  validateDeleteDriver: validate(deleteDriverSchema),
};
