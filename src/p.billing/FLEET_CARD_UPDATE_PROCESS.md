# updateFleetCard Process Documentation

## Overview
The `updateFleetCard` function updates fleet card information with automatic history tracking and optional fleet-asset relationship management.

## Tables Involved

### Primary Table
- **`billings.fleet2`** - Main fleet card table
  - Updated with new card details
  - Columns updated: `asset_id`, `fuel_id`, `card_no`, `pin`, `reg_date`, `status`, `expiry_date`, `remarks`

### Supporting Tables
- **`billings.fleet_history`** - Fleet card history/audit trail
  - Records all asset assignment changes
  - Tracks old_asset_id → new_asset_id transitions
  - Columns populated: `card_id`, `old_asset_id`, `new_asset_id`, `changed_at`

- **`billings.fleet_asset`** - Fleet-Asset join/relationship table
  - Maintains many-to-many relationships between fleet cards and assets
  - Used for advanced lookups and linkage management
  - Operations: DELETE old links, INSERT new links

## Process Flow

### 1. Fetch Current State
```
SELECT asset_id FROM billings.fleet2 WHERE id = {card_id}
```
- Retrieves the current asset assignment for comparison
- Stored in `current` variable

### 2. Asset Change Detection
```javascript
assetChanged = data.asset_id !== undefined && 
               data.asset_id !== current.asset_id
```
- Determines if the asset assignment is being changed
- Only performs additional operations if asset actually changed

### 3. If Asset Changed: Insert History Record
```sql
INSERT INTO billings.fleet_history 
  (card_id, old_asset_id, new_asset_id, changed_at) 
VALUES (?, ?, ?, NOW())
```
- Records the transition in audit trail
- Parameters:
  - `card_id`: The fleet card ID being updated
  - `old_asset_id`: Previous asset_id (from current)
  - `new_asset_id`: New asset_id (from payload)
  - `changed_at`: Current timestamp

### 4. If Asset Changed: Update Fleet-Asset Join Table
```sql
DELETE FROM billings.fleet_asset 
WHERE asset_id = ? AND card_id = ?

INSERT INTO billings.fleet_asset (asset_id, card_id) 
VALUES (?, ?)
```
- Removes old fleet-asset relationship (if existed)
- Creates new fleet-asset relationship (if new asset_id provided)
- Maintains referential integrity

### 5. Update Fleet Card Record (Always)
```sql
UPDATE billings.fleet2 
SET asset_id = ?, fuel_id = ?, card_no = ?, pin = ?, 
    reg_date = ?, status = ?, expiry_date = ?, remarks = ?
WHERE id = ?
```
- Updates the main fleet card with all provided fields
- Runs regardless of whether asset changed

## Request Payload
```json
{
  "asset_id": 7870,
  "fuel_id": 1,
  "card_no": "34534534534535",
  "pin": "1234",
  "reg_date": "2026-01-24",
  "status": "active",
  "expiry_date": "2027-01-24",
  "remarks": "Optional notes"
}
```

## Response
```json
{
  "status": "success",
  "message": "Fleet card updated successfully"
}
```

## Error Handling
- Silent catch on fleet_asset join table operations to avoid blocking main update
- Higher-level logic may surface errors if critical

## Key Features
✅ Automatic audit trail via fleet_history table  
✅ Relationship management with fleet_asset join table  
✅ Asset change tracking  
✅ Flexible field updates  
✅ Graceful error handling for join table operations
