# Maintenance Billing Badge Indicator - Backend Integration Guide

## Overview

This document describes the backend implementation for the maintenance billing badge indicator feature. The badge shows users real-time updates of unprocessed maintenance forms awaiting billing.

## Architecture

### Components

1. **Database Model** (`src/p.maintenance/maintenanceModel.ts`)
   - `getUnseenBillsCount()` - Query for unseen/unprocessed bills

2. **Controllers**
   - `src/p.maintenance/maintenanceController.ts` - Endpoint for unseen count & form upload with Socket.IO
   - `src/p.billing/billingController.ts` - Emit events on billing status changes

3. **Routes** (`src/p.maintenance/maintenanceRoutes.ts`)
   - GET endpoint for badge count

4. **Socket.IO Integration** (`src/utils/socketIoInstance.ts`)
   - Global instance for emitting events from controllers

5. **Server Integration** (`src/server.ts`)
   - Initialize Socket.IO instance on startup

## API Endpoints

### 1. Get Unseen Bills Count (Badge Endpoint)

**Endpoint:** `GET /api/mtn/bills/unseen-count`

**Authentication:** Required (tokenValidator middleware)

**Purpose:** Returns count of new/unprocessed maintenance form uploads awaiting billing

**Request:**
```bash
curl -X GET 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
  "status": "success",
  "message": "Unseen bills count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

**Response Shapes Supported (Frontend Flexible):**
- `data.count` (primary)
- `count` (top-level fallback)
- `unseen` (fallback)

**Scoping:** Automatically scoped to current user (ramco_id from auth context)

**Use Case:** Frontend badges poll this endpoint every 60s if Socket.IO is unavailable

---

### 2. Upload Maintenance Form

**Endpoint:** `PUT /api/mtn/request/:id/form-upload`

**Authentication:** Required

**Purpose:** Upload maintenance form and trigger badge updates via Socket.IO

**Request:**
```bash
curl -X PUT 'http://localhost:3030/api/mtn/request/123/form-upload' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'form_upload=@maintenance_form.pdf' \
  -F 'form_upload_date=2025-12-03 10:30:00'
```

**Response:**
```json
{
  "status": "success",
  "message": "Maintenance form uploaded successfully",
  "data": { ... }
}
```

**Socket.IO Events Emitted:**
```javascript
// Event 1: Form uploaded notification
io.emit('mtn:form-uploaded', {
  requestId: 123,
  assetId: 456,
  uploadedBy: "userid123",
  uploadedAt: "2025-12-03T10:30:00Z"
});

// Event 2: Updated counts
io.emit('mtn:counts', {
  maintenanceBilling: 42,
  unseenBills: 5
});
```

---

### 3. Update Billing Status

**Endpoint:** `PUT /api/bills/mtn/:id`

**Authentication:** Required

**Purpose:** Update maintenance billing status (e.g., mark as processed/invoiced)

**Request Body:**
```json
{
  "inv_stat": "processed",
  "inv_remarks": "Invoice created",
  ...
}
```

**Socket.IO Events Emitted (on status change to processed/invoiced/paid):**
```javascript
io.emit('mtn:counts', {
  maintenanceBilling: 42,
  unseenBills: 3  // Decreased by 1
});
```

---

## Socket.IO Events

### Emit Events (Backend → Frontend)

#### 1. `mtn:form-uploaded`
Emitted when a maintenance form is successfully uploaded

**Payload:**
```typescript
{
  requestId: number;      // ID of the maintenance request
  assetId: number | null; // Associated vehicle/asset ID
  uploadedBy: string;     // User ID who uploaded
  uploadedAt: string;     // ISO timestamp
}
```

**Use Case:** Frontend can update UI in real-time without polling

---

#### 2. `mtn:counts`
Emitted when maintenance/billing counts change

**Payload:**
```typescript
{
  maintenanceBilling: number;  // Total maintenance billing records
  unseenBills: number;         // Count of unprocessed forms awaiting billing
}
```

**Trigger Events:**
- Form upload completes
- Billing status changes to processed/invoiced/paid

**Use Case:** Update badge counters in real-time

---

## Query Logic

### Unseen Bills Count Definition

```sql
SELECT COUNT(DISTINCT vs.req_id) as count
FROM applications.vehicle_svc vs
LEFT JOIN billings.tbl_inv inv 
    ON vs.req_id = inv.svc_order OR vs.req_id = CAST(inv.svc_order AS UNSIGNED)
WHERE vs.form_upload IS NOT NULL
AND vs.form_upload != ''
AND (inv.inv_id IS NULL 
     OR inv.inv_stat IS NULL 
     OR inv.inv_stat NOT IN ('processed', 'invoiced', 'paid'))
```

**Criteria:**
- Maintenance request has a form uploaded (`form_upload NOT NULL`)
- No linked invoice exists OR invoice status is not finalized
- Scoped to current user (optional, by `ramco_id`)

---

## Frontend Integration

### Hook Implementation Example

```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useMtnBadgeCount = () => {
  const [count, setCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Try to connect to Socket.IO
    const newSocket = io(process.env.REACT_APP_API_URL, {
      auth: { token: getAuthToken() }
    });

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO');
      setIsConnected(true);
    });

    newSocket.on('mtn:form-uploaded', (data) => {
      console.log('Form uploaded:', data);
      // Refresh count
      fetchCount();
    });

    newSocket.on('mtn:counts', (data) => {
      setCount(data.unseenBills);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
      setIsConnected(false);
      // Start polling fallback
      startPolling();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Polling fallback (every 60s if socket disconnected)
  const startPolling = () => {
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  };

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/mtn/bills/unseen-count', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      const unseenCount = data.data?.count ?? data.count ?? data.unseen ?? 0;
      setCount(unseenCount);
    } catch (err) {
      console.error('Failed to fetch unseen count:', err);
    }
  };

  return { count, isConnected, fetchCount };
};
```

### Badge Component

```tsx
import { useMtnBadgeCount } from './useMtnBadgeCount';

export const MaintenanceBadge = () => {
  const { count, isConnected } = useMtnBadgeCount();

  return (
    <div className="badge-container">
      <span className="badge-label">Maintenance Bills</span>
      <span className="badge-number">{count}</span>
      {!isConnected && (
        <span className="badge-status" title="Using polling fallback">
          📡
        </span>
      )}
    </div>
  );
};
```

---

## State Transitions

### Unseen Bill Lifecycle

```
1. UPLOADED (form_upload NOT NULL)
   ↓
   → Unseen Count: +1
   → Socket: 'mtn:form-uploaded', 'mtn:counts'

2. LINKED TO INVOICE (invoice created, inv_stat = pending)
   → No count change yet

3. MARKED PROCESSED (inv_stat = 'processed' | 'invoiced' | 'paid')
   ↓
   → Unseen Count: -1
   → Socket: 'mtn:counts'

4. FINAL STATE (record removed or archived)
   → Not counted
```

---

## Database Schema Assumptions

### Tables Used

**applications.vehicle_svc** (Maintenance Requests)
```sql
- req_id (PK)
- form_upload (file path)
- ramco_id (requester)
- asset_id (vehicle)
- verification_stat
- recommendation_stat
- approval_stat
```

**billings.tbl_inv** (Maintenance Invoices)
```sql
- inv_id (PK)
- svc_order (links to req_id)
- inv_stat ('processed', 'invoiced', 'paid', etc.)
```

### Query Uses Pool (pool, not pool2)

The unseen count query runs on the primary database pool (`pool`) for consistency with user authentication.

---

## Testing Steps

### Test 1: Badge Count Endpoint

```bash
# 1. Get current count
curl -X GET 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer TOKEN'

# Expected: { "status": "success", "data": { "count": N } }
```

### Test 2: Form Upload with Socket.IO

**Setup:**
1. Connect frontend socket listener to `mtn:form-uploaded` and `mtn:counts`
2. Open server logs to watch events

**Steps:**
```bash
# Upload a form
curl -X PUT 'http://localhost:3030/api/mtn/request/123/form-upload' \
  -H 'Authorization: Bearer TOKEN' \
  -F 'form_upload=@test.pdf'

# Expected server logs:
# - "mtn:form-uploaded event: { requestId: 123, ... }"
# - "mtn:counts event: { maintenanceBilling: X, unseenBills: Y }"

# Expected frontend:
# - Badge count updates in real-time
```

### Test 3: Mark Billing as Processed

```bash
# Update billing status
curl -X PUT 'http://localhost:3030/api/bills/mtn/456' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "inv_stat": "processed" }'

# Expected frontend:
# - Badge count decrements
```

### Test 4: Polling Fallback (Socket.IO Disconnected)

**Steps:**
1. Stop Socket.IO server or disconnect client
2. Wait 60+ seconds
3. Verify badge count updates via polling

```bash
# Manually trigger poll
curl -X GET 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer TOKEN'

# Should reflect current state
```

---

## Error Handling

### Graceful Failures

- **Socket.IO emit fails:** Logged as warning, doesn't fail the request
- **Count query fails:** Returns `{ status: 'error', data: { count: 0 } }`
- **User not authenticated:** Returns 401 with `{ count: 0 }`
- **Socket.IO instance not available:** Falls back to polling only

### Logging

All Socket.IO emit attempts are logged:
```
[WARN] Failed to emit Socket.IO events: ...
[WARN] Failed to emit mtn:counts event: ...
[INFO] Socket.IO instance not available for emitting events
```

---

## Performance Considerations

### Query Optimization

- Uses `COUNT(DISTINCT vs.req_id)` to avoid duplicates
- LEFT JOIN allows checking invoice status efficiently
- Optional `ramco_id` filter reduces result set early
- Indexed on: `form_upload`, `svc_order`, `inv_stat`

### Caching (Optional Future Enhancement)

```typescript
// With Redis caching (example)
const unseenCount = await cache.get(`mtn:unseen:${userId}`);
if (!unseenCount) {
  const count = await maintenanceModel.getUnseenBillsCount(userId);
  await cache.set(`mtn:unseen:${userId}`, count, 300); // 5 min TTL
}
```

**Cache Invalidation Triggers:**
- Form upload
- Billing status change
- Manual refresh

---

## Monitoring & Debugging

### Key Metrics to Track

1. **Socket.IO Connection Rate**
   ```bash
   pm2 logs express-ts | grep "Socket connected"
   ```

2. **Badge Update Latency**
   - Log timestamp on form upload
   - Log timestamp on socket emit
   - Measure delta

3. **Polling Fallback Usage**
   - Count 60s poll requests when socket disconnected

4. **Query Performance**
   ```bash
   # Log slow queries
   mysql -e "SET GLOBAL slow_query_log=1; SET GLOBAL long_query_time=2;"
   ```

### Debug Mode

Enable detailed logging:
```typescript
// In maintenanceController.ts
console.log('Socket.IO emit - mtn:form-uploaded:', eventPayload);
console.log('Socket.IO emit - mtn:counts:', countsPayload);
```

---

## Troubleshooting

### Badge shows 0 when should show count

**Check:**
1. User is authenticated with correct `userId`
2. Form uploads have non-null `form_upload` field
3. Related invoices have correct `inv_stat` values
4. Database connection is healthy

```sql
-- Debug query
SELECT vs.req_id, vs.form_upload, vs.ramco_id, inv.inv_stat
FROM applications.vehicle_svc vs
LEFT JOIN billings.tbl_inv inv ON vs.req_id = inv.svc_order
WHERE vs.form_upload IS NOT NULL
AND vs.ramco_id = 'YOUR_USERID'
LIMIT 10;
```

### Socket.IO events not received

**Check:**
1. Client socket connected: `socket.connected === true`
2. Server emitting: Check logs for `io.emit`
3. CORS settings allow Socket.IO namespace
4. Token validation passing (check socket auth middleware)

```bash
# Check server
pm2 logs express-ts | grep "mtn:" 

# Check socket status
curl http://localhost:3030/api/health | jq '.database'
```

### Counts not decrementing after mark processed

**Check:**
1. `inv_stat` was changed to exact string: 'processed', 'invoiced', or 'paid'
2. Query is case-sensitive on status values
3. Both badges receiving `mtn:counts` event

```sql
-- Verify status value
SELECT DISTINCT inv_stat FROM billings.tbl_inv;
```

---

## Deployment Checklist

- [ ] TypeScript compiles: `npm run type-check`
- [ ] Socket.IO instance exported from server.ts
- [ ] socketIoInstance.ts utility imported in controllers
- [ ] getUnseenBillsCount added to model
- [ ] GET /api/mtn/bills/unseen-count route added
- [ ] uploadVehicleMtnForm emits socket events
- [ ] updateVehicleMtnBilling emits socket events on status change
- [ ] Frontend listens to 'mtn:form-uploaded' and 'mtn:counts'
- [ ] Frontend has 60s polling fallback
- [ ] Badge count correctly reflects data
- [ ] Error cases don't crash server
- [ ] Logging in place for debugging

---

## Future Enhancements

1. **Per-user Socket.IO rooms** - Emit to specific user rooms instead of broadcast
2. **Redis caching** - Cache unseen counts with TTL
3. **WebSocket message compression** - For high-volume events
4. **Batch events** - Combine multiple uploads into single emit
5. **User preference storage** - Remember if badge was hidden
6. **Notification history** - Store which updates user saw
7. **Real-time analytics** - Track badge interaction metrics

---

## References

- Socket.IO Documentation: https://socket.io/docs/v4/
- Express Routing: https://expressjs.com/en/guide/routing.html
- MySQL Query Optimization: https://dev.mysql.com/doc/refman/8.0/en/optimization.html
