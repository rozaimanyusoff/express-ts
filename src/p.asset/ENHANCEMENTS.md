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
     - Query workflows table: `module_name = 'asset transfer'`, `level_name = 'approver'`, `department_id = applicant's department_id`
     - Returns department-specific approver (e.g., HR transfers approved by HR HOD, IT transfers by IT HOD)
     - Fallback: Use requestor's `wk_spv_id` (work supervisor) if no workflow approver found

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
