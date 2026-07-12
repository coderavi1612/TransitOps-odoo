# Trips Service

Trip lifecycle management — create, dispatch, complete, cancel.

## Owner
Backend Team — Operations

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips` | List all trips |
| POST | `/api/trips` | Create draft trip (fleet_manager, admin) |
| GET | `/api/trips/:id` | Get trip by ID |
| PUT | `/api/trips/:id` | Update trip (fleet_manager, admin) |
| DELETE | `/api/trips/:id` | Delete trip (fleet_manager, admin) |
| POST | `/api/trips/:id/dispatch` | Dispatch trip |
| POST | `/api/trips/:id/complete` | Complete trip |
| POST | `/api/trips/:id/cancel` | Cancel trip |

## Files
- `trips.routes.js` — Express router
- `index.js` — Re-exports the router
