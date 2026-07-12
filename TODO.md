# TransitOps for Odoo - TODO

## Foundation

- [ ] Confirm Odoo version.
- [ ] Scaffold `transit_ops_core`.
- [ ] Scaffold `transit_ops_fleet`.
- [ ] Scaffold `transit_ops_trip`.
- [ ] Scaffold `transit_ops_maintenance`.
- [ ] Scaffold `transit_ops_expense`.
- [ ] Scaffold `transit_ops_reporting`.
- [ ] Add app menu: TransitOps.
- [ ] Add RBAC groups: Fleet Manager, Driver, Safety Officer, Financial Analyst, System Administrator.

## Configuration

- [ ] Add Regions model.
- [ ] Add Vehicle Types model.
- [ ] Add Maintenance Types model.
- [ ] Add Expense Categories model.
- [ ] Add default vehicle statuses: Available, On Trip, In Shop, Retired.
- [ ] Add default driver statuses: Available, On Trip, Off Duty, Suspended.
- [ ] Add default trip states: Draft, Dispatched, Completed, Cancelled.

## Fleet Management

- [ ] Add Vehicles model.
- [ ] Add unique constraint for vehicle registration number.
- [ ] Add vehicle status field.
- [ ] Add vehicle_name field.
- [ ] Add vehicle_model field.
- [ ] Add manufacturer field.
- [ ] Add vehicle capacity field.
- [ ] Add vehicle document support.
- [ ] Add `transit.ops.vehicle.document` metadata model linked to `ir.attachment`.
- [ ] Add odometer field.
- [ ] Add acquisition cost field.
- [ ] Add vehicle list, kanban, form, and activity views.

## Driver Management

- [ ] Add Drivers model.
- [ ] Add unique constraint for driver license number.
- [ ] Add license expiry date.
- [ ] Add phone field.
- [ ] Add email field.
- [ ] Add safety score.
- [ ] Add driver status field.
- [ ] Add driver availability logic.
- [ ] Add driver list, kanban, form, and activity views.

## Trip Management

- [ ] Add Trips model.
- [ ] Add source field.
- [ ] Add destination field.
- [ ] Add cargo weight field.
- [ ] Add planned distance field.
- [ ] Add start odometer field.
- [ ] Add end odometer field.
- [ ] Add actual distance field.
- [ ] Add fuel consumed field.
- [ ] Add vehicle assignment.
- [ ] Add driver assignment.
- [ ] Add trip lifecycle: Draft, Dispatched, Completed, Cancelled.
- [ ] Add dispatch action.
- [ ] Add complete action.
- [ ] Require final odometer before trip completion.
- [ ] Add cancel action.
- [ ] Validate cargo weight <= vehicle capacity.
- [ ] Block Retired vehicles from dispatch.
- [ ] Block In Shop vehicles from dispatch.
- [ ] Block vehicles already On Trip from dispatch.
- [ ] Block expired license drivers from dispatch.
- [ ] Block Suspended drivers from dispatch.
- [ ] Block drivers already On Trip from dispatch.
- [ ] Set vehicle and driver to On Trip on dispatch.
- [ ] Set vehicle and driver to Available on completion.
- [ ] Set vehicle and driver to Available on cancellation.

## Maintenance

- [ ] Add Maintenance Logs model.
- [ ] Add Maintenance Types configuration.
- [ ] Add Scheduled, Open, Closed states.
- [ ] Document maintenance lifecycle: Scheduled -> Open -> Closed.
- [ ] Set vehicle to In Shop when maintenance opens.
- [ ] Set vehicle to Available when maintenance closes unless Retired.
- [ ] Add maintenance due logic.
- [ ] Add maintenance list, kanban, calendar, form, and activity views.

## Fuel Management

- [ ] Add Fuel Logs model.
- [ ] Add litres field.
- [ ] Add cost field.
- [ ] Add date field.
- [ ] Add odometer field.
- [ ] Add fuel efficiency calculation.
- [ ] Add fuel list, pivot, graph, and form views.

## Expense Management

- [ ] Add Expenses model.
- [ ] Add expense categories: Toll, Maintenance, Misc.
- [ ] Add operational cost calculation.
- [ ] Add expense list, pivot, graph, and form views.

## Dashboard and Reporting

- [ ] Build dashboard KPI cards.
- [ ] Add filters: Vehicle Type, Region, Status, Date.
- [ ] Add Fleet Utilization report.
- [ ] Add Trip Report.
- [ ] Add Driver Performance report.
- [ ] Add Vehicle Performance report.
- [ ] Add Maintenance Report.
- [ ] Add Fuel Efficiency report.
- [ ] Define Fuel Efficiency formula as actual distance / fuel consumed.
- [ ] Add Expense Report.
- [ ] Add Vehicle ROI report.
- [ ] Define Vehicle ROI formula as (Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost.
- [ ] Add License Expiry Report.
- [ ] Add Operational Cost report.
- [ ] Add CSV export.

## API

- [ ] Add Vehicle CRUD endpoints.
- [ ] Add Driver CRUD endpoints.
- [ ] Add Trip CRUD endpoints.
- [ ] Add Maintenance CRUD endpoints.
- [ ] Add Fuel CRUD endpoints.
- [ ] Add Expense CRUD endpoints.
- [ ] Add dashboard KPI endpoint.
- [ ] Add analytics endpoint.
- [ ] Enforce RBAC on every endpoint.

## QA

- [ ] Test unique vehicle registration number.
- [ ] Test unique driver license number.
- [ ] Test dispatch with Retired vehicle.
- [ ] Test dispatch with In Shop vehicle.
- [ ] Test dispatch with vehicle already On Trip.
- [ ] Test dispatch with expired license driver.
- [ ] Test dispatch with Suspended driver.
- [ ] Test dispatch with driver already On Trip.
- [ ] Test cargo weight validation.
- [ ] Test dispatch status transitions.
- [ ] Test complete trip status transitions.
- [ ] Test complete trip requires final odometer.
- [ ] Test cancel trip status transitions.
- [ ] Test maintenance open and close transitions.
- [ ] Test dashboard KPIs.
- [ ] Test CSV export reports.
