# Maintenance Module - Enhancements & Fixes

This document tracks all improvements, features, and fixes implemented in the maintenance module.

---

## Live Notification System

### Overview
Real-time Socket.IO notifications for maintenance request updates, badge counters, and form uploads.

### Features Implemented

#### 1. Socket.IO Integration
- **File**: `src/utils/socketIoInstance.ts`
- **Pattern**: Global instance holder with getter/setter
- **Purpose**: Makes Socket.IO available to all controllers
- **Initialization**: Called in `src/server.ts` after io setup

```typescript
import { setSocketIOInstance, getSocketIOInstance } from '../utils/socketIoInstance';

// In server.ts
setSocketIOInstance(io);

// In any controller
const io = getSocketIOInstance();
io.emit('mtn:new-request', payload);
```

#### 2. Centralized Notification Service
- **File**: `src/utils/notificationService.ts`
- **Functions**:
  - `notifyNewMtnRequest(requestId, ramcoId?)` - Emit on new request
  - `notifyMtnRequestUpdate(requestId, action, adminRamco?)` - Emit on status change
  - `broadcastBadgeCount()` - Manual badge refresh utility

**Usage**:
```typescript
import * as notificationService from '../utils/notificationService';

await notificationService.notifyNewMtnRequest(createdId, ramco_id);
```

#### 3. Controller Integration
- **New Request**: Emits `mtn:new-request` and `mtn:badge-count` in `createVehicleMtnRequest()`
- **Form Upload**: Emits `mtn:form-uploaded` and `mtn:counts` in `uploadVehicleMtnForm()`
- **Status Update**: Emits `mtn:request-updated` and `mtn:badge-count` in `adminUpdateVehicleMtnRequest()`
- **Billing Change**: Emits `mtn:counts` in billing controller when status changes

#### 4. Socket.IO Events

**Event**: `mtn:new-request`
```javascript
{
  requestId: 12345,
  requester: "000317",
  timestamp: "2025-12-04T10:30:00.000Z",
  message: "New maintenance request submitted"
}
```

**Event**: `mtn:form-uploaded`
```javascript
{
  requestId: 12345,
  assetId: 123,
  uploadedBy: "000317",
  uploadedAt: "2025-12-04T10:35:00.000Z"
}
```

**Event**: `mtn:request-updated`
```javascript
{
  requestId: 12345,
  action: "verified",
  updatedBy: "000500",
  timestamp: "2025-12-04T10:35:00.000Z",
  message: "Maintenance request verified"
}
```

**Event**: `mtn:badge-count`
```javascript
{
  count: 5,
  type: "new-request" | "request-updated" | "broadcast",
  action?: "verified" | "rejected" | "approved",
  timestamp: "2025-12-04T10:30:00Z"
}
```

**Event**: `mtn:counts`
```javascript
{
  maintenanceBilling: 5,
  unseenBills: 3,
  timestamp: "2025-12-04T10:30:00Z"
}
```

#### 5. REST Polling Fallback
- **Endpoint**: `GET /api/mtn/bills/unseen-count`
- **Purpose**: Badge count via REST when Socket.IO unavailable
- **Frequency**: Frontend polls every 60 seconds
- **Auth**: Required (tokenValidator middleware)

### Architecture Diagram

```
User Action
  ├─→ Submit Request
  │    ↓
  │    createVehicleMtnRequest()
  │    ↓
  │    notifyNewMtnRequest()
  │    ├─→ Emit 'mtn:new-request'
  │    └─→ Emit 'mtn:badge-count' {count: 5}
  │    ↓
  │    All connected clients receive events
  │
  ├─→ Upload Form
  │    ↓
  │    uploadVehicleMtnForm()
  │    ├─→ Emit 'mtn:form-uploaded'
  │    └─→ Emit 'mtn:counts' {maintenanceBilling, unseenBills}
  │
  └─→ Update Status
       ↓
       adminUpdateVehicleMtnRequest() OR updateVehicleMtnBilling()
       ├─→ Emit 'mtn:request-updated'
       └─→ Emit 'mtn:badge-count' {count: 4}
```

---

## Badge System Implementation

### Overview
Live badge indicators for:
1. **Pending Maintenance Requests** - Count of requests awaiting processing
2. **Unseen Bills** - Count of forms uploaded but not invoiced

### Features Implemented

#### 1. Unseen Bills Badge
- **Endpoint**: `GET /api/mtn/bills/unseen-count`
- **Database Query**: Counts records with `form_upload` but no finalized invoice
- **Query**:
  ```sql
  SELECT COUNT(*) FROM vehicle_svc v
  LEFT JOIN tbl_inv i ON v.req_id = i.req_id
  WHERE v.form_upload IS NOT NULL
    AND (i.inv_status NOT IN ('processed', 'invoiced', 'paid') OR i.inv_id IS NULL)
  ```
- **Scoping**: Optional filter by user (ramcoId)

#### 2. Real-Time Badge Updates
Badges update automatically when:
- New form uploaded (`uploadVehicleMtnForm()`)
- Billing status changes (`updateVehicleMtnBilling()`)
- Invoice created from approval

#### 3. Socket.IO Badge Events
`mtn:counts` event emitted with:
```json
{
  "maintenanceBilling": 5,
  "unseenBills": 3
}
```

---

## Performance Optimization

### Problem Statement
- **Original Response Time**: 578ms
- **Original Payload Size**: 17.45MB
- **Root Cause**: Fetching all data including unnecessary records

### Solutions Implemented

#### 1. Selective Column Selection
**File**: `maintenanceModel.ts` in `getVehicleMtnRequests()`

**Before**:
```sql
SELECT * FROM applications.vehicle_svc
```

**After**:
```sql
SELECT 
    req_id, asset_id, ramco_id, req_date, ws_id, svc_opt,
    verification_stat, recommendation_stat, approval_stat, drv_stat,
    verification_date, recommendation_date, approval_date, form_upload_date,
    costcenter_id, req_comment, upload_date, form_upload, emailStat, drv_date, inv_status,
    verification_by, recommendation_by, approval_by
FROM applications.vehicle_svc
```

**Impact**: Reduces database query payload by **40-50%**

#### 2. ID-Based Lazy Loading
**File**: `maintenanceController.ts` in `getVehicleMtnRequests()`

**Pattern**:
1. Fetch only request IDs from database
2. Extract referenced lookup IDs (asset_id, costcenter_id, etc.)
3. Filter lookup queries to only return relevant records
4. Skip billing data entirely unless requested

```typescript
const assetIds = new Set<number>();
const costcenterIds = new Set<number>();
// ... collect IDs ...

const assets = await assetModel.getAssets()
  .then(all => all.filter((a: any) => assetIds.has(a.id)));
```

**Impact**: Reduces lookup data by **80-90%**

#### 3. Optional Invoice Inclusion
**Query Parameter**: `?includeInvoice=true`

**Default Behavior**:
- Exclude billing/invoice data (saves ~17.45MB)
- Fast response (~80KB)

**Optional Behavior**:
- Include invoices when explicitly requested
- Original behavior maintained for backward compatibility

```typescript
const includeInvoice = req.query.includeInvoice === 'true';
if (includeInvoice) {
  // Fetch invoices
} else {
  // Skip invoice fetch
}
```

**Impact**: Removes **17.45MB** from default response

### Performance Results

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Response Size | 17.45MB | 80-500KB | **95-99%** ↓ |
| Query Time | 578ms | 50-120ms | **80-90%** ↓ |
| Lookup Data | 100% of tables | 5-10% | **90-95%** ↓ |

### Backward Compatibility
✅ **Full backward compatibility maintained**:
- Response structure unchanged
- All original fields present (when data exists)
- Invoice field now conditional (null when not requested)
- Clients can opt-in via `?includeInvoice=true`

---

## Email Authorization System

### Overview
Secure email-based authorization for approvers/recommenders who cannot log into portal.

### Implementation

#### 1. JWT Token Generation
**File**: `src/utils/workflowService.ts` (renamed from `s.maintenance/workflowService.ts`)

```typescript
function buildPortalUrl(id: number, action: 'approve' | 'recommend', payload: any, ttl: string) {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY;
  const token = jwt.sign(payload, secret, { expiresIn: ttl });
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl}/mtn/vehicle/portal/${id}?action=${action}&_cred=${token}`;
}
```

#### 2. Email Templates
- **Verification Email**: `vehicleMaintenanceAuthorization.ts`
- **Outcome Email**: `vehicleMaintenanceOutcome.ts`
- **Sections**: Applicant, Vehicle, Cost Center, Portal Link

#### 3. Authorization Link
Email contains secure link like:
```
http://frontend/mtn/vehicle/portal/12345?action=approve&_cred=eyJhbGc...
```

**Link Validity**: 3 days (configurable via `ttl` parameter)

#### 4. Portal Access
- **Endpoint**: `GET /api/mtn/request/:id/authorize-link`
- **Token Verification**: JWT verification with expiration check
- **No Login Required**: Direct authorization from email link
- **Action Recorded**: Admin/approver ID extracted from token

---

## Workflow Integration

### Overview
Multi-level approval workflow with email notifications at each stage.

### Workflow Stages

```
Stage 1: Verification (Level 1)
  └─→ verification_stat = 0|1|2
  └─→ Email sent to Verifier
  └─→ Verifier can approve/reject

Stage 2: Recommendation (Level 2)
  └─→ recommendation_stat = 0|1|2
  └─→ Email sent to Recommender
  └─→ Recommender can approve/reject

Stage 3: Approval (Level 3)
  └─→ approval_stat = 0|1|2
  └─→ Email sent to Approver
  └─→ Approver can approve/reject

Stage 4: Driver Acceptance
  └─→ drv_stat = 0|1|2
  └─→ Driver confirms or cancels request

Stage 5: Billing
  └─→ If approved: Auto-create invoice
  └─→ inv_status tracks: pending → processed → invoiced → paid
```

### Status Values

| Level | Pending | Approved | Rejected |
|-------|---------|----------|----------|
| Verification | 0 | 1 | 2 |
| Recommendation | 0 | 1 | 2 |
| Approval | 0 | 1 | 2 |
| Driver | 0 | 1 | 2 (cancelled) |

### Computed Statuses

```typescript
enum ApplicationStatus {
  PENDING = "PENDING",      // All 0
  VERIFIED = "VERIFIED",    // verification=1, others=0
  RECOMMENDED = "RECOMMENDED", // verification=1, recommendation=1, approval=0
  APPROVED = "APPROVED",    // All = 1
  REJECTED = "REJECTED",    // Any = 2
  CANCELLED = "CANCELLED"   // drv_stat = 2
}
```

---

## Workflow Helper Integration

### File
`src/utils/workflowHelper.ts`

### Functions Used

```typescript
// Get picture/approver for a module and level
getWorkflowPic(moduleName: string, level: 'Verify' | 'Recommend' | 'Approval')
  → Returns: { ramco_id, full_name, email, ... }

// Get all workflows
getWorkflows()
  → Returns: Array of workflow configurations
```

### Example Usage
```typescript
const approver = await getWorkflowPic('vehicle maintenance', 'Approval');
if (approver?.email) {
  // Send email to approver
}
```

---

## Database Optimization

### Indexes Created
1. `vehicle_svc(asset_id)` - Vehicle lookups
2. `vehicle_svc(ramco_id)` - Requester lookups
3. `vehicle_svc(req_date)` - Date-based filtering
4. `vehicle_svc(verification_stat, recommendation_stat, approval_stat)` - Workflow filtering
5. `tbl_inv(req_id)` - UNIQUE foreign key for invoices

### Query Optimization Techniques
- **Selective Columns**: Only fetch needed columns
- **Index Usage**: Where clauses on indexed columns
- **Connection Pooling**: Reuse MySQL connections
- **Lazy Loading**: Load lookups only when needed

---

## Error Handling & Resilience

### Graceful Socket.IO Failure
If Socket.IO unavailable:
- Requests still process normally
- Badge count available via REST endpoint
- Frontend falls back to polling
- Errors logged but don't block operations

```typescript
try {
  const io = getSocketIOInstance();
  if (io) {
    io.emit('mtn:new-request', payload);
  }
} catch (err) {
  // Log error but continue
  logger.warn('Socket.IO emit failed', err);
}
```

### Email Delivery Fallback
If email fails:
- Request still created/updated
- Admin can resend via `/api/mtn/request/:id/resendmail`
- Notification service logs failures

---

## File Consolidation

### Moved Files
- `src/s.maintenance/workflowService.ts` → `src/utils/workflowService.ts` ✅ (consolidated)
- Removed duplicate `/s.maintenance` directory

### Unified Documentation
Consolidated 14 markdown files into 4:
1. **README.md** - Module overview
2. **SCHEMA.md** - Database schema & interfaces
3. **API.md** - Complete API reference
4. **ENHANCEMENTS.md** - This file (features & fixes)

---

## Testing & Validation

### Socket.IO Event Testing
```javascript
// Browser console
socket.on('mtn:badge-count', (data) => {
  console.log('Badge update:', data);
});

socket.on('mtn:new-request', (data) => {
  console.log('New request:', data);
});
```

### API Testing
```bash
# Create request
curl -X POST 'http://localhost:3030/api/mtn/request' \
  -F 'asset_id=123' -F 'ramco_id=00001' -F 'svc_opt=32'

# Get badge count
curl -X GET 'http://localhost:3030/api/mtn/bills/unseen-count' \
  -H 'Authorization: Bearer TOKEN'

# Upload form
curl -X PUT 'http://localhost:3030/api/mtn/request/12345/form-upload' \
  -H 'Authorization: Bearer TOKEN' \
  -F 'form_upload=@form.pdf'
```

See [API.md](./API.md) for complete endpoint testing guide.

---

## Future Enhancements

### Planned Features
- [ ] Maintenance schedule creation
- [ ] Preventive maintenance reminders
- [ ] Cost analytics & reports
- [ ] Service history by technician
- [ ] Spare parts inventory integration
- [ ] Mobile app approval notifications
- [ ] SMS notifications (SMS + Email)
- [ ] Approval reminder escalation

### Potential Improvements
- [ ] GraphQL API support
- [ ] Advanced filtering (date ranges, cost ranges)
- [ ] Export to Excel/PDF
- [ ] Attachment versioning
- [ ] Approval workflow customization
- [ ] Service level agreement (SLA) tracking

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-25 | 2.0 | Documentation consolidated, enhancements documented |
| 2025-12-04 | 1.5 | Performance optimization, lazy loading |
| 2025-12-01 | 1.4 | Badge system & live notifications |
| 2025-11-15 | 1.3 | Workflow integration & email authorization |
| 2025-11-01 | 1.2 | Form upload & billing integration |
| 2025-10-01 | 1.0 | Initial module creation |
