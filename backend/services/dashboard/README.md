# Dashboard Service

KPI aggregation and analytics reporting.

## Owner
Backend Team — Reporting

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/kpis` | Get dashboard KPI summary |
| GET | `/api/dashboard/analytics` | Get filtered analytics data |

## Files
- `dashboard.routes.js` — Express router
- `index.js` — Re-exports the router
