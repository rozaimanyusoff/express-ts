# Computer Assessment - Quick Testing Guide

## Verify the Fix is Working

### 1. Create a Computer Assessment
```bash
# Find a computer asset first
curl http://localhost:3030/api/compliance/it-assets-status?type=1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Note down an asset_id (e.g., 42)

# Create assessment with full hardware specs
curl -X POST http://localhost:3030/api/compliance/it-assess \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "asset_id": 42,
    "register_number": "COMP-TEST-001",
    "assessment_year": 2026,
    "assessment_date": "2026-01-05",
    "category": "Desktop",
    "brand": "Dell",
    "model": "OptiPlex",
    "ramco_id": "EMP001",
    
    "os_name": "Windows 11 Pro",
    "os_version": "23H2",
    "cpu_manufacturer": "Intel",
    "cpu_model": "Core i7-12700",
    "cpu_generation": "12th Gen",
    "memory_manufacturer": "Kingston",
    "memory_type": "DDR4",
    "memory_size_gb": 32,
    "storage_manufacturer": "Samsung",
    "storage_type": "SSD",
    "storage_size_gb": 512,
    
    "battery_equipped": 0,
    "av_installed": "Windows Defender",
    "vpn_installed": "Cisco AnyConnect",
    "overall_score": 95,
    "remarks": "Test assessment"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Computer assessment created successfully",
  "data": {
    "id": 156
  }
}
```

### 2. Verify Data Saved in 1_specs Table
```bash
# Connect to local database
mysql -h localhost -u smart -p'smartP@ssw0rd'

# Check if data was saved
SELECT 
  id, asset_id, os_name, cpu_manufacturer, memory_size_gb, 
  storage_size_gb, battery_equipped, av_installed, vpn_installed
FROM assets.1_specs 
WHERE asset_id = 42
LIMIT 1;
```

**Expected Output:** All fields should have values (not NULL)
```
+----+----------+-------------------+------------------+----------------+------------------+-------------------+-----------------+------------------+
| id | asset_id | os_name           | cpu_manufacturer | memory_size_gb | storage_size_gb | battery_equipped | av_installed    | vpn_installed    |
+----+----------+-------------------+------------------+----------------+------------------+-------------------+-----------------+------------------+
|  1 |       42 | Windows 11 Pro    | Intel            |             32 |              512 | 0                | Windows Defender | Cisco AnyConnect |
+----+----------+-------------------+------------------+-------------------+-----------------+------------------+
```

### 3. Verify Computer Assessment Record
```bash
# Check computer_assessment table
SELECT 
  id, asset_id, os_name, cpu_model, memory_size_gb, 
  overall_score, remarks
FROM compliance.computer_assessment 
WHERE asset_id = 42
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:** Assessment record with all details
```
+-----+----------+-------------------+------------------+----------------+---------------+---------------------+
| id  | asset_id | os_name           | cpu_model        | memory_size_gb | overall_score | remarks             |
+-----+----------+-------------------+------------------+----------------+---------------+---------------------+
| 156 |       42 | Windows 11 Pro    | Core i7-12700    |             32 |            95 | Test assessment     |
+-----+----------+-------------------+------------------+----------------+---------------+---------------------+
```

### 4. Verify All 1_specs Columns Are Populated
```bash
# Check all computer-specific fields
SELECT 
  asset_id,
  os_name, os_version,
  cpu_manufacturer, cpu_model, cpu_generation,
  memory_manufacturer, memory_type, memory_size_gb,
  storage_manufacturer, storage_type, storage_size_gb,
  graphics_type, graphics_manufacturer,
  display_resolution, display_interfaces,
  ports_usb_a, ports_usb_c, ports_ethernet, ports_hdmi,
  battery_equipped, adapter_equipped,
  av_installed, av_vendor, av_status,
  vpn_installed, vpn_setup_type,
  assess_id
FROM assets.1_specs 
WHERE asset_id = 42;
```

**Expected:** All provided fields have values, unprovided fields are NULL (not all zero)

### 5. Test with File Attachments
```bash
# Create multipart request with attachments
curl -X POST http://localhost:3030/api/compliance/it-assess \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "asset_id=42" \
  -F "register_number=COMP-TEST-002" \
  -F "assessment_year=2026" \
  -F "assessment_date=2026-01-05" \
  -F "os_name=Windows 11" \
  -F "cpu_manufacturer=Intel" \
  -F "memory_size_gb=16" \
  -F "attachments[0]=@/path/to/file1.pdf" \
  -F "attachments[1]=@/path/to/file2.jpg" \
  -F "attachments[2]=@/path/to/file3.pdf"
```

**Verify:**
```bash
# Check attachment paths in 1_specs
SELECT asset_id, attachment_1, attachment_2, attachment_3 
FROM assets.1_specs 
WHERE asset_id = 42;
```

**Expected:** Paths like `uploads/compliance/assessment/computer/assessment-156-attachment-0-...`

### 6. Compare with Vehicle Assessment (Verify Backward Compatibility)
```bash
# Create vehicle assessment
curl -X POST http://localhost:3030/api/compliance/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "asset_id": 99,
    "register_number": "VEH-TEST-001",
    "assessment_year": 2026,
    "transmission": "Automatic",
    "fuel_type": "Petrol",
    "chassis_no": "ABC123456789"
  }'

# Verify vehicle specs saved to 2_specs
SELECT 
  asset_id, register_number, transmission, fuel_type, chassis_no
FROM assets.2_specs 
WHERE asset_id = 99;
```

**Expected:** Vehicle fields populated, computer fields ignored (backward compatible ✓)

## Test Checklist

- [ ] Computer assessment creates successfully (status: success)
- [ ] os_name stored in 1_specs (not NULL)
- [ ] cpu_manufacturer stored in 1_specs (not NULL)
- [ ] memory_size_gb stored in 1_specs (correct value)
- [ ] storage_size_gb stored in 1_specs (correct value)
- [ ] battery_equipped stored in 1_specs (correct value)
- [ ] av_installed stored in 1_specs (not NULL)
- [ ] vpn_installed stored in 1_specs (not NULL)
- [ ] ports_* (USB, HDMI, etc.) stored in 1_specs (correct counts)
- [ ] attachment_1, attachment_2, attachment_3 paths saved
- [ ] assess_id field links back to computer_assessment record
- [ ] Vehicle assessments still work (type_id=2)
- [ ] Vehicle-specific fields (transmission, fuel_type) save to 2_specs
- [ ] No errors in server logs

## Known Issues / Debug

### Computer specs not saving?
1. Check `type_id` is being set to `1` in request
2. Verify asset exists in `assets.assetdata`
3. Check server logs for errors in "Error updating computer specs:" message
4. Verify MySQL connection is working: `mysql -h localhost -u smart -p'smartP@ssw0rd'`

### Attachments not saving?
1. Check directory exists: `ls -la /uploads/compliance/assessment/computer/`
2. Verify file upload permissions on server
3. Check "Failed to process attachment" logs
4. Verify attachment field names are exactly `attachments[0]`, `attachments[1]`, `attachments[2]`

### Email notification failed?
1. Check SMTP configuration in .env
2. Verify technician has valid email address
3. Check error log: "Error sending IT assessment notification email:"
4. This doesn't block assessment creation (non-fatal)

## Success Indicators

✅ **Fix is working when:**
1. Computer assessment records create successfully
2. Hardware specs (os_name, cpu, memory, storage, etc.) are saved to 1_specs table
3. All 40+ fields are preserved (not silently dropped)
4. Type-aware filtering works (computer fields go to 1_specs, vehicle fields go to 2_specs)
5. Vehicle assessments still work (backward compatible)
6. Server logs show no "Error updating computer specs:" messages
