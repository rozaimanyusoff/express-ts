# Billing Module Backend Documentation

This README provides an overview of the backend setup, endpoints, data models, and enhancement/change log for the billing module (`/src/p.billing`).

## Directory Structure

- `billingController.ts` — Main controller for all billing endpoints
- `billingModel.ts` — Data access/model functions
- `billingRoutes.ts` — Express routes for billing endpoints
- Other submodules: asset, group, nav, purchase, role, stock, telco, user

## Main Endpoints

### Vehicle Maintenance
- `GET /api/bills/vehicle` — List all vehicle maintenance records
- `GET /api/bills/vehicle/:id` — Get details for a specific maintenance record
- `POST /api/bills/vehicle` — Create new maintenance record
- `PUT /api/bills/vehicle/:id` — Update maintenance record
- `DELETE /api/bills/vehicle/:id` — Delete maintenance record
- `GET /api/bills/vehicle/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` — Maintenance summary by asset/year/month

### Fuel Billing
- `GET /api/bills/fuel` — List all fuel billing records
- `GET /api/bills/fuel/:id` — Get details for a specific fuel billing
- `POST /api/bills/fuel` — Create new fuel billing
- `PUT /api/bills/fuel/:id` — Update fuel billing
- `GET /api/bills/fuel/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` — Fuel summary by vehicle/year
- `GET /api/bills/fuel/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id}` — Filter summary by cost center

### Fleet Cards, Issuers, Service Options
- `GET /api/bills/fleetcards` — List all fleet cards
- `GET /api/bills/fleetcards/:id` — Get fleet card details
- `GET /api/bills/fleetcards/issuer/:id` — Get fleet cards by issuer
- `GET /api/bills/fuel/issuers` — List all fuel issuers
- `GET /api/bills/fuel/issuers/:id` — Get issuer details
- `GET /api/bills/service-options` — List all service options

## Data Models
- **Vehicle Maintenance**: inv_id, inv_no, inv_date, vehicle_id, cc_id, loc_id, ws_id, ...
- **Fuel Billing**: stmt_id, stmt_no, stmt_date, stmt_issuer, ...
- **Fuel Vehicle Amount**: s_id, stmt_id, vehicle_id, cc_id, loc_id, ...
- **Temp Vehicle Records**: vehicle_id, vehicle_regno, cc_id, ...

## Lookup Tables
- Costcenters, Districts, Workshops, Fleet Cards, Fuel Issuers

## Enhancement & Change Log
- 2025-08-04: Added cost center filter to `/fuel/summary` endpoint (`cc` query param)
- 2025-08-04: Fixed vehicle mapping in fuel summary to use `vehicle_id` and `vehicle_regno`
- 2025-08-04: Improved documentation and endpoint structure

## Setup & Notes
- All endpoints require valid date range (`from`, `to`) in `YYYY-MM-DD` format
- Use query param `cc` to filter by cost center in summary endpoints
- Data mapping uses lookup tables for asset, costcenter, district, etc.
- For further enhancements, update this README and note changes in the log above

---



## Fuel Billing Costcenter Summary Endpoint

This endpoint provides a summary of fuel billing grouped by cost center, year, and month, and is sorted by cost center name.

### Endpoint
`GET /api/billing/fuel/costcenter-summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Output Example
```
{
  "status": "success",
  "message": "Fuel billing costcenter summary by date range retrieved successfully",
  "data": [
    {
      "costcenter": "DBPS",
      "details": [
        {
          "year": 2024,
          "expenses": "4248.71",
          "months": [
            {
              "month": 12,
              "expenses": "2273.06"
            },
            {
              "month": 11,
              "expenses": "1975.65"
            }
          ]
        },
        ...
      ]
    },
    ...
  ]
}
```

### Notes
- Grouped by cost center, year, and month.
- Each year contains an array of months, each with total expenses for that month.
- Cost center name is mapped from cc_id.
- The output is sorted alphabetically by cost center name.
