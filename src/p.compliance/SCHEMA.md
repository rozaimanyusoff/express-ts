# Compliance Module - Database Schema

**Database**: `compliance`  
**Full Schema File**: [compliance.sql](../../src/db/compliance.sql) - Complete database  
**Module-Specific Tables**: [compliance_module.sql](../../src/db/compliance_module.sql) - Focused tables only

## Database Configuration

- **Main Database**: `compliance` (MySQL pool)
- **Related Databases**: `applications` (maintenance), `assets` (vehicle/IT data)

## Main Tables

### 1. `compliance.summon` - Summon Records

Tracks legal summons issued to vehicles/organization.

```sql
CREATE TABLE summon (
  -- Identifiers
  id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT,                -- Foreign key to assets.vehicle
  
  -- Summon Details
  summon_date DATE,            -- Date summon was issued
  type_id INT,                 -- Foreign key to summon_type
  agency_id INT,               -- Foreign key to summon_agency
  
  -- Amount & Payment
  amount DECIMAL(12,2),        -- Summon amount
  payment_date DATE,           -- Date paid (if settled)
  payment_amount DECIMAL(12,2), -- Amount paid
  payment_method VARCHAR(50),  -- Payment method
  payment_reference VARCHAR(100), -- Payment reference/receipt
  
  -- Documentation
  summon_upl VARCHAR(255),     -- Original summon document
  summon_receipt VARCHAR(255), -- Payment receipt/proof
  
  -- Notes & Status
  remarks TEXT,
  status VARCHAR(50),          -- pending, paid, disputed, closed
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. `compliance.summon_type` - Summon Classifications

Types of summons (traffic violation, parking, etc.).

```sql
CREATE TABLE summon_type (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. `compliance.summon_agency` - Enforcement Agencies

Agencies that issue summons.

```sql
CREATE TABLE summon_agency (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  contact_info VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. `compliance.summon_type_agency` - Type-Agency Mapping

Many-to-many relationship between summon types and agencies.

```sql
CREATE TABLE summon_type_agency (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type_id INT NOT NULL,
  agency_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (type_id, agency_id),
  FOREIGN KEY (type_id) REFERENCES summon_type(id),
  FOREIGN KEY (agency_id) REFERENCES summon_agency(id)
);
```

### 5. `compliance.v_assess2` - Vehicle Assessments

Main vehicle health assessment records.

```sql
CREATE TABLE v_assess2 (
  -- Identifiers
  assess_id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT NOT NULL,
  
  -- Assessment Details
  assess_date DATE,
  assess_year YEAR,
  technician VARCHAR(100),
  
  -- Status & Scoring
  adt_status INT,      -- 0=incomplete, 1=complete
  overall_score INT,   -- 1=poor, 2=fair, 3=good, 4=excellent
  
  -- Findings Summary
  remarks TEXT,
  
  -- Ownership & Location
  ramco_id VARCHAR(20),
  department_id INT,
  costcenter_id INT,
  location_id INT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 6. `compliance.v_assess_dt2` - Vehicle Assessment Details

Individual findings/checklist items for assessments.

```sql
CREATE TABLE v_assess_dt2 (
  -- Identifiers
  assess_dt_id INT PRIMARY KEY AUTO_INCREMENT,
  assess_id INT NOT NULL,
  criteria_id INT,      -- Foreign key to assessment criteria
  
  -- Finding Details
  adt_finding TEXT,     -- Description of finding
  adt_remarks TEXT,     -- Notes on finding
  
  -- Status & Classification
  adt_status INT,       -- Finding status
  adt_ncr INT,          -- 0=pass, 1=minor, 2=non-conformance (NCR)
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assess_id) REFERENCES v_assess2(assess_id)
);
```

### 7. `compliance.v_assess_qset` - Assessment Criteria/Questionnaires

Set of questions/criteria used in vehicle assessments.

```sql
CREATE TABLE v_assess_qset (
  assess_qset_id INT PRIMARY KEY AUTO_INCREMENT,
  question_text TEXT NOT NULL,
  question_category VARCHAR(100),
  response_type ENUM('yes_no', 'scale', 'text'),
  sequence_order INT,
  is_active INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 8. `compliance.computer_assessment` - IT Hardware Assessments

Computer/laptop health assessments.

```sql
CREATE TABLE computer_assessment (
  -- Identifiers
  id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT NOT NULL,
  
  -- Assessment Metadata
  assessment_year VARCHAR(4),
  assessment_date DATE,
  technician VARCHAR(100),
  
  -- Scoring & Remarks
  overall_score INT,           -- 1-5 scale
  remarks TEXT,
  
  -- Asset Details (from linked asset)
  register_number VARCHAR(100),
  category VARCHAR(50),
  brand VARCHAR(100),
  model VARCHAR(100),
  purchase_date DATE,
  
  -- Asset Ownership
  costcenter_id INT,
  department_id INT,
  location_id INT,
  ramco_id VARCHAR(20),
  
  -- OS Information
  os_name VARCHAR(100),
  os_version VARCHAR(100),
  os_patch_status VARCHAR(50),
  
  -- CPU Details
  cpu_manufacturer VARCHAR(100),
  cpu_model VARCHAR(100),
  cpu_generation VARCHAR(50),
  cpu_cores INT,
  cpu_threads INT,
  
  -- Memory
  memory_manufacturer VARCHAR(100),
  memory_type VARCHAR(50),      -- DDR4, DDR5, etc.
  memory_size_gb INT,
  
  -- Storage
  storage_manufacturer VARCHAR(100),
  storage_type VARCHAR(50),     -- SSD, HDD, NVMe, etc.
  storage_size_gb INT,
  
  -- Graphics
  graphics_type VARCHAR(50),    -- Integrated, Discrete
  graphics_manufacturer VARCHAR(100),
  graphics_specs VARCHAR(100),
  
  -- Display
  display_manufacturer VARCHAR(100),
  display_size DECIMAL(3,1),
  display_resolution VARCHAR(50),
  
  -- Display Interfaces (JSON array)
  display_interfaces JSON,       -- ["HDMI", "USB-C", "DP"]
  
  -- Ports & Connectivity
  usb_ports INT,
  audio_jack INT,
  sd_card_reader INT,
  thunderbolt_ports INT,
  
  -- Security
  antivirus_installed INT,
  antivirus_vendor VARCHAR(100),
  antivirus_status VARCHAR(50),
  antivirus_license_valid INT,
  
  vpn_installed INT,
  vpn_type VARCHAR(100),
  vpn_username VARCHAR(100),
  
  -- Software
  installed_apps TEXT,          -- List of installed applications
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY (asset_id, assessment_year)
);
```

### 9. `compliance.criteria_ownership` - Criteria Ownership

Mapping of assessment criteria to department/technician ownership.

```sql
CREATE TABLE criteria_ownership (
  id INT PRIMARY KEY AUTO_INCREMENT,
  criteria_id INT NOT NULL,
  owner_type VARCHAR(50),        -- department, technician, team
  owner_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Key Interfaces

### Summon (from summon table)

```typescript
interface Summon {
  id?: number;
  asset_id?: number;
  summon_date?: Date | string;
  type_id?: number;
  agency_id?: number;
  amount?: number;
  payment_date?: Date | string;
  payment_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  summon_upl?: string;          // File path
  summon_receipt?: string;      // File path
  remarks?: string;
  status?: string;              // pending, paid, disputed, closed
  created_at?: Date;
  updated_at?: Date;
}
```

### VehicleAssessment (from v_assess2)

```typescript
interface VehicleAssessment {
  assess_id?: number;
  asset_id?: number;
  assess_date?: Date | string;
  assess_year?: number;
  technician?: string;
  adt_status?: number;          // 0=incomplete, 1=complete
  overall_score?: number;       // 1=poor, 2=fair, 3=good, 4=excellent
  remarks?: string;
  ramco_id?: string;
  department_id?: number;
  costcenter_id?: number;
  location_id?: number;
  created_at?: Date;
  updated_at?: Date;
}
```

### VehicleAssessmentDetail (from v_assess_dt2)

```typescript
interface VehicleAssessmentDetail {
  assess_dt_id?: number;
  assess_id?: number;
  criteria_id?: number;
  adt_finding?: string;
  adt_remarks?: string;
  adt_status?: number;
  adt_ncr?: number;             // 0=pass, 1=minor, 2=NCR (non-conformance)
  created_at?: Date;
  updated_at?: Date;
}
```

### ComputerAssessment (from computer_assessment)

```typescript
interface ComputerAssessment {
  id?: number;
  asset_id?: number;
  assessment_year?: string;
  assessment_date?: Date | string;
  technician?: string;
  overall_score?: number;       // 1-5 scale
  remarks?: string;
  
  // Asset Details
  register_number?: string;
  category?: string;
  brand?: string;
  model?: string;
  purchase_date?: Date | string;
  
  // Ownership
  costcenter_id?: number;
  department_id?: number;
  location_id?: number;
  ramco_id?: string;
  
  // OS
  os_name?: string;
  os_version?: string;
  os_patch_status?: string;
  
  // Hardware
  cpu_manufacturer?: string;
  cpu_model?: string;
  memory_size_gb?: number;
  storage_size_gb?: number;
  
  // Display
  display_manufacturer?: string;
  display_size?: number;
  display_resolution?: string;
  display_interfaces?: string[]; // JSON parsed
  
  // Security
  antivirus_installed?: number;
  antivirus_vendor?: string;
  vpn_installed?: number;
  
  created_at?: Date;
  updated_at?: Date;
}
```

## Query Patterns

### Get Vehicle Assessments by Year
```sql
SELECT * FROM compliance.v_assess2
WHERE assess_year = 2024
ORDER BY assess_date DESC;
```

### Get NCR Items from Assessment
```sql
SELECT * FROM compliance.v_assess_dt2
WHERE assess_id = ? AND adt_ncr = 2
ORDER BY assess_dt_id;
```

### Get NCR Maintenance Actions
```sql
SELECT req_id, req_date, svc_opt, drv_stat, approval_stat
FROM applications.vehicle_svc
WHERE asset_id = ? 
  AND FIND_IN_SET('32', svc_opt) > 0
  AND req_date >= ?
ORDER BY req_date DESC;
```

### Get IT Assessment Status by Year
```sql
SELECT a.id, a.asset_id, ca.id as assessment_id, ca.overall_score
FROM assets.asset a
LEFT JOIN compliance.computer_assessment ca 
  ON a.id = ca.asset_id AND ca.assessment_year = ?
WHERE a.type_id = 1  -- IT devices
ORDER BY a.id;
```

### Get Unpaid Summons
```sql
SELECT * FROM compliance.summon
WHERE status != 'paid' AND payment_date IS NULL
ORDER BY summon_date DESC;
```

## Indexes

### Performance Indexes
```sql
CREATE INDEX idx_summon_asset ON summon(asset_id);
CREATE INDEX idx_summon_date ON summon(summon_date);
CREATE INDEX idx_summon_status ON summon(status);

CREATE INDEX idx_assess_asset ON v_assess2(asset_id);
CREATE INDEX idx_assess_date ON v_assess2(assess_date);
CREATE INDEX idx_assess_year ON v_assess2(assess_year);

CREATE INDEX idx_assess_dt_assess ON v_assess_dt2(assess_id);
CREATE INDEX idx_assess_dt_ncr ON v_assess_dt2(adt_ncr);

CREATE INDEX idx_computer_assess_asset ON computer_assessment(asset_id);
CREATE INDEX idx_computer_assess_year ON computer_assessment(assessment_year);
CREATE INDEX idx_computer_assess_technician ON computer_assessment(technician);

CREATE UNIQUE INDEX idx_computer_unique ON computer_assessment(asset_id, assessment_year);
```

## Relationships

```
summon_type ──┐
              ├─→ summon_type_agency ←─┬─ summon_agency
              └─ summon.type_id          └─ summon.agency_id

asset.id ──┬─→ summon.asset_id
           ├─→ v_assess2.asset_id ──→ v_assess_dt2.assess_id
           └─→ computer_assessment.asset_id

v_assess_qset ──→ v_assess_dt2.criteria_id (optional)
v_assess_qset ──→ criteria_ownership.criteria_id
```

## Performance Considerations

- **Selective Columns**: Query only needed fields
- **Indexed Lookups**: Filter by indexed columns (asset_id, date, year)
- **JSON Handling**: Parsed in application layer
- **Connection Pooling**: Reuse MySQL connections
- **Lazy Loading**: Load related data only when needed

## Migration Notes

For schema updates:
1. Add migration file to `db/migrations/`
2. Update table definitions above
3. Update TypeScript interfaces in model
4. Test queries with sample data
5. Document breaking changes
