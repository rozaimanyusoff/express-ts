# Computer Assessment Secondary Procedure - Quick Reference

## Secondary Procedure Execution Flow

```
createComputerAssessment()
    ↓
[1] Create computer_assessment record
    ↓
[2] CALL updateAssetBasicSpecs(asset_id, specsUpdateData)
    │
    ├─ Query: SELECT id FROM assets.1_specs WHERE asset_id = ?
    │
    ├─ Found? ─── YES ──→ UPDATE assets.1_specs SET ... WHERE asset_id = ?
    │              └─→ Return: { operation: 'update-success', updatedFieldCount, ... }
    │              └─→ Log: "✓ Computer specs UPDATED for asset_id=X: N fields"
    │
    └─ Found? ─── NO ──→ INSERT INTO assets.1_specs (asset_id, type_id, ...) VALUES (...)
                   └─→ Return: { operation: 'insert-success', insertId, createdFieldCount, ... }
                   └─→ Log: "✓ Computer specs INSERTED for asset_id=X: N fields (id: Y)"
    ↓
[3] Process attachments
    ↓
[4] Send email notification
    ↓
[5] Return success response
```

## Key Function Behavior

### When Record Exists (UPDATE)
- **Check:** `asset_id` found in assets.1_specs
- **Action:** `UPDATE assets.1_specs SET ... WHERE asset_id = ?`
- **Fields Updated:** Only allowed type-specific fields
- **Timestamp:** `updated_at = NOW()`
- **Result:** Same record (id unchanged), fields updated
- **Log:** `✓ Computer specs UPDATED for asset_id=42: 8 fields modified`

### When Record Not Found (INSERT)
- **Check:** `asset_id` NOT found in assets.1_specs
- **Action:** `INSERT INTO assets.1_specs (...) VALUES (...)`
- **Fields Created:** asset_id, type_id, allowed fields, timestamps
- **Timestamps:** `created_at = NOW(), updated_at = NOW()`
- **Result:** New record created with auto-increment id
- **Log:** `✓ Computer specs INSERTED for asset_id=99: 8 fields created (1_specs id: 156)`

## Critical Details

| Aspect | Detail |
|--------|--------|
| **Matching Key** | asset_id (exact match, case-sensitive integer) |
| **Table** | assets.1_specs for type_id=1 (computers) |
| **Uniqueness** | One record per asset_id (1:1 relationship) |
| **Type_id** | Always 1 for computer assessments |
| **Field Count** | 40+ computer hardware fields allowed |
| **Timestamp Auto-Set** | created_at (INSERT), updated_at (INSERT/UPDATE) |
| **Error Handling** | Logged but doesn't fail assessment |

## Response Metadata Returned

### UPDATE Case
```json
{
  "operation": "update-success",
  "message": "Asset specs updated successfully",
  "asset_id": 42,
  "type_id": 1,
  "affectedRows": 1,
  "updatedFieldCount": 8,
  "updatedFields": ["os_name", "cpu_manufacturer", "memory_size_gb", ...]
}
```

### INSERT Case
```json
{
  "operation": "insert-success",
  "message": "Asset specs created successfully",
  "asset_id": 99,
  "type_id": 1,
  "insertId": 156,
  "createdFieldCount": 8,
  "createdFields": ["os_name", "cpu_manufacturer", "memory_size_gb", ...]
}
```

## Server Logs to Watch

```
✓ Computer specs UPDATED for asset_id=42: 8 fields modified
✓ Computer specs INSERTED for asset_id=99: 8 fields created (1_specs id: 156)
Error updating computer specs: [Error details]  ← Non-fatal, assessment created anyway
```

## Verification

### Check if INSERT or UPDATE Happened
```bash
# View server logs
tail -f /path/to/server/logs

# Watch for:
# - "UPDATED" = record was found and updated
# - "INSERTED" = record was created fresh
```

### Database Verification
```sql
-- Check if asset has 1_specs record
SELECT id, asset_id, created_at, updated_at 
FROM assets.1_specs 
WHERE asset_id = 42;

-- If multiple rows exist for same asset_id = BUG (shouldn't happen)
-- If 0 rows = INSERT failed (check logs)
-- If 1 row with recent updated_at = UPDATE successful
-- If 1 row with recent created_at = INSERT successful
```

## Configuration

### Type-Specific Allowed Fields

**Computer (type_id=1) Allowed:**
```
os_name, os_version, cpu_manufacturer, cpu_model, cpu_generation,
memory_manufacturer, memory_type, memory_size_gb,
storage_manufacturer, storage_type, storage_size_gb,
graphics_type, graphics_manufacturer, graphics_specs,
display_manufacturer, display_size, display_resolution, 
display_form_factor, display_interfaces,
ports_usb_a, ports_usb_c, ports_thunderbolt, ports_ethernet, ports_hdmi,
ports_displayport, ports_vga, ports_sdcard, ports_audiojack,
battery_equipped, battery_capacity, adapter_equipped, adapter_output,
av_installed, av_vendor, av_status, av_license,
vpn_installed, vpn_setup_type, vpn_username,
installed_software, office_account,
attachment_1, attachment_2, attachment_3,
brand_id, model_id, category_id, entry_code, asset_code
```

**Vehicle (type_id=2) Allowed:**
```
register_number, chassis_no, engine_no, transmission, fuel_type, card_id,
cubic_meter, color, seating_capacity, avls_availability,
avls_install_date, avls_removal_date, avls_transfer_date,
brand_id, model_id, category_id, entry_code, asset_code
```

## Common Scenarios

### Scenario 1: New Computer Asset Assessment
```
Asset 99 has no record in 1_specs
→ INSERT creates new record (id=156)
→ Log: "✓ Computer specs INSERTED for asset_id=99: 8 fields created (1_specs id: 156)"
→ Database: 1 new row in 1_specs with asset_id=99
```

### Scenario 2: Update Existing Computer Assessment
```
Asset 42 already has record (id=156) in 1_specs
→ UPDATE modifies that record
→ Log: "✓ Computer specs UPDATED for asset_id=42: 8 fields modified"
→ Database: Same row (id=156), new values and updated_at timestamp
```

### Scenario 3: Vehicle Assessment (Backward Compat)
```
Asset 50, type_id=2
→ Uses 2_specs table (not 1_specs)
→ Completely separate operation
→ Vehicle fields (transmission, fuel_type) stored in 2_specs
→ Computer fields ignored
```

## Error Scenarios

| Scenario | Handling |
|----------|----------|
| `asset_id` not provided | Specs update skipped, assessment still created |
| Database error on UPDATE/INSERT | Error logged, assessment still created |
| Invalid `type_id` | Error thrown, specs update failed |
| `asset_id` not in assetdata | OK - specs can exist without master asset |
| No fields match allowedColumns | No update/insert performed |
| File attachment fails | Logged separately, specs still updated |

## Relationship Diagram

```
computer_assessment table
  ├─ id (primary key)
  ├─ asset_id → (foreign key)
  ├─ assess_id → stays NULL (not foreign key)
  └─ assess_id (backref) ← can be NULL or point to computer_assessment.id

assets.1_specs table
  ├─ id (primary key)
  ├─ asset_id (unique key, one per asset) ← matched against incoming asset_id
  ├─ assess_id (optional) → can reference computer_assessment.id
  ├─ type_id (always 1)
  └─ 40+ computer hardware fields
```

## Implementation Checklist

- ✅ asset_id lookup query correct
- ✅ UPDATE logic when record exists
- ✅ INSERT logic when record not found
- ✅ type_id set correctly in INSERT
- ✅ Timestamps auto-managed
- ✅ Field filtering by type_id
- ✅ Operation metadata returned
- ✅ Logging enhanced with operation type
- ✅ Error handling graceful (non-fatal)
- ✅ Code type-checked and compiled
- ✅ Server running with logging active

---

**Quick Test:**
```bash
# Check logs for the operation
POST /api/compliance/it-assess with new asset
→ Look for: "✓ Computer specs INSERTED"

POST /api/compliance/it-assess with same asset
→ Look for: "✓ Computer specs UPDATED"
```
