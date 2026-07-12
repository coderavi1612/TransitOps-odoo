# TransitOps for Odoo - Architecture

## 1. Architecture Summary

TransitOps is implemented as a modular Odoo addon suite focused on fleet management and transport operations. It follows Odoo Enterprise conventions for models, views, security, menus, reports, scheduled actions, chatter, activity tracking, and analytics.

## 2. Addon Structure

| Addon | Responsibility |
| --- | --- |
| `transit_ops_core` | Shared configuration, security groups, regions, vehicle types, common sequences |
| `transit_ops_fleet` | Vehicle registry, vehicle documents, odometer, capacity, acquisition cost, vehicle status |
| `transit_ops_trip` | Trip creation, source, destination, cargo weight, distance, dispatch, completion, cancellation |
| `transit_ops_maintenance` | Maintenance logs, maintenance types, scheduled maintenance, open/close workflow |
| `transit_ops_expense` | Fuel logs, expenses, expense categories, operational cost, ROI inputs |
| `transit_ops_reporting` | Dashboards, KPIs, pivot views, graph views, analytics, CSV export |

No logistics-specific addons are included in the core scope.

## 3. Odoo Dependencies

| Dependency | Purpose |
| --- | --- |
| `base` | Users, companies, access rights |
| `mail` | Chatter, activities, reminders |
| `web` | Views, dashboard, client actions |
| `fleet` | Optional alignment with Odoo fleet concepts |

Optional future dependencies:

| Dependency | Future Use |
| --- | --- |
| `hr` | Driver employee integration |
| `account` | Deeper expense and accounting integration |
| `iot` | IoT telemetry |

## 4. Canonical Data Flow

| Step | Action | System Result |
| --- | --- | --- |
| 1 | Administrator configures regions, vehicle types, maintenance types, expense categories, and roles | Master data is ready |
| 2 | Fleet Manager creates vehicles | Vehicle status starts as Available unless configured otherwise |
| 3 | Fleet Manager or Safety Officer creates drivers | Driver status starts as Available unless configured otherwise |
| 4 | Fleet Manager creates a Draft trip | Trip is pending assignment |
| 5 | Fleet Manager assigns Available vehicle and Available driver | Business rules validate assignment |
| 6 | Fleet Manager dispatches trip | Trip becomes Dispatched; vehicle and driver become On Trip |
| 7 | Trip is completed or cancelled | Vehicle and driver return to Available |
| 8 | Maintenance is opened | Vehicle becomes In Shop |
| 9 | Maintenance is closed | Vehicle becomes Available unless Retired |
| 10 | Fuel and expenses are recorded | Analytics and ROI are updated |

## 5. Security and RBAC

| Role | Access Level |
| --- | --- |
| Feature | Fleet Manager | Driver | Safety Officer | Financial Analyst | System Administrator |
| --- | --- | --- | --- | --- | --- |
| Vehicles | CRUD | Read | Read | Read | CRUD |
| Drivers | CRUD | Self | CRUD | Read | CRUD |
| Trips | CRUD | Update Assigned | Read | Read | CRUD |
| Maintenance | CRUD | Read | CRUD | Read | CRUD |
| Fuel | CRUD | Create | Read | CRUD | CRUD |
| Expenses | CRUD | Create | Read | CRUD | CRUD |
| Dashboard | Read | Read Assigned | Read | Read | CRUD |
| Reports | Read | No Access | Read | CRUD | CRUD |
| Configuration | No Access | No Access | Read | Read | CRUD |

## 6. Business Rule Enforcement

Business rules must be enforced at model level, not only in UI views.

| Rule Area | Enforcement Location |
| --- | --- |
| Unique vehicle registration number | SQL constraint on vehicle |
| Unique driver license number | SQL constraint on driver |
| Dispatch eligibility | Trip dispatch action validation |
| Cargo capacity | Trip assignment and dispatch validation |
| Maintenance vehicle status | Maintenance open/close methods |
| Trip completion status reset | Trip complete/cancel methods |
| Expiring license checks | Scheduled action and dashboard query |

## 7. Reporting Architecture

| Component | Purpose |
| --- | --- |
| Dashboard client action | KPI cards and filterable charts |
| Pivot views | Fleet utilization, trip, expense, fuel, and maintenance analysis |
| Graph views | Trend charts and comparisons |
| CSV export actions | Hackathon-required reporting exports |
| Scheduled reminders | License and maintenance due notifications |

## 8. Future Architecture

Future enhancements must remain separate from the hackathon core scope.

| Future Addon Area |
| --- |
| GPS tracking |
| IoT telemetry |
| Mobile application |
| Route optimization |
| External APIs |
| Warehouse integration |
| Shipment management |
