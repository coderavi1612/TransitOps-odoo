# Maintenance Service

Vehicle maintenance lifecycle — schedule, open, close.

## Owner
Backend Team — Safety

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/maintenance` | List maintenance logs |
| POST | `/api/maintenance` | Create maintenance log |
| GET | `/api/maintenance/:id` | Get maintenance log by ID |
| PUT | `/api/maintenance/:id` | Update maintenance log |
| DELETE | `/api/maintenance/:id` | Delete maintenance log |
| POST | `/api/maintenance/:id/open` | Open maintenance (vehicle → In Shop) |
| POST | `/api/maintenance/:id/close` | Close maintenance (vehicle → Available) |

## Files
- `maintenance.routes.js` — Express router
- `index.js` — Re-exports the router
