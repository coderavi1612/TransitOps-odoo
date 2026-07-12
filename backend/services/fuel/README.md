# Fuel Service

Fuel log tracking and efficiency reporting.

## Owner
Backend Team — Financial

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fuel` | List fuel logs |
| POST | `/api/fuel` | Create fuel log (fleet_manager, admin) |
| GET | `/api/fuel/:id` | Get fuel log by ID |
| PUT | `/api/fuel/:id` | Update fuel log (fleet_manager, admin) |
| DELETE | `/api/fuel/:id` | Delete fuel log (fleet_manager, admin) |

## Files
- `fuel.routes.js` — Express router
- `index.js` — Re-exports the router
