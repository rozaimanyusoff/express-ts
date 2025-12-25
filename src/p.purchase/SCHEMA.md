# Purchase Module - Database Schema

**Database**: `purchases2`  
**Full Schema File**: [purchases2.sql](../../src/db/purchases2.sql) - Complete database  
**Module-Specific Tables**: [purchase_module.sql](../../src/db/purchase_module.sql) - Focused tables only

## Table: `purchase_request`

Master table for purchase requisitions.

```sql
CREATE TABLE purchase_request (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pr_no VARCHAR(255) UNIQUE,
  pr_date DATE NOT NULL,
  request_type VARCHAR(100),
  ramco_id VARCHAR(255) NOT NULL,
  costcenter_id INT,
  department_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INDEX idx_pr_date (pr_date)
INDEX idx_ramco_id (ramco_id)
INDEX idx_costcenter_id (costcenter_id)
INDEX idx_request_type (request_type)
```

### TypeScript Interface

```typescript
export interface PurchaseRequestRecord {
  id?: number;
  pr_no?: null | string;
  pr_date: string;           // YYYY-MM-DD
  request_type: string;      // 'goods', 'services', etc.
  ramco_id: string;          // Requester RAMCO ID
  costcenter_id: number;     // Cost center ID
  department_id: number;     // Department ID
  created_at?: string;
  updated_at?: string;
}
```

### Key Queries

```typescript
// Get all purchase requests
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_request ORDER BY pr_date DESC`
);

// Get PR by ID
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_request WHERE id = ?`,
  [id]
);

// Create new PR
const [result] = await pool.query(
  `INSERT INTO purchases2.purchase_request 
   (pr_no, pr_date, request_type, ramco_id, costcenter_id, created_at, updated_at) 
   VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
  [pr_no, pr_date, request_type, ramco_id, costcenter_id]
);

// Prevent duplicate
const [existing] = await pool.query(
  `SELECT id FROM purchases2.purchase_request 
   WHERE pr_no = ? AND pr_date = ? AND ramco_id = ? AND costcenter_id = ? LIMIT 1`,
  [pr_no, pr_date, ramco_id, costcenter_id]
);
```

---

## Table: `purchase_items`

Line items within a purchase request.

```sql
CREATE TABLE purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  request_id FOREIGN KEY REFERENCES purchase_request(id),
  description VARCHAR(500),
  qty INT NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2),
  supplier_id INT,
  po_no VARCHAR(255),
  po_date DATE,
  handover_to VARCHAR(255),
  handover_at DATE,
  purpose VARCHAR(255),
  upload_path VARCHAR(500),
  type_id INT,
  category_id INT,
  brand_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INDEX idx_request_id (request_id)
INDEX idx_supplier_id (supplier_id)
INDEX idx_po_date (po_date)
INDEX idx_type_id (type_id)
```

### TypeScript Interface

```typescript
export interface PurchaseRequestItemRecord {
  id?: number;
  request_id?: number;          // Foreign key to purchase_request
  description: string;          // Item description
  qty: number;                  // Quantity
  unit_price: number;           // Price per unit
  total_price: number;          // qty × unit_price
  supplier_id?: number;         // Supplier reference
  po_no?: string;               // Purchase order number
  po_date?: string;             // PO date (YYYY-MM-DD)
  handover_to?: string;         // Recipient name
  handover_at?: string;         // Handover date
  purpose?: null | string;      // Purpose/notes
  upload_path?: string;         // Document path
  type_id: number;              // Asset type (for filtering)
  category_id?: null | number;  // Asset category
  brand_id?: number;            // Brand reference
  created_at?: string;
  updated_at?: string;
}
```

### Key Queries

```typescript
// Get all purchase items
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_items ORDER BY created_at DESC`
);

// Get items by status (custom query)
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_items 
   WHERE request_id IN (SELECT id FROM purchase_request WHERE status = ?)`,
  [status]
);

// Get items by cost center
const [rows] = await pool.query(
  `SELECT pi.* FROM purchases2.purchase_items pi
   JOIN purchases2.purchase_request pr ON pi.request_id = pr.id
   WHERE pr.costcenter_id = ?
   ORDER BY pi.po_date DESC`,
  [costcenter_id]
);

// Get items by supplier
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_items 
   WHERE supplier_id = ? 
   ORDER BY po_date DESC`,
  [supplier_id]
);

// Get items by date range
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_items 
   WHERE po_date BETWEEN ? AND ? 
   ORDER BY po_date DESC`,
  [startDate, endDate]
);
```

---

## Table: `purchase_delivery`

Delivery records for purchased items.

```sql
CREATE TABLE purchase_delivery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  purchase_id FOREIGN KEY REFERENCES purchase_items(id),
  do_no VARCHAR(255),           -- Delivery order number
  do_date DATE,
  inv_no VARCHAR(255),          -- Invoice number
  inv_date DATE,
  grn_no VARCHAR(255),          -- Goods received note
  grn_date DATE,
  upload_path VARCHAR(500),     -- Supporting document
  status VARCHAR(50),           -- requested|ordered|delivered|invoiced|completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INDEX idx_purchase_id (purchase_id)
INDEX idx_do_no (do_no)
INDEX idx_inv_no (inv_no)
INDEX idx_status (status)
```

### TypeScript Interface

```typescript
export interface PurchaseDeliveryRecord {
  id?: number;
  purchase_id: number;          // Foreign key to purchase_items
  do_no?: string;               // Delivery order number
  do_date?: string;             // DO date (YYYY-MM-DD)
  inv_no?: string;              // Invoice number
  inv_date?: string;            // Invoice date
  grn_no?: string;              // GRN number
  grn_date?: string;            // GRN date
  upload_path?: string;         // File path for receipt/invoice
  status?: string;              // Status enum
  created_at?: string;
  updated_at?: string;
}
```

### Status Values

```typescript
type DeliveryStatus = 'requested' | 'ordered' | 'delivered' | 'invoiced' | 'completed';
```

### Key Queries

```typescript
// Get all deliveries
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_delivery ORDER BY do_date DESC`
);

// Get deliveries by purchase ID
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_delivery 
   WHERE purchase_id = ? 
   ORDER BY do_date DESC`,
  [purchase_id]
);

// Get deliveries by status
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_delivery 
   WHERE status = ? 
   ORDER BY do_date DESC`,
  [status]
);

// Get pending deliveries
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_delivery 
   WHERE status IN ('requested', 'ordered') 
   ORDER BY do_date ASC`
);
```

---

## Table: `purchase_supplier`

Master supplier records.

```sql
CREATE TABLE purchase_supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(255) NOT NULL,
  supplier_code VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_person VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(10),
  country VARCHAR(100),
  status INT DEFAULT 1,         -- 1: Active, 0: Inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INDEX idx_supplier_name (supplier_name)
INDEX idx_supplier_code (supplier_code)
INDEX idx_status (status)
```

### TypeScript Interface

```typescript
export interface SupplierRecord {
  id?: number;
  supplier_name: string;        // Company name
  supplier_code?: string;       // Supplier code
  contact_email?: string;
  contact_phone?: string;
  contact_person?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status?: number;              // 1: Active, 0: Inactive
  created_at?: string;
  updated_at?: string;
}
```

### Key Queries

```typescript
// Get all suppliers
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_supplier WHERE status = 1 ORDER BY supplier_name ASC`
);

// Get supplier by ID
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_supplier WHERE id = ?`,
  [id]
);

// Search suppliers by name
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_supplier 
   WHERE supplier_name LIKE ? 
   ORDER BY supplier_name ASC`,
  [`%${searchTerm}%`]
);
```

---

## Table: `purchase_asset_registry`

Asset inventory records linked to purchases.

```sql
CREATE TABLE purchase_asset_registry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_code VARCHAR(100) UNIQUE,
  asset_name VARCHAR(255),
  asset_type_id INT,
  costcenter_id INT,
  location VARCHAR(255),
  acquisition_date DATE,
  acquisition_cost DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'active',  -- active|retired|transferred
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INDEX idx_asset_code (asset_code)
INDEX idx_asset_type_id (asset_type_id)
INDEX idx_costcenter_id (costcenter_id)
INDEX idx_status (status)
```

### TypeScript Interface

```typescript
export interface PurchaseAssetRegistryRecord {
  id?: number;
  asset_code: string;           // Unique asset identifier
  asset_name: string;           // Asset name
  asset_type_id?: number;       // Type reference
  costcenter_id?: number;       // Cost center ownership
  location?: string;            // Physical location
  acquisition_date?: string;    // Purchase date (YYYY-MM-DD)
  acquisition_cost?: number;    // Purchase price
  status?: string;              // active|retired|transferred
  created_at?: string;
  updated_at?: string;
}
```

### Key Queries

```typescript
// Get all registered assets
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_asset_registry WHERE status = 'active' ORDER BY asset_name ASC`
);

// Get assets by cost center
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_asset_registry 
   WHERE costcenter_id = ? 
   ORDER BY asset_name ASC`,
  [costcenter_id]
);

// Get assets by type
const [rows] = await pool.query(
  `SELECT * FROM purchases2.purchase_asset_registry 
   WHERE asset_type_id = ? 
   ORDER BY acquisition_date DESC`,
  [type_id]
);
```

---

## Table: `purchase_registry`

Join table linking purchase items to assets.

```sql
CREATE TABLE purchase_registry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  purchase_id FOREIGN KEY REFERENCES purchase_items(id),
  registry_id INT NOT NULL,
  registry_id FOREIGN KEY REFERENCES purchase_asset_registry(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(255)
);

INDEX idx_purchase_id (purchase_id)
INDEX idx_registry_id (registry_id)
INDEX UNIQUE idx_purchase_registry (purchase_id, registry_id)
```

### TypeScript Interface

```typescript
export interface PurchaseRegistryRecord {
  id?: number;
  purchase_id: number;          // Foreign key to purchase_items
  registry_id: number;          // Foreign key to purchase_asset_registry
  assigned_at?: string;
  assigned_by?: string;         // RAMCO ID of assigner
}
```

### Key Queries

```typescript
// Get registry records for a purchase
const [rows] = await pool.query(
  `SELECT pr.*, ar.asset_code, ar.asset_name 
   FROM purchases2.purchase_registry pr
   JOIN purchases2.purchase_asset_registry ar ON pr.registry_id = ar.id
   WHERE pr.purchase_id = ?`,
  [purchase_id]
);

// Get purchases linked to an asset
const [rows] = await pool.query(
  `SELECT pi.*, pr.purchase_id 
   FROM purchases2.purchase_items pi
   JOIN purchases2.purchase_registry pr ON pi.id = pr.purchase_id
   WHERE pr.registry_id = ?`,
  [registry_id]
);
```

---

## Database Relationships

```
purchase_request (1) ──→ (Many) purchase_items
                                    ↓
                            purchase_delivery
                            purchase_supplier (ref)

purchase_items (1) ──→ (Many) purchase_registry
                                    ↓
                        purchase_asset_registry
```

## Performance Considerations

### Indexes
All tables have composite indexes on frequently joined columns:
- `purchase_items.request_id` (join with purchase_request)
- `purchase_delivery.purchase_id` (join with purchase_items)
- `purchase_registry.purchase_id, registry_id` (unique constraint)

### Query Optimization
- Use date indexes for range queries (`po_date`, `do_date`)
- Status filtering uses index (`purchase_delivery.status`)
- Cost center aggregations use `costcenter_id` index
- Type filtering for asset managers uses `type_id` index

## Sample Data

### Purchase Request
```json
{
  "id": 1,
  "pr_no": "PR-2024-001",
  "pr_date": "2024-12-01",
  "request_type": "goods",
  "ramco_id": "user_123",
  "costcenter_id": 5,
  "department_id": 2
}
```

### Purchase Item
```json
{
  "id": 10,
  "request_id": 1,
  "description": "Laptop - Dell Inspiron 15",
  "qty": 2,
  "unit_price": 1500,
  "total_price": 3000,
  "supplier_id": 3,
  "po_no": "PO-2024-001",
  "po_date": "2024-12-01",
  "type_id": 5,
  "category_id": 2
}
```

### Delivery Record
```json
{
  "id": 15,
  "purchase_id": 10,
  "do_no": "DO-2024-001",
  "do_date": "2024-12-10",
  "inv_no": "INV-2024-001",
  "inv_date": "2024-12-10",
  "grn_no": "GRN-2024-001",
  "grn_date": "2024-12-11",
  "status": "invoiced"
}
```
