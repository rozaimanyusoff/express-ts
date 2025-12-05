# Backend Integration Checklist - Maintenance Billing Badge

## Completed ✅

### Core Implementation
- [x] **Socket.IO Instance Utility** (`src/utils/socketIoInstance.ts`)
  - Exports `setSocketIOInstance()` 
  - Exports `getSocketIOInstance()`
  - Properly typed with Socket.IO types

- [x] **Server Integration** (`src/server.ts`)
  - Imported `setSocketIOInstance` 
  - Called `setSocketIOInstance(io)` after io creation
  - Socket.IO instance available to all controllers

- [x] **Database Query** (`src/p.maintenance/maintenanceModel.ts`)
  - Added `getUnseenBillsCount(ramcoId?: number)`
  - Queries form_upload + invoice status
  - Supports optional user scoping
  - Uses `pool` (primary database)

- [x] **API Endpoint** (`src/p.maintenance/maintenanceController.ts`)
  - Added `getUnseenBillsCount()` controller
  - Extracts user from auth context
  - Returns `{ status, message, data: { count } }`
  - 401 error if not authenticated
  - 500 error with count=0 on query failure

- [x] **Route Registration** (`src/p.maintenance/maintenanceRoutes.ts`)
  - Registered `GET /api/mtn/bills/unseen-count`
  - Protected by `tokenValidator` middleware
  - Placed early in route definitions for proper ordering

- [x] **Form Upload Events** (`src/p.maintenance/maintenanceController.ts`)
  - Enhanced `uploadVehicleMtnForm()` function
  - Emits `mtn:form-uploaded` event
  - Emits `mtn:counts` event with updated counts
  - Handles Socket.IO unavailability gracefully
  - Doesn't fail request if socket emit fails

- [x] **Billing Status Events** (`src/p.billing/billingController.ts`)
  - Imported `getSocketIOInstance`
  - Enhanced `updateVehicleMtnBilling()` function
  - Detects status change to 'processed'/'invoiced'/'paid'
  - Emits `mtn:counts` event with updated counts
  - Handles Socket.IO unavailability gracefully

### Compilation & Build
- [x] **TypeScript Type Check** - Passes with 0 errors
- [x] **Build Process** - Completes successfully
- [x] **No Runtime Errors** - All imports resolve correctly

### Documentation
- [x] **MAINTENANCE_BADGE_INTEGRATION.md** - 500+ lines comprehensive guide
  - API endpoints documented
  - Socket.IO events documented
  - Query logic explained
  - Frontend integration examples
  - Testing procedures
  - Troubleshooting guide
  - Deployment checklist
  - Performance considerations

- [x] **BADGE_IMPLEMENTATION_SUMMARY.md** - Quick reference
  - Implementation overview
  - Files modified
  - Event flow diagram
  - Frontend quick start
  - Testing checklist
  - Deployment notes

---

## Ready for Frontend Integration ✅

### Frontend Can Now:

1. **Poll for badge count**
   ```javascript
   GET /api/mtn/bills/unseen-count
   Response: { data: { count: 5 } }
   ```
   - Every 60 seconds (fallback if no Socket.IO)
   - Only if user authenticated
   - Handles 401/500 gracefully

2. **Listen to real-time Socket.IO events**
   ```javascript
   socket.on('mtn:form-uploaded', (data) => { ... })
   socket.on('mtn:counts', (data) => { ... })
   ```
   - Get instant updates on form upload
   - Get instant updates on billing status change
   - Fall back to polling if socket disconnects

3. **Display badge correctly**
   - Show count of unseenBills
   - Update in real-time or every 60s
   - Show connection status indicator (optional)

---

## Endpoints Summary

| Method | Path | Auth | Response | Purpose |
|--------|------|------|----------|---------|
| GET | `/api/mtn/bills/unseen-count` | Yes | `{ data: { count } }` | Badge count |
| PUT | `/api/mtn/request/:id/form-upload` | Yes | Success/Error | Upload form + emit events |
| PUT | `/api/bills/mtn/:id` | Yes | Success/Error | Update billing + emit events |

---

## Socket.IO Events Emitted by Backend

| Event | Payload | When | For |
|-------|---------|------|-----|
| `mtn:form-uploaded` | `{ requestId, assetId, uploadedBy, uploadedAt }` | Form uploaded | Real-time UI update |
| `mtn:counts` | `{ maintenanceBilling, unseenBills }` | Form uploaded or billing status changed | Badge count update |

---

## Database Requirements

### Tables (Pre-existing)
- `applications.vehicle_svc` (maintenance requests)
- `billings.tbl_inv` (invoices)

### Recommended Indexes (Optional, for performance)
```sql
CREATE INDEX idx_vehicle_svc_form_upload 
  ON applications.vehicle_svc(form_upload, ramco_id);

CREATE INDEX idx_tbl_inv_svc_order 
  ON billings.tbl_inv(svc_order, inv_stat);
```

### Query Scoping
- Unseen counts filtered by `ramco_id` (requester)
- User ID extracted from JWT token
- No cross-user data leakage

---

## Environment Setup (No New Env Vars Required)

All Socket.IO configuration uses existing setup:
- Port: `process.env.SERVER_PORT` (or 3000)
- CORS: Already configured in `src/server.ts`
- JWT Secret: Uses existing `process.env.JWT_SECRET`

No new environment variables needed! ✅

---

## Integration Steps for Frontend Team

### 1. Install Dependencies
```bash
npm install socket.io-client
```

### 2. Create Hook (see BADGE_IMPLEMENTATION_SUMMARY.md)
```typescript
export const useMtnBadgeCount = () => { ... }
```

### 3. Use in Component
```tsx
const badgeCount = useMtnBadgeCount();
return <span className="badge">{badgeCount}</span>;
```

### 4. Test
- Poll endpoint works
- Socket events received
- Badge updates in real-time
- Polling fallback works (60s intervals)

---

## API Response Examples

### Success - Badge Count
```json
{
  "status": "success",
  "message": "Unseen bills count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

### Error - Not Authenticated
```json
{
  "status": "error",
  "message": "Unauthorized - user context required",
  "data": {
    "count": 0
  }
}
```

### Socket Event - Form Uploaded
```json
{
  "requestId": 123,
  "assetId": 456,
  "uploadedBy": "user_123",
  "uploadedAt": "2025-12-03T10:30:45Z"
}
```

### Socket Event - Counts Updated
```json
{
  "maintenanceBilling": 42,
  "unseenBills": 5
}
```

---

## Verification Checklist (Before Handoff)

### Backend Server
- [x] Starts without errors: `npm run dev`
- [x] Health check passes: `GET /api/health`
- [x] Type checks pass: `npm run type-check`
- [x] Builds successfully: `npm run build`

### Endpoints
- [x] `GET /api/mtn/bills/unseen-count` returns count
- [x] `PUT /api/mtn/request/:id/form-upload` accepts file
- [x] `PUT /api/bills/mtn/:id` accepts inv_stat

### Socket.IO
- [x] Server instance initialized
- [x] Events can be emitted
- [x] Instance accessible from controllers
- [x] Graceful handling if unavailable

### Logging
- [x] Socket events logged
- [x] Errors logged
- [x] Query performance visible in logs
- [x] Form uploads tracked

---

## Known Limitations & Future Enhancements

### Current Design
- Broadcasts counts to all connected clients (could be optimized to per-user rooms)
- Recalculates full counts on each event (could be cached)
- No event history/persistence
- No user preference storage

### Future Enhancements
1. **Per-user Socket.IO rooms** - Emit only to relevant users
2. **Redis caching** - Cache counts with TTL
3. **Event debouncing** - Batch multiple events
4. **Notification center** - Store event history
5. **Metrics dashboard** - Track badge interactions
6. **User preferences** - Remember hidden badges

---

## Support & Documentation

### For Frontend Team
- **Main Guide:** `MAINTENANCE_BADGE_INTEGRATION.md`
- **Quick Start:** `BADGE_IMPLEMENTATION_SUMMARY.md`
- **Examples:** See hook implementation in both docs

### For Backend Team
- **Code Locations:**
  - Socket utility: `src/utils/socketIoInstance.ts`
  - Maintenance model: `src/p.maintenance/maintenanceModel.ts`
  - Maintenance controller: `src/p.maintenance/maintenanceController.ts`
  - Billing controller: `src/p.billing/billingController.ts`
  - Server setup: `src/server.ts`

### For DevOps Team
- **Monitoring:** Check Socket.IO connections in logs
- **Scaling:** Each server instance gets its own io broadcast (consider load balancer)
- **Logging:** All events logged to PM2 logs
- **Health:** Endpoint `GET /api/health` includes database status

---

## Final Status

✅ **Backend Implementation Complete**
- All required endpoints implemented
- All Socket.IO events configured
- All error handling in place
- All documentation provided
- All TypeScript errors resolved
- Build successful
- Ready for frontend integration

**Next Step:** Frontend team implements hook and badge component
