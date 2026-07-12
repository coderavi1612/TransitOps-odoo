const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'dispatcher']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1),
  }),
});

const assignRoleSchema = z.object({
  body: z.object({
    user_id: z.string().uuid(),
    role: z.enum(['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst', 'dispatcher']),
  }),
});

module.exports = {
  validateSignup: validate(signupSchema),
  validateLogin: validate(loginSchema),
  validateRefresh: validate(refreshSchema),
  validateAssignRole: validate(assignRoleSchema),
};
