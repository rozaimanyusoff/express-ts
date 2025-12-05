# Implementation Summary: Maintenance Billing Badge Backend

## What Was Implemented

### ✅ 1. Unseen Bills Count Query
- **File:** `src/p.maintenance/maintenanceModel.ts`
- **Function:** `getUnseenBillsCount(ramcoId?: number)`
- **Logic:** Returns count of maintenance requests with `form_upload` but no finalized invoice (`inv_stat` not in 'processed', 'invoiced', 'paid')
- **Scoping:** Optional filter by user (ramcoId)

### ✅ 2. REST API Endpoint
- **Route:** `GET /api/mtn/bills/unseen-count`
- **File:** `src/p.maintenance/maintenanceRoutes.ts` + `maintenanceController.ts`
- **Auth:** Required (tokenValidator middleware)
- **Response:** `{ status, message, data: { count } }`
- **Purpose:** Badge polls this every 60s if Socket.IO unavailable

### ✅ 3. Socket.IO Instance Management
- **File:** `src/utils/socketIoInstance.ts`
- **Exports:** `setSocketIOInstance()` and `getSocketIOInstance()`
- **Purpose:** Makes Socket.IO available to all controllers
- **Initialization:** Called in `src/server.ts` after io setup

### ✅ 4. Form Upload with Socket Events
- **Endpoint:** `PUT /api/mtn/request/:id/form-upload`
- **File:** `src/p.maintenance/maintenanceController.ts` - `uploadVehicleMtnForm()`
- **Emits:**
  - `mtn:form-uploaded` → `{ requestId, assetId, uploadedBy, uploadedAt }`
  - `mtn:counts` → `{ maintenanceBilling, unseenBills }`

### ✅ 5. Billing Status Update Events
- **Endpoint:** `PUT /api/bills/mtn/:id`
- **File:** `src/p.billing/billingController.ts` - `updateVehicleMtnBilling()`
- **Trigger:** When `inv_stat` changes to 'processed', 'invoiced', or 'paid'
- **Emits:** `mtn:counts` → updated unseenBills count

### ✅ 6. Server Integration
- **File:** `src/server.ts`
- **Changes:**
  - Import `setSocketIOInstance` from socketIoInstance utility
  - Call `setSocketIOInstance(io)` after io setup
  - Socket.IO becomes globally accessible to controllers

---

## Files Modified/Created

| File | Changes | Lines |
|------|---------|-------|
| `src/utils/socketIoInstance.ts` | **NEW** - Socket instance holder | 27 |
| `src/p.maintenance/maintenanceModel.ts` | Added `getUnseenBillsCount()` | +40 |
| `src/p.maintenance/maintenanceController.ts` | Added `getUnseenBillsCount()` endpoint, updated `uploadVehicleMtnForm()` with Socket events | +70 |
| `src/p.maintenance/maintenanceRoutes.ts` | Added route for `bills/unseen-count` | +1 |
| `src/p.billing/billingController.ts` | Added Socket import, updated `updateVehicleMtnBilling()` with event emit | +20 |
| `src/server.ts` | Added Socket instance initialization | +2 |
| `MAINTENANCE_BADGE_INTEGRATION.md` | **NEW** - Comprehensive documentation | 500+ |

---

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  ┌──────────────┐              ┌──────────────┐          │
│  │ Badge Badge  │              │  Socket.IO   │          │
│  │   (count=5)  │◄─────────────│  Listener    │          │
│  └──────────────┘              └──────────────┘          │
│                                       ▲                   │
│  Fallback: Poll /api/mtn/bills/      │                   │
│  unseen-count every 60s (if socket   │                   │
│  disconnected)                        │                   │
└────────────────────────────────────────┼──────────────────┘
                                          │
                            ┌─────────────┴─────────────┐
                            │                           │
                    Socket.IO Events              REST API
                    ┌────────────────┐           ┌─────────────┐
                    │                │           │             │
                    ▼                │           ▼             │
        ┌───────────────────────┐    │   ┌───────────────────┐│
        │ BACKEND SERVER        │    │   │  GET /api/mtn/   ││
        │                       │    │   │ bills/unseen-    ││
        │ uploadVehicleMtnForm()├────┤   │ count             ││
        │  ├─ Save file         │    │   └───────────────────┘│
        │  ├─ emit             │    │   Returns: { count: N }
        │  │ 'mtn:form-uploaded'│    │
        │  └─ emit              │    │
        │    'mtn:counts'       │────┘
        │                       │
        │ updateVehicleMtnBilling()
        │  └─ If inv_stat =     │
        │    'processed' then   │
        │    emit 'mtn:counts'  │
        │                       │
        │ Database Query        │
        │ getUnseenBillsCount() │
        │                       │
        └───────────────────────┘
```

---

## Query Logic

### Unseen Bills = Form uploaded + No finalized invoice

```sql
SELECT COUNT(DISTINCT vs.req_id) as count
FROM applications.vehicle_svc vs
LEFT JOIN billings.tbl_inv inv 
    ON vs.req_id = inv.svc_order
WHERE vs.form_upload IS NOT NULL AND vs.form_upload != ''
  AND (inv.inv_id IS NULL 
       OR inv.inv_stat NOT IN ('processed', 'invoiced', 'paid'))
```

**Criteria:**
- ✓ Has form uploaded
- ✓ No linked invoice OR invoice not finalized
- ✓ Scoped to current user (optional)

---

## Socket.IO Event Details

### Event 1: `mtn:form-uploaded`
```typescript
{
  requestId: 123,
  assetId: 456,
  uploadedBy: "user_id_123",
  uploadedAt: "2025-12-03T10:30:00Z"
}
```
**When:** Form upload completes successfully
**Use:** Track who uploaded what vehicle's form

### Event 2: `mtn:counts`
```typescript
{
  maintenanceBilling: 42,
  unseenBills: 5
}
```
**When:** Form uploaded OR billing status changed
**Use:** Update badge count in real-time

---

## Authentication & Scoping

### User Context
- Extracted from `req.user.userId` or `req.userId`
- Set by `tokenValidator` middleware
- Falls back to 'unknown' if missing

### Count Query Scoping
```typescript
// With user context
const count = await getUnseenBillsCount(userId);

// Query adds: WHERE vs.ramco_id = userId
```

### Authorization
- Badge endpoint protected by `tokenValidator`
- Each user sees only their own counts
- No cross-tenant data leakage

---

## Error Handling

| Error | Behavior | Response |
|-------|----------|----------|
| User not authenticated | Return 401 | `{ status: 'error', data: { count: 0 } }` |
| Query fails | Return 500 | `{ status: 'error', data: { count: 0 } }` |
| Socket.IO not available | Don't fail request | Log warning, frontend polls |
| Socket emit fails | Don't fail request | Log warning, continue |

---

## Performance

### Query Performance
- O(1) count query with proper indexes
- Lightweight LEFT JOIN
- Optional user filter reduces scan

### Recommended Indexes
```sql
CREATE INDEX idx_vehicle_svc_form_upload 
  ON applications.vehicle_svc(form_upload, ramco_id);

CREATE INDEX idx_tbl_inv_svc_order 
  ON billings.tbl_inv(svc_order, inv_stat);
```

### Polling Strategy
- Frontend polls every 60s if Socket.IO unavailable
- Per-user counts (not global)
- Can be cached with 5-30s TTL

---

## Testing Checklist

```bash
# 1. Type check
npm run type-check

# 2. Test endpoint
curl -X GET 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer TOKEN'

# 3. Upload form (watch for Socket.IO events in logs)
curl -X PUT 'http://localhost:3030/api/mtn/request/123/form-upload' \
  -H 'Authorization: Bearer TOKEN' \
  -F 'form_upload=@test.pdf'

# 4. Update billing status
curl -X PUT 'http://localhost:3030/api/bills/mtn/456' \
  -H 'Authorization: Bearer TOKEN' \
  -d '{"inv_stat":"processed"}'

# 5. Frontend receives events
# Check browser console for mtn:form-uploaded and mtn:counts

# 6. Test polling fallback
# Stop Socket.IO, wait 60s, verify count still updates
```

---

## Frontend Integration (Quick Start)

### 1. Install socket.io-client
```bash
npm install socket.io-client
```

### 2. Create Hook
```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useMtnBadgeCount = () => {
  const [count, setCount] = useState(0);
  const socket = io(process.env.REACT_APP_API_URL, {
    auth: { token: localStorage.getItem('auth_token') }
  });

  useEffect(() => {
    socket.on('mtn:counts', (data) => setCount(data.unseenBills));
    socket.on('mtn:form-uploaded', fetchCount);
    
    const pollInterval = setInterval(fetchCount, 60000);
    
    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [socket]);

  const fetchCount = async () => {
    const res = await fetch('/api/mtn/bills/unseen-count', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    setCount(data.data?.count ?? 0);
  };

  return count;
};
```

### 3. Use in Component
```tsx
import { useMtnBadgeCount } from './hooks/useMtnBadgeCount';

export const Header = () => {
  const badgeCount = useMtnBadgeCount();
  
  return (
    <header>
      <h1>Dashboard</h1>
      {badgeCount > 0 && (
        <span className="badge" title="Maintenance forms awaiting billing">
          {badgeCount}
        </span>
      )}
    </header>
  );
};
```

---

## Deployment Notes

### Pre-deployment
- [ ] Run `npm run type-check` - should pass with 0 errors
- [ ] Verify Socket.IO port (default 3000, configurable via env)
- [ ] Ensure database indexes exist
- [ ] Test with sample data

### Post-deployment
- [ ] Monitor error logs: `pm2 logs express-ts | grep -i error`
- [ ] Check Socket connections: `pm2 logs express-ts | grep "Socket"`
- [ ] Verify counts endpoint: `curl http://localhost:3030/api/mtn/bills/unseen-count`
- [ ] Test Socket.IO with frontend

### Rollback
```bash
# If issues, rollback to previous version
git revert HEAD
npm run build
pm2 restart express-ts
```

---

## Next Steps

1. **Frontend Integration** - Implement useMtnBadgeCount hook
2. **Testing** - Run full test suite
3. **Monitoring** - Set up alerts for Socket.IO disconnections
4. **Documentation** - Share MAINTENANCE_BADGE_INTEGRATION.md with team
5. **Cache Layer** (Optional) - Add Redis for frequently queried counts

---

## Questions?

Refer to:
- `MAINTENANCE_BADGE_INTEGRATION.md` - Full documentation
- `src/p.maintenance/maintenanceModel.ts` - Query logic
- `src/p.maintenance/maintenanceController.ts` - Endpoint implementation
- `src/utils/socketIoInstance.ts` - Socket.IO setup
