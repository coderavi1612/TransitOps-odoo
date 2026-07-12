# TransitOps for Odoo - UI

## 1. UI Scope

TransitOps uses Odoo-native UI patterns. The interface should feel like an official Odoo Enterprise module and should prioritize operational accuracy, clear status visibility, and fast record management.

## 2. Supported Odoo Views

| View | Usage |
| --- | --- |
| List | Vehicles, drivers, trips, maintenance, fuel logs, expenses, reports |
| Kanban | Vehicle status, driver availability, trip lifecycle, maintenance state |
| Form | Record creation and detail management |
| Calendar | Trips and scheduled maintenance |
| Pivot | Reports and analytics |
| Graph | KPI trends and performance charts |
| Activity | Follow-ups, reminders, compliance tasks |
| Dashboard | KPI cards, charts, and filters |

## 3. Dashboard UI

KPI cards:

| KPI |
| --- |
| Active Vehicles |
| Available Vehicles |
| Vehicles in Maintenance |
| Retired Vehicles |
| Drivers On Duty |
| Drivers Available |
| Active Trips |
| Pending Trips |
| Completed Trips |
| Fleet Utilization % |
| Fuel Efficiency |
| Operational Cost |
| Vehicle ROI |
| Maintenance Due |
| Expiring Licenses |

Filters:

| Filter |
| --- |
| Vehicle Type |
| Region |
| Status |
| Date |

Charts:

| Chart |
| --- |
| Vehicle status distribution |
| Trip count by state |
| Fuel efficiency trend |
| Operational cost by category |
| Maintenance due by vehicle type |
| Vehicle ROI by vehicle |

KPI labels:

| KPI | UI Definition |
| --- | --- |
| Vehicles in Maintenance | Vehicles with status `In Shop` |
| Drivers On Duty | Drivers with status `On Trip` |

## 4. Vehicle UI

Vehicle form sections:

| Section | Fields |
| --- | --- |
| Identity | Vehicle name, vehicle model, manufacturer, registration number, vehicle type, region, status |
| Capacity | Capacity, odometer |
| Financial | Acquisition cost, operational cost, ROI |
| Documents | Registration, insurance, permit attachments |
| Maintenance | Active and historical maintenance logs |
| Trips | Current and historical trip records |

## 5. Driver UI

Driver form sections:

| Section | Fields |
| --- | --- |
| Profile | Name, phone, email, region, status |
| License | License number, expiry date |
| Safety | Safety score, notes |
| Trips | Current and historical trip assignments |
| Activities | License reminders and compliance tasks |

## 6. Trip UI

Trip form sections:

| Section | Fields |
| --- | --- |
| Route | Source, destination, planned distance |
| Cargo | Cargo weight |
| Odometer and Fuel | Start odometer, end odometer, actual distance, fuel consumed |
| Assignment | Vehicle, driver |
| Lifecycle | Draft, Dispatched, Completed, Cancelled |
| Cost | Linked fuel and expense information where available |

Trip buttons:

| Button | Availability |
| --- | --- |
| Dispatch | Draft trips with valid vehicle, driver, and cargo capacity |
| Complete | Dispatched trips after final odometer is entered |
| Cancel | Draft or Dispatched trips |

## 7. Maintenance UI

Maintenance form sections:

| Section | Fields |
| --- | --- |
| Vehicle | Vehicle, odometer, region |
| Maintenance | Maintenance type, scheduled date, open date, close date, state |
| Cost | Estimated cost, actual cost |
| Notes | Work description and attachments |

Buttons:

| Button | Result |
| --- | --- |
| Open Maintenance | Vehicle becomes In Shop |
| Close Maintenance | Vehicle becomes Available unless Retired |

Lifecycle:

| State | Next State |
| --- | --- |
| Scheduled | Open |
| Open | Closed |

## 8. Fuel and Expense UI

Fuel log fields:

| Field |
| --- |
| Vehicle |
| Litres |
| Cost |
| Date |
| Odometer |
| Fuel Efficiency |

Expense fields:

| Field |
| --- |
| Vehicle |
| Trip |
| Expense Category |
| Amount |
| Date |
| Notes |

## 9. Excluded UI Patterns

The core UI does not include a logistics control tower, shipment board, warehouse queue, customer tracking portal, proof capture screen, or carrier dispatch interface.
