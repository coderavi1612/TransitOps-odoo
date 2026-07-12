const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listExpensesSchema = z.object({
  query: z.object({
    vehicle_id: z.string().optional(),
    trip_id: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const createExpenseSchema = z.object({
  body: z.object({
    vehicle_id: z.string().uuid(),
    trip_id: z.string().uuid().nullable().optional(),
    expense_category: z.string().optional(),
    expense_category_id: z.string().uuid().nullable().optional(),
    amount: z.number().positive(),
    date: z.string().min(1),
    notes: z.string().optional(),
  }),
});

const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    trip_id: z.string().uuid().nullable().optional(),
    expense_category: z.string().optional(),
    expense_category_id: z.string().uuid().nullable().optional(),
    amount: z.number().positive().optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  validateListExpenses: validate(listExpensesSchema),
  validateCreateExpense: validate(createExpenseSchema),
  validateUpdateExpense: validate(updateExpenseSchema),
};
