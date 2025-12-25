# Maintenance Module - API Reference

**Base URL**: `/api/mtn`  
**Authentication**: Token required (Bearer token in Authorization header)

## Overview

This document lists all maintenance module endpoints, their parameters, authentication requirements, and example responses.

---

## Core Operations

### 1. Create Maintenance Request

**Endpoint**: `POST /api/mtn/request`

**Authentication**: Optional (can be public or protected)

**Content-Type**: `multipart/form-data`

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | number | ✓ | Vehicle/asset ID |
| `ramco_id` | string | ✓ | Requester employee ID |
| `req_comment` | string | | Request reason/comments |
| `svc_opt` | string | ✓ | Comma-separated service option IDs (e.g., "32,35") |
| `ws_id` | number | | Workshop ID |
| `costcenter_id` | number | | Cost center ID |
| `req_upload` | file | | Optional upload document |

**Example Request**:
```bash
curl -X POST 'http://localhost:3030/api/mtn/request' \
  -F 'asset_id=123' \
  -F 'ramco_id=00001' \
  -F 'req_comment=Service inspection needed' \
  -F 'svc_opt=32,35' \
  -F 'ws_id=5' \
  -F 'req_upload=@document.pdf'
```

**Success Response** (201):
```json
{
  "status": "success",
  "message": "Maintenance request created successfully",
  "data": {
    "req_id": 12345,
    "asset_id": 123,
    "ramco_id": "00001",
    "req_date": "2025-12-25T10:30:00.000Z",
    "req_comment": "Service inspection needed",
    "svc_opt": "32,35",
    "verification_stat": 0,
    "recommendation_stat": 0,
    "approval_stat": 0,
    "drv_stat": 0
  }
}
```

**Error Response** (400):
```json
{
  "status": "error",
  "message": "asset_id and ramco_id are required",
  "data": null
}
```

---

### 2. Get All Requests

**Endpoint**: `GET /api/mtn/request`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by final status: `pending`, `verified`, `recommended`, `approved`, `rejected`, `cancelled` | `?status=approved` |
| `pendingStatus` | string | Filter by pending stage: `verified`, `recommended`, `approval` | `?pendingStatus=verified` |
| `ramco` | string | Filter by requester employee ID | `?ramco=00001` |
| `years` | array | Filter by request year (comma-separated) | `?years=2024,2025` |
| `includeInvoice` | boolean | Include billing/invoice data (default: false) | `?includeInvoice=true` |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/mtn/request?pendingStatus=verified' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Maintenance requests retrieved successfully",
  "data": [
    {
      "req_id": 12345,
      "asset_id": 123,
      "ramco_id": "00001",
      "req_date": "2025-12-25T10:30:00.000Z",
      "verification_stat": 0,
      "recommendation_stat": 0,
      "approval_stat": 0,
      "application_status": "PENDING",
      "status": "pending",
      "asset": {
        "id": 123,
        "name": "Toyota Camry",
        "license_plate": "ABC 1234"
      },
      "requester": {
        "ramco_id": "00001",
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

### 3. Get Request by ID

**Endpoint**: `GET /api/mtn/request/:id`

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Request ID |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/mtn/request/12345' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Maintenance request retrieved successfully",
  "data": {
    "req_id": 12345,
    "asset_id": 123,
    "ramco_id": "00001",
    "req_date": "2025-12-25T10:30:00.000Z",
    "verification_stat": 1,
    "verification_date": "2025-12-25T12:00:00.000Z",
    "verification_by": "00002",
    "recommendation_stat": 0,
    "approval_stat": 0,
    "drv_stat": 1,
    "application_status": "VERIFIED",
    "status": "verified"
  }
}
```

---

### 4. Get Requests by Asset ID

**Endpoint**: `GET /api/mtn/request/record/:asset_id`

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `asset_id` | number | Vehicle/asset ID |

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/mtn/request/record/123' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Maintenance records retrieved successfully",
  "data": [
    {
      "req_id": 12345,
      "asset_id": 123,
      "inv_id": 5001,
      "inv_date": "2025-12-26T10:00:00.000Z",
      "inv_status": "invoiced"
    },
    {
      "req_id": 12346,
      "asset_id": 123,
      "inv_id": null,
      "inv_status": null
    }
  ]
}
```

---

## Workflow Operations

### 5. Verify Request

**Endpoint**: `PUT /api/mtn/request/:id` (with `verification_stat`)

**Authentication**: Required

**Request Body**:
```json
{
  "verification_stat": 1,
  "verification_by": "00002",
  "verification": "Document verified"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Maintenance request updated successfully",
  "data": {
    "req_id": 12345,
    "verification_stat": 1,
    "verification_date": "2025-12-25T12:00:00.000Z"
  }
}
```

### 6. Recommend Request

**Endpoint**: `PUT /api/mtn/request/:id/recommend`

**Authentication**: Required

**Request Body**:
```json
{
  "recommendation_stat": 1,
  "recommendation": "Approved for processing"
}
```

**Emits Socket.IO**:
```javascript
socket.emit('mtn:request-updated', {
  requestId: 12345,
  action: "recommended",
  updatedBy: "00002",
  timestamp: "2025-12-25T12:00:00Z"
});
```

### 7. Approve Request

**Endpoint**: `PUT /api/mtn/request/:id/approve`

**Authentication**: Required

**Request Body**:
```json
{
  "approval_stat": 1,
  "approval": "Request approved"
}
```

**Auto-Actions**:
- Creates invoice in `billings.tbl_inv`
- Emits `mtn:request-updated` event
- Updates badge count

### 8. Reject Request

**Endpoint**: `PUT /api/mtn/request/:id` (with rejection status)

**Request Body**:
```json
{
  "verification_stat": 2,
  "verification": "Missing documentation"
}
```

---

## Bulk Operations

### 9. Bulk Recommend

**Endpoint**: `PUT /api/mtn/request/bulk/recommend`

**Authentication**: Required

**Request Body**:
```json
{
  "request_ids": [12345, 12346, 12347],
  "recommendation_stat": 1,
  "recommendation": "Batch approved"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Recommendations processed",
  "data": {
    "successful": 3,
    "failed": 0
  }
}
```

### 10. Bulk Approve

**Endpoint**: `PUT /api/mtn/request/bulk/approve`

**Authentication**: Required

**Request Body**:
```json
{
  "request_ids": [12345, 12346],
  "approval_stat": 1,
  "approval": "Batch approved"
}
```

---

## Form Upload

### 11. Upload Maintenance Form

**Endpoint**: `PUT /api/mtn/request/:id/form-upload`

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Accepted Files**: JPEG, PNG, WebP, PDF

**Request Body**:
```
form_upload: <binary file data>
```

**Example Request**:
```bash
curl -X PUT 'http://localhost:3030/api/mtn/request/12345/form-upload' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'form_upload=@service_form.pdf'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Form uploaded successfully",
  "data": {
    "req_id": 12345,
    "form_upload": "/uploads/admin/vehiclemtn2/abc123def456.pdf",
    "form_upload_date": "2025-12-25T15:30:00.000Z"
  }
}
```

**Socket.IO Events Emitted**:
```javascript
// To all connected clients
socket.emit('mtn:form-uploaded', {
  requestId: 12345,
  assetId: 123,
  uploadedBy: "00001",
  uploadedAt: "2025-12-25T15:30:00Z"
});

socket.emit('mtn:counts', {
  maintenanceBilling: 5,
  unseenBills: 3
});
```

---

## Authorization & Driver Engagement

### 12. Authorize via Email Link

**Endpoint**: `GET /api/mtn/request/:id/authorize-link`

**Authentication**: Not required (uses JWT token in query)

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `_cred` | string | JWT token (generated server-side) |
| `action` | string | Action type: `approve` or `recommend` |

**Example URL** (sent via email):
```
http://frontend.example.com/mtn/vehicle/portal/12345?action=approve&_cred=eyJhbGc...
```

**Server-Side Handling**:
```typescript
// Token payload contains: { contact, ramco_id, req_id }
const authorizeViaEmailLink = async (req: Request, res: Response) => {
  const token = req.query._cred as string;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // Proceed with authorization for decoded.ramco_id
};
```

### 13. Driver Accept/Cancel

**Endpoint**: `PUT /api/mtn/request/:id` (driver action)

**Request Body**:
```json
{
  "drv_stat": 1,
  "drv_date": "2025-12-25T16:00:00.000Z"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Driver confirmed request",
  "data": {
    "req_id": 12345,
    "drv_stat": 1
  }
}
```

---

## Real-Time Badges

### 14. Get Unseen Bills Count (Badge Endpoint)

**Endpoint**: `GET /api/mtn/bills/unseen-count`

**Authentication**: Required

**Purpose**: Get count of maintenance forms awaiting billing

**Example Request**:
```bash
curl -X GET 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Unseen bills count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

**Query Logic**:
```sql
SELECT COUNT(*) FROM vehicle_svc v
LEFT JOIN tbl_inv i ON v.req_id = i.req_id
WHERE v.form_upload IS NOT NULL
  AND (i.inv_status NOT IN ('processed', 'invoiced', 'paid') OR i.inv_id IS NULL);
```

**Socket.IO Fallback**:
If Socket.IO unavailable, frontend polls this endpoint every 60s for badge updates.

---

## Additional Operations

### 15. Cancel Request

**Endpoint**: `PUT /api/mtn/request/:id/cancel`

**Request Body**:
```json
{
  "drv_stat": 2,
  "reason": "No longer needed"
}
```

### 16. Delete Request

**Endpoint**: `DELETE /api/mtn/request/:id`

**Authentication**: Required (admin only)

### 17. Update Request (General)

**Endpoint**: `PUT /api/mtn/request/:id`

**Request Body** (any combination):
```json
{
  "req_comment": "Updated comment",
  "costcenter_id": 101,
  "ws_id": 5,
  "verification_stat": 1,
  "recommendation_stat": 0,
  "approval_stat": 0
}
```

### 18. Admin Update Request

**Endpoint**: `PUT /api/mtn/request/:id/admin`

**Authentication**: Required (admin only)

**Request Body**:
```json
{
  "verification_stat": 1,
  "recommendation_stat": 1,
  "approval_stat": 1,
  "admin_notes": "Approved for processing"
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
  "message": "Invalid request parameter",
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

## Socket.IO Events

All real-time updates emitted via Socket.IO:

| Event | Trigger | Payload |
|-------|---------|---------|
| `mtn:new-request` | New request created | `{ requestId, requester, timestamp }` |
| `mtn:form-uploaded` | Form uploaded | `{ requestId, assetId, uploadedBy, uploadedAt }` |
| `mtn:request-updated` | Status changed | `{ requestId, action, updatedBy, timestamp }` |
| `mtn:badge-count` | Count updates | `{ count, type, action?, timestamp }` |
| `mtn:counts` | Multiple counts | `{ maintenanceBilling, unseenBills }` |

---

## Error Codes

| Code | Message | Status |
|------|---------|--------|
| 400 | Missing required fields | Bad Request |
| 401 | Unauthorized - invalid token | Unauthorized |
| 403 | Forbidden - insufficient permissions | Forbidden |
| 404 | Request not found | Not Found |
| 500 | Internal server error | Server Error |

---

## Testing Checklist

- [ ] Create request without auth
- [ ] Get requests with various filters
- [ ] Verify workflow progression (0→1→1→1)
- [ ] Upload form and check Socket.IO emit
- [ ] Approve request and verify invoice creation
- [ ] Get badge count and verify polling fallback
- [ ] Test email authorization links
- [ ] Bulk operations with multiple requests
- [ ] Error handling for invalid data
