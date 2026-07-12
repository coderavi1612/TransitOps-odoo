# TransitOps for Odoo - Modules

## 1. Module Overview

| Module | Addon | Primary Records |
| --- | --- | --- |
| Core | `transit_ops_core` | Users, roles, regions, vehicle types, maintenance types, expense categories |
| Fleet Management | `transit_ops_fleet` | Vehicles, vehicle documents, vehicle name, model, manufacturer, odometer readings |
| Driver Management | `transit_ops_fleet` | Drivers, contact number, email, licenses, safety scores, availability |
| Trip Management | `transit_ops_trip` | Trips and assignments |
| Maintenance | `transit_ops_maintenance` | Maintenance logs and scheduled maintenance |
| Fuel Management | `transit_ops_expense` | Fuel logs and fuel efficiency |
| Expense Management | `transit_ops_expense` | Expenses, categories, operational cost |
| Reporting | `transit_ops_reporting` | KPIs, charts, analytics, CSV exports |

## 2. Fleet Management

| Feature | Requirement |
| --- | --- |
| Vehicle Registry | Store vehicle master records |
| Vehicle Model / Name | Store vehicle_name, vehicle_model, and manufacturer |
| Vehicle Status | Available, On Trip, In Shop, Retired |
| Vehicle Capacity | Store maximum cargo weight |
| Vehicle Documents | Store registration, insurance, permits, and attachments |
| Odometer | Track odometer readings |
| Acquisition Cost | Store vehicle acquisition cost for ROI |

Business rules:

| Rule |
| --- |
| Vehicle registration number must be unique |
| Retired vehicles cannot be dispatched |
| In Shop vehicles cannot be dispatched |
| Vehicles already On Trip cannot be assigned |

## 3. Driver Management

| Feature | Requirement |
| --- | --- |
| Driver Profile | Store driver master data |
| Contact Number | Store driver phone number |
| Email | Store optional driver email |
| License Number | Must be unique |
| License Expiry | Used for dispatch validation and reminders |
| Safety Score | Used for performance and compliance reporting |
| Availability | Available, On Trip, Off Duty, Suspended |

Business rules:

| Rule |
| --- |
| Driver license number must be unique |
| Expired license drivers cannot be dispatched |
| Suspended drivers cannot be dispatched |
| Drivers already On Trip cannot be assigned |

## 4. Trip Management

| Feature | Requirement |
| --- | --- |
| Trip Creation | Create Draft trip |
| Source | Required trip origin |
| Destination | Required trip destination |
| Cargo Weight | Must be less than or equal to vehicle capacity |
| Planned Distance | Used for reporting and efficiency analysis |
| Start Odometer | Captured before or at dispatch |
| End Odometer | Required when completing a trip |
| Actual Distance | Calculated from odometer readings or entered when required |
| Fuel Consumed | Used for fuel efficiency reporting |
| Vehicle Assignment | Only Available vehicles can be assigned |
| Driver Assignment | Only Available drivers with valid license can be assigned |
| Trip Lifecycle | Draft, Dispatched, Completed, Cancelled |

Lifecycle effects:

| Action | Result |
| --- | --- |
| Dispatch | Trip becomes Dispatched; vehicle and driver become On Trip |
| Complete | Trip becomes Completed; end odometer is captured; vehicle and driver become Available |
| Cancel | Trip becomes Cancelled; vehicle and driver become Available |

## 5. Maintenance

| Feature | Requirement |
| --- | --- |
| Maintenance Log | Track service and repair activity |
| Maintenance Type | Scheduled, repair, inspection, or custom category |
| Open State | Vehicle becomes In Shop |
| Closed State | Vehicle becomes Available unless Retired |
| Scheduled Maintenance | Drives maintenance due KPI and reminders |
| Vehicle Availability | Blocks dispatch while maintenance is open |

Lifecycle:

| State | Next State |
| --- | --- |
| Scheduled | Open |
| Open | Closed |

## 6. Fuel Management

| Feature | Requirement |
| --- | --- |
| Fuel Logs | Record fuel activity per vehicle |
| Litres | Required value |
| Cost | Required value |
| Date | Required value |
| Fuel Efficiency | Calculated as `actual_distance / fuel_consumed` |

## 7. Expense Management

| Feature | Requirement |
| --- | --- |
| Toll Expense | Track toll costs |
| Maintenance Expense | Track maintenance-related cost |
| Misc Expense | Track other operational costs |
| Operational Cost | Aggregate fuel and expense records |
| Vehicle ROI | Calculated as `(Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost` |

## 8. Reporting

| Report |
| --- |
| Fleet Utilization |
| Trip Report |
| Driver Performance |
| Vehicle Performance |
| Maintenance Report |
| Fuel Efficiency |
| Expense Report |
| Vehicle ROI |
| License Expiry Report |
| Operational Cost |

CSV export is in core scope. PDF export is Future Enhancement.
