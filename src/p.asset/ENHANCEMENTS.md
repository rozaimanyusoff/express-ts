# Asset Module - Features & Enhancements

## Asset Depreciation System

### Overview
Automatic depreciation calculation for assets based on purchase year and unit price. Uses straight-line method with 20% annual depreciation rate, maximum 5-year life.

### Formula
```
Years Old = Current Year - Purchase Year
Depreciation Years = MIN(Years Old, 5)  // Cap at 5 years
Remaining Percentage = MAX(0, 1 - (Depreciation Years * 0.2))
Net Book Value (NBV) = Unit Price × Remaining Percentage
```

### Example Workflow
```
Purchase Year: 2024, Unit Price: $1,200

Year 0 (2024): NBV = $1,200 × (1 - 0 × 0.2) = $1,200 (100%)
Year 1 (2025): NBV = $1,200 × (1 - 1 × 0.2) = $960 (80%)
Year 2 (2026): NBV = $1,200 × (1 - 2 × 0.2) = $720 (60%)
Year 3 (2027): NBV = $1,200 × (1 - 3 × 0.2) = $480 (40%)
Year 4 (2028): NBV = $1,200 × (1 - 4 × 0.2) = $240 (20%)
Year 5+ (2029+): NBV = $1,200 × (1 - 5 × 0.2) = $0 (0%)
```

### Implementation
```typescript
export const calculateNBV = (unitPrice: null | number | undefined, purchaseYear: null | number | undefined): null | string => {
  if (!unitPrice || unitPrice <= 0 || !purchaseYear) return null;
  
  const currentYear = new Date().getFullYear();
  const yearsOld = currentYear - purchaseYear;
  const depreciationYears = Math.min(yearsOld, 5);
  const remainingPercentage = Math.max(0, 1 - (depreciationYears * 0.2));
  
  const nbv = unitPrice * remainingPercentage;
  return nbv.toFixed(2);
};
```

### Usage in API
Every asset detail response includes calculated NBV:
```json
{
  "id": 1,
  "asset_code": "COMP-001-2024",
  "unit_price": 1200.00,
  "purchase_year": 2024,
  "net_book_value": "1200.00",
  "asset_age": 0
}
```

### Integration Points
- **Billing Module**: Uses NBV for asset valuation and write-offs
- **Financial Reports**: Depreciation schedules and asset valuations
- **Insurance**: Asset value tracking for coverage calculations

---

## Asset Transfer & Handover Workflow

### Process Flow
```
1. Request Creation (Employee/Supervisor)
   ↓
2. Supervisor Review & Approval
   ↓
3. HOD Review & Approval (if required)
   ↓
4. Asset Transfer Execution
   ↓
5. New Owner Acceptance
   ↓
6. Handover Checklist Completion
   ↓
7. System Record Update
```

### Database Tables Involved
- `transfer_request` - Main transfer request record
- `transfer_items` - Assets included in transfer
- `transfer_checklists` - Condition/status verification checklist
- `assetdata` - Updated with new employee_id upon completion

### Step 1: Create Asset Transfer Request

**Endpoint:** `POST /api/assets/transfers`

**Procedure:**
1. Parse request payload:
   - `transfer_by` (required): RAMCO ID of requester
   - `transfer_date`: Transfer effective date (default: now)
   - `costcenter_id`: Target cost center (optional)
   - `department_id`: Target department (optional)
   - `transfer_status`: Status (default: 'submitted')
   - `details` (required): Array of transfer items (JSON array or JSON string)

2. Create transfer request record in `transfer_request` table:
   - Stores requester info, dates, and organizational context (costcenter/department)
   - Returns `transfer_id` for linking items

3. Create transfer items in `transfer_items` table for each detail:
   - `asset_id`: Asset being transferred
   - `type_id`: Asset type
   - `current_owner`, `new_owner`: RAMCO IDs
   - `current_costcenter_id`, `new_costcenter_id`: Cost centers
   - `current_department_id`, `new_department_id`: Departments
   - `current_location_id`, `new_location_id`: Location/District IDs
   - `effective_date`: When transfer takes effect
   - `reason`: Transfer reason
   - `remarks`: Additional notes
   - `return_to_asset_manager`: Flag if asset goes back to manager
   - `attachment`: Optional supporting documents

4. Enrich data for email notifications:
   - Fetch all employees, costcenters, departments, districts, asset types
   - Build lookup maps for ID→Name/Code conversions
   - Resolve requestor details from employee directory
   - **Determine approver via workflow system:**
     - **Primary**: Query workflows table: `module_name = 'asset transfer'`, `level_name = 'approver'`, `department_id = applicant's department_id` (MUST match exactly)
     - **Fallback**: Use requestor's `wk_spv_id` (work supervisor) if no workflow approver found
     - **Important**: The workflow record's `department_id` MUST match the request's `department_id` parameter. No global approvers are supported; each department requires its own approver entry in workflows table.

5. Send email notifications:
   - **To Requestor**: Confirmation email with transfer summary
   - **To Supervisor/HOD**: Action email with:
     - Transfer details and items
     - Action buttons for approve/reject
     - Portal link (JWT-signed URL with 3-day expiration)
     - Department context (via `?dept=` parameter)

6. Response: Returns `transfer_id` for tracking and subsequent approval steps

**Request Payload Example:**
```json
POST /api/assets/transfers
{
  "transfer_by": "EMP001",
  "transfer_date": "2026-01-13",
  "costcenter_id": 5,
  "department_id": 3,
  "transfer_status": "submitted",
  "details": [
    {
      "asset_id": 123,
      "type_id": 2,
      "current_owner": "EMP001",
      "new_owner": "EMP002",
      "current_costcenter_id": 5,
      "new_costcenter_id": 6,
      "current_department_id": 3,
      "new_department_id": 4,
      "current_location_id": 1,
      "new_location_id": 2,
      "effective_date": "2026-01-15",
      "reason": "Employee promotion",
      "remarks": "Transfer to new IT department",
      "return_to_asset_manager": false
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Asset transfer request created successfully",
  "request_id": 42
}
```

### Step 2: Approval Workflow
```typescript
// Supervisor checks transfer request
PUT /api/assets/transfers/approval
{
  "transfer_ids": [1, 2],
  "approval_status": "approved",
  "comment": "Approved for transfer"
}

// System sends email notifications to:
// - Current owner
// - New owner
// - Supervisor
// - HOD
```

### Step 3: Acceptance Workflow
New owner accepts/acknowledges transfer with optional attachments (photos, signatures):

```typescript
PUT /api/assets/transfers/:id/acceptance
Content-Type: multipart/form-data

FormData:
- acceptance_attachments: [photo1.jpg, photo2.jpg]
```

### Email Notifications
The module sends automated emails at each stage:

| Event | Recipients | Template |
|-------|-----------|----------|
| Transfer Requested | Requestor, Supervisor/HOD | `assetTransferRequest`, `assetTransferSupervisor` |
| Supervisor Approves | New Owner, Requester | `assetTransferApprovedNewOwner`, `assetTransferApprovedRequestor` |
| HOD Approves | All parties | `assetTransferApprovalSummary` |
| Ownership Changed | All parties | `assetTransferAccepted*` |

### Email Templates Used
```typescript
import { assetTransferAcceptedCurrentOwnerEmail } from '../utils/emailTemplates/assetTransferAccepted';
import { assetTransferApprovalSummaryEmail } from '../utils/emailTemplates/assetTransferApprovalSummary';
import { assetTransferApprovedNewOwnerEmail } from '../utils/emailTemplates/assetTransferApprovedNewOwner';
import { assetTransferApprovedRequestorEmail } from '../utils/emailTemplates/assetTransferApprovedRequestor';
import { assetTransferCurrentOwnerEmail } from '../utils/emailTemplates/assetTransferCurrentOwner';
import assetTransferRequestEmail from '../utils/emailTemplates/assetTransferRequest';
import assetTransferSupervisorEmail from '../utils/emailTemplates/assetTransferSupervisorEmail';
```

### Validation Rules
- New owner must exist in `employees` table
- All assets in transfer must exist and be active
- Cannot transfer to same employee
- Requires supervisor approval before completion
- May require HOD approval based on department policies

---

## Asset Classification Hierarchy

### Type → Category → Brand → Model Relationship

```
Types (e.g., "Computer")
  ├── Categories (e.g., "Laptop", "Desktop")
  │   └── Brands (e.g., "Dell", "HP")
  │       └── Models (e.g., "Latitude 5540", "EliteBook 850")
  │
Vehicles
  ├── Categories (e.g., "Car", "Motorcycle")
  │   └── Brands (e.g., "Toyota", "Honda")
  │       └── Models (e.g., "Camry", "Civic")
```

### Database Schema
```sql
-- Many-to-many: Brand can have multiple categories
CREATE TABLE brand_category (
  brand_id INT,
  category_id INT,
  PRIMARY KEY (brand_id, category_id)
);
```

### API Examples
```bash
# Get laptop categories
GET /api/assets/categories?type=1  # Type 1 = Computer

# Get brands for Laptops
GET /api/assets/brands?type=1&categories=5  # Category 5 = Laptop

# Get models for Dell Laptops
GET /api/assets/models?type=1&brand=12  # Brand 12 = Dell
```

### Custom Properties System

Dynamic properties per asset type via `spec_properties` table:

```bash
POST /api/assets/spec-properties
{
  "type_id": 1,
  "property_name": "RAM",
  "property_type": "select",
  "options": ["4GB", "8GB", "16GB", "32GB"]
}

POST /api/assets/spec-properties/:id/apply
# Triggers ALTER TABLE to add column to type-specific spec table
```

---

## Organization & Location Hierarchy

### Structure
```
Cost Centers (Financial allocation)
  └── Departments (Organizational units)
      └── Sections (Teams within departments)
          └── Employees (Individual staff)

Sites (Physical locations)
  ├── Zones (Geographic regions)
  └── Districts (Areas)
      └── Locations (Specific offices/buildings)
```

### Example Usage
```json
{
  "id": 1,
  "asset_code": "LAPTOP-001",
  "cost_center_id": 3,      // Finance allocation
  "department_id": 2,        // IT Department
  "site_id": 1,              // HQ Building
  "zone_id": 2,              // North Zone
  "location_id": 8           // 3rd Floor, Building A
}
```

### Query Example
Get all assets in IT department at HQ:
```sql
SELECT a.* FROM assetdata a
WHERE a.department_id = 2 AND a.site_id = 1
```

---

## Software & Specification Tracking

### PC Software Management
Track software licenses on computers:

```json
POST /api/assets/softwares
{
  "asset_id": 1,
  "software_name": "Microsoft Office 365",
  "version": "2024",
  "license_key": "XXXXX-XXXXX-XXXXX",
  "license_expiry": "2025-12-31",
  "status": "active"
}
```

### Type-Specific Specifications

#### Computer Specs (pc_specs)
```json
{
  "asset_id": 1,
  "serial_number": "CN-0HF5KN-67890",
  "cpu": "Intel Core i7",
  "cpu_generation": "13th Gen",
  "memory": "16GB",
  "storage": "512GB SSD",
  "os": "Windows 11 Pro"
}
```

#### Vehicle Specs (v_specs)
```json
{
  "asset_id": 2,
  "register_number": "ABC 1234",
  "chassis_no": "JTDKBRFV8L3123456",
  "engine_no": "2TR-FEV1234567",
  "transmission": "Automatic",
  "fuel_type": "Diesel",
  "cubic_meter": "2800",
  "avls_availability": "yes",
  "avls_install_date": "2024-01-01"
}
```

---

## Procurement Integration

### Asset Purchase Tracking
Link assets to purchase orders from Purchase module:

```json
POST /api/assets
{
  "asset_code": "COMP-001-2024",
  "asset_name": "Dell Latitude 5540",
  "unit_price": 1200.00,
  "purchase_date": "2024-01-15",
  "supplier_id": 5
}
```

### Batch Registration
Register multiple purchased assets at once:

```bash
POST /api/assets/register-batch
{
  "procurement_id": 100,
  "assets": [
    {
      "asset_code": "COMP-001-2024",
      "asset_name": "Dell Latitude 5540",
      "type_id": 1,
      "category_id": 5,
      "brand_id": 12,
      "unit_price": 1200.00
    }
  ]
}
```

### Vendor Management
Track supplier information:

```json
POST /api/assets/vendors
{
  "vendor_name": "Tech Solutions Ltd",
  "contact_person": "John Sales",
  "email": "sales@techsol.com",
  "phone": "+1-800-123-4567",
  "address": "123 Tech Street, City"
}
```

---

## Asset History & Audit Trail

### Tracking Changes
`asset_history` table records all modifications:

```json
{
  "asset_id": 1,
  "action": "employee_changed",
  "old_value": "156",
  "new_value": "200",
  "changed_at": "2024-01-20T14:30:00Z",
  "changed_by": "supervisor_id_15"
}
```

### Query History
```sql
SELECT * FROM asset_history
WHERE asset_id = 1
ORDER BY changed_at DESC;
```

---

## Access Control & Permissions

### Role-Based Access
Access controlled via JWT token and user context (`req.user`):

| Role | Assets | Transfers | Types/Categories | Reports |
|------|--------|-----------|-------------------|---------|
| Employee | View own | Create requests | View | View own |
| Supervisor | View dept | Approve | Manage | View dept |
| Manager | View all | Approve all | Manage | View all |
| Admin | CRUD all | All | Full | Full |

### Endpoint Protection
```typescript
// All routes protected with tokenValidator middleware
app.use('/api/assets', tokenValidator, assetRoutes);
```

### Data Access Control
```typescript
// Filter based on user role
if (req.user.role === 'employee') {
  // Show only their own assets
  const myAssets = await getAssets({ employee_id: req.user.id });
} else if (req.user.role === 'supervisor') {
  // Show department assets
  const deptAssets = await getAssets({ department_id: req.user.department_id });
}
```

---

## Search & Filtering Features

### Free-Text Search
Search across asset code, name, and registration:

```bash
GET /api/assets?q=laptop
GET /api/assets?q=ABC%201234  # Registration number
```

### Advanced Filtering
```bash
# Multiple types
GET /api/assets?type=1,2,3

# Multiple purposes
GET /api/assets?purpose=office,meeting-room

# Date range (for transfer reports)
GET /api/assets/transfers?from_date=2024-01-01&to_date=2024-12-31

# Status combination
GET /api/assets?status=active&department_id=2&cost_center_id=3
```

### Pagination & Sorting
```bash
# Pagination
GET /api/assets?page=2&pageSize=50
GET /api/assets?offset=50&limit=25

# Sorting
GET /api/assets?sortBy=asset_code&sortDir=asc
GET /api/assets?sortBy=purchase_year&sortDir=desc
```

---

## Key Integrations

### With Maintenance Module (p.maintenance)
- References vehicle assets for service tracking
- Links to vehicle specs for maintenance calculations
- Tracks poolcar assignments and schedules

### With Billing Module (p.billing)
- References assets for fleet billing
- Uses depreciation for asset valuations
- Tracks fuel consumption by vehicle assets
- Links to departments for cost allocation

### With Compliance Module (p.compliance)
- References assets for assessment targets (vehicles, computers)
- Tracks compliance history per asset type
- Links employee assignments to asset compliance

### With Purchase Module (p.purchase)
- Receives purchased asset registrations
- Tracks procurement to asset lifecycle
- Manages supplier/vendor relationships

---

## Database Optimization Tips

### Indexes to Consider
```sql
-- Performance optimization
CREATE INDEX idx_assetdata_employee ON assetdata(employee_id);
CREATE INDEX idx_assetdata_department ON assetdata(department_id);
CREATE INDEX idx_assetdata_status ON assetdata(record_status);
CREATE INDEX idx_assetdata_type ON assetdata(type_id);
CREATE INDEX idx_asset_history_asset ON asset_history(asset_id, changed_at DESC);
CREATE FULLTEXT INDEX ft_asset_search ON assetdata(asset_code, asset_name);
```

### Query Optimization
- Use `EXPLAIN` to analyze complex queries
- Archive old transfer requests annually
- Partition `asset_history` by year for large datasets
- Consider materialized views for depreciation reports

---

## Future Enhancement Opportunities

### Short-term
- [ ] Barcode/QR code generation for assets
- [ ] Mobile asset inspection app
- [ ] Bulk asset import from CSV
- [ ] Asset location map/dashboard
- [ ] Automated depreciation reports

### Medium-term
- [ ] Asset maintenance scheduling integration
- [ ] Insurance premium calculation based on NBV
- [ ] Multi-location asset transfers
- [ ] Asset lifecycle stage tracking
- [ ] Predictive failure analysis for critical assets

### Long-term
- [ ] IoT asset tracking with GPS/RFID
- [ ] AI-powered asset optimization suggestions
- [ ] Cross-organization asset pooling
- [ ] Real-time asset utilization dashboard
- [ ] Predictive asset replacement planning

---

## Security Considerations

### Data Protection
- All asset transfers require approval chain
- Financial data (unit_price, NBV) access-controlled
- Audit trail prevents unauthorized changes
- Employee data linked through proper access control

### API Security
- JWT token validation on all endpoints
- Rate limiting recommended for sensitive operations
- CORS configured for cross-origin requests
- SQL injection prevention via parameterized queries

### Compliance
- Asset history provides audit trail for financial audits
- Transfer approval chain ensures accountability
- Depreciation calculations comply with accounting standards
- GDPR-compliant when handling employee personal data

---

## Asset Transfer Acceptance Process (`setAssetTransferAcceptance`)

### Overview
The acceptance endpoint completes the asset transfer workflow. It records acceptance evidence (attachments, checklist confirmation), updates asset ownership, and triggers notification emails to stakeholders.

### Endpoint
```
PUT /api/assets/transfers/:id/acceptance
Content-Type: multipart/form-data
```

### Request Payload

**JSON Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `acceptance_by` | string | ✅ | ramco_id of person accepting transfer |
| `acceptance_date` | ISO 8601 | ❌ | Date/time of acceptance (defaults to now) |
| `acceptance_remarks` | string | ❌ | Notes/remarks about the acceptance |
| `checklist-items` | string/array | ❌ | Comma-separated or array of checklist item IDs |

**File Upload:**
| Field | Type | Max | Description |
|-------|------|-----|-------------|
| `acceptance_attachments` | multipart files | 3 | Evidence/documentation files |

### Complete Request Example
```bash
curl -X PUT http://localhost:3030/api/assets/transfers/1/acceptance \
  -F "acceptance_by=000277" \
  -F "acceptance_date=2026-01-14T10:30:00Z" \
  -F "acceptance_remarks=Assets verified and in good condition" \
  -F "checklist-items=1,2,3" \
  -F "acceptance_attachments=@photo1.jpg" \
  -F "acceptance_attachments=@photo2.png" \
  -F "acceptance_attachments=@document.pdf"
```

### Process Flow

#### Step 1: Request Validation
```typescript
// Validate transfer ID exists
const transfer = await assetModel.getAssetTransferById(requestId);
if (!transfer) return 404 error;
```

#### Step 2: Parse Input Parameters
```typescript
// Extract and parse form fields
- acceptance_by: String (ramco_id)
- acceptance_date: ISO timestamp (defaults to NOW if omitted)
- acceptance_remarks: String
- checklist-items: Convert comma-separated string or array to number[]
```

#### Step 3: Handle File Uploads
```typescript
// Multer processes files and saves to disk
// Uploaded to: /mnt/winshare/uploads/assets/transfers/acceptance/
// Returns array of file paths
const filePaths = [];
if (req.files.acceptance_attachments) {
  filePaths = req.files.acceptance_attachments.map(f => 
    uploadUtil.toDbPath('assets/transfers/acceptance', f.filename)
  );
}
```

#### Step 4: Update transfer_items Table
```sql
UPDATE transfer_items 
SET 
  acceptance_by = ?,
  acceptance_date = ?,
  acceptance_remarks = ?,
  acceptance_checklist_items = ?,  -- stored as "1,2,3"
  acceptance_attachments = ?,       -- stored as JSON: ["path1", "path2", "path3"]
  attachment1 = ?,                  -- first file path (or null)
  attachment2 = ?,                  -- second file path (or null)
  attachment3 = ?,                  -- third file path (or null)
  updated_at = NOW()
WHERE id = ?
```

**File Distribution Logic:**
```typescript
attachment1 = filePaths[0] || null;  // First uploaded file
attachment2 = filePaths[1] || null;  // Second uploaded file
attachment3 = filePaths[2] || null;  // Third uploaded file
// Additional files (if any) are ignored
```

#### Step 5: Update Asset Ownership (Batch)
For each transfer item where `new_owner` is specified:

```typescript
// Fetch asset details
const asset = await assetModel.getAssetById(item.asset_id);

// 5a. Insert movement record into asset_history
INSERT INTO asset_history 
  (asset_id, ramco_id, costcenter_id, department_id, location_id, 
   register_number, type_id, effective_date)
VALUES 
  (item.asset_id, item.new_owner, item.new_costcenter_id, 
   item.new_department_id, item.new_location_id, 
   asset.register_number, asset.type_id, acceptance_date)

// 5b. Update current ownership in assetdata
UPDATE assetdata 
SET 
  ramco_id = item.new_owner,
  costcenter_id = item.new_costcenter_id,
  department_id = item.new_department_id,
  location_id = item.new_location_id
WHERE id = item.asset_id
```

#### Step 6: Send Email Notifications
Sends emails to three recipient groups:

**a) To Requestor (Applicant):**
- Template: `assetTransferAcceptedRequestor.ts`
- Message: "Your transfer has been accepted"
- Content: Assets accepted, accepted by, date

**b) To Current Owner:**
- Template: `assetTransferAcceptedCurrentOwner.ts`
- Message: "Assets have been transferred out of your control"
- Content: Transfer details, new owner info

**c) To New Owner's HOD (Head of Department):**
- Template: `assetTransferAcceptedHodEmail.ts`
- Message: "Your employee has accepted assets"
- Content: Assets received, employee details

### Database State After Acceptance

**transfer_items Table:**
```json
{
  "id": 1,
  "transfer_id": 1,
  "asset_id": 865,
  "current_owner": "000475",
  "new_owner": "000277",
  "acceptance_by": "000277",
  "acceptance_date": "2026-01-14 10:30:00",
  "acceptance_remarks": "Verified and in good condition",
  "acceptance_checklist_items": "1,2,3",
  "acceptance_attachments": "['/uploads/assets/transfers/acceptance/photo1.jpg', '/uploads/assets/transfers/acceptance/photo2.png', '/uploads/assets/transfers/acceptance/document.pdf']",
  "attachment1": "/uploads/assets/transfers/acceptance/photo1.jpg",
  "attachment2": "/uploads/assets/transfers/acceptance/photo2.png",
  "attachment3": "/uploads/assets/transfers/acceptance/document.pdf",
  "updated_at": "2026-01-14 10:30:00"
}
```

**assetdata Table (Updated):**
```json
{
  "id": 865,
  "ramco_id": "000277",        // Changed from 000475
  "costcenter_id": 26,         // Updated if provided
  "department_id": 16,         // Updated if provided
  "location_id": 2             // Updated if provided
}
```

**asset_history Table (New Record):**
```json
{
  "asset_id": 865,
  "ramco_id": "000277",
  "costcenter_id": 26,
  "department_id": 16,
  "location_id": 2,
  "register_number": "5CG7314HJW",
  "type_id": 1,
  "effective_date": "2026-01-14 10:30:00",
  "created_at": "2026-01-14 10:30:00"
}
```

### Error Handling

| Scenario | HTTP Status | Response |
|----------|------------|----------|
| Missing transfer ID | 400 | Invalid transfer request id |
| Transfer not found | 404 | Transfer request not found |
| Invalid acceptance_by | 400 | (multer validation) |
| File upload failure | 400 | File upload error |
| Database update failure | 500 | Internal server error |
| Ownership update fails | 500 | Error logged but acceptance saved |

**Note:** Ownership update errors don't block acceptance save - issue is logged for manual review.

### Acceptance Portal Integration

The acceptance endpoint is used by the frontend acceptance portal after user clicks "Accept Transfer" button:

```
Portal URL: {FRONTEND_URL}/assets/transfer/acceptance/{transfer_id}
Query params: ?new_owner={ramco_id}&_cred={credential_code}

Portal calls:
1. GET /api/assets/transfers/:id/items?new_owner=:ramco_id
   ↓ Returns filtered items with full enrichment
2. PUT /api/assets/transfers/:id/acceptance (multipart)
   ↓ Submits acceptance with files and checklist
```

### Security Considerations

1. **File Upload**
   - Multer validates file types
   - Files saved with unique names (prevents overwrites)
   - Directory path restricted to `/mnt/winshare/uploads/assets/transfers/acceptance/`

2. **Ownership Transfer**
   - Only transfers when acceptance_by is provided
   - Uses transaction-like pattern (insert history first, then update current)
   - Asset history provides complete audit trail

3. **Authentication**
   - Requires valid JWT token (enforced by middleware)
   - acceptance_by should match authenticated user or be authorized

4. **Data Validation**
   - Checklist items validated as positive integers
   - Dates validated as ISO 8601 format
   - Filenames sanitized by multer

---

## Testing Strategy


### Unit Tests
- Depreciation calculation edge cases
- Transfer approval workflows
- Classification hierarchy validation
- Search functionality with special characters

### Integration Tests
- Asset creation with related entities
- Transfer workflow end-to-end
- Email notification delivery
- Procurement integration

### Scenarios to Test
- [ ] Create asset, assign to employee, depreciate over 5 years
- [ ] Transfer asset through approval chain with notifications
- [ ] Search assets by multiple filters
- [ ] Handle soft delete (status = 'disposed')
- [ ] Cascade updates when department/employee deleted
- [ ] Concurrent transfer requests handling
