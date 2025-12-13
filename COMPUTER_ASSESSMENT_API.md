# Computer Assessment API Documentation

## Overview
The Computer Assessment API provides endpoints for managing IT health assessments for computers/laptops. This includes detailed specifications, security status, and hardware inventory.

## Base URL
`/api/compliance/computer-assessments`

## Endpoints

### 1. Get All Computer Assessments
**GET** `/computer-assessments`

**Query Parameters:**
- `asset_id` (optional): Filter by asset ID
- `assessment_year` (optional): Filter by assessment year (e.g., "2024")
- `technician` (optional): Filter by technician username
- `ramco_id` (optional): Filter by employee RAMCO ID (owner)

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "X computer assessment(s) retrieved",
  "data": [
    {
      "id": 1,
      "assessment_year": "2024",
      "assessment_date": "2024-06-15",
      "technician": "jdoe",
      "overall_score": 3,
      "remarks": "Summarize health, open issues, remediation",
      "asset_id": 234,
      "register_number": "ABC123",
      "category": "laptop",
      "brand": "Dell",
      "model": "Latitude 7440",
      "purchase_date": "2023-02-01",
      "costcenter_id": 25,
      "department_id": 13,
      "location_id": 15,
      "ramco_id": "000322",
      "os_name": "Windows",
      "os_version": "11 Pro",
      "os_patch_status": "Updated",
      "cpu_manufacturer": "Intel",
      "cpu_model": "i5-1340P",
      "cpu_generation": "13th Gen",
      "memory_manufacturer": "Samsung",
      "memory_type": "DDR5",
      "memory_size_gb": 16,
      "storage_manufacturer": "Samsung",
      "storage_type": "SSD NVMe",
      "storage_size_gb": 512,
      "graphics_type": "Integrated",
      "graphics_manufacturer": "Intel",
      "graphics_specs": "Iris Xe",
      "display_manufacturer": "LG",
      "display_size": 14,
      "display_resolution": "1920x1080",
      "display_form_factor": "Standard",
      "display_interfaces": ["HDMI", "USB-C"],
      "ports_usb_a": 2,
      "ports_usb_c": 1,
      "ports_thunderbolt": 0,
      "ports_ethernet": 1,
      "ports_hdmi": 1,
      "ports_displayport": 0,
      "ports_vga": 0,
      "ports_sdcard": 1,
      "ports_audiojack": 1,
      "battery_equipped": true,
      "battery_capacity": "56Wh",
      "adapter_equipped": false,
      "adapter_output": null,
      "av_installed": "Installed",
      "av_vendor": "ESET",
      "av_status": "Active",
      "av_license": "Valid",
      "vpn_installed": "Not installed",
      "vpn_setup_type": null,
      "vpn_username": null,
      "installed_software": "ms365, pdf editor, autocad",
      "created_at": "2024-06-15T10:00:00.000Z",
      "updated_at": "2024-06-15T10:00:00.000Z"
    }
  ]
}
```

### 2. Get Computer Assessment by ID
**GET** `/computer-assessments/:id`

**Path Parameters:**
- `id` (required): Assessment ID

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Computer assessment retrieved successfully",
  "data": {
    "id": 1,
    "assessment_year": "2024",
    // ... full assessment object
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid assessment ID
- `404 Not Found`: Assessment not found
- `500 Internal Server Error`: Server error

### 3. Create Computer Assessment
**POST** `/computer-assessments`

**Request Body (JSON):**
```json
{
  "assessment_year": "2024",
  "assessment_date": "2024-06-15",
  "technician": "jdoe",
  "overall_score": 3,
  "remarks": "Summarize health, open issues, remediation",
  "asset_id": 234,
  "register_number": "ABC123",
  "category": "laptop",
  "brand": "Dell",
  "model": "Latitude 7440",
  "purchase_date": "2023-02-01",
  "costcenter_id": 25,
  "department_id": 13,
  "location_id": 15,
  "ramco_id": "000322",
  "os_name": "Windows",
  "os_version": "11 Pro",
  "os_patch_status": "Updated",
  "cpu_manufacturer": "Intel",
  "cpu_model": "i5-1340P",
  "cpu_generation": "13th Gen",
  "memory_manufacturer": "Samsung",
  "memory_type": "DDR5",
  "memory_size_gb": 16,
  "storage_manufacturer": "Samsung",
  "storage_type": "SSD NVMe",
  "storage_size_gb": 512,
  "graphics_type": "Integrated",
  "graphics_manufacturer": "Intel",
  "graphics_specs": "Iris Xe",
  "display_manufacturer": "LG",
  "display_size": 14,
  "display_resolution": "1920x1080",
  "display_form_factor": "Standard",
  "display_interfaces": ["HDMI", "USB-C"],
  "ports_usb_a": 2,
  "ports_usb_c": 1,
  "ports_thunderbolt": 0,
  "ports_ethernet": 1,
  "ports_hdmi": 1,
  "ports_displayport": 0,
  "ports_vga": 0,
  "ports_sdcard": 1,
  "ports_audiojack": 1,
  "battery_equipped": true,
  "battery_capacity": "56Wh",
  "adapter_equipped": false,
  "adapter_output": null,
  "av_installed": "Installed",
  "av_vendor": "ESET",
  "av_status": "Active",
  "av_license": "Valid",
  "vpn_installed": "Not installed",
  "vpn_setup_type": null,
  "vpn_username": null,
  "installed_software": "ms365, pdf editor, autocad"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Computer assessment created successfully",
  "data": {
    "id": 1
  }
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "message": "Error message describing the issue",
  "data": null
}
```

### 4. Update Computer Assessment
**PUT** `/computer-assessments/:id`

**Path Parameters:**
- `id` (required): Assessment ID

**Request Body (JSON):**
Any subset of the fields from the Create endpoint. Only provided fields will be updated.

```json
{
  "overall_score": 4,
  "remarks": "Updated assessment remarks",
  "av_license": "Expired"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Computer assessment updated successfully",
  "data": {
    "id": 1,
    "assessment_year": "2024",
    // ... full updated assessment object
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid assessment ID
- `500 Internal Server Error`: Server error

### 5. Delete Computer Assessment
**DELETE** `/computer-assessments/:id`

**Path Parameters:**
- `id` (required): Assessment ID

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Computer assessment deleted successfully",
  "data": null
}
```

**Error Responses:**
- `400 Bad Request`: Invalid assessment ID
- `500 Internal Server Error`: Server error (e.g., assessment not found)

## Field Descriptions

### Assessment Metadata
- **assessment_year**: Year of assessment (e.g., "2024")
- **assessment_date**: Date the assessment was conducted (YYYY-MM-DD)
- **technician**: ID or username of technician performing assessment
- **overall_score**: Overall health score (0-5 scale recommended)
- **remarks**: General remarks, health summary, issues, and remediation

### Asset Reference
- **asset_id**: Reference to the asset in the asset management system
- **register_number**: Asset register/serial number
- **category**: Asset category (laptop, desktop, monitor, etc.)
- **brand**: Computer brand (Dell, HP, Lenovo, etc.)
- **model**: Computer model name/number
- **purchase_date**: Date of purchase (YYYY-MM-DD)

### Asset Ownership
- **costcenter_id**: Cost center ID where asset belongs
- **department_id**: Department ID responsible for asset
- **location_id**: Physical location of asset
- **ramco_id**: RAMCO ID of primary owner/user

### OS Specifications
- **os_name**: Operating System name (Windows, macOS, Linux)
- **os_version**: OS version/release (e.g., "11 Pro", "Sonoma", "Ubuntu 22.04")
- **os_patch_status**: Patch status (Updated, Pending, Outdated)

### CPU Specifications
- **cpu_manufacturer**: CPU manufacturer (Intel, AMD)
- **cpu_model**: CPU model (e.g., i5-1340P, Ryzen 7 5700X)
- **cpu_generation**: CPU generation (e.g., 13th Gen, 5th Gen)

### Memory Specifications
- **memory_manufacturer**: RAM manufacturer (Samsung, Corsair, Kingston)
- **memory_type**: Memory type (DDR5, DDR4, LPDDR5)
- **memory_size_gb**: Total memory size in GB (8, 16, 32, 64)

### Storage Specifications
- **storage_manufacturer**: Storage manufacturer
- **storage_type**: Storage type (SSD NVMe, SSD SATA, HDD)
- **storage_size_gb**: Storage capacity in GB (256, 512, 1024, etc.)

### Graphics Specifications
- **graphics_type**: Graphics type (Integrated, Dedicated, Hybrid)
- **graphics_manufacturer**: GPU manufacturer (Intel, NVIDIA, AMD)
- **graphics_specs**: GPU specs/model (Iris Xe, RTX 4090, Radeon RX)

### Display Specifications
- **display_manufacturer**: Monitor/display manufacturer
- **display_size**: Display diagonal size in inches (13, 14, 15, 27, etc.)
- **display_resolution**: Resolution (1920x1080, 2560x1440, 3840x2160)
- **display_form_factor**: Form factor (Standard, Ultrawide, 4K, Curved)
- **display_interfaces**: Array of display connection types (["HDMI", "USB-C", "DisplayPort"])

### Ports
- **ports_usb_a**: Number of USB-A ports
- **ports_usb_c**: Number of USB-C ports
- **ports_thunderbolt**: Number of Thunderbolt ports
- **ports_ethernet**: Number of Ethernet ports
- **ports_hdmi**: Number of HDMI ports
- **ports_displayport**: Number of DisplayPort connections
- **ports_vga**: Number of VGA ports
- **ports_sdcard**: Number of SD Card readers
- **ports_audiojack**: Number of audio jack ports

### Battery & Adapter
- **battery_equipped**: Boolean indicating if device has internal battery
- **battery_capacity**: Battery capacity (e.g., "56Wh", "80Wh", "100Wh")
- **adapter_equipped**: Boolean indicating if power adapter is equipped
- **adapter_output**: Adapter power output (e.g., "65W", "140W", "240W")

### Security & VPN
- **av_installed**: Antivirus status ("Installed", "Not installed", "Trial")
- **av_vendor**: Antivirus vendor (ESET, Norton, McAfee, Windows Defender)
- **av_status**: AV status ("Active", "Inactive", "Disabled")
- **av_license**: AV license status ("Valid", "Expired", "No License")
- **vpn_installed**: VPN status ("Installed", "Not installed")
- **vpn_setup_type**: Type of VPN setup (Corporate VPN, Personal VPN, etc.)
- **vpn_username**: VPN username if applicable

### Software
- **installed_software**: Comma-separated or detailed list of installed software and applications

## Query Examples

### Get all assessments for a specific asset
```
GET /api/compliance/computer-assessments?asset_id=234
```

### Get assessments for a specific year and technician
```
GET /api/compliance/computer-assessments?assessment_year=2024&technician=jdoe
```

### Get assessments for a specific employee
```
GET /api/compliance/computer-assessments?ramco_id=000322
```

### Get assessments by cost center
```
GET /api/compliance/computer-assessments?costcenter_id=25
```

## Database Schema

The `computer_assessment` table stores all assessment data with the following characteristics:
- Auto-incrementing primary key (`id`)
- Timestamps for creation and updates (`created_at`, `updated_at`)
- Indexed columns for common queries: `asset_id`, `assessment_year`, `technician`, `ramco_id`, `costcenter_id`, `department_id`, `location_id`
- `display_interfaces` stored as JSON for flexible array handling
- Comprehensive COMMENT documentation for each field

## Notes

- Dates are stored in MySQL DATETIME format but accepted in ISO 8601 format in requests
- The `display_interfaces` field accepts both JSON arrays and comma-separated strings
- All timestamp fields are automatically set by the database
- Array fields like port counts default to 0 if not specified
- The `overall_score` typically uses a 0-5 scale but accepts any integer
