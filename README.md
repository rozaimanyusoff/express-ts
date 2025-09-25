# Express TypeScript Backend API

A comprehensive Express.js backend API built with TypeScript, featuring maintenance management, billing, assets, and user management systems.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Maintenance Management](#maintenance-management)
  - [Billing Management](#billing-management)
  - [Asset Management](#asset-management)
  - [Authentication](#authentication)
- [Database Structure](#database-structure)
- [Usage Examples](#usage-examples)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd express-ts

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit environment variables
nano .env

# Start the development server
npm run dev
```

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret

# URLs
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# File Storage / Uploads
# Optional: Override where uploaded files are stored & served from.
# If not set, code falls back to <project_root>/uploads locally.
# In production you might mount an external volume (e.g. /mnt/winshare) and set:
#   UPLOAD_BASE_PATH=/uploads            # internal write path inside container
#   STATIC_UPLOAD_PATH=/mnt/winshare     # path exposed via /uploads route
UPLOAD_BASE_PATH=
STATIC_UPLOAD_PATH=
```

## API Endpoints

### Maintenance Management

#### 1. Get All Maintenance Records
```http
GET /api/mtn/vehicle
```
**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `verified`, `recommended`, `approved`)

**Response:**
```json
{
  "status": "success",
  "message": "Maintenance records data retrieved successfully",
  "data": [
    {
      "req_id": 11136,
      "req_date": "2025-08-13T16:00:00.000Z",
      "svc_type": [
        {"id": 13, "name": "AIRCOND"},
        {"id": 4, "name": "REPAIR"}
      ],
      "req_comment": "AIRCOND TIDAK BERFUNGSI",
      "upload_date": null,
      "verification_date": "2025-08-14T02:47:04.000Z",
      "recommendation_date": "2025-08-14T06:40:34.000Z",
      "approval_date": "2025-08-14T07:05:32.000Z",
      "form_upload_date": "2020-07-19T16:00:00.000Z",
      "emailStat": 0,
      "inv_status": 0,
      "status": "approved",
      "vehicle": {
        "id": 358,
        "register_number": "ABC1234"
      },
      "requester": {
        "ramco_id": "004112",
        "name": "Muhammad Haziq Bin Hamzah",
        "email": "mhaziq.hamzah@ranhill.com.my"
      },
      "recommendation_by": {
        "ramco_id": "000712",
        "name": "Muhammad Arif Bin Abdul Jalil",
        "email": "arif.jalil@ranhill.com.my"
      },
      "approval_by": {
        "ramco_id": "000871",
        "name": "Kamariah Binti Yusof",
        "email": "kamariah@ranhill.com.my"
      },
      "costcenter": {
        "id": 25,
        "name": "NRWMJ8"
      },
      "workshop": {
        "id": 178,
        "name": "ISRAP AUTO SERVICE (SGT)"
      }
    }
  ]
}
```

#### 2. Get Maintenance Record by ID
```http
GET /api/mtn/vehicle/{id}
```
Returns a single maintenance record with the same structure as above.

#### 3. Get Maintenance Records by Vehicle
```http
GET /api/mtn/vehicle/record/{vehicle_id}
```
**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `verified`, `recommended`, `approved`)

**Response:**
```json
{
  "status": "success",
  "message": "Maintenance records for vehicle 358 retrieved successfully",
  "data": [...], // Same structure as get all records
  "count": 5
}
```

#### 4. Create Maintenance Record
```http
POST /api/mtn/vehicle
```
**Request Body:**
```json
{
  "vehicle_id": 358,
  "ramco_id": "004112",
  "svc_opt": "13,4",
  "req_comment": "Vehicle needs air conditioning repair",
  "cc_id": 25,
  "ws_id": 178
}
```

#### 5. Update Maintenance Record
```http
PUT /api/mtn/vehicle/{id}
```
**Request Body:** Same as create, with updated fields.

#### 6. Delete Maintenance Record
```http
DELETE /api/mtn/vehicle/{id}
```

#### 7. Force Invoice Creation
```http
POST /api/mtn/vehicle/{requestId}/forceinvoice
```
Creates an invoice for an approved maintenance record. Prevents duplicates by checking existing invoices.

**Response:**
```json
{
  "status": "success",
  "message": "Invoice created successfully for maintenance record",
  "data": {
    "success": true,
    "insertId": 12345,
    "affectedRows": 1,
    "requestId": 11136
  }
}
```

#### 8. Resend Portal Link
```http
POST /api/mtn/vehicle/{requestId}/resendmail
```
Sends an encrypted portal access link to the maintenance requester via email.

**Response:**
```json
{
  "status": "success",
  "message": "Portal link sent successfully",
  "data": {
    "requestId": 11136,
    "sentTo": "requester@example.com",
    "portalUrl": "http://localhost:3000/mtn/vehicle/portal/11136?_cred=encrypted_data",
    "testMode": false
  }
}
```

### Maintenance Types Management

#### 9. Get All Maintenance Types
```http
GET /api/mtn/types
```

#### 10. Get Maintenance Type by ID
```http
GET /api/mtn/types/{id}
```

#### 11. Create Maintenance Type
```http
POST /api/mtn/types
```

#### 12. Update Maintenance Type
```http
PUT /api/mtn/types/{id}
```

#### 13. Delete Maintenance Type
```http
DELETE /api/mtn/types/{id}
```

### Billing Management

#### 14. Get Billing Accounts
```http
GET /api/billing/accounts
```
Returns billing accounts with full logo URLs.

**Response:**
```json
{
  "status": "success",
  "message": "Billing accounts retrieved successfully",
  "data": [
    {
      "bill_id": 258,
      "bill_ac": "20016523MG1003014",
      "provider": "LAP",
      "logo": "http://localhost:3001/images/vendor_logo/tnb.png",
      "service": "utilities",
      "bfcy_id": 72,
      "cat_id": 6,
      "bill_product": "BIL AIR",
      "bill_desc": "LUMUT RUMAH SEWA 2"
    }
  ]
}
```

#### 15. Get Fuel Billing Vehicle Summary
```http
GET /api/billing/fuel-billing-vehicle-summary?from=2024-01-01&to=2024-12-31&cc=22
```
Returns enriched fuel billing data with resolved category, brand, model, and owner objects.

**Query Parameters:**
- `from` (required): Start date (YYYY-MM-DD)
- `to` (required): End date (YYYY-MM-DD)  
- `cc` (optional): Cost center filter

**Response:**
```json
{
  "status": "success",
  "message": "Fuel billing summary by date range retrieved successfully",
  "data": [
    {
      "vehicle_id": 358,
      "vehicle": "ABC1234",
      "category": {"id": 1, "name": "Sedan"},
      "brand": {"id": 5, "name": "Toyota"},
      "model": {"id": 15, "name": "Camry"},
      "owner": {"ramco_id": "004112", "name": "John Doe"},
      "costcenter": {"id": 22, "name": "DEPT001"},
      "total_litre": 150.5,
      "total_amount": 450.00,
      "details": [
        {
          "year": 2024,
          "expenses": "450.00",
          "fuel": [...]
        }
      ]
    }
  ]
}
```

## Database Structure

### Applications Database
- `vehicle_svc`: Main maintenance records table
- `svctype`: Service types and maintenance categories

### Billings Database  
- `tbl_inv`: Invoice records for maintenance
- `tbl_workshops`: Workshop information

### Assets Database
- Various asset-related tables for vehicles, employees, cost centers

## Usage Examples

### Filtering Maintenance Records
```bash
# Get all pending maintenance records
curl "http://localhost:3001/api/mtn/vehicle?status=pending"

# Get approved maintenance records for specific vehicle
curl "http://localhost:3001/api/mtn/vehicle/record/358?status=approved"
```

### Creating Invoice
```bash
# Force create invoice for approved maintenance request
curl -X POST "http://localhost:3001/api/mtn/vehicle/11136/forceinvoice"
```

### Sending Portal Link
```bash
# Resend portal access link to requester
curl -X POST "http://localhost:3001/api/mtn/vehicle/11136/resendmail"
```

### Fuel Billing Summary
```bash
# Get fuel billing summary with filters
curl "http://localhost:3001/api/billing/fuel-billing-vehicle-summary?from=2024-01-01&to=2024-12-31&cc=22"
```

## Features

- **Data Enrichment**: All endpoints resolve foreign keys to meaningful objects (employees, vehicles, workshops, etc.)
- **Status Filtering**: Filter maintenance records by workflow status
- **Secure Portal Links**: Encrypted credential system for portal access
- **Email Integration**: Automated email notifications with HTML templates
- **Duplicate Prevention**: Invoice creation prevents duplicates
- **Full URL Resolution**: Static assets return complete URLs
- **Comprehensive Error Handling**: Detailed error messages and HTTP status codes

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Uploads Path (Local vs Production)

Uploaded files are publicly served at the route `/uploads`.

Static serving resolution order at runtime:
1. `STATIC_UPLOAD_PATH` (if defined)
2. `/mnt/winshare` (if it exists – typical production mount)
3. Fallback project directory: `<project_root>/uploads`

When writing files (multer, manual saves) the base path is resolved by:
1. `UPLOAD_BASE_PATH` (if set) – if set to `/uploads` locally and not writable, it falls back automatically to `<project_root>/uploads` and logs a warning.
2. Fallback: `<project_root>/uploads`

### Local Development
Leave both variables empty. A folder `./uploads` will be created automatically at first use.

### Production Example
```
UPLOAD_BASE_PATH=/uploads
STATIC_UPLOAD_PATH=/mnt/winshare
```
Ensure your container / host mounts the real persistent volume at `/mnt/winshare` (or whichever directory you choose) and that the process user has write permissions.

### Troubleshooting
- ENOENT or permission errors for `/uploads`: unset `UPLOAD_BASE_PATH` locally or point it to an owned directory.
- Confirm start-up log: `Serving /uploads from: <resolved_path>`.

### Security Note
Any file placed under the resolved directory becomes publicly accessible via `GET /uploads/...`. Add validation and sanitization when accepting file uploads.

## License

[Add your license information here]
