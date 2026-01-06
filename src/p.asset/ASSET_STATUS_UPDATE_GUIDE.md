# Asset Status Update - Implementation Summary

## What Was Added

A complete **PUT /api/assets/{asset_id}/update-status** endpoint with automatic audit trail tracking.

## Implementation Details

### 1. Database Layer
- **Migration**: `db/migrations/add_status_history_table.sql`
- **New Table**: `assets.status_history` with full before/after tracking
- **Table Constraints**: Foreign key to `assetdata` with CASCADE delete

### 2. Model Layer (`src/p.asset/assetModel.ts`)
Two new functions:

**`updateAssetStatus(asset_id, data)`**
- Updates `assetdata` table with new status values
- Updates `updated_by` and `updated_at` automatically
- Handles optional fields (classification, record_status, condition_status)

**`createStatusHistory(asset_id, beforeData, afterData, updated_by)`**
- Creates audit trail record in `status_history` table
- Captures before/after values for all three status fields
- Records timestamp and user who made the change

### 3. Controller Layer (`src/p.asset/assetController.ts`)
**`updateAssetStatus(req, res)`**
- Validates request parameters and payload
- Fetches current asset state
- Calls both model functions in transaction-like sequence
- Returns detailed before/after response

### 4. Route Layer (`src/p.asset/assetRoutes.ts`)
```typescript
router.put('/:asset_id/update-status', asyncHandler(assetController.updateAssetStatus));
```

---

## API Documentation

### Endpoint
```
PUT /api/assets/{asset_id}/update-status
```

### Authentication
Requires valid JWT token (via `tokenValidator` middleware)

### Request Example
```bash
curl -X PUT http://localhost:3000/api/assets/123/update-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classification": "rental",
    "record_status": "archived",
    "condition_status": "returned",
    "updated_by": "EMP123"
  }'
```

### Request Body Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `classification` | string | No | Asset classification (e.g., "rental", "owned", "leased") |
| `record_status` | string | No | Record status (e.g., "active", "archived", "disposed") |
| `condition_status` | string | No | Condition status (e.g., "working", "returned", "faulty") |
| `updated_by` | string | **Yes** | User ID/Ramco ID performing the update |

**Note**: At least one status field must be provided.

### Success Response (200)
```json
{
  "status": "success",
  "message": "Asset status updated successfully",
  "data": {
    "asset_id": 123,
    "before": {
      "classification": "owned",
      "record_status": "active",
      "condition_status": "working"
    },
    "after": {
      "classification": "rental",
      "record_status": "archived",
      "condition_status": "returned"
    },
    "updated_by": "EMP123",
    "updated_at": "2026-01-06T14:30:45.000Z"
  }
}
```

### Error Responses

**Invalid Asset ID (400)**
```json
{
  "status": "error",
  "message": "Invalid asset ID",
  "data": null
}
```

**Missing Required Fields (400)**
```json
{
  "status": "error",
  "message": "updated_by (ramco_id) is required",
  "data": null
}
```

**Asset Not Found (404)**
```json
{
  "status": "error",
  "message": "Asset not found",
  "data": null
}
```

**Server Error (500)**
```json
{
  "status": "error",
  "message": "Error updating asset status",
  "data": null
}
```

---

## Test Cases

### Test 1: Update All Three Fields
```bash
curl -X PUT http://localhost:3000/api/assets/100/update-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classification": "rental",
    "record_status": "archived",
    "condition_status": "returned",
    "updated_by": "EMP001"
  }'
```

### Test 2: Update Only Classification
```bash
curl -X PUT http://localhost:3000/api/assets/100/update-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classification": "leased",
    "updated_by": "EMP002"
  }'
```

### Test 3: Update Only Record Status
```bash
curl -X PUT http://localhost:3000/api/assets/100/update-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "record_status": "active",
    "updated_by": "EMP003"
  }'
```

### Test 4: Missing required_by field (should fail)
```bash
curl -X PUT http://localhost:3000/api/assets/100/update-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classification": "rental"
  }'
```

### Test 5: Invalid Asset ID (should fail)
```bash
curl -X PUT http://localhost:3000/api/assets/99999/update-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classification": "rental",
    "updated_by": "EMP001"
  }'
```

---

## Database Verification

### Check Updated Asset
```sql
SELECT id, classification, record_status, condition_status, updated_by, updated_at
FROM assets.assetdata
WHERE id = 123;
```

### Check Audit Trail
```sql
SELECT * FROM assets.status_history
WHERE asset_id = 123
ORDER BY updated_at DESC;
```

### Check All Status Changes by User
```sql
SELECT asset_id, classification_before, classification_after,
       record_status_before, record_status_after,
       condition_status_before, condition_status_after,
       updated_by, updated_at
FROM assets.status_history
WHERE updated_by = 'EMP001'
ORDER BY updated_at DESC;
```

---

## Key Features

✅ **Selective Updates** - Only update the fields you need  
✅ **Automatic Audit Trail** - All changes tracked in `status_history` table  
✅ **Before/After Comparison** - Full visibility into what changed  
✅ **User Tracking** - Records who made each change and when  
✅ **Data Integrity** - Foreign key constraints prevent orphaned records  
✅ **Type-Safe** - Full TypeScript support with proper error handling  
✅ **Consistent API** - Follows project's response format standards  

---

## Next Steps

1. **Apply Migration**: Run the SQL migration to create the `status_history` table
   ```bash
   mysql -u root -p assets < db/migrations/add_status_history_table.sql
   ```

2. **Restart Server**: Restart the backend to load the new routes
   ```bash
   npm run dev
   ```

3. **Test the Endpoint**: Use any of the test cases above

4. **Monitor Audit Trail**: Query `status_history` table to verify tracking

---

## Files Modified

| File | Changes |
|------|---------|
| `src/p.asset/assetModel.ts` | Added 2 functions: `updateAssetStatus()`, `createStatusHistory()` |
| `src/p.asset/assetController.ts` | Added 1 function: `updateAssetStatus()` |
| `src/p.asset/assetRoutes.ts` | Added 1 route: `PUT /:asset_id/update-status` |
| `db/migrations/add_status_history_table.sql` | New migration file |

---

## Notes

- The endpoint uses the existing `asyncHandler` utility for error handling
- All updates include automatic timestamp tracking via `updated_at`
- The `status_history` table is optimized with indexes on `asset_id` and `updated_at` for fast queries
- Audit trail captures complete before/after state for all three status fields
