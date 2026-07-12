# TransitOps for Odoo - Database

## 1. Canonical Models

Only the models required by the hackathon scope are included.

| Business Entity | Odoo Model |
| --- | --- |
| Users | `res.users` |
| Roles | `res.groups` |
| Vehicles | `transit.ops.vehicle` |
| Vehicle Documents | `transit.ops.vehicle.document` |
| Drivers | `transit.ops.driver` |
| Trips | `transit.ops.trip` |
| Maintenance Logs | `transit.ops.maintenance.log` |
| Fuel Logs | `transit.ops.fuel.log` |
| Expenses | `transit.ops.expense` |
| Regions | `transit.ops.region` |
| Vehicle Types | `transit.ops.vehicle.type` |
| Maintenance Types | `transit.ops.maintenance.type` |
| Expense Categories | `transit.ops.expense.category` |

## 2. `transit.ops.vehicle`

| Field | Type | Required |
| --- | --- | --- |
| name | Char | Yes |
| vehicle_name | Char | Yes |
| vehicle_model | Char | Yes |
| manufacturer | Char | No |
| registration_number | Char | Yes |
| vehicle_type_id | Many2one | Yes |
| region_id | Many2one | No |
| status | Selection | Yes |
| capacity | Float | Yes |
| odometer | Float | No |
| acquisition_cost | Monetary | No |
| active_trip_id | Many2one | No |
| document_ids | One2many | No |

Status values:

| Value |
| --- |
| Available |
| On Trip |
| In Shop |
| Retired |

Constraints:

| Constraint |
| --- |
| Vehicle registration number must be unique |
| Retired vehicles cannot be dispatched |
| In Shop vehicles cannot be dispatched |
| Vehicle already On Trip cannot be assigned |

## 3. `transit.ops.vehicle.document`

Stores explicit vehicle document metadata while using Odoo attachments for file storage.

| Field | Type | Required |
| --- | --- | --- |
| vehicle_id | Many2one | Yes |
| document_type | Selection | Yes |
| document_number | Char | No |
| issue_date | Date | No |
| expiry_date | Date | No |
| attachment_id | Many2one to `ir.attachment` | Yes |
| active | Boolean | No |

## 4. `transit.ops.driver`

| Field | Type | Required |
| --- | --- | --- |
| name | Char | Yes |
| user_id | Many2one | No |
| phone | Char | Yes |
| email | Char | No |
| license_number | Char | Yes |
| license_expiry_date | Date | Yes |
| safety_score | Float | No |
| status | Selection | Yes |
| region_id | Many2one | No |
| active_trip_id | Many2one | No |

Status values:

| Value |
| --- |
| Available |
| On Trip |
| Off Duty |
| Suspended |

Constraints:

| Constraint |
| --- |
| Driver license number must be unique |
| Expired license drivers cannot be dispatched |
| Suspended drivers cannot be dispatched |
| Driver already On Trip cannot be assigned |

## 5. `transit.ops.trip`

| Field | Type | Required |
| --- | --- | --- |
| name | Char | Yes |
| source | Char | Yes |
| destination | Char | Yes |
| cargo_weight | Float | Yes |
| planned_distance | Float | Yes |
| start_odometer | Float | No |
| end_odometer | Float | No |
| actual_distance | Float | No |
| fuel_consumed | Float | No |
| vehicle_id | Many2one | Yes |
| driver_id | Many2one | Yes |
| region_id | Many2one | No |
| state | Selection | Yes |
| planned_date | Date | No |
| dispatch_datetime | Datetime | No |
| completion_datetime | Datetime | No |

State values:

| Value |
| --- |
| Draft |
| Dispatched |
| Completed |
| Cancelled |

Constraints:

| Constraint |
| --- |
| Cargo weight must be less than or equal to vehicle capacity |
| Dispatch sets vehicle and driver to On Trip |
| Complete sets vehicle and driver to Available |
| Cancel sets vehicle and driver to Available |
| Completing a trip requires end odometer |
| Actual distance is calculated as end odometer minus start odometer when both values exist |

## 6. `transit.ops.maintenance.log`

| Field | Type | Required |
| --- | --- | --- |
| vehicle_id | Many2one | Yes |
| maintenance_type_id | Many2one | Yes |
| state | Selection | Yes |
| scheduled_date | Date | No |
| open_date | Date | No |
| close_date | Date | No |
| cost | Monetary | No |
| odometer | Float | No |
| notes | Text | No |

State values:

| Value |
| --- |
| Scheduled |
| Open |
| Closed |

Rules:

| Rule |
| --- |
| Opening maintenance sets vehicle to In Shop |
| Closing maintenance sets vehicle to Available unless Retired |

Lifecycle:

| State | Next State |
| --- | --- |
| Scheduled | Open |
| Open | Closed |

## 7. `transit.ops.fuel.log`

| Field | Type | Required |
| --- | --- | --- |
| vehicle_id | Many2one | Yes |
| date | Date | Yes |
| litres | Float | Yes |
| cost | Monetary | Yes |
| odometer | Float | No |
| fuel_efficiency | Float | No |

## 8. `transit.ops.expense`

| Field | Type | Required |
| --- | --- | --- |
| vehicle_id | Many2one | Yes |
| trip_id | Many2one | No |
| expense_category_id | Many2one | Yes |
| amount | Monetary | Yes |
| date | Date | Yes |
| notes | Text | No |

## 9. Configuration Models

| Model | Key Fields |
| --- | --- |
| `transit.ops.region` | name, active |
| `transit.ops.vehicle.type` | name, default_capacity, active |
| `transit.ops.maintenance.type` | name, active |
| `transit.ops.expense.category` | name, category_type, active |

## 10. Reporting Formula Fields

| Metric | Formula |
| --- | --- |
| Fuel Efficiency | `actual_distance / fuel_consumed` or distance derived from odometer divided by litres |
| Vehicle ROI | `(Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost` |
| Operational Cost | `Fuel Cost + Maintenance Cost + Toll Expense + Misc Expense` |

## 11. Excluded Models

The core database design does not include shipment, package, proof, load, stop, delivery route, warehouse, webhook, carrier, or external integration models.
