# Purchase Module - API Reference

**Base URL**: `/api/purchases`  
**Authentication**: Bearer token required for most endpoints  
**Upload Path**: `/uploads/purchases/`

---

## Purchase Requests

### 1. Get All Purchase Requests

**Endpoint**: `GET /purchases/requests`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "pr_no": "PR-2024-001",
      "pr_date": "2024-12-01",
      "request_type": "goods",
      "ramco_id": "user_123",
      "costcenter_id": 5,
      "department_id": 2,
      "created_at": "2024-12-01T08:00:00Z"
    }
  ]
}
```

---

### 2. Get Purchase Request by ID

**Endpoint**: `GET /purchases/requests/:id`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Request ID |

**Response**: Single purchase request object

---

### 3. Create Purchase Request

**Endpoint**: `POST /purchases/requests`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "pr_no": "PR-2024-001",
  "pr_date": "2024-12-01",
  "request_type": "goods",
  "ramco_id": "user_123",
  "costcenter_id": 5,
  "department_id": 2
}
```

**Validation**:
- `pr_no`, `pr_date`, `ramco_id`, `costcenter_id` required
- Duplicate prevention: Same PR number + date + requester + cost center

**Success Response** (201):
```json
{
  "status": "success",
  "message": "Purchase request created",
  "data": { "id": 1 }
}
```

---

### 4. Update Purchase Request

**Endpoint**: `PUT /purchases/requests/:id`

**Request Body**: Partial fields to update
```json
{
  "pr_no": "PR-2024-001-REVISED",
  "request_type": "services"
}
```

**Updatable Fields**: `pr_no`, `pr_date`, `request_type`, `ramco_id`, `costcenter_id`

---

### 5. Delete Purchase Request

**Endpoint**: `DELETE /purchases/requests/:id`

**Response**:
```json
{
  "status": "success",
  "message": "Purchase request deleted"
}
```

---

## Purchase Items

### 6. Get All Purchase Items

**Endpoint**: `GET /purchases/`

**Query Parameters** (all optional):
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: requested, ordered, delivered, invoiced, completed |
| `costcenter` | string | Filter by cost center ID or name |
| `supplier` | string | Filter by supplier name (partial match) |
| `startDate` | date | Start date (YYYY-MM-DD) |
| `endDate` | date | End date (YYYY-MM-DD) |
| `dateField` | string | Date field to filter: pr_date, po_date, do_date, inv_date, grn_date |
| `managers` | string | Comma-separated RAMCO IDs for type-based filtering |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/purchases/?status=ordered&costcenter=CC001'
```

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 10,
      "request_id": 1,
      "description": "Laptop - Dell Inspiron 15",
      "qty": 2,
      "unit_price": 1500,
      "total_price": 3000,
      "supplier_id": 3,
      "po_no": "PO-2024-001",
      "po_date": "2024-12-01",
      "upload_url": "/uploads/purchases/file123.pdf",
      "type": { "id": 5, "name": "IT Equipment" },
      "supplier": { "id": 3, "name": "Tech Solutions Ltd" },
      "request": { "pr_no": "PR-2024-001", "costcenter_id": 5 }
    }
  ]
}
```

---

### 7. Get Purchase Item by ID

**Endpoint**: `GET /purchases/:id`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Purchase item ID |

---

### 8. Get Purchase Summary

**Endpoint**: `GET /purchases/summary`

**Purpose**: Get aggregated purchase summary (for dashboards)

**Response**:
```json
{
  "status": "success",
  "data": {
    "total_requests": 45,
    "total_ordered": 32,
    "total_delivered": 28,
    "total_pending": 4,
    "total_value": 250000
  }
}
```

---

### 9. Create Purchase Item

**Endpoint**: `POST /purchases/`

**Content-Type**: `multipart/form-data`

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | number | yes | Parent purchase request ID |
| `description` | string | yes | Item description |
| `qty` | number | yes | Quantity |
| `unit_price` | number | yes | Price per unit |
| `supplier_id` | number | no | Supplier ID |
| `po_no` | string | no | Purchase order number |
| `po_date` | date | no | PO date (YYYY-MM-DD) |
| `type_id` | number | yes | Asset type ID |
| `category_id` | number | no | Asset category ID |
| `brand_id` | number | no | Brand ID |
| `purpose` | string | no | Purpose/notes |
| `upload_path` | file | no | Supporting document |

**Example Request**:
```bash
curl -X POST 'http://localhost:3030/api/purchases/' \
  -F 'request_id=1' \
  -F 'description=Laptop - Dell Inspiron 15' \
  -F 'qty=2' \
  -F 'unit_price=1500' \
  -F 'supplier_id=3' \
  -F 'type_id=5' \
  -F 'upload_path=@quotation.pdf'
```

**Success Response** (201):
```json
{
  "status": "success",
  "message": "Purchase item created",
  "data": { "id": 10 }
}
```

---

### 10. Update Purchase Item

**Endpoint**: `PUT /purchases/:id`

**Content-Type**: `multipart/form-data`

**Updatable Fields**: All fields from creation endpoint

---

### 11. Delete Purchase Item

**Endpoint**: `DELETE /purchases/:id`

---

## Suppliers

### 12. Get All Suppliers

**Endpoint**: `GET /purchases/suppliers`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "supplier_name": "Tech Solutions Ltd",
      "supplier_code": "TS001",
      "contact_email": "contact@tech.com",
      "contact_phone": "123-456-7890",
      "contact_person": "John Doe",
      "address": "123 Tech Street",
      "city": "Kuala Lumpur",
      "status": 1
    }
  ]
}
```

---

### 13. Get Supplier by ID

**Endpoint**: `GET /purchases/suppliers/:id`

---

### 14. Create Supplier

**Endpoint**: `POST /purchases/suppliers`

**Request Body**:
```json
{
  "supplier_name": "Tech Solutions Ltd",
  "supplier_code": "TS001",
  "contact_email": "contact@tech.com",
  "contact_phone": "123-456-7890",
  "contact_person": "John Doe",
  "address": "123 Tech Street",
  "city": "Kuala Lumpur",
  "state": "Selangor",
  "postal_code": "50000",
  "country": "Malaysia"
}
```

---

### 15. Update Supplier

**Endpoint**: `PUT /purchases/suppliers/:id`

**Updatable Fields**: All fields from creation

---

### 16. Delete Supplier

**Endpoint**: `DELETE /purchases/suppliers/:id`

---

## Asset Registry

### 17. Get All Asset Registry

**Endpoint**: `GET /purchases/registry/all`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "asset_code": "ASSET-2024-001",
      "asset_name": "Laptop",
      "asset_type_id": 5,
      "costcenter_id": 2,
      "location": "Office A",
      "acquisition_date": "2024-12-01",
      "acquisition_cost": 1500,
      "status": "active"
    }
  ]
}
```

---

### 18. Get Asset Registry by Purchase Request

**Endpoint**: `GET /purchases/registry?pr_id=1`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `pr_id` | number | Purchase request ID |

---

### 19. Create Asset Registry Entry

**Endpoint**: `POST /purchases/registry`

**Request Body**:
```json
{
  "asset_code": "ASSET-2024-001",
  "asset_name": "Laptop",
  "asset_type_id": 5,
  "costcenter_id": 2,
  "location": "Office A",
  "acquisition_date": "2024-12-01",
  "acquisition_cost": 1500
}
```

---

## Deliveries

### 20. Get All Deliveries

**Endpoint**: `GET /purchases/deliveries`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 15,
      "purchase_id": 10,
      "do_no": "DO-2024-001",
      "do_date": "2024-12-10",
      "inv_no": "INV-2024-001",
      "inv_date": "2024-12-10",
      "grn_no": "GRN-2024-001",
      "grn_date": "2024-12-11",
      "status": "invoiced",
      "upload_url": "/uploads/purchases/grn123.pdf"
    }
  ]
}
```

---

### 21. Get Delivery by ID

**Endpoint**: `GET /purchases/deliveries/:id`

---

### 22. Create Delivery

**Endpoint**: `POST /purchases/deliveries`

**Content-Type**: `multipart/form-data`

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `purchase_id` | number | yes | Purchase item ID |
| `do_no` | string | no | Delivery order number |
| `do_date` | date | no | DO date |
| `inv_no` | string | no | Invoice number |
| `inv_date` | date | no | Invoice date |
| `grn_no` | string | no | GRN number |
| `grn_date` | date | no | GRN date |
| `upload_path` | file | no | Receipt/invoice file |

**Example Request**:
```bash
curl -X POST 'http://localhost:3030/api/purchases/deliveries' \
  -F 'purchase_id=10' \
  -F 'do_no=DO-2024-001' \
  -F 'do_date=2024-12-10' \
  -F 'inv_no=INV-2024-001' \
  -F 'upload_path=@invoice.pdf'
```

---

### 23. Update Delivery

**Endpoint**: `PUT /purchases/deliveries/:id`

**Content-Type**: `multipart/form-data`

---

### 24. Delete Delivery

**Endpoint**: `DELETE /purchases/deliveries/:id`

---

## Standard Response Format

### Success (2xx)
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": { /* result */ }
}
```

### Error (4xx/5xx)
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

---

## Error Codes

| Code | Message | Status |
|------|---------|--------|
| 400 | Missing required fields | Bad Request |
| 400 | Invalid date format | Bad Request |
| 400 | Duplicate PR exists | Bad Request |
| 401 | Unauthorized | Unauthorized |
| 404 | Record not found | Not Found |
| 500 | Internal server error | Server Error |

---

## Testing Checklist

- [ ] Create purchase request with required fields
- [ ] Create purchase item with file upload
- [ ] Filter purchases by status
- [ ] Filter purchases by cost center
- [ ] Filter purchases by date range
- [ ] Create supplier and link to items
- [ ] Create asset registry entry
- [ ] Create delivery record with document
- [ ] Update purchase request
- [ ] Test manager-based type filtering
- [ ] Verify email notification on delivery
- [ ] Test file path generation for uploads
- [ ] Verify duplicate PR prevention
- [ ] Test all error scenarios
