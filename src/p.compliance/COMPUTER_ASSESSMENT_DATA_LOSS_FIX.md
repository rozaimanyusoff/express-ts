# Computer Assessment Data Loss - Bug Fix Summary

## Issue Identified
**Severity:** CRITICAL  
**Impact:** All computer hardware assessment data was being silently dropped and never saved to the database

## Root Cause Analysis

### Database Schema Verification
Connected to local MySQL database (localhost) and verified table structures:

#### 1_specs Table (Computers - type_id=1)
- **Total Columns:** 54
- **Computer-Specific Fields:**
  - OS: os_name, os_version
  - CPU: cpu_manufacturer, cpu_model, cpu_generation
  - Memory: memory_manufacturer, memory_type, memory_size_gb
  - Storage: storage_manufacturer, storage_type, storage_size_gb
  - Graphics: graphics_type, graphics_manufacturer, graphics_specs
  - Display: display_manufacturer, display_size, display_resolution, display_form_factor, display_interfaces
  - Ports: ports_usb_a, ports_usb_c, ports_thunderbolt, ports_ethernet, ports_hdmi, ports_displayport, ports_vga, ports_sdcard, ports_audiojack (9 types)
  - Battery/Power: battery_equipped, battery_capacity, adapter_equipped, adapter_output
  - Security: av_installed, av_vendor, av_status, av_license, vpn_installed, vpn_setup_type, vpn_username
  - Software: installed_software, office_account
  - **Attachments:** attachment_1, attachment_2, attachment_3
  - **Common:** serial_number, brand_id, model_id, category_id, entry_code, asset_code

#### 2_specs Table (Vehicles - type_id=2)
- **Total Columns:** 23
- **Vehicle-Specific Fields:**
  - register_number, chassis_no, engine_no
  - transmission, fuel_type, cubic_meter
  - color, seating_capacity, card_id
  - avls_* fields (availability, install_date, removal_date, transfer_date)
  - Common fields: brand_id, model_id, category_id, entry_code, asset_code

### Bug Location: updateAssetBasicSpecs()
**File:** [src/p.asset/assetModel.ts](src/p.asset/assetModel.ts#L593)  
**Lines:** 593-700

The function had a **hardcoded allowedColumns array** that only included vehicle (2_specs) fields:

```typescript
// BEFORE (BUGGY):
const allowedColumns = [
  'brand_id', 'model_id', 'category_id', 'cubic_meter', 'fuel_type', 'transmission',
  'color', 'chassis_no', 'engine_no', 'seating_capacity', 'mileage', 'avls_availability',
  'avls_install_date', 'avls_removal_date', 'avls_transfer_date'
];
```

### Data Flow
1. `createComputerAssessment()` (complianceController) attempts to save ~40 computer hardware fields
2. Fields are passed to `updateAssetBasicSpecs(asset_id, specData)` as part of specsUpdateData
3. **Function filters incoming data against allowedColumns**
4. **Since allowedColumns only contains vehicle fields, ALL computer fields are filtered out**
5. **Only fields that happen to match (brand_id, model_id, category_id) are saved**
6. **Result: All computer-specific hardware details (os_name, cpu_manufacturer, memory_size_gb, etc.) are lost**

## Solution Implemented

### Made updateAssetBasicSpecs() Type-Aware
Changed from hardcoded allowedColumns to **dynamic type-specific column lists**:

```typescript
// AFTER (FIXED):
let allowedColumns: string[] = [];

if (type_id === 1) {
  // Computer (1_specs) fields - 45 computer-specific columns
  allowedColumns = [
    'serial_number', 'os_name', 'os_version', 'cpu_manufacturer', 'cpu_model', 'cpu_generation',
    'memory_manufacturer', 'memory_type', 'memory_size_gb', 'storage_manufacturer', 'storage_type',
    'storage_size_gb', 'graphics_type', 'graphics_manufacturer', 'graphics_specs', 'display_manufacturer',
    'display_size', 'display_resolution', 'display_form_factor', 'display_interfaces',
    'ports_usb_a', 'ports_usb_c', 'ports_thunderbolt', 'ports_ethernet', 'ports_hdmi',
    'ports_displayport', 'ports_vga', 'ports_sdcard', 'ports_audiojack',
    'battery_equipped', 'battery_capacity', 'adapter_equipped', 'adapter_output',
    'av_installed', 'av_vendor', 'av_status', 'av_license',
    'vpn_installed', 'vpn_setup_type', 'vpn_username', 'installed_software', 'office_account',
    'attachment_1', 'attachment_2', 'attachment_3',
    'brand_id', 'model_id', 'category_id', 'entry_code', 'asset_code'
  ];
} else if (type_id === 2) {
  // Vehicle (2_specs) fields - 17 vehicle-specific columns
  allowedColumns = [
    'register_number', 'chassis_no', 'engine_no', 'transmission', 'fuel_type', 'card_id',
    'cubic_meter', 'color', 'seating_capacity', 'avls_availability', 'avls_install_date',
    'avls_removal_date', 'avls_transfer_date', 'brand_id', 'model_id', 'category_id',
    'entry_code', 'asset_code'
  ];
} else {
  // Other types - common fields only
  allowedColumns = ['brand_id', 'model_id', 'category_id', 'entry_code', 'asset_code'];
}
```

## Changes Made

### File: src/p.asset/assetModel.ts
- **Function:** updateAssetBasicSpecs (lines 593-700)
- **Change Type:** Bug fix - replaced hardcoded allowedColumns with type-specific logic
- **Impact:** Computer assessment data will now be properly saved to assets.1_specs table

## Verification

✅ **Type-check passed:** All TypeScript validation successful  
✅ **No syntax errors:** Code compiles cleanly  
✅ **Backward compatible:** Vehicle assessments (type_id=2) continue to work as before  
✅ **Schema validated:** Confirmed all columns exist in both 1_specs and 2_specs tables

## Next Steps

1. **Test computer assessment creation:**
   ```bash
   POST /api/compliance/it-assess
   Body: {
     asset_id: <computer_asset_id>,
     type_id: 1,
     os_name: "Windows 11",
     cpu_manufacturer: "Intel",
     memory_size_gb: 16,
     ...other fields
   }
   ```

2. **Verify data persistence:**
   ```sql
   SELECT * FROM assets.1_specs WHERE asset_id = <test_asset_id>;
   ```

3. **Check for existing data loss:**
   - Review recent computer assessment records
   - Determine if re-assessment is needed for affected assets

## Impact Summary

- **Severity:** Critical (data loss)
- **Scope:** All computer asset hardware assessments (type_id=1)
- **Fix Type:** Code logic error
- **Deployment:** Requires server restart to take effect
- **Data Recovery:** May require re-running computer assessments if detailed hardware specs were needed

## Files Modified
- [src/p.asset/assetModel.ts](src/p.asset/assetModel.ts#L593-L630) - updateAssetBasicSpecs() function

## Related Issues Fixed in This Session
1. ✅ `/api/compliance/assessments?asset_id={id}` filtering (query parameter handling)
2. ✅ `roadtax_expiry` retrieval (database lookup strategy)
3. ✅ Purchase registry corrections not syncing to assetdata (audit trail implementation)
4. ✅ **Computer assessment hardware data loss (type-aware field filtering)**
