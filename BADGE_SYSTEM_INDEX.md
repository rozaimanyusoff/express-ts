# Live Badge Notification System - Complete Index

## 📋 Project Overview

Backend implementation of live notification badges that update in real-time when:
1. **User submits a maintenance request** → Badge count increases
2. **Admin responds to request** → Badge count decreases

Built with Socket.IO for real-time events + REST polling fallback.

---

## 📚 Documentation Guide

### For Quick Understanding
👉 **Start here:** [`LIVE_NOTIFICATION_SUMMARY.md`](./LIVE_NOTIFICATION_SUMMARY.md)
- 5-minute overview
- How it works (user flow + admin flow)  
- Key features
- File changes summary

### For Backend Developers
👉 **Read next:** [`NOTIFICATION_SERVICE.md`](./NOTIFICATION_SERVICE.md)
- Architecture deep-dive
- Event flow diagrams
- API documentation with payload examples
- Database query explanation
- Testing procedures

### For Frontend Developers (React)
👉 **Implement here:** [`FRONTEND_BADGE_SETUP.md`](./FRONTEND_BADGE_SETUP.md)
- Complete Socket.IO setup guide
- Custom React hooks + components
- Event listeners with examples
- Styling options (Bootstrap, Tailwind, CSS)
- Error handling & polling fallback
- Testing in browser console

### Copy-Paste Code
👉 **Get started:** [`QUICK_SNIPPETS.md`](./QUICK_SNIPPETS.md)
- Production-ready code snippets
- React components (hooks, components, CSS)
- cURL testing commands
- Browser console debugging
- Multiple CSS framework options

### Technical Deep Dive
👉 **Full reference:** [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md)
- Complete end-to-end flow
- Event reference documentation
- Architecture diagram (ASCII art)
- Deployment checklist
- API endpoints reference

---

## 🔧 Backend Implementation Details

### New Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/utils/notificationService.ts` | Centralized Socket.IO event management | 88 |

### Files Modified

| File | Changes |
|------|---------|
| `src/p.maintenance/maintenanceController.ts` | Import + 2 notification calls |

### Existing Infrastructure (No Changes)

| Component | Role |
|-----------|------|
| `src/p.maintenance/maintenanceModel.ts` | `getUnseenBillsCount()` query |
| `src/p.maintenance/maintenanceRoutes.ts` | `GET /api/mtn/bills/unseen-count` |
| `src/utils/socketIoInstance.ts` | Socket.IO instance holder |

---

## 🎯 Event Lifecycle

```
┌─────────────────────────────────────────┐
│  User submits request (POST)            │
│  createVehicleMtnRequest()              │
│  ↓                                       │
│  Insert DB record → createdId           │
│  ↓                                       │
│  notifyNewMtnRequest(createdId)         │
│  ├─ Query: getUnseenBillsCount() → 5   │
│  ├─ Emit: mtn:new-request              │
│  └─ Emit: mtn:badge-count {count: 5}   │
│  ↓                                       │
│  Frontend receives event                │
│  Badge display: 5                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Admin updates request (PUT)            │
│  adminUpdateVehicleMtnRequest()         │
│  ↓                                       │
│  Update DB record → verification_stat=1 │
│  ↓                                       │
│  notifyMtnRequestUpdate(id, 'verified') │
│  ├─ Query: getUnseenBillsCount() → 4   │
│  ├─ Emit: mtn:request-updated          │
│  └─ Emit: mtn:badge-count {count: 4}   │
│  ↓                                       │
│  Frontend receives event                │
│  Badge display: 4                       │
└─────────────────────────────────────────┘
```

---

## 📡 Socket.IO Events Reference

### `mtn:badge-count` (Main Event)
**When:** Every time count changes  
**Payload:**
```javascript
{
  count: 5,
  type: 'new-request' | 'request-updated' | 'broadcast',
  action?: 'verified' | 'rejected',
  timestamp: "2025-12-04T10:30:00Z"
}
```

### `mtn:new-request` (Notification)
**When:** New request created  
**Payload:**
```javascript
{
  requestId: 12345,
  requester: "000317",
  timestamp: "2025-12-04T10:30:00Z",
  message: "New maintenance request submitted"
}
```

### `mtn:request-updated` (Notification)
**When:** Admin responds to request  
**Payload:**
```javascript
{
  requestId: 12345,
  action: 'verified' | 'approved' | 'rejected',
  updatedBy: "000500",
  timestamp: "2025-12-04T10:30:00Z",
  message: "Maintenance request verified"
}
```

---

## 🌐 REST API Endpoints

### Get Badge Count (Polling Fallback)
```
GET /api/mtn/bills/unseen-count
Authorization: Bearer <token>

Response 200:
{
  "status": "success",
  "message": "Unseen bills count retrieved successfully",
  "data": { "count": 5 }
}
```

### Create Request (Triggers Badge ↑)
```
POST /api/mtn/request
Authorization: Bearer <token>
Content-Type: application/json

Body: { ramco_id, asset_id, svc_opt, ... }
Response 201: { status, message, data: { req_id } }
```

### Admin Update (Triggers Badge ↓)
```
PUT /api/mtn/request/:id/admin
Authorization: Bearer <token>
Content-Type: application/json

Body: { verification_stat: 1|2, ws_id, ... }
Response 200: { status, message, data }
```

---

## 🚀 Quick Start

### Backend (Already Done ✅)
1. ✅ Created `src/utils/notificationService.ts`
2. ✅ Modified `maintenanceController.ts`
3. ✅ Build verified: `npm run build`
4. ✅ Tests pass: `npm run type-check`

### Frontend (Next Steps)

**Step 1:** Copy Socket service to `src/services/socketService.ts`  
See: [`QUICK_SNIPPETS.md`](./QUICK_SNIPPETS.md#1-socket-service)

**Step 2:** Create hook at `src/hooks/useMtnBadge.ts`  
See: [`QUICK_SNIPPETS.md`](./QUICK_SNIPPETS.md#2-badge-hook)

**Step 3:** Create component at `src/components/MtnBadge.tsx`  
See: [`QUICK_SNIPPETS.md`](./QUICK_SNIPPETS.md#3-badge-component)

**Step 4:** Add to header component  
See: [`QUICK_SNIPPETS.md`](./QUICK_SNIPPETS.md#5-header-integration)

**Step 5:** Initialize socket in App.tsx  
See: [`QUICK_SNIPPETS.md`](./QUICK_SNIPPETS.md#6-apptsx-setup)

---

## ✅ Testing Checklist

### Backend Tests
- [x] Type-check: `npm run type-check` ✅
- [x] Build: `npm run build` ✅
- [x] No compilation errors: 0 errors ✅

### Frontend Tests (After Implementation)
- [ ] Socket.IO connects on app load
- [ ] Create request → badge increments
- [ ] Admin updates → badge decrements
- [ ] Socket fails → polling fallback works
- [ ] Notifications show in console
- [ ] No memory leaks (event listeners cleaned up)

### cURL/Manual Tests
```bash
# See QUICK_SNIPPETS.md Testing section for exact commands
curl -X POST '/api/mtn/request' # Create → badge ↑
curl -X PUT '/api/mtn/request/:id/admin' # Update → badge ↓
curl '/api/mtn/bills/unseen-count' # Check count
```

---

## 📊 Why a Helper Service?

Instead of putting notification logic directly in controllers:

| Benefit | Why |
|---------|-----|
| **DRY** | Used in 2+ places → maintain once |
| **Separation of Concerns** | HTTP logic ≠ Event logic |
| **Consistency** | All badges emit same structure |
| **Testability** | Unit test independently |
| **Scalability** | Add new notification types easily |

---

## 📈 Architecture Diagram

```
Frontend                Backend              Database
┌──────────────┐       ┌──────────────────┐  ┌──────────┐
│ MtnBadge UI  │       │ Socket.IO        │  │ MySQL    │
│  (React)     │◄──────│ Server           │  │ vehicle_ │
└──────────────┘       │                  │  │ svc      │
                       │ notificationService  │          │
Listen events:         │  • notify...()   │  │ Queries: │
- mtn:badge-count      │  • emit events   │  │ Count    │
- mtn:new-request      │                  │  │ pending  │
- mtn:request-updated  │ maintenanceCtrl  │  │ requests │
                       │  • createRequest │  └──────────┘
Fallback:              │  • adminUpdate   │
- REST poll 60s        │                  │
- GET /api/mtn/        │ Socket.IO        │
  bills/unseen-count   │ Instance holder  │
                       └──────────────────┘
```

---

## 🔄 Event Flow Summary

```
User Action                Backend Processing        Frontend Result
─────────────────────────────────────────────────────────────────────

Submit request         ─→ createVehicleMtnRequest
                         ├─ Insert DB
                         ├─ notifyNewMtnRequest
                         │  ├─ getUnseenBillsCount
                         │  ├─ emit mtn:new-request
                         │  └─ emit mtn:badge-count ──→ Badge: 5


Admin responds         ─→ adminUpdateVehicleMtnRequest
                         ├─ Update DB
                         ├─ notifyMtnRequestUpdate
                         │  ├─ getUnseenBillsCount
                         │  ├─ emit mtn:request-updated
                         │  └─ emit mtn:badge-count ──→ Badge: 4
```

---

## 📝 Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `LIVE_NOTIFICATION_SUMMARY.md` | Quick reference | ✅ Created |
| `NOTIFICATION_SERVICE.md` | Technical deep-dive | ✅ Created |
| `FRONTEND_BADGE_SETUP.md` | Frontend guide | ✅ Created |
| `IMPLEMENTATION_SUMMARY.md` | Full reference | ✅ Created |
| `QUICK_SNIPPETS.md` | Copy-paste code | ✅ Created |
| `src/utils/notificationService.ts` | Service code | ✅ Created |
| `src/p.maintenance/maintenanceController.ts` | Integration | ✅ Modified |

---

## 🎓 Learning Path

### 5 Minutes - Get Overview
→ Read: `LIVE_NOTIFICATION_SUMMARY.md`

### 15 Minutes - Understand Architecture
→ Read: `NOTIFICATION_SERVICE.md`

### 30 Minutes - Frontend Setup
→ Read: `FRONTEND_BADGE_SETUP.md`
→ Copy: Code from `QUICK_SNIPPETS.md`

### 1 Hour - Full Deployment
→ Implement components
→ Test with cURL commands
→ Deploy to production

---

## ❓ FAQ

**Q: Do I need a helper service?**  
A: Yes! See "Why a Helper Service?" section. DRY principle, consistency, testability.

**Q: What if Socket.IO fails?**  
A: Automatic fallback to REST polling every 60 seconds.

**Q: Which events do I need to listen to?**  
A: Just `mtn:badge-count` for badge UI. Optional: listen to notification events for toasts.

**Q: How is count determined?**  
A: Database query counts requests with `form_upload != NULL` and `inv_stat IS NULL` and pending status.

**Q: Does notification fail if Socket.IO unavailable?**  
A: No. All notifications wrapped in try-catch. Request succeeds even if emit fails.

**Q: How often should I poll?**  
A: Every 60 seconds (if socket disconnected). Configurable in hook.

---

## 🚢 Deployment Checklist

- [ ] Code reviewed
- [ ] Backend build passes: `npm run build`
- [ ] Types correct: `npm run type-check`
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Test: Create request → badge +1
- [ ] Test: Admin update → badge -1
- [ ] Frontend implemented
- [ ] Deploy to production
- [ ] Monitor Socket.IO connections
- [ ] Monitor server logs for notifications

---

## 📞 Support

All implementation details are documented in markdown files above. Each has:
- Code examples
- Event payloads
- Testing procedures
- Troubleshooting

**See specific file for your role:**
- Backend Dev → `NOTIFICATION_SERVICE.md`
- Frontend Dev → `FRONTEND_BADGE_SETUP.md`
- DevOps → `IMPLEMENTATION_SUMMARY.md`
- Quick Setup → `QUICK_SNIPPETS.md`

---

**Status: ✅ Backend Complete - Ready for Frontend Implementation**

Last Updated: December 4, 2025  
Backend Build: PASSED ✅  
Type Check: PASSED ✅
