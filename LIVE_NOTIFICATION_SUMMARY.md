# Live Notification Badge - Quick Summary

## What Was Implemented

✅ **Centralized Notification Service** (`src/utils/notificationService.ts`)
- `notifyNewMtnRequest()` - Triggered when user submits request
- `notifyMtnRequestUpdate()` - Triggered when admin responds  
- `broadcastBadgeCount()` - Manual badge refresh utility

✅ **Controller Integration**
- `createVehicleMtnRequest()` - Emits badge count increase
- `adminUpdateVehicleMtnRequest()` - Emits badge count decrease

✅ **Socket.IO Events Emitted**
- `mtn:new-request` - New application submitted
- `mtn:request-updated` - Admin responded to application
- `mtn:badge-count` - Current pending count (fired with both above events)

## How It Works

### User Flow
1. User submits maintenance request via `POST /api/mtn/request`
2. Request inserted in database
3. `notifyNewMtnRequest()` emits Socket.IO events
4. Frontend receives `mtn:badge-count` event
5. Badge counter increments in real-time

### Admin Flow
1. Admin updates request via `PUT /api/mtn/request/:id/admin`
2. Request status updated to "verified" or "rejected"
3. `notifyMtnRequestUpdate()` emits Socket.IO events
4. Frontend receives `mtn:badge-count` event  
5. Badge counter decrements in real-time

## Frontend Usage

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3030');

// Listen for badge updates
socket.on('mtn:badge-count', (data) => {
  console.log('Pending requests:', data.count);
  // Update your badge UI here
  document.querySelector('.badge').textContent = data.count;
});

// Listen for specific notifications
socket.on('mtn:new-request', (data) => {
  console.log('New request:', data);
  // Show toast/notification
});

socket.on('mtn:request-updated', (data) => {
  console.log('Request updated:', data.action);
  // Show confirmation notification
});
```

## Fallback: REST Polling

If Socket.IO fails, use REST polling endpoint:

```bash
GET /api/mtn/bills/unseen-count
# Returns: { status: 'success', data: { count: 5 } }
```

## Key Features

| Feature | Details |
|---------|---------|
| **Automatic** | No manual trigger needed, fires on creation/update |
| **Real-time** | Socket.IO broadcast to all connected admins |
| **Safe** | Try-catch blocks prevent crashes |
| **Reliable** | Continues even if Socket.IO not available |
| **Scoped** | Counts only pending requests awaiting admin action |
| **Fallback** | REST endpoint for polling-based frontends |

## Do I Need Helpers/Utils?

**YES** - And here's why:

| Reason | Benefit |
|--------|---------|
| **DRY Principle** | Same notification logic used in 2+ places |
| **Separation of Concerns** | Controllers focus on HTTP, notifications separate |
| **Consistency** | Single event format across all notifications |
| **Testing** | Can unit test notification logic independently |
| **Maintenance** | Change one place = updates everywhere |
| **Scalability** | Easy to add new notification types later |

## Files Changed

```
✨ CREATED:
  src/utils/notificationService.ts
  NOTIFICATION_SERVICE.md (detailed docs)
  LIVE_NOTIFICATION_SUMMARY.md (this file)

📝 MODIFIED:
  src/p.maintenance/maintenanceController.ts
    - Added import of notificationService
    - Added notifyNewMtnRequest() call in createVehicleMtnRequest
    - Added notifyMtnRequestUpdate() call in adminUpdateVehicleMtnRequest

✅ ALREADY EXISTS (no changes):
  src/p.maintenance/maintenanceModel.ts
    - getUnseenBillsCount() query
  src/p.maintenance/maintenanceRoutes.ts
    - GET /api/mtn/bills/unseen-count endpoint
  src/utils/socketIoInstance.ts
    - Socket.IO instance holder
```

## Testing

### 1. Create Request (Badge Increases)
```bash
curl -X POST 'http://localhost:3030/api/mtn/request' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{ "ramco_id": "000317", "asset_id": 115, "svc_opt": "1,2" }'
```
Watch Socket.IO events in frontend console ✅

### 2. Admin Updates Request (Badge Decreases)
```bash
curl -X PUT 'http://localhost:3030/api/mtn/request/12345/admin' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <admin_token>' \
  -d '{ "verification_stat": 1, "ws_id": 5 }'
```
Watch badge count decrease in real-time ✅

### 3. Check via REST (Fallback)
```bash
curl 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer <token>'
```
Should return current pending count ✅

## Next Steps

1. **Frontend Setup** - Add Socket.IO listeners to your badge component
2. **Testing** - Create/update requests and verify badge updates
3. **Monitoring** - Check server logs for `notifyXxx` messages
4. **Deployment** - Deploy code to staging/production
