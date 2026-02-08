# Transfer Commitment Query Fix - Summary

## Problem Identified
The `getUncommittedTransfers` endpoint was returning transfer items that had already been committed and appeared in the `asset_history` table. This caused the frontend to show completed transfers as pending, potentially allowing users to commit the same transfer multiple times.

## Root Cause
The query used to exclude already-committed transfers was checking the wrong column mapping:

### **Before (INCORRECT):**
```sql
SELECT ti.* FROM transfer_items ti
WHERE ti.acceptance_by IS NOT NULL
AND ti.id NOT IN (
  SELECT DISTINCT transfer_id 
  FROM asset_history
  WHERE transfer_id IS NOT NULL
)
```

This checked if `transfer_items.id` (item ID, e.g., 19) was NOT IN `asset_history.transfer_id` column. However, `asset_history.transfer_id` stores the transfer REQUEST ID (e.g., 8), not the item ID.

Result: Item 19 was never found in the list (checking for 19 vs looking for 8), so the exclusion always failed.

## Solution Implemented
Changed all three affected queries to use `NOT EXISTS` with proper column mapping:

### **After (CORRECT):**
```sql
SELECT ti.* FROM transfer_items ti
WHERE ti.acceptance_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1
  FROM asset_history ah
  WHERE ah.transfer_id = ti.transfer_id
  AND ah.asset_id = ti.asset_id
)
```

This correctly checks if an `asset_history` entry exists for BOTH:
- `transfer_id` (the transfer REQUEST ID)
- `asset_id` (the specific asset being transferred)

### Files Modified
1. **[src/p.asset/assetModel.ts](src/p.asset/assetModel.ts)**
   - Line 2248: `getUncommittedAcceptedItems()` - Updated query logic
   - Line 2290: `getAllUncommittedAcceptedTransfers()` - Updated query logic  
   - Line 2325: `getUncommittedTransferSummary()` - Updated query logic

## Verification
The fix ensures:
- ✅ Committed transfers are properly excluded from pending list
- ✅ Duplicate prevention still works (deduplication added in commit 2fa40f9)
- ✅ Return only truly uncommitted transfers (accepted but not yet committed)
- ✅ Uses proper column mapping (transfer_id AND asset_id)

## Data Flow
1. User accepts a transfer → `transfer_items.acceptance_by` is set
2. Asset Manager commits transfer → `asset_history` record created with `transfer_id` and `asset_id`
3. Query execution:
   - Finds all items with `acceptance_by IS NOT NULL` (accepted)
   - EXCLUDES items where `asset_history` entry exists for same transfer AND asset
   - Returns only truly pending items ready for commitment

## Test Results
API endpoint `GET /api/assets/transfer-commit/pending?type_id=2` now correctly returns only items that:
- Have been accepted (`acceptance_by` field populated)
- Have NOT been committed yet (no entry in `asset_history` with matching transfer_id + asset_id)

---
**Date Fixed:** February 7, 2026
**Related Commits:** 2fa40f9 (dedup), 5df61b6 (endpoint refactor), THIS FIX (query correction)
