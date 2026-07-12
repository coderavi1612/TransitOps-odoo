# TransitOps for Odoo - Navigation

## 1. Top-Level App

| App |
| --- |
| TransitOps |

## 2. Main Menu Structure

| Menu | Submenus |
| --- | --- |
| Dashboard | Operations Dashboard |
| Fleet | Vehicles, Vehicle Documents, Vehicle Types |
| Drivers | Drivers, License Expiry, Safety Scores |
| Trips | Trips, Draft Trips, Active Trips, Completed Trips, Cancelled Trips |
| Maintenance | Maintenance Logs, Scheduled Maintenance, Maintenance Types |
| Fuel | Fuel Logs, Fuel Efficiency |
| Expenses | Expenses, Expense Categories, Operational Cost |
| Reports | Fleet Utilization, Trip Report, Driver Performance, Vehicle Performance, Maintenance Report, Fuel Efficiency, Expense Report, Vehicle ROI, License Expiry Report, Operational Cost |
| Configuration | Regions, Vehicle Types, Maintenance Types, Expense Categories, Roles, Settings |

## 3. Dashboard Filters

| Filter |
| --- |
| Vehicle Type |
| Region |
| Status |
| Date |

## 4. Fleet Menu

| Menu Item | Model | Purpose |
| --- | --- | --- |
| Vehicles | `transit.ops.vehicle` | Vehicle registry and status |
| Vehicle Documents | `transit.ops.vehicle.document` | Compliance and document storage |
| Vehicle Types | `transit.ops.vehicle.type` | Vehicle classification and capacity defaults |

## 5. Drivers Menu

| Menu Item | Model | Purpose |
| --- | --- | --- |
| Drivers | `transit.ops.driver` | Driver registry and availability |
| License Expiry | `transit.ops.driver` | Expiring and expired license monitoring |
| Safety Scores | `transit.ops.driver` | Driver safety score review |

## 6. Trips Menu

| Menu Item | Model | Purpose |
| --- | --- | --- |
| Trips | `transit.ops.trip` | All trips |
| Draft Trips | `transit.ops.trip` | Trips not yet dispatched |
| Active Trips | `transit.ops.trip` | Dispatched trips |
| Completed Trips | `transit.ops.trip` | Completed trips |
| Cancelled Trips | `transit.ops.trip` | Cancelled trips |

## 7. Maintenance Menu

| Menu Item | Model | Purpose |
| --- | --- | --- |
| Maintenance Logs | `transit.ops.maintenance.log` | Maintenance records |
| Scheduled Maintenance | `transit.ops.maintenance.log` | Upcoming and due maintenance |
| Maintenance Types | `transit.ops.maintenance.type` | Maintenance classification |

## 8. Fuel and Expenses Menus

| Menu Item | Model | Purpose |
| --- | --- | --- |
| Fuel Logs | `transit.ops.fuel.log` | Fuel entries |
| Fuel Efficiency | `transit.ops.fuel.log` | Efficiency analytics |
| Expenses | `transit.ops.expense` | Operational expenses |
| Expense Categories | `transit.ops.expense.category` | Toll, maintenance, miscellaneous categories |
| Operational Cost | `transit.ops.expense` | Cost reporting |
