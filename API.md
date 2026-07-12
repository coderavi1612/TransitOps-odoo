# TransitOps for Odoo - API

## 1. API Scope

The TransitOps API is minimal and aligned to the hackathon scope. It supports CRUD operations for vehicles, drivers, trips, maintenance, fuel logs, expenses, dashboard KPIs, and analytics.

External logistics integrations are Future Enhancements only.

## 2. Authentication

| Mechanism | Purpose |
| --- | --- |
| Odoo session | Internal authenticated use |
| API token | Controlled server access if enabled |
| RBAC | Enforce role permissions for all endpoints |

## 3. Vehicle API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/vehicles` | GET | List vehicles |
| `/transit_ops/api/vehicles` | POST | Create vehicle |
| `/transit_ops/api/vehicles/<id>` | GET | Get vehicle |
| `/transit_ops/api/vehicles/<id>` | PUT | Update vehicle |
| `/transit_ops/api/vehicles/<id>` | DELETE | Archive vehicle when allowed |

Vehicle fields:

| Field | Required |
| --- | --- |
| registration_number | Yes |
| vehicle_name | Yes |
| vehicle_model | Yes |
| manufacturer | No |
| vehicle_type_id | Yes |
| capacity | Yes |
| status | Yes |
| odometer | No |
| acquisition_cost | No |
| region_id | No |

## 4. Driver API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/drivers` | GET | List drivers |
| `/transit_ops/api/drivers` | POST | Create driver |
| `/transit_ops/api/drivers/<id>` | GET | Get driver |
| `/transit_ops/api/drivers/<id>` | PUT | Update driver |
| `/transit_ops/api/drivers/<id>` | DELETE | Archive driver when allowed |

Driver fields:

| Field | Required |
| --- | --- |
| name | Yes |
| phone | Yes |
| email | No |
| license_number | Yes |
| license_expiry_date | Yes |
| safety_score | No |
| status | Yes |
| region_id | No |

## 5. Trip API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/trips` | GET | List trips |
| `/transit_ops/api/trips` | POST | Create Draft trip |
| `/transit_ops/api/trips/<id>` | GET | Get trip |
| `/transit_ops/api/trips/<id>` | PUT | Update Draft trip |
| `/transit_ops/api/trips/<id>` | DELETE | Archive trip when allowed |

Trip fields:

| Field | Required |
| --- | --- |
| source | Yes |
| destination | Yes |
| cargo_weight | Yes |
| planned_distance | Yes |
| start_odometer | Recommended at dispatch |
| end_odometer | Required on completion |
| actual_distance | Calculated or entered on completion |
| fuel_consumed | Required for fuel efficiency reporting |
| vehicle_id | Yes |
| driver_id | Yes |
| state | Yes |

Trip actions:

| Endpoint | Method | Result |
| --- | --- | --- |
| `/transit_ops/api/trips/<id>/dispatch` | POST | Trip Dispatched; vehicle and driver On Trip |
| `/transit_ops/api/trips/<id>/complete` | POST | End odometer captured; Trip Completed; vehicle and driver Available |
| `/transit_ops/api/trips/<id>/cancel` | POST | Trip Cancelled; vehicle and driver Available |

## 6. Maintenance API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/maintenance` | GET | List maintenance logs |
| `/transit_ops/api/maintenance` | POST | Create maintenance log |
| `/transit_ops/api/maintenance/<id>` | GET | Get maintenance log |
| `/transit_ops/api/maintenance/<id>` | PUT | Update maintenance log |
| `/transit_ops/api/maintenance/<id>` | DELETE | Archive maintenance log when allowed |

Maintenance actions:

| Endpoint | Method | Result |
| --- | --- | --- |
| `/transit_ops/api/maintenance/<id>/open` | POST | Vehicle becomes In Shop |
| `/transit_ops/api/maintenance/<id>/close` | POST | Vehicle becomes Available unless Retired |

## 7. Fuel API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/fuel` | GET | List fuel logs |
| `/transit_ops/api/fuel` | POST | Create fuel log |
| `/transit_ops/api/fuel/<id>` | GET | Get fuel log |
| `/transit_ops/api/fuel/<id>` | PUT | Update fuel log |
| `/transit_ops/api/fuel/<id>` | DELETE | Archive fuel log when allowed |

Required fields:

| Field |
| --- |
| vehicle_id |
| litres |
| cost |
| date |
| odometer |

## 8. Expense API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/expenses` | GET | List expenses |
| `/transit_ops/api/expenses` | POST | Create expense |
| `/transit_ops/api/expenses/<id>` | GET | Get expense |
| `/transit_ops/api/expenses/<id>` | PUT | Update expense |
| `/transit_ops/api/expenses/<id>` | DELETE | Archive expense when allowed |

Expense categories:

| Category |
| --- |
| Toll |
| Maintenance |
| Misc |

## 9. Dashboard and Analytics API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/transit_ops/api/dashboard/kpis` | GET | Dashboard KPI summary |
| `/transit_ops/api/analytics` | GET | Filtered analytics data |

Supported filters:

| Filter |
| --- |
| vehicle_type_id |
| region_id |
| status |
| date_from |
| date_to |

Analytics formulas:

| Metric | Formula |
| --- | --- |
| Fuel Efficiency | `actual_distance / fuel_consumed` |
| Vehicle ROI | `(Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost` |
| Vehicles in Maintenance | Count of vehicles with status `In Shop` |
| Drivers On Duty | Count of drivers with status `On Trip` |

## 10. Explicit Exclusions

No shipment API, webhook API, ecommerce integration API, warehouse API, route optimization API, carrier API, or customer tracking API is included in the core scope.
