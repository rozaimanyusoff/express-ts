## s.webstock module — backend documentation

This module integrates with the Webstock database and currently implements CRUD for the table `location_type`.

### Purpose
- Provide REST endpoints to manage location types used by Webstock-related features.
- Keep the DB schema configurable via the `WEBSTOCK_DB` environment variable.

### Environment
- `WEBSTOCK_DB` (default: `web_stock`)
- Uses the primary MySQL pool from `src/utils/db.ts` (DB_* variables from `.env`).

### Files
- `webstockModel.ts` — Data access for `location_type` (id, old_id, type)
- `webstockController.ts` — Request handlers (list/get/create/update/delete)
- `webstockRoutes.ts` — Router mounted at `/api/webstock`

### API Endpoints
Base path: `/api/webstock`

- Location Types
  - GET `/location-types`
    - Returns: `{ status: 'success', data: LocationType[] }`
  - GET `/location-types/:id`
    - 404 if not found. Returns: `{ status: 'success', data: LocationType }`
  - POST `/location-types`
    - Body: `{ type: string, old_id?: number | null }`
    - 400 if `type` missing. Returns: `{ status: 'success', message: 'Location type created', id }`
  - PUT `/location-types/:id`
    - Body: `{ type: string, old_id?: number | null }`
    - 400 if `type` missing. Returns: `{ status: 'success', message: 'Location type updated' }`
  - DELETE `/location-types/:id`
    - Returns: `{ status: 'success', message: 'Location type deleted' }`

- Locations
  - GET `/locations`
    - Returns: `{ status: 'success', data: Location[] }`
  - GET `/locations/:id`
    - 404 if not found. Returns: `{ status: 'success', data: Location }`
  - POST `/locations`
    - Body: accepts nullable fields; no required fields yet.
    - Returns: `{ status: 'success', message: 'Location created', id }` (id is n_id)
  - PUT `/locations/:id`
    - Body: accepts nullable fields.
    - Returns: `{ status: 'success', message: 'Location updated' }`
  - DELETE `/locations/:id`
    - Returns: `{ status: 'success', message: 'Location deleted' }`

- Fixed Assets
  - GET `/fixed-assets`
    - Returns: `{ status: 'success', data: FixedAsset[] }`
  - GET `/fixed-assets/:id`
    - Param `:id` is the asset `ID`. 404 if not found. Returns the asset.
  - POST `/fixed-assets`
    - Body: accepts all fixed_asset columns; returns `{ status: 'success', message: 'Fixed asset created', id }`
  - PUT `/fixed-assets/:id`
    - Updates all provided fields for the given `ID`.
  - DELETE `/fixed-assets/:id`
    - Deletes the asset with that `ID`.

Types:
```
interface LocationType {
  id: number
  old_id: number | null
  type: string
}
```

Location (columns excerpt):
```
interface Location {
  n_id: number
  ID: string | null
  sitecode: string | null
  sitename: string | null
  // ... other nullable columns (location_fname, room_number, longitude, latitude, location_scope, extension, idcomp,
  // tel, fax, contact_person, designation, mobile_no, email_address, location_type_id, district, dept_ownership, type_of_location)
}
```

FixedAsset (columns excerpt):
```
interface FixedAsset {
  ID: string | null
  asset_type: string | null
  asset_serial: string | null
  model: string | null
  description: string | null
  // ... many more columns as per DB (manufacturer, depreciation_by_day, lifetime, po_number, account_bill,
  // insurance_code, insured_value, warranty_end_date, acquisition_*, preventive_*, idcomp, user_id, connect_otg,
  // asset_name, active, remarks, supp_*, owner_*, disposal_*, district, dept_ownership, type_of_location, po_num2, bq_item_num)
}
```

### Try it
```zsh
# List all
curl -s http://localhost:3030/api/webstock/location-types | jq .

# Create
curl -s -X POST http://localhost:3030/api/webstock/location-types \
  -H 'Content-Type: application/json' \
  -d '{"type":"Warehouse","old_id":null}' | jq .

# Update
curl -s -X PUT http://localhost:3030/api/webstock/location-types/1 \
  -H 'Content-Type: application/json' \
  -d '{"type":"Main Warehouse","old_id":10}' | jq .

# Delete
curl -s -X DELETE http://localhost:3030/api/webstock/location-types/1 | jq .

# Locations
curl -s http://localhost:3030/api/webstock/locations | jq .
curl -s -X POST http://localhost:3030/api/webstock/locations \
  -H 'Content-Type: application/json' \
  -d '{"sitename":"HQ","sitecode":"HQ01"}' | jq .
curl -s -X PUT http://localhost:3030/api/webstock/locations/1 \
  -H 'Content-Type: application/json' \
  -d '{"sitename":"HQ North"}' | jq .
curl -s -X DELETE http://localhost:3030/api/webstock/locations/1 | jq .

# Fixed assets
curl -s http://localhost:3030/api/webstock/fixed-assets | jq .
curl -s -X GET http://localhost:3030/api/webstock/fixed-assets/ASSET001 | jq .
curl -s -X POST http://localhost:3030/api/webstock/fixed-assets \
  -H 'Content-Type: application/json' \
  -d '{"ID":"ASSET001","asset_type":"PC","asset_name":"Workstation"}' | jq .
curl -s -X PUT http://localhost:3030/api/webstock/fixed-assets/ASSET001 \
  -H 'Content-Type: application/json' \
  -d '{"asset_name":"Workstation A"}' | jq .
curl -s -X DELETE http://localhost:3030/api/webstock/fixed-assets/ASSET001 | jq .
```

### Dev notes
- Controller and model were renamed to `webstockController.ts` and `webstockModel.ts` (previously `locationType*`).
- All route handlers are wrapped with `asyncHandler` to centralize error handling.
- Add new entities by following the same pattern:
  - Create model (types + CRUD)
  - Add controller (validation + responses)
  - Extend `webstockRoutes.ts`
  - Mount paths under `/api/webstock`
  - Update this README with endpoints and examples

### TODO
- Add pagination/sorting to list endpoint
- Add simple uniqueness checks for `type`
- Optional auth guarding for the routes
