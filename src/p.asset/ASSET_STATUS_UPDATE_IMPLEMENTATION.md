# Asset Status Update Implementation

## Overview
Implemented a new endpoint to update asset status fields with automatic audit trail creation.

## Files Modified/Created

### 1. Database Migration
**File**: `db/migrations/add_status_history_table.sql`
- Creates `status_history` table in `assets` database
- Tracks before/after values for: `classification`, `record_status`, `condition_status`
- Fields: `id`, `asset_id`, `classification_before`, `classification_after`, `record_status_before`, `record_status_after`, `condition_status_before`, `condition_status_after`, `updated_by`, `updated_at`
- Foreign key constraint on `assetdata` table

### 2. Model Methods
**File**: `src/p.asset/assetModel.ts`

#### `updateAssetStatus(asset_id, data)`
- Updates asset status fields in `assetdata` table
- Parameters:
  - `asset_id`: Asset ID (number)
  - `data`: Object with optional fields:
    - `classification`: string
    - `record_status`: string
    - `condition_status`: string
    - `updated_by`: string (required)
- Returns: `{ updated: boolean, affectedRows: number, message: string }`

#### `createStatusHistory(asset_id, beforeData, afterData, updated_by)`
- Creates audit trail entry in `status_history` table
- Parameters:
  - `asset_id`: Asset ID (number)
  - `beforeData`: Object with original values
  - `afterData`: Object with new values
  - `updated_by`: User ID (ramco_id)
- Returns: `{ created: boolean, insertId: number, message: string }`

### 3. Controller Method
**File**: `src/p.asset/assetController.ts`

#### `updateAssetStatus(req, res)`
- Endpoint handler for status update
- Validates request data
- Fetches current asset state
- Calls model methods for update and audit trail
- Returns success/error response

### 4. Route
**File**: `src/p.asset/assetRoutes.ts`
```typescript
router.put('/:asset_id/update-status', asyncHandler(assetController.updateAssetStatus));
```

## API Endpoint

**Method**: `PUT`  
**Path**: `/api/assets/{asset_id}/update-status`  
**Requires**: Token authentication (via `tokenValidator` middleware)

### Request Body
```json
{
  "classification": "rental",
  "record_status": "archived",
  "condition_status": "returned",
  "updated_by": "ramco_id"
}
```

### Response (Success - 200)
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
    "updated_by": "ramco_id",
    "updated_at": "2026-01-06T12:34:56.000Z"
  }
}
```

### Response (Error - 400/404/500)
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

## Features

✅ **Selective Updates**: Update only the fields you need (all are optional except `updated_by`)  
✅ **Audit Trail**: Automatic creation of before/after records in `status_history` table  
✅ **Timestamps**: All operations track the exact update time (`updated_at` in both tables)  
✅ **User Tracking**: Records who made the change via `updated_by` field  
✅ **Data Integrity**: Foreign key constraint ensures audit records reference valid assets  
✅ **Error Handling**: Comprehensive validation and error responses

## Database Schema

### assetdata (updated fields)
```sql
`classification` varchar(50)
`record_status` varchar(50)
`condition_status` varchar(50)
`updated_by` varchar(100)
`updated_at` timestamp
```

### status_history (new table)
```sql
CREATE TABLE `status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `classification_before` varchar(50),
  `classification_after` varchar(50),
  `record_status_before` varchar(50),
  `record_status_after` varchar(50),
  `condition_status_before` varchar(50),
  `condition_status_after` varchar(50),
  `updated_by` varchar(100),
  `updated_at` datetime,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`),
  KEY `idx_updated_at` (`updated_at`)
);
```

## Next Steps

1. Apply the migration: `db/migrations/add_status_history_table.sql`
2. Restart the backend server (`npm run dev`)
3. Test the endpoint with your client
4. Query `status_history` table to verify audit trails are being created
