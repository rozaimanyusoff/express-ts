# Compliance Module - API Reference

**Base URL**: `/api/compliance`  
**Authentication**: Most endpoints require Bearer token (see specific endpoint for details)

## Overview

This document lists all compliance module endpoints covering summon management, vehicle assessments, IT assessments, and compliance tracking.

---

## Summon Management

### 1. Get All Summons

**Endpoint**: `GET /api/compliance/summon`

**Authentication**: Optional

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `asset_id` | number | Filter by vehicle ID |
| `status` | string | Filter by status: `pending`, `paid`, `disputed`, `closed` |
| `type_id` | number | Filter by summon type |
| `agency_id` | number | Filter by agency |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/compliance/summon?status=pending' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "5 summon(s) retrieved",
  "data": [
    {
      "id": 1,
      "asset_id": 123,
      "summon_date": "2025-12-20",
      "type_id": 2,
      "agency_id": 1,
      "amount": 500,
      "payment_date": null,
      "status": "pending",
      "remarks": "Traffic violation"
    }
  ]
}
```

---

### 2. Get Summon by ID

**Endpoint**: `GET /api/compliance/summon/:id`

**Authentication**: Optional

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Summon ID |

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Summon retrieved successfully",
  "data": {
    "id": 1,
    "asset_id": 123,
    "summon_date": "2025-12-20",
    "type_id": 2,
    "agency_id": 1,
    "amount": 500,
    "summon_upl": "/uploads/compliance/summon/file.pdf",
    "status": "pending"
  }
}
```

---

### 3. Create Summon

**Endpoint**: `POST /api/compliance/summon`

**Authentication**: Optional

**Content-Type**: `multipart/form-data`

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | number | ✓ | Vehicle ID |
| `summon_date` | date | ✓ | Date issued (YYYY-MM-DD) |
| `type_id` | number | ✓ | Summon type ID |
| `agency_id` | number | ✓ | Agency ID |
| `amount` | number | ✓ | Amount in currency |
| `remarks` | string | | Notes |
| `summon_upl` | file | | Original summon document |

**Example Request**:
```bash
curl -X POST 'http://localhost:3030/api/compliance/summon' \
  -F 'asset_id=123' \
  -F 'summon_date=2025-12-20' \
  -F 'type_id=2' \
  -F 'agency_id=1' \
  -F 'amount=500' \
  -F 'remarks=Traffic violation' \
  -F 'summon_upl=@summon.pdf'
```

**Success Response** (201):
```json
{
  "status": "success",
  "message": "Summon created successfully",
  "data": {
    "id": 1,
    "asset_id": 123,
    "summon_date": "2025-12-20",
    "type_id": 2,
    "agency_id": 1,
    "amount": 500,
    "status": "pending"
  }
}
```

---

### 4. Update Summon

**Endpoint**: `PUT /api/compliance/summon/:id`

**Authentication**: Optional

**Content-Type**: `multipart/form-data`

**Request Body** (same as Create, all optional):
```json
{
  "summon_date": "2025-12-25",
  "amount": 600,
  "remarks": "Updated remarks"
}
```

---

### 5. Record Summon Payment

**Endpoint**: `PUT /api/compliance/summon/:id/payment`

**Authentication**: Optional

**Content-Type**: `multipart/form-data`

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_date` | date | ✓ | Date paid (YYYY-MM-DD) |
| `payment_amount` | number | ✓ | Amount paid |
| `payment_method` | string | | Payment method |
| `payment_reference` | string | | Receipt/reference number |
| `summon_receipt` | file | | Payment receipt |

**Example Request**:
```bash
curl -X PUT 'http://localhost:3030/api/compliance/summon/1/payment' \
  -F 'payment_date=2025-12-25' \
  -F 'payment_amount=500' \
  -F 'payment_method=bank_transfer' \
  -F 'payment_reference=TRX123456' \
  -F 'summon_receipt=@receipt.pdf'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Payment recorded successfully",
  "data": {
    "id": 1,
    "payment_date": "2025-12-25",
    "payment_amount": 500,
    "status": "paid"
  }
}
```

---

### 6. Delete Summon

**Endpoint**: `DELETE /api/compliance/summon/:id`

**Authentication**: Optional

---

## Summon Type Management

### 7. Get All Summon Types

**Endpoint**: `GET /api/compliance/summon/type`

**Response**:
```json
{
  "status": "success",
  "message": "X summon type(s) retrieved",
  "data": [
    {
      "id": 1,
      "name": "Traffic Violation",
      "description": "Traffic-related offenses",
      "created_at": "2025-01-01"
    }
  ]
}
```

### 8. Create Summon Type

**Endpoint**: `POST /api/compliance/summon/type`

**Request Body**:
```json
{
  "name": "Parking Violation",
  "description": "Illegal parking offenses",
  "agency_ids": [1, 2, 3]
}
```

---

## Vehicle Assessment Operations

### 9. Get Vehicle Assessments

**Endpoint**: `GET /api/compliance/assessments`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter: `vehicle` |
| `year` | number | Filter by assessment year |
| `status` | number | 0=incomplete, 1=complete |
| `asset_id` | number | Filter by vehicle ID |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/compliance/assessments?type=vehicle&year=2024' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "X assessment(s) retrieved",
  "data": [
    {
      "assess_id": 1,
      "asset_id": 123,
      "assess_date": "2025-12-01",
      "assess_year": 2025,
      "technician": "john_tech",
      "adt_status": 1,
      "overall_score": 3,
      "remarks": "Vehicle in good condition",
      "ramco_id": "00001",
      "department_id": 5
    }
  ]
}
```

---

### 10. Get Assessment by ID

**Endpoint**: `GET /api/compliance/assessments/:id`

**Response**:
```json
{
  "status": "success",
  "message": "Assessment retrieved",
  "data": {
    "assess_id": 1,
    "details": [
      {
        "assess_dt_id": 1,
        "adt_finding": "Brake pads worn",
        "adt_ncr": 2,
        "adt_remarks": "Requires immediate replacement"
      }
    ]
  }
}
```

---

### 11. Create Vehicle Assessment

**Endpoint**: `POST /api/compliance/assessments`

**Request Body**:
```json
{
  "asset_id": 123,
  "assess_date": "2025-12-01",
  "assess_year": 2025,
  "technician": "john_tech",
  "overall_score": 3,
  "remarks": "Regular inspection"
}
```

---

### 12. Track NCR Actions

**Endpoint**: `GET /api/compliance/assessments/:assessmentId/ncr-actions`

**Purpose**: Get driver maintenance actions taken for NCR (Non-Conformance) items

**Response**:
```json
{
  "status": "success",
  "message": "NCR tracking data retrieved",
  "data": {
    "assessment": { /* assessment details */ },
    "ncr_items": [
      {
        "assess_dt_id": 1,
        "adt_finding": "Brake pads worn",
        "adt_ncr": 2
      }
    ],
    "driver_actions": [
      {
        "req_id": 500,
        "req_date": "2025-12-05",
        "svc_opt": "32",
        "drv_stat": 1,
        "approval_stat": 1
      }
    ],
    "summary": {
      "ncr_count": 5,
      "actions_taken": 3,
      "pending_actions": 2
    }
  }
}
```

---

## IT Assessment Operations

### 13. Get Computer Assessments

**Endpoint**: `GET /api/compliance/computer-assessments`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `assessment_year` | string | Filter by year (e.g., "2024") |
| `technician` | string | Filter by technician |
| `ramco_id` | string | Filter by asset owner |
| `asset_id` | number | Filter by specific asset |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/compliance/computer-assessments?assessment_year=2024' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "X computer assessment(s) retrieved",
  "data": [
    {
      "id": 1,
      "asset_id": 234,
      "assessment_year": "2024",
      "assessment_date": "2024-06-15",
      "technician": "jdoe",
      "overall_score": 4,
      "register_number": "ABC123",
      "brand": "Dell",
      "model": "Latitude 7440",
      "os_name": "Windows",
      "os_version": "11 Pro",
      "cpu_model": "Intel i5",
      "memory_size_gb": 16,
      "storage_size_gb": 512,
      "antivirus_installed": 1,
      "vpn_installed": 1
    }
  ]
}
```

---

### 14. Get Computer Assessment by ID

**Endpoint**: `GET /api/compliance/computer-assessments/:id`

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Assessment retrieved",
  "data": {
    "id": 1,
    "asset_id": 234,
    "overall_score": 4,
    "remarks": "Hardware in excellent condition"
    // ... all fields from computer_assessment table
  }
}
```

---

### 15. Create Computer Assessment

**Endpoint**: `POST /api/compliance/it-assess`

**Authentication**: Optional (but recommended)

**Request Body**:
```json
{
  "asset_id": 1294,
  "assessment_year": 2026,
  "assessment_date": "2026-01-06",
  "register_number": "220222812102000235",
  "technician": "000277",
  "overall_score": 85,
  "brand": "HP",
  "model": "Pavilion",
  "category": "Laptop",
  "os_name": "Windows 11",
  "os_version": "22H2",
  "cpu_manufacturer": "Intel",
  "cpu_model": "Core i7",
  "memory_size_gb": 16,
  "storage_type": "SSD",
  "storage_size_gb": 512,
  "costcenter_id": 15,
  "department_id": 8,
  "location_id": 5,
  "ramco_id": "000277",
  "purchase_date": "2022-07-01",
  "remarks": "Hardware in excellent condition"
}
```

**Processing Steps**:
1. Validate duplicate (same asset + year + register_number)
2. Create assessment record
3. Update computer specs in `1_specs` table (51 fields)
4. Check asset_history for changes:
   - Compare costcenter_id, department_id, location_id, ramco_id
   - Insert new record if ANY field changed
   - Skip insertion if all fields identical (optimization)
5. Update `assetdata` table:
   - Sync ownership fields (costcenter, department, location, owner)
   - Sync specs fields (category, brand, model)
   - Only updates existing records, no insertions
6. Process attachments (if provided)
7. Send notification email to technician

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Computer assessment created successfully",
  "data": {
    "id": 5719
  }
}
```

**Console Logs** (operation tracking):
```
✓ Computer specs UPDATED for asset_id=1294: 51 fields modified
✓ Asset history record INSERTED for asset_id=1294 (ID: 5719): Changes detected - costcenterChanged, departmentChanged, locationChanged
✓ assetdata UPDATED for asset_id=1294: 4 field(s) modified
Message sent: <email-id>
```

**Error Response** (400 - Duplicate):
```json
{
  "status": "error",
  "message": "Assessment already exists for asset 220222812102000235 in year 2026",
  "data": null
}
```

**Fields Involved**:

| Category | Fields | Purpose |
|----------|--------|---------|
| **Assessment** | assessment_year, assessment_date, overall_score | Assessment metadata |
| **Asset Ref** | asset_id, register_number | Asset identification |
| **Equipment** | brand, model, category | Equipment classification |
| **Hardware** | os_name, os_version, cpu_manufacturer, cpu_model, memory_size_gb, storage_type, storage_size_gb, battery_equipped, ports_*, av_installed, vpn_installed | Complete hardware inventory |
| **Ownership** | costcenter_id, department_id, location_id, ramco_id | Asset ownership/allocation |
| **Purchase** | purchase_date | Purchase tracking |
| **Files** | attachments[0], attachments[1], attachments[2] | Supporting documents |
| **Tech Info** | technician, remarks | Assessment details |

**Database Updates**:
- `computer_assessment` (it_assessment): 1 record created
- `1_specs`: 1 record created/updated (51 fields)
- `asset_history`: 1 record created (if values changed)
- `assetdata`: 1 record updated (if fields changed)

---

### 16. Update Computer Assessment

**Endpoint**: `PUT /api/compliance/it-assess/:id`

**Request Body** (same as Create, all optional)

**Processing**: Same as Create (including asset_history & assetdata checks)

---

### 17. Delete Computer Assessment

**Endpoint**: `DELETE /api/compliance/computer-assessments/:id`

---

## IT Asset Assessment Status

### 18. Get IT Assets with Assessment Status

**Endpoint**: `GET /api/compliance/it-assets-status`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `assessment_year` | string | Filter by assessment year |
| `assessed_only` | boolean | Show only assessed assets |
| `not_assessed_only` | boolean | Show only unassessed assets |

**Response**:
```json
{
  "status": "success",
  "message": "X IT asset(s) retrieved with assessment status",
  "data": [
    {
      "asset": {
        "id": 1295,
        "entry_code": "10658",
        "brand": "HP",
        "category": "Laptop",
        "department": "BD",
        "costcenter": "DBTLDM",
        "location": "TLDM Lumut"
      },
      "assessment": {
        "id": 25,
        "assessment_year": "2024",
        "assessment_date": "2024-06-15",
        "overall_score": 4,
        "technician": "jdoe"
      },
      "assessed": true
    },
    {
      "asset": { /* ... */ },
      "assessment": null,
      "assessed": false
    }
  ]
}
```

---

## Assessment Criteria Management

### 19. Get Assessment Criteria

**Endpoint**: `GET /api/compliance/assessments/criteria`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "assess_qset_id": 1,
      "question_text": "Are brakes functioning properly?",
      "question_category": "Brake System",
      "response_type": "yes_no"
    }
  ]
}
```

### 20. Get Criteria Ownership

**Endpoint**: `GET /api/compliance/assessments/criteria/ownership`

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "criteria_id": 5,
      "owner_type": "department",
      "owner_id": 3,
      "description": "Owned by Maintenance Department"
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

### Client Error (4xx)
```json
{
  "status": "error",
  "message": "Invalid request",
  "data": null
}
```

### Server Error (5xx)
```json
{
  "status": "error",
  "message": "Internal server error",
  "data": null
}
```

---

## Error Codes

| Code | Message | Status |
|------|---------|--------|
| 400 | Missing required fields | Bad Request |
| 401 | Unauthorized | Unauthorized |
| 403 | Forbidden | Forbidden |
| 404 | Record not found | Not Found |
| 409 | Duplicate assessment (year + asset) | Conflict |
| 500 | Internal server error | Server Error |

---

## Testing Checklist

- [ ] Create summon and verify file upload
- [ ] Record payment and auto-update status to paid
- [ ] Create vehicle assessment with details
- [ ] Track NCR actions and correlate with maintenance
- [ ] Create computer assessment with all fields
- [ ] Filter assessments by year/technician
- [ ] Get IT assets with assessment status
- [ ] Update existing assessments
- [ ] Delete records properly
- [ ] Email notifications for summons
