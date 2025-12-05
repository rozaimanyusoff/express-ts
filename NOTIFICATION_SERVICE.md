# Live Notification Badge Implementation

## Overview

This document explains the live notification system for maintenance request badges that show admins real-time updates of pending applications.

## Architecture

### Components

1. **notificationService.ts** - Centralized helper for Socket.IO event emissions
2. **maintenanceController.ts** - Triggers notifications on request creation/updates
3. **socketIoInstance.ts** - Global Socket.IO instance holder
4. **Socket.IO Client** (Frontend) - Listens for events and updates badge

### Event Flow

```
User submits request (createVehicleMtnRequest)
                ↓
        Request inserted in DB
                ↓
        notificationService.notifyNewMtnRequest()
                ↓
        Emits 'mtn:new-request' event (broadcast)
        Emits 'mtn:badge-count' event with updated count
                ↓
        Frontend receives event
        Updates badge counter in real-time
```

```
Admin updates request (adminUpdateVehicleMtnRequest)
                ↓
        Request status updated in DB
                ↓
        notificationService.notifyMtnRequestUpdate()
                ↓
        Emits 'mtn:request-updated' event (broadcast)
        Emits 'mtn:badge-count' event with new count
                ↓
        Frontend receives event
        Decrements badge counter in real-time
```

## Notification Service API

### `notifyNewMtnRequest(requestId, ramcoId?)`

Called when a new maintenance request is created.

```typescript
// Example usage in createVehicleMtnRequest controller
await notificationService.notifyNewMtnRequest(createdId, ramco_id);
```

**Emitted Events:**
- `mtn:new-request` - Broadcast notification of new request
- `mtn:badge-count` - Updated counter (type: 'new-request')

**Response Payload:**
```javascript
{
  requestId: 12345,
  requester: "000317",
  timestamp: "2025-12-04T10:30:00.000Z",
  message: "New maintenance request submitted"
}
```

### `notifyMtnRequestUpdate(requestId, action, adminRamco?)`

Called when admin verifies, approves, or rejects a request.

```typescript
// Example usage in adminUpdateVehicleMtnRequest controller
await notificationService.notifyMtnRequestUpdate(reqId, 'verified', adminRamco);
```

**Parameters:**
- `action`: One of `'verified' | 'approved' | 'rejected' | 'other'`
- `adminRamco`: The admin's ID who made the change (optional, extracted from auth context)

**Emitted Events:**
- `mtn:request-updated` - Notification of status change
- `mtn:badge-count` - Updated counter (type: 'request-updated')

**Response Payload:**
```javascript
{
  requestId: 12345,
  action: "verified",
  updatedBy: "000500",
  timestamp: "2025-12-04T10:35:00.000Z",
  message: "Maintenance request verified"
}
```

### `broadcastBadgeCount()`

Utility to manually broadcast current badge count (rarely needed, use sparingly).

```typescript
// Useful for periodic updates or recovery scenarios
await notificationService.broadcastBadgeCount();
```

## Frontend Integration

### Listen for Badge Updates

```typescript
// Connect to Socket.IO
const socket = io('http://localhost:3030', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Listen for new requests
socket.on('mtn:new-request', (data) => {
  console.log('New request:', data);
  playNotificationSound();
});

// Listen for badge count updates
socket.on('mtn:badge-count', (data) => {
  console.log('Badge count updated:', data.count);
  updateBadgeDisplay(data.count);
  
  if (data.type === 'new-request') {
    // Badge increased
    showNotificationToast(`New maintenance request received!`);
  } else if (data.type === 'request-updated') {
    // Badge may have decreased
    console.log(`Request ${data.action}: ${data.action}`);
  }
});

// Listen for request updates
socket.on('mtn:request-updated', (data) => {
  console.log(`Request ${data.requestId} ${data.action}`, data);
});
```

### Polling Fallback (if Socket.IO fails)

```typescript
// Fallback to REST polling if Socket.IO disconnects
setInterval(async () => {
  try {
    const response = await fetch('/api/mtn/bills/unseen-count', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    updateBadgeDisplay(data.data.count);
  } catch (error) {
    console.error('Polling failed:', error);
  }
}, 60000); // Poll every 60 seconds
```

## Database Query

The badge count is determined by:

```sql
SELECT COUNT(*) FROM applications.vehicle_svc
WHERE 
  form_upload IS NOT NULL            -- Form has been uploaded
  AND inv_stat IS NULL               -- Invoice not yet generated/processed
  AND (
    verification_stat IS NULL        -- Awaiting verification
    OR verification_stat = 0
    OR (
      verification_stat = 1          -- Verified, now awaiting recommendation
      AND recommendation_stat IS NULL
    )
    OR (
      verification_stat = 1          -- Verified & recommended, awaiting approval
      AND recommendation_stat = 1
      AND approval_stat IS NULL
    )
  )
```

This counts requests in "pending response" states only.

## Key Implementation Details

### Error Handling

All notification calls are wrapped in try-catch blocks to prevent failures from crashing request lifecycle:

```typescript
try {
  await notificationService.notifyNewMtnRequest(createdId, ramco_id);
} catch (notifErr) {
  console.error('Failed to emit notification', notifErr);
  // Continue - request still succeeds even if socket emit fails
}
```

### Async Safety

Notifications are fire-and-forget (using `await` but not blocking response):

```typescript
// Emit notification asynchronously but don't wait for it to complete
notificationService.notifyNewMtnRequest(createdId, ramco_id)
  .catch(err => console.error('Notification error:', err));

// Return response immediately
res.status(201).json({ status: 'success', ... });
```

### Socket.IO Instance Check

Service validates Socket.IO is initialized before attempting emission:

```typescript
const io = getSocketIOInstance();
if (!io) {
  console.warn('Socket.IO not initialized');
  return; // Graceful degradation
}
```

## Testing

### Test New Request Notification

```bash
curl -X POST 'http://localhost:3030/api/mtn/request' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "req_date": "2025-12-04",
    "ramco_id": "000317",
    "asset_id": 115,
    "costcenter_id": 1,
    "location_id": 1,
    "ctc_m": "0100000000",
    "svc_opt": "1,2,3",
    "req_comment": "Test notification"
  }'
```

Listen for events on frontend console:
```javascript
socket.on('mtn:new-request', data => console.log('New:', data));
socket.on('mtn:badge-count', data => console.log('Badge:', data));
```

### Test Admin Update Notification

```bash
curl -X PUT 'http://localhost:3030/api/mtn/request/12345/admin' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <admin_token>' \
  -d '{
    "verification_stat": 1,
    "ws_id": 5,
    "major_opt": "1,2",
    "major_svc_comment": "Approved for major service"
  }'
```

Verify badge count decrements:
```javascript
socket.on('mtn:badge-count', data => {
  console.log('Updated count:', data.count);
});
```

### Manual Badge Count Check

```bash
# Get current badge count via REST (polling fallback)
curl 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer <token>'

# Response:
# {
#   "status": "success",
#   "message": "Unseen bills count retrieved successfully",
#   "data": { "count": 3 }
# }
```

## Files Modified

1. **Created: `src/utils/notificationService.ts`**
   - New helper with three main functions
   - Centralized Socket.IO event logic
   - Safe error handling

2. **Modified: `src/p.maintenance/maintenanceController.ts`**
   - Import notificationService
   - Call `notifyNewMtnRequest()` after successful creation
   - Call `notifyMtnRequestUpdate()` after admin update

3. **Existing: `src/p.maintenance/maintenanceRoutes.ts`**
   - Already has `GET /api/mtn/bills/unseen-count` for polling fallback

4. **Existing: `src/utils/socketIoInstance.ts`**
   - Already initialized in server.ts

## Benefits of This Approach

| Aspect | Benefit |
|--------|---------|
| **Reusability** | Both controllers use same notification logic |
| **Maintainability** | Single source of truth for notification patterns |
| **Testability** | Notification logic separated from HTTP logic |
| **Consistency** | All badges emit same event structure |
| **Reliability** | Error handling prevents cascade failures |
| **Flexibility** | Easy to add new notification types in future |

## Future Enhancements

1. **User-scoped notifications** - Emit only to specific admin's socket connection
2. **Notification history** - Store in database for audit trail
3. **Email notifications** - Combine Socket.IO with email for persistent alerts
4. **Notification preferences** - Admin can configure which events to receive
5. **Batch updates** - When multiple requests are processed, emit single count update
