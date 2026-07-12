# TransitOps for Odoo - Product Requirements

## 1. Product Summary

TransitOps is a Fleet Management and Transport Operations Platform for organizations managing their own vehicles and drivers. It replaces spreadsheet-based operations with centralized Odoo workflows for vehicle registry, driver registry, trip management, maintenance, fuel logs, expense tracking, dashboards, reports, authentication, and RBAC.

The product must satisfy the Odoo Hackathon mandatory scope first. Items outside the official scope are listed only as Future Enhancements.

## 2. Target Users

| User | Primary Needs |
| --- | --- |
| Fleet Manager | Control vehicle availability, assign trips, monitor utilization, and manage operations |
| Driver | View assigned trip details and maintain accurate operational status |
| Safety Officer | Track license expiry, safety score, and maintenance compliance |
| Financial Analyst | Analyze fuel cost, expenses, operational cost, and vehicle ROI |
| System Administrator | Manage users, roles, permissions, master data, and configuration |

## 3. Core Modules

| Module | Scope |
| --- | --- |
| Fleet Management | Vehicle registry, vehicle name, vehicle model, manufacturer, status, capacity, documents, odometer, acquisition cost |
| Driver Management | Driver profile, contact number, email, license number, license expiry, safety score, availability |
| Trip Management | Trip creation, source, destination, cargo weight, planned distance, odometer readings, actual distance, fuel consumed, vehicle and driver assignment |
| Maintenance | Maintenance logs, type, open/closed/scheduled state, vehicle availability impact |
| Fuel Management | Fuel logs, litres, cost, date, fuel efficiency |
| Expense Management | Toll, maintenance, miscellaneous expenses, operational cost |
| Reporting | KPIs, charts, analytics, ROI, CSV export |
| Authentication and RBAC | Secure access by role and permission |

## 4. Canonical Statuses

### Vehicle Status

| Status | Dispatch Allowed |
| --- | --- |
| Available | Yes |
| On Trip | No |
| In Shop | No |
| Retired | No |

### Driver Status

| Status | Assignment Allowed |
| --- | --- |
| Available | Yes |
| On Trip | No |
| Off Duty | No |
| Suspended | No |

### Trip Lifecycle

| State | Description |
| --- | --- |
| Draft | Trip is created but not dispatched |
| Dispatched | Trip is active; vehicle and driver are On Trip |
| Completed | Trip is finished; vehicle and driver return to Available |
| Cancelled | Trip is cancelled; vehicle and driver return to Available |

## 5. Business Rules

| Rule | Requirement |
| --- | --- |
| Vehicle registration number | Must be unique |
| Driver license number | Must be unique |
| Retired vehicle | Cannot be dispatched |
| In Shop vehicle | Cannot be dispatched |
| Vehicle already On Trip | Cannot be assigned to another active trip |
| Expired license driver | Cannot be dispatched |
| Suspended driver | Cannot be dispatched |
| Driver already On Trip | Cannot be assigned to another active trip |
| Cargo weight | Must be less than or equal to vehicle capacity |
| Dispatch trip | Vehicle becomes On Trip and driver becomes On Trip |
| Complete trip | Vehicle becomes Available and driver becomes Available |
| Cancel trip | Vehicle becomes Available and driver becomes Available |
| Open maintenance | Vehicle becomes In Shop |
| Close maintenance | Vehicle becomes Available unless Retired |

## 6. Dashboard KPIs

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

Dashboard filters:

| Filter |
| --- |
| Vehicle Type |
| Region |
| Status |
| Date |

KPI definitions:

| KPI | Definition |
| --- | --- |
| Vehicles in Maintenance | Count of vehicles with status `In Shop` |
| Drivers On Duty | Count of drivers with status `On Trip` |
| Fuel Efficiency | `actual_distance / fuel_consumed` where both values are available |
| Vehicle ROI | `(Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost` |

## 7. Reports

| Report | Export |
| --- | --- |
| Fleet Utilization | CSV |
| Trip Report | CSV |
| Driver Performance | CSV |
| Vehicle Performance | CSV |
| Maintenance Report | CSV |
| Fuel Efficiency | CSV |
| Expense Report | CSV |
| Vehicle ROI | CSV |
| License Expiry Report | CSV |
| Operational Cost | CSV |

PDF export is Future Enhancement.

## 8. Reporting Formulas

| Metric | Formula |
| --- | --- |
| Fuel Efficiency | `actual_distance / fuel_consumed` |
| Vehicle ROI | `(Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost` |
| Operational Cost | `Fuel Cost + Maintenance Cost + Toll Expense + Misc Expense` |
| Fleet Utilization % | `(Vehicles On Trip / Active Vehicles) * 100` |

## 9. Future Enhancements

| Enhancement |
| --- |
| GPS tracking |
| IoT telemetry |
| Fleet tracking map |
| Mobile app |
| Route optimization |
| External APIs |
| Warehouse integration |
| Shipment management |
