# Purchase Import Process - Enhanced Implementation

## Summary of Changes

The import process has been enhanced with three critical improvements:

### 1. ✅ Duplicate Check on purchase_items (Already Implemented)
- Checks `pr_no` uniqueness before inserting each item
- Skips duplicates and records them in the response

### 2. ✅ Request_id Linking & Purchase Request Processing
**New Flow**:
- **Step 1**: Import purchase requests FIRST
  - Reads unique `pr_no` values from import data
  - Checks for duplicates in `purchase_request` table
  - Creates new records with: `request_type`, `pr_no`, `pr_date`, `ramco_id`, `costcenter_id`
  - Returns mapping of `pr_no` → `request_id`
  
- **Step 2**: Import purchase items WITH request_id linking
  - Uses the `request_id` mapping from Step 1
  - Each item is linked to its corresponding purchase request
  - Checks `pr_no` duplicates in `purchase_items` table
  - Ensures referential integrity

**Key Enhancement**: 
```typescript
// Before: Items had no request_id
// After: Items are linked to requests via request_id
INSERT INTO purchase_items (request_id, pr_no, ...) 
  VALUES (?, ?, ...)  // request_id from mapping
```

### 3. ✅ Import Logging System
**Log File**: `src/p.purchase/import.logs`

**Features**:
- JSON Lines format (one JSON object per line)
- Timestamp for each import
- Complete statistics:
  - Items inserted, duplicated, failed
  - Requests inserted, duplicated, failed
  - pr_no → request_id mapping for audit trail
  
**Log Entry Example**:
```json
{
  "timestamp": "2026-01-10 15:30:45",
  "purchase_items_inserted": 100,
  "purchase_requests_inserted": 50,
  "purchase_items_duplicates": 5,
  "purchase_requests_duplicates": 2,
  "purchase_items_failed": 0,
  "purchase_requests_failed": 0,
  "total_rows_processed": 150,
  "details": { ... }
}
```

**Use Cases**:
- Audit trail of all imports
- Undo operations (use mapping to delete inserted records)
- Track import history
- Debugging failed imports

## Modified Files

### 1. `purchaseModel.ts`
**Changes**:
- Enhanced `importPurchaseRequests()` to return `request_id_map`
- Updated `importPurchaseItems()` to accept and use `request_id_map`
- Added `ImportLog` interface for type safety
- Duplicate handling now maps existing request_ids

**New Behavior**:
```typescript
// Old: importPurchaseRequests(items) → ImportResult
// New: importPurchaseRequests(items) → ImportResult & { request_id_map }

// Old: importPurchaseItems(items) → ImportResult
// New: importPurchaseItems(items, requestIdMap) → ImportResult
```

### 2. `purchaseController.ts`
**Changes**:
- Reversed import order: requests first, then items
- Passes request_id mapping between functions
- Added `writeImportLog()` function
- Updated response to include log file path

**New Endpoint Response**:
```json
{
  "data": {
    "imported_count": 100,
    "requests_imported": 50,
    "duplicate_items": ["PR001"],
    "failed_items": [],
    "total_records": 150,
    "log_file": "/p.purchase/import.logs"  // NEW
  }
}
```

### 3. `IMPORT_PROCESS.md`
- Updated documentation with complete process flow
- Added logging section with examples
- Included undo operation guidelines
- Updated all function signatures

## Undo Operations

The import logs contain all information needed to undo an import:

```bash
# 1. Parse the log file to get request_ids and pr_nos
cat src/p.purchase/import.logs | tail -1 | jq '.details.requests.request_id_map'

# 2. Delete imported items
DELETE FROM purchases2.purchase_items 
WHERE pr_no IN ('PR001', 'PR002', 'PR003', ...);

# 3. Delete imported requests
DELETE FROM purchases2.purchase_request 
WHERE id IN (100, 101, 102, ...);  -- IDs from mapping
```

## Testing the Enhanced Process

```bash
# 1. Check import logs directory
ls -la src/p.purchase/import.logs

# 2. Run import
curl -X POST http://localhost:3000/api/purchases/import

# 3. View latest log entry
tail -1 src/p.purchase/import.logs | jq '.'

# 4. Verify items linked to requests
SELECT COUNT(*) FROM purchases2.purchase_items 
WHERE request_id IS NOT NULL;
```

## Data Integrity

The new process ensures:
- ✅ Each purchase item is linked to a purchase request
- ✅ No orphaned items (all have request_id)
- ✅ Duplicate pr_nos are handled gracefully
- ✅ Full audit trail in import.logs
- ✅ Referential integrity maintained

## Backward Compatibility

- ✅ Existing endpoints unchanged
- ✅ Log file is append-only (new feature)
- ✅ No breaking changes to API
- ✅ All existing tests continue to pass
