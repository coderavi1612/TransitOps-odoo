# TransitOps for Odoo - Design

## 1. Design Direction

TransitOps should look and behave like an Odoo Enterprise operations module. The design should support fleet managers, drivers, safety officers, financial analysts, and system administrators with clear status visibility, predictable forms, and implementation-ready reporting.

## 2. Experience Principles

| Principle | Application |
| --- | --- |
| Odoo native first | Use standard Odoo list, kanban, form, calendar, pivot, graph, activity, and dashboard patterns |
| Status clarity | Vehicle, driver, and trip status must be visible in every relevant record |
| Rule transparency | Dispatch restrictions should be shown as clear validation messages |
| Operational density | Tables and forms should support repeated daily use |
| Consistent terminology | Use the same statuses, fields, and menu names across every screen |

## 3. Status Badges

### Vehicle Status

| Status | Suggested Badge |
| --- | --- |
| Available | Green |
| On Trip | Blue |
| In Shop | Amber |
| Retired | Gray |

### Driver Status

| Status | Suggested Badge |
| --- | --- |
| Available | Green |
| On Trip | Blue |
| Off Duty | Gray |
| Suspended | Red |

### Trip Lifecycle

| State | Suggested Badge |
| --- | --- |
| Draft | Gray |
| Dispatched | Blue |
| Completed | Green |
| Cancelled | Red |

## 4. Validation Messages

| Condition | Message |
| --- | --- |
| Vehicle is Retired | Retired vehicles cannot be dispatched. |
| Vehicle is In Shop | Vehicles in shop cannot be dispatched. |
| Vehicle is On Trip | Vehicle already on trip cannot be assigned. |
| Driver license expired | Driver with expired license cannot be dispatched. |
| Driver is Suspended | Suspended drivers cannot be dispatched. |
| Driver is On Trip | Driver already on trip cannot be assigned. |
| Cargo exceeds capacity | Cargo weight must be less than or equal to vehicle capacity. |

## 5. Dashboard Layout

Recommended layout:

| Area | Content |
| --- | --- |
| Header filters | Vehicle Type, Region, Status, Date |
| KPI row 1 | Active Vehicles, Available Vehicles, Vehicles in Maintenance, Retired Vehicles |
| KPI row 2 | Drivers On Duty, Drivers Available, Active Trips, Pending Trips, Completed Trips |
| KPI row 3 | Fleet Utilization %, Fuel Efficiency, Operational Cost, Vehicle ROI |
| Compliance row | Maintenance Due, Expiring Licenses |
| Charts | Utilization, fuel efficiency, operational cost, trip states |

KPI naming rules:

| KPI | Definition |
| --- | --- |
| Vehicles in Maintenance | Display label for vehicles with status `In Shop` |
| Drivers On Duty | Display label for drivers with status `On Trip` |

## 6. Record Forms

All major forms should include:

| Form Element | Purpose |
| --- | --- |
| Status bar | Show lifecycle and allowed transitions |
| Smart buttons | Link to related trips, maintenance, fuel logs, expenses, and documents |
| Chatter | Audit notes and activities |
| Required fields | Clearly marked before saving |
| Activity scheduling | Follow-up for license expiry and maintenance due |

## 7. Accessibility

| Requirement |
| --- |
| Do not rely only on color for statuses |
| Keep form labels clear and consistent |
| Use readable table columns for operational users |
| Keep keyboard navigation compatible with Odoo defaults |
| Use concise validation messages |

## 8. Future Design Considerations

Future enhancements such as GPS maps, IoT telemetry, mobile app screens, route optimization, warehouse integration, and shipment management should be designed separately from the core hackathon module.
