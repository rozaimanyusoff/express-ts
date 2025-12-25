# Maintenance Module - Database Schema

**Database**: `applications`  
**Full Schema File**: [applications.sql](../../src/db/applications.sql) - Complete database  
**Module-Specific Tables**: [maintenance_module.sql](../../src/db/maintenance_module.sql) - Focused tables only

## Database Configuration

- **Primary DB**: `applications` (MySQL pool)
- **Secondary DB**: `assets` (MySQL pool2)  
- **Billing DB**: `billings`

## Main Tables

### 1. `applications.vehicle_svc` - Vehicle Service Requests

Master table for all vehicle maintenance requests.

```sql
CREATE TABLE vehicle_svc (
  -- Identifiers
  req_id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT NOT NULL,
  ramco_id VARCHAR(20) NOT NULL,
  
  -- Request Details
  req_date DATETIME,
  req_comment TEXT,
  svc_opt VARCHAR(255),  -- Comma-separated service option IDs
  ws_id INT,              -- Workshop ID
  costcenter_id INT,
  cc_id INT,
  
  -- Verification Workflow (Level 1)
  verification_stat INT,  -- 0=pending, 1=approved, 2=rejected
  verification_date DATETIME,
  verification_by VARCHAR(20),
  verification TEXT,      -- Verification notes/reason
  
  -- Recommendation Workflow (Level 2)
  recommendation_stat INT,  -- 0=pending, 1=approved, 2=rejected
  recommendation_date DATETIME,
  recommendation_by VARCHAR(20),
  recommendation TEXT,     -- Recommendation notes/reason
  
  -- Approval Workflow (Level 3)
  approval_stat INT,      -- 0=pending, 1=approved, 2=rejected
  approval_date DATETIME,
  approval_by VARCHAR(20),
  approval TEXT,          -- Approval notes/reason
  
  -- Driver Engagement
  drv_stat INT,           -- 0=pending, 1=accepted, 2=cancelled
  drv_date DATETIME,
  
  -- Form Upload
  form_upload VARCHAR(255),     -- PDF/Image file path
  form_upload_date DATETIME,
  
  -- Invoice/Billing
  inv_status VARCHAR(50),       -- Status: pending, processed, invoiced, paid
  
  -- Additional Fields
  upload_date DATETIME,
  emailStat INT
);
```

**Key Indexes**:
- `PRIMARY KEY (req_id)`
- `INDEX (asset_id)`
- `INDEX (ramco_id)`
- `INDEX (req_date)`
- `INDEX (verification_stat, recommendation_stat, approval_stat)`

### 2. `applications.svctype` - Service Types

Configuration table for available maintenance service types.

```sql
CREATE TABLE svctype (
  svctype_id INT PRIMARY KEY AUTO_INCREMENT,
  svctype_name VARCHAR(100) NOT NULL,
  svctype_description TEXT,
  status INT                -- 1=active, 0=inactive
);
```

### 3. `billings.tbl_inv` - Maintenance Billing/Invoices

Billing records linked to approved maintenance requests.

```sql
CREATE TABLE tbl_inv (
  -- Identifiers
  inv_id INT PRIMARY KEY AUTO_INCREMENT,
  req_id INT,              -- Foreign key to vehicle_svc.req_id
  
  -- Invoice Details
  inv_date DATETIME,
  inv_amount DECIMAL(12,2),
  inv_status VARCHAR(50),  -- pending, processed, invoiced, paid
  
  -- Additional Fields
  payment_date DATETIME,
  notes TEXT
);
```

**Key Indexes**:
- `PRIMARY KEY (inv_id)`
- `UNIQUE KEY (req_id)`  -- One invoice per request
- `INDEX (inv_status)`
- `INDEX (inv_date)`

### 4. Related Tables (for lookups)

#### `assets.vehicle` - Vehicles/Assets
```sql
-- Used to fetch asset details (vehicle name, license plate, etc.)
SELECT id, name, license_plate, ... FROM assets.vehicle
```

#### `assets.insurance` - Vehicle Insurance
```sql
-- Insurance details linked to assets
SELECT insurance_id, asset_id, provider, ... FROM assets.insurance
```

#### `assets.vehicle_insurance` - Road Tax
```sql
-- Road tax/permit information
SELECT id, asset_id, tax_amount, ... FROM assets.vehicle_insurance
```

#### `assets.employee` - Employee Directory
```sql
-- Employee information (name, email, ramco_id)
SELECT ramco_id, full_name, email, department ... FROM assets.employee
```

#### `assets.touchngo` & `touchngo_det` - TnG Cards
```sql
-- RFID/TnG card tracking
SELECT card_id, asset_id, balance ... FROM assets.touchngo
```

## Key Interfaces

### MaintenanceRequest (from vehicle_svc)

```typescript
interface MaintenanceRequest {
  req_id: number;
  asset_id: number;
  ramco_id: string;
  
  // Request Details
  req_date: Date;
  req_comment: string;
  svc_opt: string;        // "32,35" (comma-separated)
  ws_id: number;
  costcenter_id: number;
  
  // Workflow Status
  verification_stat: number;   // 0|1|2
  recommendation_stat: number; // 0|1|2
  approval_stat: number;       // 0|1|2
  drv_stat: number;            // 0|1|2
  
  // Timestamps
  verification_date?: Date;
  recommendation_date?: Date;
  approval_date?: Date;
  drv_date?: Date;
  form_upload_date?: Date;
  
  // Who did what
  verification_by?: string;
  recommendation_by?: string;
  approval_by?: string;
  
  // Reasons/Comments
  verification?: string;
  recommendation?: string;
  approval?: string;
  
  // Upload & Billing
  form_upload?: string;
  inv_status?: string;
  emailStat?: number;
}
```

### Workflow Status Values

```typescript
enum WorkflowStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2
}

enum DriverStatus {
  Pending = 0,
  Accepted = 1,
  Cancelled = 2
}

enum InvoiceStatus {
  Pending = "pending",
  Processed = "processed",
  Invoiced = "invoiced",
  Paid = "paid"
}
```

### Computed Properties

#### `application_status` - Overall Request Status
```
- "PENDING" → All workflow stats are 0
- "VERIFIED" → verification=1, others=0
- "RECOMMENDED" → verification=1, recommendation=1, approval=0
- "APPROVED" → All workflow stats = 1
- "REJECTED" → Any stat = 2
- "CANCELLED" → drv_stat = 2
```

#### `status` - Simplified Status
```
- "pending" → Pending at any stage
- "verified" → Passed verification
- "recommended" → Passed recommendation
- "approved" → Fully approved
- "rejected" → Rejected at any stage
- "cancelled" → Driver cancelled
```

## Query Patterns

### Get Pending Maintenance Requests
```sql
SELECT * FROM applications.vehicle_svc
WHERE verification_stat = 0 
  AND recommendation_stat = 0 
  AND approval_stat = 0
ORDER BY req_id DESC;
```

### Get Approved Maintenance Requests
```sql
SELECT * FROM applications.vehicle_svc
WHERE verification_stat = 1 
  AND recommendation_stat = 1 
  AND approval_stat = 1
ORDER BY req_id DESC;
```

### Get Unseen Bills Count
```sql
SELECT COUNT(*) as count 
FROM applications.vehicle_svc v
LEFT JOIN billings.tbl_inv i ON v.req_id = i.req_id
WHERE v.form_upload IS NOT NULL
  AND v.form_upload != ''
  AND (i.inv_status NOT IN ('processed', 'invoiced', 'paid') OR i.inv_id IS NULL);
```

### Get Maintenance Records by Vehicle
```sql
SELECT v.*, 
       i.inv_id, i.inv_date, i.inv_amount, i.inv_status,
       a.name as asset_name, a.license_plate
FROM applications.vehicle_svc v
LEFT JOIN billings.tbl_inv i ON v.req_id = i.req_id
LEFT JOIN assets.vehicle a ON v.asset_id = a.id
WHERE v.asset_id = ?
ORDER BY v.req_id DESC;
```

## Performance Considerations

### Indexes Created
1. `vehicle_svc(asset_id)` - For lookups by vehicle
2. `vehicle_svc(ramco_id)` - For lookups by requester
3. `vehicle_svc(req_date)` - For date-based filtering
4. `vehicle_svc(verification_stat, recommendation_stat, approval_stat)` - For workflow filtering
5. `tbl_inv(req_id)` - Foreign key lookup with UNIQUE constraint

### Optimization Techniques
- **Selective Columns**: Select only needed columns, not `SELECT *`
- **Lazy Loading**: Filter lookup tables to only referenced IDs
- **Optional Joins**: Exclude invoice data by default (add query param to include)
- **Connection Pooling**: Reuse MySQL connections

## Migration Notes

If schema needs updates:
1. Add migration file to `db/migrations/`
2. Update table definitions above
3. Update TypeScript interfaces
4. Test queries with sample data
5. Document breaking changes in ENHANCEMENTS.md
