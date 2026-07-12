# Expenses Service

Expense tracking — tolls, maintenance costs, miscellaneous.

## Owner
Backend Team — Financial

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense (fleet_manager, financial_analyst, admin) |
| GET | `/api/expenses/:id` | Get expense by ID |
| PUT | `/api/expenses/:id` | Update expense (fleet_manager, financial_analyst, admin) |
| DELETE | `/api/expenses/:id` | Delete expense (fleet_manager, financial_analyst, admin) |

## Files
- `expenses.routes.js` — Express router
- `index.js` — Re-exports the router
