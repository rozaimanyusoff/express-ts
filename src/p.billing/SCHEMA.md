# Billing Module - Database Schema

**Database**: `billings`  
**Full Schema File**: [billings.sql](../../src/db/billings.sql) - Complete database  
**Module-Specific Tables**: [billing_module.sql](../../src/db/billing_module.sql) - Focused tables only

## Database Configuration

- **Billings Database**: `billings` (MySQL pool2)
- **Applications DB**: `applications` (maintenance requests, vehicle_svc table)
- **Assets DB**: `assets` (vehicle and employee data)

## Main Tables

### 1. `billings.tbl_inv` - Vehicle Maintenance Invoices

Master invoice table for maintenance requests.

```sql
CREATE TABLE tbl_inv (
  -- Identifiers
  inv_id INT PRIMARY KEY AUTO_INCREMENT,
  svc_order INT,              -- Foreign key to applications.vehicle_svc.req_id
  vehicle_id INT,
  
  -- Invoice Details
  inv_no VARCHAR(50),         -- Invoice number
  inv_date DATE,              -- Invoice date
  inv_remarks TEXT,
  
  -- Costs
  inv_total DECIMAL(12,2),    -- Total invoice amount
  
  -- Status & Workflow
  inv_stat VARCHAR(50),       -- draft, form uploaded, accrued, invoiced, paid
  
  -- Ownership & Location
  ws_id INT,                  -- Workshop ID
  costcenter_id INT,
  cc_id INT,
  location_id INT,
  
  -- Dates
  svc_date DATE,
  entry_date DATETIME,
  running_no INT,
  
  -- Service Details
  svc_odo VARCHAR(50),        -- Odometer reading
  
  -- File Upload
  attachment VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. `billings.tbl_inv_part` - Invoice Line Items

Parts and services on each invoice.

```sql
CREATE TABLE tbl_inv_part (
  -- Identifiers
  inv_part_id INT PRIMARY KEY AUTO_INCREMENT,
  inv_id INT NOT NULL,
  
  -- Part Details
  part_name VARCHAR(255),
  part_code VARCHAR(100),
  quantity INT,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (inv_id) REFERENCES tbl_inv(inv_id)
);
```

### 3. `billings.fuel_stmt` - Fuel Billing Statements

Monthly or periodic fuel billing statements.

```sql
CREATE TABLE fuel_stmt (
  -- Identifiers
  stmt_id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Statement Details
  stmt_no VARCHAR(50),
  stmt_date DATE,
  stmt_month VARCHAR(50),     -- YYYY-MM format
  
  -- Vendor/Issuer
  fuel_vendor_id INT,
  
  -- Amounts
  stmt_total DECIMAL(12,2),
  
  -- Status
  status VARCHAR(50),         -- pending, approved, invoiced, paid
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. `billings.fuel_stmt_detail` - Per-Vehicle Fuel Costs

Fuel cost allocation per vehicle per statement.

```sql
CREATE TABLE fuel_stmt_detail (
  -- Identifiers
  id INT PRIMARY KEY AUTO_INCREMENT,
  stmt_id INT NOT NULL,
  vehicle_id INT,
  
  -- Amounts
  amount DECIMAL(12,2),
  quantity DECIMAL(10,2),     -- Liters
  
  -- Ownership
  costcenter_id INT,
  cc_id INT,
  location_id INT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (stmt_id) REFERENCES fuel_stmt(stmt_id)
);
```

### 5. `billings.fuel_vendor` - Fuel Vendors/Issuers

Fuel vendors and card issuers.

```sql
CREATE TABLE fuel_vendor (
  -- Identifiers
  vendor_id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Details
  vendor_name VARCHAR(100) NOT NULL,
  vendor_code VARCHAR(50),
  contact_info VARCHAR(255),
  
  -- Status
  status INT DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 6. `billings.fleet2` - Fleet Cards

Fleet/fuel cards issued to vehicles.

```sql
CREATE TABLE fleet2 (
  -- Identifiers
  fleet_id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Card Details
  card_number VARCHAR(50),
  card_type VARCHAR(50),      -- Fuel, MultiCard, etc.
  issuer_id INT,              -- Foreign key to fuel_vendor
  
  -- Status
  card_status VARCHAR(50),    -- Active, Inactive, Expired
  issued_date DATE,
  expiry_date DATE,
  
  -- Limits
  daily_limit DECIMAL(12,2),
  monthly_limit DECIMAL(12,2),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 7. `billings.fleet_history` - Fleet Card Transactions

Transaction history for fleet cards.

```sql
CREATE TABLE fleet_history (
  -- Identifiers
  history_id INT PRIMARY KEY AUTO_INCREMENT,
  fleet_id INT NOT NULL,
  
  -- Transaction Details
  transaction_type VARCHAR(50), -- fuel, fee, adjustment
  transaction_date DATETIME,
  amount DECIMAL(12,2),
  
  -- Reference
  reference_no VARCHAR(100),
  remarks TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (fleet_id) REFERENCES fleet2(fleet_id)
);
```

### 8. `billings.fleet_asset` - Fleet Card to Asset Mapping

Maps fleet cards to vehicles/assets.

```sql
CREATE TABLE fleet_asset (
  -- Identifiers
  mapping_id INT PRIMARY KEY AUTO_INCREMENT,
  fleet_id INT NOT NULL,
  asset_id INT NOT NULL,
  
  -- Period
  issued_date DATE,
  returned_date DATE,
  
  -- Status
  status VARCHAR(50),         -- Active, Returned, Inactive
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY (fleet_id, asset_id),
  FOREIGN KEY (fleet_id) REFERENCES fleet2(fleet_id)
);
```

### 9. `billings.tbl_util` - Utility Bills

Utility billing statements (electricity, water, etc.).

```sql
CREATE TABLE tbl_util (
  -- Identifiers
  util_id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Bill Details
  util_type VARCHAR(50),      -- Electricity, Water, Gas, etc.
  bill_month VARCHAR(50),     -- YYYY-MM format
  bill_amount DECIMAL(12,2),
  
  -- Account Link
  account_id INT,
  
  -- Due & Payment
  due_date DATE,
  paid_date DATE,
  
  -- Status
  status VARCHAR(50),         -- pending, paid, overdue
  
  -- Remarks
  remarks TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 10. `billings.util_billing_ac` - Utility Billing Accounts

Utility account master data.

```sql
CREATE TABLE util_billing_ac (
  -- Identifiers
  account_id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Account Details
  account_number VARCHAR(100),
  account_name VARCHAR(255),
  util_type VARCHAR(50),
  
  -- Location
  location_id INT,
  department_id INT,
  costcenter_id INT,
  
  -- Service
  service_provider VARCHAR(100),
  
  -- Status
  status INT DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 11. `billings.util_beneficiary` - Utility Beneficiaries

Beneficiaries or properties for utility payments.

```sql
CREATE TABLE util_beneficiary (
  -- Identifiers
  beneficiary_id INT PRIMARY KEY AUTO_INCREMENT,
  account_id INT NOT NULL,
  
  -- Details
  beneficiary_name VARCHAR(255),
  property_address TEXT,
  contact_person VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  
  -- Status
  status INT DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (account_id) REFERENCES util_billing_ac(account_id)
);
```

## Key Interfaces

### VehicleMaintenance Invoice

```typescript
interface VehicleMaintenance {
  inv_id?: number;
  svc_order?: number;
  vehicle_id?: number;
  inv_no?: string;
  inv_date?: Date | string;
  inv_total?: string | number;
  inv_stat?: string;  // draft, form uploaded, accrued, invoiced, paid
  inv_remarks?: string;
  ws_id?: number;
  costcenter_id?: number;
  location_id?: number;
  svc_date?: Date | string;
  svc_odo?: string;
  attachment?: string;
  running_no?: number;
}
```

### Invoice Status Calculation

```typescript
enum InvoiceStatus {
  Draft = "draft",           // No form upload, no amount
  FormUploaded = "form uploaded",  // Form uploaded, no amount
  Accrued = "accrued",       // Form uploaded, amount set, no invoice
  Invoiced = "invoiced",     // Invoice number & date set
  Paid = "paid"
}

function calculateInvStat(
  inv_no: string,
  inv_date: Date,
  form_upload_date: Date,
  inv_total: number
): InvoiceStatus {
  const hasInvNo = inv_no && inv_no.trim() !== '';
  const hasInvDate = !!inv_date;
  const hasFormUpload = !!form_upload_date;
  const hasAmount = inv_total > 0;
  
  if (hasInvNo && hasInvDate && hasAmount) return "invoiced";
  if (!hasInvNo && !hasInvDate && hasFormUpload && hasAmount) return "accrued";
  if (!hasInvNo && !hasInvDate && hasFormUpload && !hasAmount) return "form uploaded";
  return "draft";
}
```

## Query Patterns

### Get Vehicle Maintenance Billings by Year
```sql
SELECT * FROM billings.tbl_inv
WHERE YEAR(entry_date) = 2024
ORDER BY entry_date DESC;
```

### Get Fuel Cost by Vehicle and Cost Center
```sql
SELECT f.stmt_month, f.costcenter_id, SUM(f.amount) as total_cost
FROM billings.fuel_stmt_detail f
WHERE f.stmt_id IN (
  SELECT stmt_id FROM billings.fuel_stmt WHERE stmt_date BETWEEN ? AND ?
)
GROUP BY f.stmt_month, f.costcenter_id;
```

### Get Unseen Bills (Badge Count)
```sql
SELECT COUNT(*) FROM billings.tbl_inv
WHERE (inv_stat = 'form uploaded' OR inv_stat = 'accrued')
  AND (inv_no IS NULL OR inv_date IS NULL);
```

### Get Utility Bills by Account
```sql
SELECT u.*, a.account_number, a.service_provider
FROM billings.tbl_util u
LEFT JOIN billings.util_billing_ac a ON u.account_id = a.account_id
WHERE u.account_id = ? AND u.bill_month >= ?
ORDER BY u.bill_month DESC;
```

## Indexes

### Performance Indexes
```sql
CREATE INDEX idx_tbl_inv_vehicle ON tbl_inv(vehicle_id);
CREATE INDEX idx_tbl_inv_svc_order ON tbl_inv(svc_order);
CREATE INDEX idx_tbl_inv_date ON tbl_inv(inv_date);
CREATE INDEX idx_tbl_inv_status ON tbl_inv(inv_stat);
CREATE INDEX idx_tbl_inv_entry_date ON tbl_inv(entry_date);

CREATE INDEX idx_fuel_stmt_vendor ON fuel_stmt(fuel_vendor_id);
CREATE INDEX idx_fuel_stmt_date ON fuel_stmt(stmt_date);
CREATE INDEX idx_fuel_detail_stmt ON fuel_stmt_detail(stmt_id);
CREATE INDEX idx_fuel_detail_vehicle ON fuel_stmt_detail(vehicle_id);
CREATE INDEX idx_fuel_detail_cc ON fuel_stmt_detail(costcenter_id);

CREATE INDEX idx_fleet_card_status ON fleet2(card_status);
CREATE INDEX idx_fleet_asset_asset ON fleet_asset(asset_id);

CREATE INDEX idx_util_account ON tbl_util(account_id);
CREATE INDEX idx_util_status ON tbl_util(status);
```

## Relationships

```
fuel_vendor ──→ fuel_stmt.fuel_vendor_id
fuel_vendor ──→ fleet2.issuer_id

fleet2 ──→ fleet_history.fleet_id
fleet2 ──→ fleet_asset.fleet_id
         └──→ assets.vehicle.id

tbl_inv ──→ tbl_inv_part.inv_id
        ├──→ applications.vehicle_svc.req_id (via svc_order)
        └──→ assets.vehicle.id (via vehicle_id)

fuel_stmt ──→ fuel_stmt_detail.stmt_id

util_billing_ac ──→ util_beneficiary.account_id
                ├──→ tbl_util.account_id
                └──→ assets.location.id (via location_id)
```

## Performance Considerations

- **Selective Columns**: Query only needed fields
- **Date Range Filtering**: Use indexed date columns
- **Cost Center Filter**: Pre-filter in WHERE clause
- **Connection Pooling**: Reuse MySQL connections
- **Lazy Loading**: Load related data only when needed
- **Report Generation**: Build Excel exports from pre-aggregated queries

## Migration Notes

For schema updates:
1. Add migration file to `db/migrations/`
2. Update table definitions above
3. Update TypeScript interfaces
4. Test queries with sample data
5. Document breaking changes in ENHANCEMENTS.md
