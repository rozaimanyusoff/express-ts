# Maintenance Status API - Quick Reference

## Endpoints

```
GET  /api/admin/maintenance          → Get current maintenance status (public)
PUT  /api/admin/maintenance          → Update status (admin-only, requires JWT token)
```

## GET /api/admin/maintenance
- **Auth**: None (public endpoint)
- **Usage**: Called on frontend app load to check maintenance mode

```bash
curl http://localhost:5000/api/admin/maintenance
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "active": false,
    "message": "We are performing planned maintenance.",
    "until": "2026-01-03T14:30:00.000Z",
    "updatedBy": "User 123",
    "updatedAt": "2026-01-03T12:00:00.000Z"
  }
}
```

## PUT /api/admin/maintenance
- **Auth**: Required (JWT token) + Admin role (role: 1)
- **Body**: `{ active: boolean, message: string, until?: string }`
- **Side Effect**: Broadcasts `backend:maintenance` event via Socket.IO to ALL clients

```bash
curl -X PUT http://localhost:5000/api/admin/maintenance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "active": true,
    "message": "System maintenance in progress",
    "until": "2026-01-03T14:30:00.000Z"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Maintenance status updated successfully",
  "data": {
    "active": true,
    "message": "System maintenance in progress",
    "until": "2026-01-03T14:30:00.000Z",
    "updatedBy": "User 123",
    "updatedAt": "2026-01-03T12:00:00.000Z"
  }
}
```

## Socket.IO Real-Time Broadcast

After successful PUT request, all connected Socket.IO clients receive:

```javascript
socket.on('backend:maintenance', (status) => {
  // {
  //   active: true,
  //   message: "System maintenance in progress",
  //   until: "2026-01-03T14:30:00.000Z",
  //   updatedBy: "User 123",
  //   updatedAt: "2026-01-03T12:00:00.000Z"
  // }
});
```

## Frontend Integration

### 1. Check Status on App Load
```javascript
const response = await fetch('/api/admin/maintenance');
const result = await response.json();
if (result.data.active) {
  showMaintenanceNotice(result.data.message);
}
```

### 2. Listen for Real-Time Updates
```javascript
socket.on('backend:maintenance', (status) => {
  if (status.active) {
    showMaintenanceNotice(status.message);
  } else {
    hideMaintenanceNotice();
  }
});
```

### 3. Admin Updates Status
```javascript
const updateMaintenance = async (active, message, until) => {
  const response = await fetch('/api/admin/maintenance', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ active, message, until })
  });
  return response.json();
};
```

## Error Responses

| Status | Condition |
|--------|-----------|
| 403 | User is not admin (role ≠ 1) |
| 400 | Invalid request body (active must be boolean, message must be string) |
| 500 | Server error reading/writing maintenance status |

## Data Persistence

- Status saved to `maintenance.json` in project root
- Persists across server restarts
- Includes metadata: updatedBy (user ID), updatedAt (ISO timestamp)

## Combined Real-Time Events

Frontend can listen to both:
- `backend:health` - Database status (every 30 seconds)
- `backend:maintenance` - Maintenance mode (on admin update)

```javascript
// System monitoring
socket.on('backend:health', (health) => {
  if (health.status !== 'healthy') {
    showHealthWarning(health);
  }
});

socket.on('backend:maintenance', (maintenance) => {
  if (maintenance.active) {
    showMaintenanceBanner(maintenance.message);
  }
});
```
