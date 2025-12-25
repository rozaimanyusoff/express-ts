# Asset Module - API Reference

## Base URL & Authentication
- **Base URL**: `http://localhost:3000/api/assets`
- **Authentication**: JWT token in `Authorization: Bearer {token}` header
- **Content-Type**: `application/json`
- **Protected**: All endpoints require valid JWT token (via `tokenValidator` middleware)

---

## Standard Response Format

### Success Response (200)
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": {}
}
```

### Error Response (400/500)
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

---

## Core Asset Endpoints

### GET /
List all assets with filtering, pagination, and sorting support.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | number/string | Filter by type ID (comma-separated for multiple) |
| `status` | string | Filter by record status (active, inactive, disposed) |
| `purpose` | string | Filter by asset purpose |
| `classification` | string | Filter by classification |
| `manager` | number | Filter by manager ID |
| `owner` | string | Filter by owner (employee ID) |
| `supervisor` | number | Filter by supervisor ID |
| `hod` | number | Filter by head of department ID |
| `register` | string | Filter by registration number |
| `brand` | number | Filter by brand ID |
| `q` | string | Free-text search across asset code, name, register |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Records per page (default: 25) |
| `limit` | number | Alias for pageSize |
| `offset` | number | Offset for pagination (alternative to page) |
| `sortBy` | string | Column to sort by (e.g., asset_code, purchase_year) |
| `sortDir` | string | Sort direction (asc, desc) |

**Example**:
```bash
GET /api/assets?type=1&status=active&page=1&pageSize=10
GET /api/assets?brand=5&classification=IT%20Equipment&sortBy=asset_code&sortDir=asc
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Assets data retrieved successfully",
  "data": [
    {
      "id": 1,
      "asset_code": "ASSET-001-2024",
      "asset_name": "Dell Latitude 5540",
      "type_id": 1,
      "category_id": 5,
      "brand_id": 12,
      "model_id": 45,
      "employee_id": 156,
      "department_id": 2,
      "cost_center_id": 3,
      "location_id": 8,
      "unit_price": 1200.00,
      "purchase_year": 2024,
      "record_status": "active",
      "classification": "IT Equipment",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 256,
    "totalPages": 26
  }
}
```

---

### GET /:id
Get specific asset by ID with all related details.

**Parameters**:
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | number | URL | Asset ID |

**Example**:
```bash
GET /api/assets/1
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Asset retrieved successfully",
  "data": {
    "id": 1,
    "asset_code": "ASSET-001-2024",
    "asset_name": "Dell Latitude 5540",
    "type_id": 1,
    "category_id": 5,
    "brand_id": 12,
    "model_id": 45,
    "type": { "id": 1, "type_name": "Computer" },
    "category": { "id": 5, "category_name": "Laptop" },
    "brand": { "id": 12, "brand_name": "Dell" },
    "model": { "id": 45, "model_name": "Latitude 5540" },
    "employee": { "id": 156, "first_name": "John", "last_name": "Doe" },
    "department": { "id": 2, "department_name": "IT Department" },
    "location": { "id": 8, "location_name": "Main Office" },
    "unit_price": 1200.00,
    "purchase_year": 2024,
    "net_book_value": "960.00",
    "asset_age": 0,
    "record_status": "active"
  }
}
```

**Error Responses**:
- `404` - Asset not found

---

### POST /
Create new asset record.

**Request Body**:
```json
{
  "asset_code": "ASSET-001-2024",
  "asset_name": "Dell Latitude 5540",
  "type_id": 1,
  "category_id": 5,
  "brand_id": 12,
  "model_id": 45,
  "employee_id": 156,
  "department_id": 2,
  "cost_center_id": 3,
  "location_id": 8,
  "site_id": 1,
  "zone_id": 2,
  "manager_id": 5,
  "unit_price": 1200.00,
  "purchase_year": 2024,
  "purchase_date": "2024-01-15",
  "record_status": "active",
  "purpose": "Office Work",
  "classification": "IT Equipment"
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Asset created successfully",
  "data": {
    "id": 101,
    "asset_code": "ASSET-001-2024",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses**:
- `400` - Validation failed (missing required fields)
- `400` - Asset code already exists

---

### PUT /:id
Update existing asset.

**Parameters**:
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | number | URL | Asset ID |

**Request Body** (partial update):
```json
{
  "employee_id": 200,
  "location_id": 10,
  "record_status": "inactive",
  "purchase_year": 2023
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Asset updated successfully",
  "data": {
    "id": 101,
    "affectedRows": 1
  }
}
```

**Error Responses**:
- `404` - Asset not found
- `400` - Validation failed

---

### DELETE /:id
Delete asset record.

**Parameters**:
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | number | URL | Asset ID |

**Example**:
```bash
DELETE /api/assets/101
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Asset deleted successfully",
  "data": { "affectedRows": 1 }
}
```

**Error Responses**:
- `404` - Asset not found

---

## Classification Management

### Types (GET /types, POST /types, PUT /types/:id, DELETE /types/:id)
Manage asset types (Computer, Vehicle, Equipment, etc.).

```bash
GET /api/assets/types
POST /api/assets/types  # {"type_name": "Computer", "description": "...", "color": "#FF0000"}
PUT /api/assets/types/1  # Update type
DELETE /api/assets/types/1
```

### Categories (GET /categories, POST /categories, PUT /categories/:id, DELETE /categories/:id)
Manage asset categories filtered by type.

```bash
GET /api/assets/categories?type=1
POST /api/assets/categories  # {"category_name": "Laptop", "type_id": 1}
PUT /api/assets/categories/5
DELETE /api/assets/categories/5
```

### Brands (GET /brands, POST /brands, PUT /brands/:id, DELETE /brands/:id)
Manage asset manufacturers.

```bash
GET /api/assets/brands?type=1&categories=5,6
POST /api/assets/brands  # {"brand_name": "Dell", "country": "USA"}
PUT /api/assets/brands/12
DELETE /api/assets/brands/12
```

### Models (GET /models, POST /models, PUT /models/:id, DELETE /models/:id)
Manage asset models by brand.

```bash
GET /api/assets/models?type=1&brand=12,15
POST /api/assets/models  # {"model_name": "Latitude 5540", "brand_id": 12}
PUT /api/assets/models/45
DELETE /api/assets/models/45
```

---

## Organization Reference Endpoints

### Departments
```bash
GET /api/assets/departments
GET /api/assets/departments/:id
POST /api/assets/departments  # {"department_name": "IT", "cost_center_id": 3}
PUT /api/assets/departments/:id
DELETE /api/assets/departments/:id
```

### Cost Centers
```bash
GET /api/assets/costcenters
GET /api/assets/costcenters/:id
POST /api/assets/costcenters  # {"code": "IT-001", "name": "IT Department"}
PUT /api/assets/costcenters/:id
DELETE /api/assets/costcenters/:id
```

### Locations
```bash
GET /api/assets/locations
GET /api/assets/locations/:id
POST /api/assets/locations  # {"location_name": "Main Office", "site_id": 1}
```

### Sites, Zones, Districts
```bash
GET /api/assets/sites
GET /api/assets/zones
GET /api/assets/districts
```

---

## Employee Management

### Employees
```bash
GET /api/assets/employees
GET /api/assets/employees/:id
GET /api/assets/employees/search?q=john
GET /api/assets/employees/ramco/:ramco_id
GET /api/assets/employees/email/:email
POST /api/assets/employees  # {"employee_id": "E001", "first_name": "John", "department_id": 2}
PUT /api/assets/employees/:id
DELETE /api/assets/employees/:id
PUT /api/assets/employees/update-resign  # Bulk resignation update
```

### Positions
```bash
GET /api/assets/positions
POST /api/assets/positions  # {"position_name": "Senior Engineer"}
PUT /api/assets/positions/:id
DELETE /api/assets/positions/:id
```

### Sections
```bash
GET /api/assets/sections
POST /api/assets/sections  # {"section_name": "Development", "department_id": 2}
PUT /api/assets/sections/:id
DELETE /api/assets/sections/:id
```

---

## Asset Specifications

### PC Software
```bash
GET /api/assets/softwares?asset_id=1
POST /api/assets/softwares  # {"asset_id": 1, "software_name": "Microsoft Office", "license_key": "..."}
PUT /api/assets/softwares/:id
DELETE /api/assets/softwares/:id
```

### Spec Properties
Master table for type-specific asset properties.

```bash
GET /api/assets/spec-properties?type=1
POST /api/assets/spec-properties  # {"property_name": "RAM", "type_id": 1}
POST /api/assets/spec-properties/:id/apply  # Apply to spec table
POST /api/assets/spec-properties/apply-pending  # Batch apply
PUT /api/assets/spec-properties/:id
DELETE /api/assets/spec-properties/:id
```

---

## Asset Transfer Workflow

### Create Transfer Request
```bash
POST /api/assets/transfers
```

**Request Body**:
```json
{
  "from_employee_id": 156,
  "to_employee_id": 200,
  "reason": "Department transfer",
  "items": [
    {
      "asset_id": 1,
      "condition": "Good"
    }
  ]
}
```

### List Transfers
```bash
GET /api/assets/transfers?status=pending&dept=2&from_date=2024-01-01&to_date=2024-12-31
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | pending, approved, rejected, accepted |
| `dept` | number | Filter by department |
| `requester` | number | Filter by requesting employee |
| `supervisor` | number | Filter by supervisor |
| `hod` | number | Filter by head of department |
| `from_date` | date | Filter from date (YYYY-MM-DD) |
| `to_date` | date | Filter to date (YYYY-MM-DD) |

### Approve/Reject Transfers
```bash
PUT /api/assets/transfers/approval
```

**Request Body**:
```json
{
  "transfer_ids": [1, 2, 3],
  "approval_status": "approved",
  "comment": "Approved"
}
```

### Accept Transfer (New Owner)
```bash
PUT /api/assets/transfers/:id/acceptance
```

**Multipart Form Data**:
- `acceptance_attachments` (file) - Receipt/handover documents

### Transfer Checklist
```bash
GET /api/assets/transfer-checklist?transfer_id=1
POST /api/assets/transfer-checklist  # {"transfer_id": 1, "item_description": "Check condition"}
PUT /api/assets/transfer-checklist/:id  # {"checked": true}
```

---

## Asset Managers
```bash
GET /api/assets/managers
GET /api/assets/managers/:id
POST /api/assets/managers  # {"name": "John Manager", "email": "john@example.com", "department_id": 2}
PUT /api/assets/managers/:id
DELETE /api/assets/managers/:id
```

---

## Brand-Category Mappings

### Assign Category to Brand
```bash
POST /api/assets/brands/:brand_code/categories/:category_code
```

### Get Categories for Brand
```bash
GET /api/assets/brands/:brand_code/categories
```

### Get All Mappings
```bash
GET /api/assets/brand-category-mappings
```

---

## Error Codes Reference

| Code | Message | Cause |
|------|---------|-------|
| 400 | Validation failed | Missing/invalid required fields |
| 400 | Asset code already exists | Duplicate asset code |
| 400 | Invalid type ID | Referenced type doesn't exist |
| 400 | Employee not found | Referenced employee doesn't exist |
| 400 | Department not found | Referenced department doesn't exist |
| 404 | Asset not found | Asset ID doesn't exist |
| 404 | Resource not found | Generic 404 for any resource |
| 500 | Internal server error | Database or system error |

---

## Testing Checklist

- [ ] Create asset with all required fields
- [ ] Filter assets by type, status, and other parameters
- [ ] Update asset details
- [ ] Delete asset
- [ ] Create/update/delete classification types (types, categories, brands, models)
- [ ] Search employees
- [ ] Create transfer request
- [ ] Approve/reject transfer
- [ ] Accept transfer with attachments
- [ ] Verify depreciation calculation (NBV, asset age)
- [ ] Pagination and sorting work correctly
- [ ] Free-text search returns relevant results
- [ ] Unauthorized requests are rejected (no JWT token)

---

## Integration with Other Modules

### Maintenance Module (p.maintenance)
- Uses `assetdata` for vehicle information
- References vehicle specs via `v_specs`
- Links to employees for assignment tracking

### Billing Module (p.billing)
- References assets for fleet tracking
- Uses vehicle specs for fuel consumption calculations
- Links to departments for billing allocation

### Compliance Module (p.compliance)
- References assets for assessment targets
- Uses employee data for assessment assignments

### Purchase Module (p.purchase)
- Links to `asset_purchase` for procurement tracking
- References vendors for supplier management
- Registers purchased assets into `assetdata`

---

## API Examples

### Example 1: Register New Computer
```bash
curl -X POST http://localhost:3000/api/assets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_code": "COMP-001-2024",
    "asset_name": "Dell Latitude 5540",
    "type_id": 1,
    "category_id": 5,
    "brand_id": 12,
    "model_id": 45,
    "employee_id": 156,
    "unit_price": 1200,
    "purchase_year": 2024,
    "classification": "IT Equipment"
  }'
```

### Example 2: List All Active Computers
```bash
curl http://localhost:3000/api/assets?type=1&status=active \
  -H "Authorization: Bearer {token}"
```

### Example 3: Transfer Asset to New Employee
```bash
curl -X POST http://localhost:3000/api/assets/transfers \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "from_employee_id": 156,
    "to_employee_id": 200,
    "reason": "Department transfer",
    "items": [{"asset_id": 1, "condition": "Good"}]
  }'
```

### Example 4: Get Asset with Depreciation
```bash
curl http://localhost:3000/api/assets/1 \
  -H "Authorization: Bearer {token}"

# Response includes:
# "unit_price": 1200,
# "purchase_year": 2024,
# "net_book_value": "960.00",  (calculated: 1200 * (1 - 0 * 0.2))
# "asset_age": 0
```
