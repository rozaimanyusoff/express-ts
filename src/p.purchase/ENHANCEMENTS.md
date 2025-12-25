# Purchase Module - Enhancements & Features

## 1. Purchase Request Lifecycle

### Complete Workflow

```
┌──────────────┐
│   Create PR  │  PR number assigned, cost center selected
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ Add Items/Line   │  Items added with supplier assignment,
│ Items (qty, $)   │  quantity, unit price, total price
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  Create PO       │  Purchase order created with
│  (po_no, date)   │  vendor and delivery date
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  Delivery Order  │  DO received with delivery date,
│  (do_no, date)   │  location, handover details
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   Invoice        │  Invoice matched with PO,
│ (inv_no, date)   │  amount verified
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  GRN (Goods      │  Goods physically received
│  Received Note)  │  and verified
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   Completed      │  Purchase order closed,
│   Status         │  asset registered (if applicable)
└──────────────────┘
```

### Status Tracking

Each purchase item has lifecycle states:
- **Requested**: PR created, awaiting approval
- **Ordered**: PO issued to supplier
- **Delivered**: DO received, items physically available
- **Invoiced**: Invoice matched, payment pending
- **Completed**: Full cycle complete, GRN received, payment processed

---

## 2. Purchase Item Management

### Features

#### A. Multi-Item Support
- Single PR can contain multiple line items
- Each item has independent status tracking
- Different suppliers per item
- Individual handover recipients

#### B. Pricing & Quantities
- Unit price tracking
- Quantity management
- Automatic total calculation (qty × unit_price)
- Support for partial deliveries

#### C. Document Management
- Attachment upload per item (quotations, specs)
- File storage in `/uploads/purchases/`
- Public URL generation for download
- Multiple file format support (PDF, images, etc.)

#### D. Type & Category Management
- Items classified by asset type
- Asset type ties to manager assignments
- Category grouping for inventory
- Brand tracking for sourcing consistency

### Implementation Pattern

```typescript
// Create purchase item with file
const formData = new FormData();
formData.append('request_id', 1);
formData.append('description', 'Laptop - Dell Inspiron 15');
formData.append('qty', 2);
formData.append('unit_price', 1500);
formData.append('supplier_id', 3);
formData.append('type_id', 5);
formData.append('upload_path', fileInput.files[0]);

const response = await fetch('/api/purchases', {
  method: 'POST',
  body: formData
});

// File automatically saved to: /uploads/purchases/{hash}/{filename}
// Public URL: /uploads/purchases/{hash}/{filename}
```

---

## 3. Supplier Management System

### Features

#### A. Master Supplier Records
- Centralized supplier database
- Complete contact information
- Geographic details (address, city, state)
- Status tracking (active/inactive)

#### B. Supplier Assignment
- Link supplier to purchase items
- Multiple items per supplier
- Default supplier support (future)
- Supplier performance tracking (future)

#### C. Supplier Information
- Contact person for escalations
- Email for order notifications
- Phone for urgent communications
- Address for shipping labels

### Supplier Data Structure

```typescript
interface SupplierRecord {
  id: number;
  supplier_name: string;           // Company name
  supplier_code: string;           // Reference code (e.g., TS001)
  contact_email: string;           // For notifications
  contact_phone: string;           // For urgent contact
  contact_person: string;          // Key contact name
  address: string;                 // Physical address
  city: string;                    // City
  state: string;                   // State/province
  postal_code: string;             // ZIP code
  country: string;                 // Country
  status: 1 | 0;                   // 1: Active, 0: Inactive
}
```

---

## 4. Asset Registry & Inventory

### Features

#### A. Asset Tracking
- Register purchased items as company assets
- Unique asset codes for tracking
- Physical location recording
- Acquisition cost tracking

#### B. Asset-Purchase Linkage
- Link multiple purchases to single asset
- Track asset history (transfers, retirements)
- Cost center accountability
- Department ownership

#### C. Asset Lifecycle
- Asset states: active, retired, transferred
- History tracking for audits
- Depreciation baseline (cost tracking)
- Location movement tracking

### Asset Registry Structure

```typescript
interface PurchaseAssetRegistryRecord {
  id: number;
  asset_code: string;              // Unique identifier (ASSET-2024-001)
  asset_name: string;              // Human-readable name
  asset_type_id: number;           // Type reference
  costcenter_id: number;           // Owner department
  location: string;                // Physical location
  acquisition_date: string;        // Purchase date
  acquisition_cost: number;        // Purchase price
  status: 'active' | 'retired' | 'transferred';
}
```

---

## 5. Delivery Workflow

### Features

#### A. Multi-Document Tracking
- **DO (Delivery Order)**: Shipping document
- **Invoice**: Billing document
- **GRN (Goods Received Note)**: Receipt verification

#### B. Document Upload
- Upload DO/invoice/GRN documents
- File storage with versioning
- Public URL for document retrieval
- Support for later uploads (not all required at once)

#### C. Status Progression
- Track which documents received
- Automatic status updates based on documents
- Payment hold until all docs received
- Audit trail of document dates

### Delivery Status Logic

```typescript
// Status determined by document completion
if (grn_no && grn_date) {
  status = 'completed';  // Physical goods received
} else if (inv_no && inv_date) {
  status = 'invoiced';   // Invoice received
} else if (do_no && do_date) {
  status = 'delivered';  // Goods in transit/received
} else {
  status = 'ordered';    // PO issued, waiting for delivery
}
```

---

## 6. Manager-Based Filtering

### Features

#### A. Asset Manager Assignments
- Managers assigned to specific asset types
- See only items of their assigned types
- Default fallback to logged-in user's type assignments
- Override via query parameter `?managers=ramco_id`

#### B. Access Control Pattern

```typescript
// Get active types for logged-in manager
const managersList = await getAssetManagers();
const activeMgrTypes = new Set(
  managersList
    .filter(m => m.ramco_id === loginUsername)
    .filter(m => m.is_active === 1)
    .map(m => m.manager_id)
);

// Filter purchases to only their types
purchases = purchases.filter(p => 
  activeMgrTypes.has(p.type_id)
);
```

#### C. Multi-Manager Override
```bash
# Get purchases visible to multiple managers
curl -X GET 'http://localhost:3030/api/purchases/?managers=mgr1,mgr2,mgr3'
```

---

## 7. Advanced Filtering & Search

### Filter Combinations

#### A. By Status
```bash
# Show only ordered purchases
curl -X GET 'http://localhost:3030/api/purchases/?status=ordered'
```

#### B. By Cost Center
```bash
# Show purchases for specific cost center
curl -X GET 'http://localhost:3030/api/purchases/?costcenter=CC001'
```

#### C. By Supplier
```bash
# Search purchases from supplier (partial match)
curl -X GET 'http://localhost:3030/api/purchases/?supplier=Tech%20Solutions'
```

#### D. By Date Range
```bash
# Get purchases between dates, filter by specific date field
curl -X GET 'http://localhost:3030/api/purchases/?startDate=2024-01-01&endDate=2024-12-31&dateField=po_date'
```

### Supported Date Fields
- `pr_date`: Purchase request date
- `po_date`: Purchase order date
- `do_date`: Delivery order date
- `inv_date`: Invoice date
- `grn_date`: GRN date

---

## 8. Enriched Response Data

### Data Aggregation in API Response

The GET purchases endpoint automatically enriches results with related data:

```json
{
  "id": 10,
  "description": "Laptop - Dell Inspiron 15",
  "qty": 2,
  "unit_price": 1500,
  "total_price": 3000,
  "upload_url": "/uploads/purchases/file123.pdf",
  
  "type": {
    "id": 5,
    "name": "IT Equipment"
  },
  
  "category": {
    "id": 2,
    "name": "Computers"
  },
  
  "brand": {
    "id": 7,
    "name": "Dell"
  },
  
  "supplier": {
    "id": 3,
    "name": "Tech Solutions Ltd"
  },
  
  "request": {
    "id": 1,
    "pr_no": "PR-2024-001",
    "costcenter_id": 5,
    "requested_by": {
      "full_name": "John Doe",
      "ramco_id": "user_123"
    },
    "department": {
      "id": 2,
      "name": "IT Department"
    }
  }
}
```

### Batch Resolution
- Types/categories/brands loaded once per request
- Suppliers loaded in batch
- Purchase requests and departments batch-loaded
- Employee details resolved for requester names

---

## 9. Email Notifications

### Purchase Notification System

#### A. When Items Are Created/Updated
```typescript
const { renderPurchaseNotification } = require('src/utils/emailTemplates/purchaseNotification');
const { sendMail } = require('src/utils/mailer');

// Send notification to supplier and approvers
const emailContent = renderPurchaseNotification({
  purchase_id: 10,
  description: 'Laptop - Dell Inspiron 15',
  qty: 2,
  po_no: 'PO-2024-001',
  supplier_email: 'contact@tech.com'
});

await sendMail({
  to: supplier_email,
  subject: 'Purchase Order Notification',
  html: emailContent
});
```

#### B. Delivery Completion
```typescript
// When delivery marked complete
const { renderPurchaseRegistryCompleted } = require('src/utils/emailTemplates/purchaseRegistryCompleted');

const emailContent = renderPurchaseRegistryCompleted({
  asset_code: 'ASSET-2024-001',
  asset_name: 'Laptop',
  delivery_date: '2024-12-11'
});

// Send to requesting department and finance
await sendMail({
  to: requester_email,
  subject: 'Asset Delivery Completed',
  html: emailContent
});
```

---

## 10. Error Handling & Validation

### Input Validation

```typescript
// Duplicate PR prevention
if (data.pr_no && data.pr_date && data.ramco_id && data.costcenter_id) {
  const [existing] = await pool.query(
    `SELECT id FROM purchases2.purchase_request 
     WHERE pr_no = ? AND pr_date = ? AND ramco_id = ? AND costcenter_id = ? LIMIT 1`,
    [data.pr_no, data.pr_date, data.ramco_id, data.costcenter_id]
  );
  
  if (existing.length > 0) {
    throw new Error('Purchase request already exists');
  }
}

// Date validation
if (new Date(startDate) > new Date(endDate)) {
  throw new Error('Start date must be before end date');
}
```

### Error Scenarios

| Scenario | Status | Response |
|----------|--------|----------|
| Missing required field | 400 | Validation error message |
| Duplicate PR | 400 | PR already exists error |
| Invalid date format | 400 | Date format error |
| File upload failed | 400 | Upload error details |
| Record not found | 404 | Not found |
| Unauthorized | 401 | Authentication required |
| Database error | 500 | Internal server error |

---

## 11. File Upload & Storage

### Upload Path Structure

```
/uploads/purchases/
├── {hash1}/
│   ├── quotation_1.pdf
│   ├── spec_sheet.pdf
│   └── invoice.pdf
└── {hash2}/
    ├── delivery_order.pdf
    └── grn.pdf
```

### File Handling

```typescript
import { buildStoragePath, safeMove, toPublicUrl } from 'src/utils/uploadUtil';

// Multer middleware configured
const purchaseUploader = createUploader('purchases');

// In controller
if (req.files && req.files.upload_path) {
  const file = req.files.upload_path;
  const storagePath = buildStoragePath('purchases', file.name);
  await safeMove(file.data, storagePath);
  const publicUrl = toPublicUrl('purchases', file.name);
  // Save publicUrl to database
}
```

---

## 12. Database Optimization

### Performance Indexes

All tables optimized with indexes on frequently queried columns:

```sql
-- Purchase request indexes
INDEX idx_pr_date (pr_date)
INDEX idx_ramco_id (ramco_id)
INDEX idx_costcenter_id (costcenter_id)

-- Purchase items indexes
INDEX idx_request_id (request_id)
INDEX idx_supplier_id (supplier_id)
INDEX idx_type_id (type_id)
INDEX idx_po_date (po_date)

-- Delivery indexes
INDEX idx_purchase_id (purchase_id)
INDEX idx_do_no (do_no)
INDEX idx_status (status)

-- Asset registry indexes
INDEX idx_asset_code (asset_code)
INDEX idx_costcenter_id (costcenter_id)
```

---

## 13. Future Enhancements

### Short-term
- [ ] PO approval workflow (pending → approved → ordered)
- [ ] Budget tracking and limits per cost center
- [ ] Goods received notifications to requesters
- [ ] Purchase history and reporting dashboard
- [ ] Supplier performance scoring

### Medium-term
- [ ] Three-way matching (PO ↔ DO ↔ Invoice)
- [ ] Automatic invoice matching with PO
- [ ] Purchase analytics and trends
- [ ] Bulk import of purchase requests (CSV/Excel)
- [ ] Integration with accounting system (invoice creation)

### Long-term
- [ ] Procurement portal for requesters
- [ ] Vendor management system (payments, ratings)
- [ ] Contract management module
- [ ] RFQ (Request for Quotation) automation
- [ ] Integration with e-commerce suppliers (API sync)

---

## 14. Security Considerations

### Access Control
- All endpoints require Bearer token authentication
- Manager-based type filtering restricts visibility
- Cost center level restrictions (future)
- Role-based operations (create, update, delete)

### Audit Trail
- All purchases logged with timestamps
- User who created/updated tracked
- File uploads versioned and tracked
- Delivery changes audited

### Data Protection
- Sensitive supplier info in secure database
- File uploads scanned (future)
- Encryption of sensitive fields (future)
- Regular backups of purchase data

---

## 15. Integration Points

### External Modules
- **p.asset**: Asset types, categories, cost centers, employees
- **p.user**: User authentication and profile data
- **utils.emailTemplates**: HTML email rendering
- **utils.mailer**: SMTP email sending
- **utils.uploadUtil**: File storage and URL generation

### Events & Hooks
- Purchase creation triggers supplier notification
- Delivery completion triggers asset registration
- Status changes logged for audit
- File uploads trigger validation and storage
