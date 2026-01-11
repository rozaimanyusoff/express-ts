# Purchase Data Import Process

## Overview
This module implements a data import process that imports older records from the `purchase_item_import` table into the system. The import process performs the following operations in sequence:

1. **Purchase Requests Import**: Creates new `purchase_request` records with mapping
2. **Purchase Items Import**: Imports records into `purchase_items` table with request_id linking
3. **Logging**: Records all import statistics to `import.logs` for audit trail and undo operations

## Endpoint

### POST `/api/purchases/import`

Initiates the import process for all records from the `purchase_item_import` table.

**Request**
```
POST /api/purchases/import
Content-Type: application/json
```

**Response (Success)**
```json
{
  "status": "success",
  "message": "Successfully imported 100 items and 50 requests (5 items linked to existing requests)",
  "data": {
    "imported_count": 100,
    "requests_imported": 50,
    "request_id_updates": 5,
    "duplicate_items": ["PR001", "PR002"],
    "failed_items": [
      {
        "pr_no": "PR003",
        "error": "pr_no is required"
      }
    ],
    "total_records": 150,
    "log_file": "/p.purchase/import.logs"
  }
}
```

**Response (Error)**
```json
{
  "status": "error",
  "message": "Failed to import purchase data",
  "data": null
}
```

## Process Details

### Step 1: Import Purchase Requests

Reads all records from the `purchase_item_import` table and creates **unique** purchase request records in the `purchase_request` table.

**Duplicate Check**: For each distinct `pr_no`, the system checks if it already exists in the `purchase_request` table:
- If it **exists**: 
  - Maps the existing request_id
  - **Updates any orphaned `purchase_items` records with this pr_no to link them to the existing request_id**
  - Adds to duplicate list
- If it **doesn't exist**: 
  - Creates new record and stores the request_id for linking

**Key Behavior**:
When a duplicate `pr_no` is found, the system automatically updates existing `purchase_items` records:
```sql
UPDATE purchase_items 
SET request_id = ? 
WHERE pr_no = ? AND request_id IS NULL
```

This ensures all items with a given `pr_no` are properly linked to their request, even if the items were previously imported without request_id linking.

**Columns Inserted**:
- request_type
- pr_no
- pr_date
- ramco_id
- costcenter_id

**Returns**: Map of `pr_no` → `request_id` for linking to purchase_items

### Step 2: Import Purchase Items

Inserts all records from `purchase_item_import` into the `purchase_items` table, using the request_id mapping from Step 1.

**Duplicate Check**: For each record, checks if the `pr_no` already exists in the `purchase_items` table. If it exists, the record is skipped and added to the `duplicate_items` list.

**Key Enhancement**: 
- Uses `request_id` mapping from Step 1
- Links each item to its corresponding purchase request
- Ensures referential integrity between tables

**Columns Imported**:
- request_id (linked from purchase_request via pr_no)
- name
- type_id
- category_id
- qty
- description
- purpose
- brand_id
- supplier_id
- unit_price
- total_price
- po_no
- po_date
- pr_date
- pr_no
- costcenter_id
- ramco_id
- brand
- supplier
- request_type
- costcenter
- pic
- item_type

### Step 3: Logging

Writes a JSON log entry to `src/p.purchase/import.logs` containing:
- Import timestamp
- Count of items inserted/duplicated/failed
- Count of requests inserted/duplicated/failed
- Full mapping of pr_no → request_id
- Details for audit trail and undo operations

**Log File Location**: `src/p.purchase/import.logs`

**Log Format**: JSON Lines (one JSON object per line) for easy parsing

**Log Entry Structure**:
```json
{
  "timestamp": "2026-01-10 15:30:45",
  "purchase_items_inserted": 100,
  "purchase_requests_inserted": 50,
  "purchase_items_duplicates": 5,
  "purchase_requests_duplicates": 2,
  "purchase_items_failed": 0,
  "purchase_requests_failed": 0,
  "purchase_items_updated_with_request_id": 2,
  "total_rows_processed": 150,
  "details": {
    "items": { ... },
    "requests": {
      "imported_count": 50,
      "total_records": 52,
      "duplicate_items": ["PR001", "PR002"],
      "failed_items": [],
      "request_id_map": [["PR001", 100], ["PR002", 101], ...],
      "note": "When duplicate pr_no found, existing purchase_items records are updated with request_id"
    }
  }
}
```

## Response Data Structure

```typescript
{
  imported_count: number;           // Number of items successfully imported
  requests_imported: number;        // Number of requests successfully created
  request_id_updates: number;       // Number of items updated with request_id from existing requests
  duplicate_items: string[];        // pr_no values that were duplicates
  failed_items: Array<{
    pr_no: string;                  // The pr_no of failed record
    error: string;                  // Error message
  }>;
  total_records: number;            // Total records processed
  log_file: string;                 // Path to import log file
}
```

## Error Handling

### Duplicate Records - Purchase Requests
When a duplicate `pr_no` is found in `purchase_request`:
- **Maps** the existing request_id for linking new items
- **Automatically updates** any orphaned `purchase_items` records with this pr_no
- Only updates items where `request_id IS NULL` (to avoid overwriting existing links)
- Recorded in the response's `duplicate_items` array

### Duplicate Records - Purchase Items
- If a `pr_no` exists in `purchase_items`, the record is skipped
- Duplicates are recorded in the response's `duplicate_items` array

### Validation Errors
- Records with empty or missing `pr_no` are marked as failed
- Failed records are listed in the `failed_items` array with their error message

### Database Errors
- Any database operation errors are caught and recorded as failed items
- The import process continues even if individual records fail
- Update failures (for request_id linking) are logged but don't fail the import

## Implementation Notes

### Database Tables
- **Source**: `purchases2.purchase_item_import` - Contains older records to be imported
- **Target 1**: `purchases2.purchase_request` - Stores created purchase requests
- **Target 2**: `purchases2.purchase_items` - Stores imported purchase items with request_id linking

### Model Functions

#### `importPurchaseRequests(items): Promise<ImportResult & { request_id_map }>`
- Imports unique purchase requests
- Returns request_id mapping for linking to items
- Handles duplicates by mapping existing IDs

#### `importPurchaseItems(items, requestIdMap): Promise<ImportResult>`
- Imports purchase items with request_id linking
- Uses the mapping from importPurchaseRequests
- Checks pr_no duplicates in purchase_items table

### Controller Function

#### `importPurchaseData(req, res): Promise<void>`
Main endpoint handler that orchestrates:
1. Calls `importPurchaseRequests()` first
2. Passes request_id_map to `importPurchaseItems()`
3. Writes import log via `writeImportLog()`
4. Returns combined results

#### `writeImportLog(logEntry): Promise<void>`
Appends JSON log entry to `src/p.purchase/import.logs`

## Example Usage

```bash
# Initiate import
curl -X POST http://localhost:3000/api/purchases/import \
  -H "Content-Type: application/json"

# View import logs
tail -f src/p.purchase/import.logs

# Parse specific log entry
cat src/p.purchase/import.logs | jq '.'
```

## Using Logs for Undo Operations

The log file contains all necessary information to undo an import:

1. **Parse the log entry** to get request_id_map and inserted counts
2. **Delete from purchase_items** where pr_no is in the import list (except duplicates)
3. **Delete from purchase_request** where id is in the request_id_map values

Example deletion query:
```sql
-- Delete imported items (example)
DELETE FROM purchases2.purchase_items 
WHERE pr_no IN ('PR001', 'PR002', 'PR003', ...)
AND id NOT IN (SELECT id FROM purchases2.purchase_items WHERE pr_no IN (duplicate_list));

-- Delete imported requests
DELETE FROM purchases2.purchase_request 
WHERE id IN (100, 101, 102, ...);  -- IDs from request_id_map
```

## Notes

- The import process is **not fully idempotent** - running it twice will skip duplicates but still create new requests
- Records with missing `pr_no` values are skipped with an error message
- The process continues even if some records fail to import
- Timestamps (`created_at`, `updated_at`) are automatically set to the current time
- Import logs are **append-only** - use for audit trail and undo operations
- The `request_id` linking ensures referential integrity between purchase_request and purchase_items

