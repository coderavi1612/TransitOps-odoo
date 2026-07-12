# Config Service

Master data configuration — regions, vehicle types, maintenance types, expense categories.

## Owner
Backend Team — Admin

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config/regions` | List regions |
| POST | `/api/config/regions` | Create region (admin) |
| PUT | `/api/config/regions/:id` | Update region (admin) |
| DELETE | `/api/config/regions/:id` | Delete region (admin) |
| GET | `/api/config/vehicle_types` | List vehicle types |
| POST | `/api/config/vehicle_types` | Create vehicle type (admin) |
| PUT | `/api/config/vehicle_types/:id` | Update vehicle type (admin) |
| DELETE | `/api/config/vehicle_types/:id` | Delete vehicle type (admin) |
| GET | `/api/config/maintenance_types` | List maintenance types |
| POST | `/api/config/maintenance_types` | Create maintenance type (admin) |
| PUT | `/api/config/maintenance_types/:id` | Update maintenance type (admin) |
| DELETE | `/api/config/maintenance_types/:id` | Delete maintenance type (admin) |
| GET | `/api/config/expense_categories` | List expense categories |
| POST | `/api/config/expense_categories` | Create expense category (admin) |
| PUT | `/api/config/expense_categories/:id` | Update expense category (admin) |
| DELETE | `/api/config/expense_categories/:id` | Delete expense category (admin) |

## Files
- `config.routes.js` — Express router
- `index.js` — Re-exports the router
