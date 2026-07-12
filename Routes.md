# TransitOps for Odoo - Routes and Actions

## 1. Odoo Window Actions

| Menu | Action | Model | Views |
| --- | --- | --- | --- |
| Dashboard | `action_transit_ops_dashboard` | Dashboard client action | dashboard |
| Fleet / Vehicles | `action_transit_ops_vehicle` | `transit.ops.vehicle` | list, kanban, form, activity |
| Fleet / Vehicle Documents | `action_transit_ops_vehicle_document` | `transit.ops.vehicle.document` | list, form |
| Fleet / Vehicle Types | `action_transit_ops_vehicle_type` | `transit.ops.vehicle.type` | list, form |
| Drivers / Drivers | `action_transit_ops_driver` | `transit.ops.driver` | list, kanban, form, activity |
| Drivers / License Expiry | `action_transit_ops_license_expiry` | `transit.ops.driver` | list, graph |
| Drivers / Safety Scores | `action_transit_ops_safety_score` | `transit.ops.driver` | list, graph |
| Trips / Trips | `action_transit_ops_trip` | `transit.ops.trip` | list, kanban, calendar, form, activity |
| Trips / Draft Trips | `action_transit_ops_trip_draft` | `transit.ops.trip` | list, kanban, form |
| Trips / Active Trips | `action_transit_ops_trip_active` | `transit.ops.trip` | list, kanban, calendar, form |
| Trips / Completed Trips | `action_transit_ops_trip_completed` | `transit.ops.trip` | list, pivot, graph, form |
| Trips / Cancelled Trips | `action_transit_ops_trip_cancelled` | `transit.ops.trip` | list, pivot, graph, form |
| Maintenance / Maintenance Logs | `action_transit_ops_maintenance_log` | `transit.ops.maintenance.log` | list, kanban, calendar, form, activity |
| Maintenance / Scheduled Maintenance | `action_transit_ops_maintenance_scheduled` | `transit.ops.maintenance.log` | list, calendar, form |
| Fuel / Fuel Logs | `action_transit_ops_fuel_log` | `transit.ops.fuel.log` | list, pivot, graph, form |
| Expenses / Expenses | `action_transit_ops_expense` | `transit.ops.expense` | list, pivot, graph, form |
| Reports / Fleet Utilization | `action_transit_ops_report_fleet_utilization` | report model | pivot, graph |
| Reports / Trip Report | `action_transit_ops_report_trip` | `transit.ops.trip` | pivot, graph, list |
| Reports / Operational Cost | `action_transit_ops_report_operational_cost` | report model | pivot, graph |
| Configuration / Regions | `action_transit_ops_region` | `transit.ops.region` | list, form |

## 2. Minimal HTTP Routes

Minimal routes are provided only for internal or controlled CRUD and analytics access.

| Route | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/vehicles` | GET, POST | Vehicle CRUD |
| `/transit_ops/api/vehicles/<id>` | GET, PUT, DELETE | Vehicle detail CRUD |
| `/transit_ops/api/drivers` | GET, POST | Driver CRUD |
| `/transit_ops/api/drivers/<id>` | GET, PUT, DELETE | Driver detail CRUD |
| `/transit_ops/api/trips` | GET, POST | Trip CRUD |
| `/transit_ops/api/trips/<id>` | GET, PUT, DELETE | Trip detail CRUD |
| `/transit_ops/api/maintenance` | GET, POST | Maintenance CRUD |
| `/transit_ops/api/maintenance/<id>` | GET, PUT, DELETE | Maintenance detail CRUD |
| `/transit_ops/api/fuel` | GET, POST | Fuel log CRUD |
| `/transit_ops/api/fuel/<id>` | GET, PUT, DELETE | Fuel log detail CRUD |
| `/transit_ops/api/expenses` | GET, POST | Expense CRUD |
| `/transit_ops/api/expenses/<id>` | GET, PUT, DELETE | Expense detail CRUD |
| `/transit_ops/api/dashboard/kpis` | GET | Dashboard KPI data |
| `/transit_ops/api/analytics` | GET | Analytics data |

## 3. Action Buttons

| Model | Button | Result |
| --- | --- | --- |
| `transit.ops.trip` | Dispatch | Trip becomes Dispatched; vehicle and driver become On Trip |
| `transit.ops.trip` | Complete | Trip becomes Completed; vehicle and driver become Available |
| `transit.ops.trip` | Cancel | Trip becomes Cancelled; vehicle and driver become Available |
| `transit.ops.maintenance.log` | Open Maintenance | Vehicle becomes In Shop |
| `transit.ops.maintenance.log` | Close Maintenance | Vehicle becomes Available unless Retired |

## 4. Exclusions

The core routing scope does not include customer portals, shipment routes, warehouse routes, external logistics integrations, or webhook routes.
