# Computer Assessment - Quick Reference

## Setup

### 1. Run Database Migration
```sql
-- Execute the SQL file in your compliance database
-- File: src/db/computer_assessment.sql
```

### 2. Restart Backend
```bash
npm run dev
```

## API Endpoints

### Get All Assessments
```bash
curl http://localhost:3000/api/compliance/computer-assessments
```

### Get with Filters
```bash
# By asset ID
curl "http://localhost:3000/api/compliance/computer-assessments?asset_id=234"

# By year and technician
curl "http://localhost:3000/api/compliance/computer-assessments?assessment_year=2024&technician=jdoe"

# By owner
curl "http://localhost:3000/api/compliance/computer-assessments?ramco_id=000322"
```

### Get Single Assessment
```bash
curl http://localhost:3000/api/compliance/computer-assessments/1
```

### Create Assessment
```bash
curl -X POST http://localhost:3000/api/compliance/computer-assessments \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_year": "2024",
    "assessment_date": "2024-06-15",
    "technician": "jdoe",
    "overall_score": 3,
    "remarks": "Assessment summary",
    "asset_id": 234,
    "register_number": "ABC123",
    "category": "laptop",
    "brand": "Dell",
    "model": "Latitude 7440",
    "ramco_id": "000322",
    "os_name": "Windows",
    "os_version": "11 Pro",
    "os_patch_status": "Updated",
    "memory_size_gb": 16,
    "storage_size_gb": 512,
    "av_installed": "Installed",
    "av_vendor": "ESET",
    "display_interfaces": ["HDMI", "USB-C"]
  }'
```

### Update Assessment
```bash
curl -X PUT http://localhost:3000/api/compliance/computer-assessments/1 \
  -H "Content-Type: application/json" \
  -d '{
    "overall_score": 4,
    "remarks": "Updated remarks",
    "av_license": "Valid"
  }'
```

### Delete Assessment
```bash
curl -X DELETE http://localhost:3000/api/compliance/computer-assessments/1
```

## Response Format

All responses follow this pattern:

**Success (2xx):**
```json
{
  "status": "success",
  "message": "Descriptive message",
  "data": { /* response data */ }
}
```

**Error (4xx/5xx):**
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

## Field Reference

### Minimal Required Fields (for creation)
```json
{
  "assessment_date": "2024-06-15",
  "technician": "jdoe",
  "asset_id": 234,
  "ramco_id": "000322"
}
```

### Common Fields
| Field | Type | Example |
|-------|------|---------|
| assessment_year | string | "2024" |
| assessment_date | date | "2024-06-15" |
| technician | string | "jdoe" |
| overall_score | number | 3 |
| remarks | string | "Summary of health status" |
| asset_id | number | 234 |
| register_number | string | "ABC123" |
| category | string | "laptop" |
| brand | string | "Dell" |
| model | string | "Latitude 7440" |
| ramco_id | string | "000322" |

### Hardware Specs
| Category | Fields |
|----------|--------|
| OS | os_name, os_version, os_patch_status |
| CPU | cpu_manufacturer, cpu_model, cpu_generation |
| Memory | memory_manufacturer, memory_type, memory_size_gb |
| Storage | storage_manufacturer, storage_type, storage_size_gb |
| Graphics | graphics_type, graphics_manufacturer, graphics_specs |
| Display | display_manufacturer, display_size, display_resolution, display_form_factor, display_interfaces |

### Security
| Field | Values |
|-------|--------|
| av_installed | "Installed", "Not installed", "Trial" |
| av_status | "Active", "Inactive", "Disabled" |
| av_license | "Valid", "Expired", "No License" |
| vpn_installed | "Installed", "Not installed" |

### Ports
All port fields are integers:
- ports_usb_a, ports_usb_c, ports_thunderbolt, ports_ethernet
- ports_hdmi, ports_displayport, ports_vga, ports_sdcard, ports_audiojack

## Filtering Examples

**Get all assessments for an asset:**
```
GET /computer-assessments?asset_id=234
```

**Get assessments by year:**
```
GET /computer-assessments?assessment_year=2024
```

**Get assessments by multiple criteria:**
```
GET /computer-assessments?assessment_year=2024&technician=jdoe&ramco_id=000322
```

**Get assessments by cost center:**
```
GET /computer-assessments?costcenter_id=25
```

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input/missing required fields |
| 404 | Not Found | Assessment not found |
| 500 | Server Error | Database or processing error |

## Notes

- All dates are stored as YYYY-MM-DD format
- Timestamps (created_at, updated_at) are automatically managed
- `display_interfaces` accepts both array and string formats
- Partial updates are supported on PUT
- Filtering is case-sensitive
- Port counts default to 0 if not specified

## Related Documentation

- Full API docs: [COMPUTER_ASSESSMENT_API.md](COMPUTER_ASSESSMENT_API.md)
- Implementation details: [COMPUTER_ASSESSMENT_IMPLEMENTATION.md](COMPUTER_ASSESSMENT_IMPLEMENTATION.md)

---
Last updated: December 14, 2024
