# Auth Logs Management API

## Overview

Complete API for managing and analyzing authentication logs stored in files. All endpoints require admin authentication via JWT token.

## Base URL
```
/api/admin/logs
```

## Authentication
All endpoints require `Authorization: Bearer {JWT_TOKEN}` header.

---

## Endpoints

### 1. Get All Log Files

**GET** `/files`

Returns metadata for all available log files.

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalFiles": 3,
    "files": [
      {
        "filename": "auth_2025-12-26.jsonl",
        "date": "2025-12-26",
        "size": 245832,
        "entries": 1245,
        "created": "2025-12-26T00:00:00.000Z",
        "modified": "2025-12-26T23:59:00.000Z"
      },
      {
        "filename": "auth_2025-12-25.jsonl",
        "date": "2025-12-25",
        "size": 189234,
        "entries": 956,
        "created": "2025-12-25T00:00:00.000Z",
        "modified": "2025-12-25T23:59:00.000Z"
      }
    ]
  }
}
```

---

### 2. Get Logs by Date Range

**GET** `/by-date-range`

Get logs for a specific date range with optional filtering.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string (YYYY-MM-DD) | Yes | Start date |
| endDate | string (YYYY-MM-DD) | Yes | End date |
| userId | number | No | Filter by user ID |
| action | string | No | Filter by action (login, logout, register, activate, reset_password) |
| status | string | No | Filter by status (success, fail) |

**Example:**
```
GET /by-date-range?startDate=2025-12-20&endDate=2025-12-26&action=login&status=fail
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "count": 45,
    "filters": {
      "startDate": "2025-12-20",
      "endDate": "2025-12-26",
      "userId": null,
      "action": "login",
      "status": "fail"
    },
    "logs": [
      {
        "user_id": 123,
        "action": "login",
        "status": "fail",
        "ip": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "details": "{\"reason\":\"invalid_credentials\"}",
        "created_at": "2025-12-26T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 3. Get Today's Logs

**GET** `/today`

Get all logs from today, optionally filtered by user.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | number | No | Filter by user ID |

**Example:**
```
GET /today?userId=123
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "date": "2025-12-26",
    "count": 34,
    "logs": [...]
  }
}
```

---

### 4. Get User's Logs

**GET** `/user/:userId`

Get logs for a specific user with optional filters.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | number | User ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Number of days to look back |
| action | string | - | Filter by action |
| status | string | - | Filter by status |

**Example:**
```
GET /user/123?days=30&action=login&status=fail
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "userId": 123,
    "dateRange": {
      "from": "2025-11-26",
      "to": "2025-12-26"
    },
    "stats": {
      "total": 156,
      "byAction": {
        "login": 89,
        "logout": 67
      },
      "byStatus": {
        "success": 145,
        "fail": 11
      },
      "successCount": 145,
      "failCount": 11
    },
    "logs": [...]
  }
}
```

---

### 5. Get Log Summary (Statistics)

**GET** `/summary`

Get aggregated statistics for logs in a date range.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Number of days to analyze |

**Example:**
```
GET /summary?days=7
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalEntries": 8932,
    "dateRange": {
      "from": "2025-12-19",
      "to": "2025-12-26",
      "days": 7
    },
    "byAction": {
      "login": {
        "success": 1245,
        "fail": 87,
        "total": 1332,
        "successRate": 93
      },
      "logout": {
        "success": 1198,
        "fail": 2,
        "total": 1200,
        "successRate": 100
      },
      "register": {
        "success": 34,
        "fail": 12,
        "total": 46,
        "successRate": 74
      }
    },
    "byStatus": {
      "success": 8456,
      "fail": 476
    },
    "uniqueUsers": 234,
    "uniqueIPs": 89,
    "failureRate": 5.33
  }
}
```

---

### 6. Get Suspicious Activity

**GET** `/suspicious`

Identify suspicious activity (failed attempts above threshold).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Number of days to check |
| threshold | number | 5 | Minimum failed attempts to flag |

**Example:**
```
GET /suspicious?days=7&threshold=5
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "dateRange": {
      "from": "2025-12-19",
      "to": "2025-12-26"
    },
    "threshold": 5,
    "suspiciousCount": 3,
    "activities": [
      {
        "userId": 456,
        "action": "login",
        "failCount": 12,
        "ipCount": 2,
        "ips": ["192.168.1.50", "10.0.0.15"],
        "lastAttempt": "2025-12-26T14:30:00.000Z",
        "details": [
          {
            "action": "login",
            "ip": "192.168.1.50",
            "created_at": "2025-12-26T14:30:00.000Z",
            "details": "{\"reason\":\"invalid_credentials\"}"
          }
        ]
      }
    ]
  }
}
```

---

### 7. Download Log File

**GET** `/download/:filename`

Download a specific log file as NDJSON.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| filename | string | Filename (e.g., auth_2025-12-26.jsonl) |

**Example:**
```
GET /download/auth_2025-12-26.jsonl
```

**Response:** NDJSON file download
```
Content-Type: application/x-ndjson
Content-Disposition: attachment; filename="auth_2025-12-26.jsonl"
```

---

### 8. Archive Old Log Files

**POST** `/archive`

Archive log files older than specified number of days.

**Request Body:**
```json
{
  "daysToKeep": 90
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Archived 12 log files older than 90 days",
    "archivedCount": 12,
    "daysToKeep": 90
  }
}
```

---

## Log Entry Format

Each log entry in the files has the following structure:

```json
{
  "user_id": 123,
  "action": "login",
  "status": "success",
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "details": null,
  "created_at": "2025-12-26T10:30:00.000Z"
}
```

### Fields:
| Field | Type | Description |
|-------|------|-------------|
| user_id | number | ID of the user |
| action | string | Auth action (login, logout, register, activate, reset_password, request_reset, other) |
| status | string | Success or fail |
| ip | string/null | Client IP address |
| user_agent | string/null | Browser/client user agent |
| details | string/null | JSON string with additional details |
| created_at | string | ISO timestamp |

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "startDate and endDate are required"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to retrieve logs"
}
```

---

## Usage Examples

### Get Failed Logins from Last 7 Days
```bash
curl -X GET "http://localhost:3000/api/admin/logs/by-date-range?startDate=2025-12-19&endDate=2025-12-26&action=login&status=fail" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Summary Stats
```bash
curl -X GET "http://localhost:3000/api/admin/logs/summary?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download Today's Logs
```bash
curl -X GET "http://localhost:3000/api/admin/logs/download/auth_2025-12-26.jsonl" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o auth_logs_today.jsonl
```

### Find Suspicious Activity
```bash
curl -X GET "http://localhost:3000/api/admin/logs/suspicious?days=7&threshold=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Archive Old Logs
```bash
curl -X POST "http://localhost:3000/api/admin/logs/archive" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 90}'
```

---

## Frontend Integration Example

```typescript
// Get all log files
async function getAllLogFiles() {
  const response = await fetch('/api/admin/logs/files', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Get logs by date range
async function getLogsByDate(startDate, endDate, filters = {}) {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...filters
  });
  const response = await fetch(`/api/admin/logs/by-date-range?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Get suspicious activity
async function getSuspiciousActivity(days = 7, threshold = 5) {
  const response = await fetch(
    `/api/admin/logs/suspicious?days=${days}&threshold=${threshold}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Date parameters must be in YYYY-MM-DD format
- Archived logs are moved to `uploads/logs/auth/archive/`
- File downloads are in NDJSON format (one JSON object per line)
- Suspicious activity is based on failed attempts, not geographic origin
