# Vehicles Service

Vehicle registry CRUD operations.

## Owner
Backend Team — Fleet

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vehicles` | List all vehicles |
| POST | `/api/vehicles` | Create vehicle (fleet_manager, admin) |
| GET | `/api/vehicles/:id` | Get vehicle by ID |
| PUT | `/api/vehicles/:id` | Update vehicle (fleet_manager, admin) |
| DELETE | `/api/vehicles/:id` | Delete vehicle (fleet_manager, admin) |

## Files
- `vehicles.routes.js` — Express router
- `index.js` — Re-exports the router
