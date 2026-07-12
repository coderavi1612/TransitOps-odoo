# Drivers Service

Driver registry and management.

## Owner
Backend Team — Safety

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/drivers` | List all drivers |
| POST | `/api/drivers` | Create driver (fleet_manager, safety_officer, admin) |
| GET | `/api/drivers/:id` | Get driver by ID |
| PUT | `/api/drivers/:id` | Update driver (fleet_manager, safety_officer, admin) |
| DELETE | `/api/drivers/:id` | Delete driver (fleet_manager, safety_officer, admin) |

## Files
- `drivers.routes.js` — Express router
- `index.js` — Re-exports the router
