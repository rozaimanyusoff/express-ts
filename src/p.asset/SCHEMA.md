# Asset Module - Database Schema

## Database Reference
- **Full Database Schema**: [assets.sql](../../src/db/assets.sql) (50K)
- **Module-Specific Tables**: [asset_module.sql](../../src/db/asset_module.sql)

---

## Core Asset Table

### assetdata
Primary asset registry table storing all asset information.

```sql
CREATE TABLE `assetdata` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(5) DEFAULT NULL,
  `asset_code` varchar(50) DEFAULT NULL,
  `asset_name` varchar(255) DEFAULT NULL,
  `type_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `brand_id` int DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `cost_center_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `site_id` int DEFAULT NULL,
  `zone_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `purchase_year` int DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `record_status` varchar(20) DEFAULT 'active',
  `purpose` varchar(100) DEFAULT NULL,
  `classification` varchar(50) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_type_id` (`type_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_status` (`record_status`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4;
```

**TypeScript Interface**:
```typescript
interface AssetData {
  id: number;
  entry_code?: string;
  asset_code?: string;
  asset_name?: string;
  type_id?: number;
  category_id?: number;
  brand_id?: number;
  model_id?: number;
  cost_center_id?: number;
  department_id?: number;
  employee_id?: number;
  location_id?: number;
  site_id?: number;
  zone_id?: number;
  manager_id?: number;
  unit_price?: number;
  purchase_year?: number;
  purchase_date?: string;
  record_status?: 'active' | 'inactive' | 'disposed';
  purpose?: string;
  classification?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}
```

**Key Queries**:
```sql
-- Get all active assets
SELECT * FROM assetdata WHERE record_status = 'active';

-- Get assets by type
SELECT * FROM assetdata WHERE type_id = ?;

-- Get assets by employee
SELECT * FROM assetdata WHERE employee_id = ?;

-- Get assets by department
SELECT * FROM assetdata WHERE department_id = ?;

-- Get assets with details
SELECT a.*, t.type_name, c.category_name, b.brand_name, m.model_name
FROM assetdata a
LEFT JOIN types t ON a.type_id = t.id
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN brands b ON a.brand_id = b.id
LEFT JOIN models m ON a.model_id = m.id
WHERE a.id = ?;
```

---

## Classification Tables

### types
Asset type classification (Computer, Vehicle, Equipment, etc.).

```sql
CREATE TABLE `types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) NOT NULL,
  `description` text,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_name` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4;
```

**TypeScript Interface**:
```typescript
interface AssetType {
  id: number;
  type_name: string;
  description?: string;
  icon?: string;
  color?: string;
  status: 'active' | 'inactive';
  created_at: Date;
}
```

### categories
Asset categories within each type.

```sql
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `type_id` int DEFAULT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_name` (`category_name`),
  KEY `idx_type_id` (`type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;
```

**TypeScript Interface**:
```typescript
interface Category {
  id: number;
  category_name: string;
  type_id?: number;
  description?: string;
  status: 'active' | 'inactive';
  created_at: Date;
}
```

### brands
Asset manufacturer brands.

```sql
CREATE TABLE `brands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(100) NOT NULL,
  `country` varchar(50) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_name` (`brand_name`)
) ENGINE=InnoDB AUTO_INCREMENT=200 DEFAULT CHARSET=utf8mb4;
```

### models
Asset models by brand.

```sql
CREATE TABLE `models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(100) NOT NULL,
  `brand_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_name` (`model_name`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_category_id` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=500 DEFAULT CHARSET=utf8mb4;
```

---

## Organization/Location Reference Tables

### departments
Organizational departments managing assets.

```sql
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) NOT NULL,
  `cost_center_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_name` (`department_name`),
  KEY `idx_cost_center_id` (`cost_center_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;
```

### costcenters
Financial cost centers for asset allocation.

```sql
CREATE TABLE `costcenters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `budget` decimal(15,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_costcenter_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4;
```

### sites & zones & districts & locations
Hierarchical geographic and organizational structure.

```sql
CREATE TABLE `sites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `address` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_site_name` (`site_name`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone_name` varchar(100) NOT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_zone_name` (`zone_name`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `districts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `district_name` varchar(100) NOT NULL,
  `state` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_district_name` (`district_name`)
) ENGINE=InnoDB AUTO_INCREMENT=150 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_name` varchar(100) NOT NULL,
  `site_id` int DEFAULT NULL,
  `address` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_name` (`location_name`),
  KEY `idx_site_id` (`site_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Employee Tables

### employees
Employee master data referenced by assets.

```sql
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `cost_center_id` int DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_id` (`employee_id`),
  KEY `idx_department_id` (`department_id`),
  KEY `idx_position_id` (`position_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5000 DEFAULT CHARSET=utf8mb4;
```

### positions & sections
Employee organizational roles and divisions.

```sql
CREATE TABLE `positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `position_name` varchar(100) NOT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_position_name` (`position_name`)
) ENGINE=InnoDB AUTO_INCREMENT=200 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_name` varchar(100) NOT NULL,
  `department_id` int DEFAULT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_section_name` (`section_name`),
  KEY `idx_department_id` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Employee Assignment Tables
`employee_costcenters`, `employee_departments`, `employee_districts`, `employee_positions` - Many-to-many relationships for flexible organizational structure.

---

## Asset Specifications Tables

### pc_specs
Computer specifications (CPU, memory, storage, OS).

```sql
CREATE TABLE `pc_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `cpu` varchar(100) DEFAULT NULL,
  `cpu_generation` varchar(255) DEFAULT NULL,
  `memory` varchar(10) DEFAULT NULL,
  `storage` varchar(255) DEFAULT NULL,
  `os` varchar(255) DEFAULT NULL,
  `upgraded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### v_specs
Vehicle specifications (registration, chassis, engine, transmission).

```sql
CREATE TABLE `v_specs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `register_number` varchar(100) DEFAULT NULL,
  `chassis_no` varchar(30) DEFAULT NULL,
  `engine_no` varchar(30) DEFAULT NULL,
  `transmission` varchar(20) DEFAULT NULL,
  `fuel_type` varchar(20) DEFAULT NULL,
  `cubic_meter` varchar(10) DEFAULT NULL,
  `avls_availability` enum('yes','no') DEFAULT 'no',
  `avls_install_date` date DEFAULT NULL,
  `avls_removal_date` date DEFAULT NULL,
  `avls_transfer_date` date DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### pc_software
Software installed on computer assets.

```sql
CREATE TABLE `pc_software` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `software_name` varchar(255) DEFAULT NULL,
  `version` varchar(50) DEFAULT NULL,
  `license_key` varchar(255) DEFAULT NULL,
  `license_expiry` date DEFAULT NULL,
  `installed_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Asset Tracking Tables

### asset_managers
Asset custodians and managers.

```sql
CREATE TABLE `asset_managers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### asset_history
Audit trail of asset changes.

```sql
CREATE TABLE `asset_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `changed_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `changed_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### spec_properties
Generic asset properties (JSON-like key-value storage).

```sql
CREATE TABLE `spec_properties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `property_key` varchar(100) DEFAULT NULL,
  `property_value` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Procurement & Transfer Tables

### procurements
Procurement records for bulk asset purchases.

```sql
CREATE TABLE `procurements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `procurement_code` varchar(50) DEFAULT NULL,
  `description` text,
  `budget_amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### asset_purchase
Links assets to procurement records.

```sql
CREATE TABLE `asset_purchase` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `procurement_id` int DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `unit_cost` decimal(15,2) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `total_cost` decimal(15,2) DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`),
  KEY `idx_procurement_id` (`procurement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### vendors
Supplier/vendor master data.

```sql
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vendor_name` (`vendor_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### transfer_request & transfer_items & transfer_checklists
Asset transfer/handover workflow.

```sql
CREATE TABLE `transfer_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_code` varchar(50) DEFAULT NULL,
  `from_employee_id` int DEFAULT NULL,
  `to_employee_id` int DEFAULT NULL,
  `reason` text,
  `status` varchar(20) DEFAULT 'pending',
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `transfer_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `condition` varchar(50) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transfer_id` (`transfer_id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `transfer_checklists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_id` int DEFAULT NULL,
  `item_description` varchar(255) DEFAULT NULL,
  `checked` tinyint(1) DEFAULT '0',
  `checked_by` varchar(100) DEFAULT NULL,
  `checked_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transfer_id` (`transfer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Configuration Tables

### modules
Asset system module configuration.

```sql
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) NOT NULL,
  `description` text,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_name` (`module_name`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4;
```

---

## Database Relationships

```
assetdata (core)
  ├─ type_id → types (what is it?)
  ├─ category_id → categories (detailed classification)
  ├─ brand_id → brands (manufacturer)
  ├─ model_id → models (specific model)
  ├─ employee_id → employees (assigned to)
  ├─ department_id → departments (department owns)
  ├─ cost_center_id → costcenters (cost allocation)
  ├─ location_id → locations (physical location)
  ├─ site_id → sites (site location)
  ├─ zone_id → zones (geographic zone)
  └─ manager_id → asset_managers (responsible person)

Asset Specifications (type-specific details)
  ├─ pc_specs (for type_id = Computer)
  ├─ v_specs (for type_id = Vehicle)
  ├─ pc_software (software on computers)
  └─ spec_properties (generic properties)

Asset Tracking
  ├─ asset_history (audit trail)
  └─ asset_managers (who manages it)

Asset Acquisition
  ├─ asset_purchase (procurement link)
  └─ procurements & vendors (supplier data)

Asset Transfer
  ├─ transfer_request (handover workflow)
  ├─ transfer_items (assets in transfer)
  └─ transfer_checklists (condition checklist)
```

---

## Key Queries

### Asset Lifecycle
```sql
-- Get asset with full details
SELECT a.*, t.type_name, c.category_name, b.brand_name, m.model_name,
       e.first_name, e.last_name, d.department_name, l.location_name
FROM assetdata a
LEFT JOIN types t ON a.type_id = t.id
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN brands b ON a.brand_id = b.id
LEFT JOIN models m ON a.model_id = m.id
LEFT JOIN employees e ON a.employee_id = e.id
LEFT JOIN departments d ON a.department_id = d.id
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.id = ?;

-- Get computer specs
SELECT a.*, ps.* FROM assetdata a
JOIN pc_specs ps ON a.id = ps.asset_id
WHERE a.type_id = (SELECT id FROM types WHERE type_name = 'Computer');

-- Get vehicle specs
SELECT a.*, vs.* FROM assetdata a
JOIN v_specs vs ON a.id = vs.asset_id
WHERE a.type_id = (SELECT id FROM types WHERE type_name = 'Vehicle');
```

### Asset Depreciation
```sql
-- Calculate NBV based on purchase year (20% per year, max 5 years)
SELECT id, asset_code, unit_price, purchase_year,
       YEAR(NOW()) - purchase_year AS years_old,
       ROUND(unit_price * (1 - LEAST((YEAR(NOW()) - purchase_year) * 0.2, 1)), 2) AS net_book_value
FROM assetdata
WHERE record_status = 'active' AND unit_price IS NOT NULL;
```

---

## Performance Considerations

- **Indexes**: All foreign keys and frequently filtered columns indexed
- **Partitioning**: Consider partitioning `asset_history` by date for large organizations
- **Archival**: Implement archival strategy for disposed assets (status = 'disposed')
- **Full-Text Search**: Consider FULLTEXT index on `asset_code`, `asset_name` for quick lookups

---

## Sample Data

```json
{
  "id": 101,
  "entry_code": "E001",
  "asset_code": "ASSET-001-2024",
  "asset_name": "Dell Latitude 5540",
  "type_id": 1,
  "category_id": 5,
  "brand_id": 12,
  "model_id": 45,
  "cost_center_id": 3,
  "department_id": 2,
  "employee_id": 156,
  "location_id": 8,
  "site_id": 1,
  "zone_id": 2,
  "manager_id": 5,
  "unit_price": 1200.00,
  "purchase_year": 2024,
  "purchase_date": "2024-01-15",
  "record_status": "active",
  "purpose": "Office Work",
  "classification": "IT Equipment",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```
