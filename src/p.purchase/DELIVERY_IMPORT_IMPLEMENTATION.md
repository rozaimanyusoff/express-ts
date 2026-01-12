# Delivery Import Implementation

## Overview
Completed the final procedure for the `importPurchaseData` endpoint to import delivery data from `purchase_item_import` table into the `purchase_delivery` table.

## Implementation Details

### New Function: `importDeliveryData()`
**Location:** [src/p.purchase/purchaseModel.ts](src/p.purchase/purchaseModel.ts)

**Purpose:** 
Imports delivery information from the source `purchase_item_import` table and inserts into `purchase_delivery` table.

**Data Mapped:**
- `do_date` → Delivery Order Date
- `do_no` → Delivery Order Number
- `inv_date` → Invoice Date  
- `inv_no` → Invoice Number
- `grn_date` → Goods Received Note Date
- `grn_no` → Goods Received Note Number

**Key Features:**
1. **Purchase ID Linking:** Retrieves `purchase_id` from `purchase_items` table using `pr_no` match
2. **Request ID Linking:** Uses the `request_id_map` from purchase requests import or retrieves from existing `purchase_items` record
3. **Duplicate Prevention:** Tracks unique deliveries by `pr_no` to avoid duplicate delivery records
4. **Error Handling:** Captures failed imports with error details for logging

### Updated Controller: `importPurchaseData()`
**Location:** [src/p.purchase/purchaseController.ts](src/p.purchase/purchaseController.ts)

**Process Flow:**
1. **Step 1:** Import purchase requests (creates `request_id_map`)
2. **Step 2:** Import purchase items with request_id linking
3. **Step 3:** Import delivery data from `purchase_item_import` ← **NEW**
4. **Step 4:** Create consolidated import log

**Response Includes:**
- `deliveries_imported` - Count of successfully imported delivery records
- `purchase_deliveries_failed` - Count of failed deliveries
- `purchase_deliveries_duplicates` - Count of skipped duplicate deliveries
- Detailed delivery information in the log

### Updated ImportItem Interface
**Location:** [src/p.purchase/purchaseModel.ts](src/p.purchase/purchaseModel.ts)

Added new optional properties:
- `do_date?: string`
- `do_no?: string`
- `inv_date?: string`
- `inv_no?: string`
- `grn_date?: string`
- `grn_no?: string`

## Data Flow

```
purchase_item_import
    ↓
importDeliveryData()
    ├─ Reads: do_date, do_no, inv_date, inv_no, grn_date, grn_no
    ├─ Looks up: purchase_id (from purchase_items using pr_no)
    ├─ Looks up: request_id (from request_id_map or purchase_items)
    └─ Inserts into: purchase_delivery table
    
Then updates:
    purchase_delivery.purchase_id = [purchase_items.id]
    purchase_delivery.request_id = [purchase_request.id]
```

## Database Tables

**Source:** `purchases2.purchase_item_import`
- Contains delivery data fields: `do_date`, `do_no`, `inv_date`, `inv_no`, `grn_date`, `grn_no`

**Target:** `purchases2.purchase_delivery`
- Schema:
  ```sql
  purchase_id (FK → purchase_items.id)
  request_id (FK → purchase_request.id)
  do_date
  do_no
  inv_date
  inv_no
  grn_date
  grn_no
  handover_to (ramco_id)
  handover_at
  created_at
  updated_at
  upload_path
  ```

## API Response Example

```json
{
  "status": "success",
  "message": "Successfully imported 100 items, 50 requests, and 100 deliveries",
  "data": {
    "imported_count": 100,
    "requests_imported": 50,
    "deliveries_imported": 100,
    "failed_items": [],
    "request_id_updates": 5,
    "total_records": 100,
    "log_file": "/p.purchase/import.logs"
  }
}
```

## Testing

To test the import endpoint:
```bash
POST /api/purchase/import
```

The endpoint will:
1. Fetch all records from `purchase_item_import`
2. Import purchase requests (creating unique PR records)
3. Import purchase items (linking to requests)
4. **Import delivery data (NEW)** - inserts delivery information and links to purchases/requests
5. Return consolidated results with delivery import stats

## Error Handling

Failed delivery imports are captured with:
- `pr_no` - Source document reference
- `error` - Specific error message (e.g., missing purchase_id, database constraint violation)

These are included in the response and logged to `/p.purchase/import.logs`.

## Type Safety

All TypeScript types have been validated and the implementation passes `npm run type-check`.
