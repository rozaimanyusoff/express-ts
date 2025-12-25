# Billing Module - API Reference

**Base URL**: `/api/bills`  
**Authentication**: Most endpoints require Bearer token (see specific endpoint for details)

## Overview

Complete billing API for vehicle maintenance, fuel, utilities, and fleet card management.

---

## Vehicle Maintenance Billing

### 1. Get Maintenance Billings

**Endpoint**: `GET /api/bills/mtn`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | number | Filter by billing year |
| `from` | date | Start date (YYYY-MM-DD) |
| `to` | date | End date (YYYY-MM-DD) |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/bills/mtn?year=2024'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "X vehicle maintenance billing(s) retrieved",
  "data": [
    {
      "inv_id": 1,
      "svc_order": 500,
      "vehicle_id": 123,
      "inv_no": "INV-2024-001",
      "inv_date": "2024-12-20",
      "inv_total": "5000.00",
      "inv_stat": "invoiced",
      "costcenter_id": 5
    }
  ]
}
```

---

### 2. Get Maintenance Billing by ID

**Endpoint**: `GET /api/bills/mtn/:id`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Invoice ID |

---

### 3. Get Maintenance Billing by Request ID

**Endpoint**: `GET /api/bills/mtn/request/:svc_order`

**Purpose**: Get invoice by maintenance request ID

---

### 4. Update Maintenance Billing

**Endpoint**: `PUT /api/bills/mtn/:id`

**Content-Type**: `multipart/form-data`

**Request Body**:
| Field | Type | Description |
|-------|------|-------------|
| `inv_no` | string | Invoice number |
| `inv_date` | date | Invoice date (YYYY-MM-DD) |
| `inv_total` | number | Invoice amount |
| `inv_remarks` | string | Notes |
| `attachment` | file | Supporting document |

**Example Request**:
```bash
curl -X PUT 'http://localhost:3030/api/bills/mtn/1' \
  -F 'inv_no=INV-2024-001' \
  -F 'inv_date=2024-12-20' \
  -F 'inv_total=5000' \
  -F 'attachment=@invoice.pdf'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Maintenance billing updated successfully",
  "data": {
    "inv_id": 1,
    "inv_stat": "invoiced"
  }
}
```

---

### 5. Get Maintenance Summary

**Endpoint**: `GET /api/bills/mtn/summary/vehicle`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | date | Start date (required) |
| `to` | date | End date (required) |
| `cc` | number | Cost center ID (optional) |

**Purpose**: Get maintenance costs summary by vehicle and period (Excel report)

---

### 6. Get Maintenance Summary by Date Filter

**Endpoint**: `GET /api/bills/mtn/summary/filter`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | date | Start date |
| `to` | date | End date |

**Purpose**: Excel report of maintenance billings by date range

---

## Service Parts Management

### 7. Get Service Parts

**Endpoint**: `GET /api/bills/mtn/parts`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by part name/code |

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "part_name": "Brake Pad",
      "part_code": "BP001",
      "unit_price": 150.00
    }
  ]
}
```

### 8. Create Service Part

**Endpoint**: `POST /api/bills/mtn/parts`

**Request Body**:
```json
{
  "part_name": "Brake Pad",
  "part_code": "BP001",
  "unit_price": 150.00
}
```

### 9. Update Service Part

**Endpoint**: `PUT /api/bills/mtn/parts/:id`

---

## Fuel Billing Management

### 10. Get Fuel Billings

**Endpoint**: `GET /api/bills/fuel`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "stmt_id": 1,
      "stmt_no": "FUEL-2024-001",
      "stmt_date": "2024-12-01",
      "stmt_total": "50000.00",
      "fuel_vendor_id": 1,
      "status": "pending"
    }
  ]
}
```

---

### 11. Get Fuel Summary by Vehicle

**Endpoint**: `GET /api/bills/fuel/summary`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | date | Start date (required) |
| `to` | date | End date (required) |
| `cc` | number | Cost center filter (optional) |

**Purpose**: Fuel costs summary by vehicle, month, and cost center

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "vehicle_id": 123,
      "vehicle_name": "Toyota Camry",
      "month": "2024-12",
      "amount": "5000.00",
      "costcenter": "DBPS"
    }
  ]
}
```

---

### 12. Get Fuel Cost Center Summary

**Endpoint**: `GET /api/bills/fuel/costcenter-summary`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | date | Start date (required) |
| `to` | date | End date (required) |

**Purpose**: Excel report of fuel costs grouped by cost center and month

---

## Fleet Card Management

### 13. Get Fleet Cards

**Endpoint**: `GET /api/bills/fleet`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "fleet_id": 1,
      "card_number": "1234567890",
      "card_type": "Fuel",
      "card_status": "Active",
      "daily_limit": "500.00",
      "monthly_limit": "10000.00"
    }
  ]
}
```

### 14. Create Fleet Card

**Endpoint**: `POST /api/bills/fleet`

**Request Body**:
```json
{
  "card_number": "1234567890",
  "card_type": "Fuel",
  "issuer_id": 1,
  "daily_limit": 500,
  "monthly_limit": 10000
}
```

### 15. Assign Fleet Card to Asset

**Endpoint**: `POST /api/bills/fleet/:fleet_id/assign`

**Request Body**:
```json
{
  "asset_id": 123,
  "issued_date": "2024-12-01"
}
```

### 16. Return Fleet Card

**Endpoint**: `PUT /api/bills/fleet/:fleet_id/return`

**Request Body**:
```json
{
  "returned_date": "2024-12-25"
}
```

---

## Utilities Billing

### 17. Get Utility Bills

**Endpoint**: `GET /api/bills/utilities`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `account_id` | number | Filter by account |
| `status` | string | pending, paid, overdue |

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "util_id": 1,
      "util_type": "Electricity",
      "bill_month": "2024-12",
      "bill_amount": "5000.00",
      "due_date": "2024-12-30",
      "status": "pending"
    }
  ]
}
```

### 18. Get Utility Accounts

**Endpoint**: `GET /api/bills/utility-accounts`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "account_id": 1,
      "account_number": "1234-5678",
      "account_name": "Office Electricity",
      "util_type": "Electricity",
      "location_id": 5,
      "service_provider": "TNB"
    }
  ]
}
```

### 19. Create Utility Account

**Endpoint**: `POST /api/bills/utility-accounts`

**Request Body**:
```json
{
  "account_number": "1234-5678",
  "account_name": "Office Electricity",
  "util_type": "Electricity",
  "location_id": 5,
  "service_provider": "TNB"
}
```

### 20. Add Utility Beneficiary

**Endpoint**: `POST /api/bills/utility-accounts/:account_id/beneficiary`

**Request Body**:
```json
{
  "beneficiary_name": "Main Office",
  "property_address": "Kuala Lumpur",
  "contact_person": "John Doe",
  "contact_email": "john@example.com"
}
```

### 21. Record Utility Bill Payment

**Endpoint**: `PUT /api/bills/utilities/:util_id/payment`

**Request Body**:
```json
{
  "paid_date": "2024-12-25"
}
```

---

## Fuel Vendors & Issuers

### 22. Get Fuel Vendors

**Endpoint**: `GET /api/bills/fuel/vendors`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "vendor_id": 1,
      "vendor_name": "Shell",
      "vendor_code": "SHELL",
      "status": 1
    }
  ]
}
```

### 23. Create Fuel Vendor

**Endpoint**: `POST /api/bills/fuel/vendors`

**Request Body**:
```json
{
  "vendor_name": "Shell",
  "vendor_code": "SHELL",
  "contact_info": "1800-SHELL"
}
```

---

## Service Options

### 24. Get Service Options

**Endpoint**: `GET /api/bills/mtn/options`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 32,
      "name": "NCR Maintenance",
      "description": "Non-conformance corrective action"
    }
  ]
}
```

---

## Standard Response Format

### Success (2xx)
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": { /* ... */ }
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
| 401 | Unauthorized | Unauthorized |
| 404 | Record not found | Not Found |
| 500 | Internal server error | Server Error |

---

## Testing Checklist

- [ ] Get maintenance billings with year filter
- [ ] Update invoice with file upload
- [ ] Get fuel summary by cost center
- [ ] Create and assign fleet card to asset
- [ ] Record utility bill payment
- [ ] Get invoice status calculations (draft/invoiced)
- [ ] Test date range filtering
- [ ] Verify Excel report generation
- [ ] Test Socket.IO badge count updates
- [ ] Verify all error scenarios
