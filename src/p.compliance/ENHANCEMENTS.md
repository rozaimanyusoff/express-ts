# Compliance Module - Enhancements & Features

This document tracks all major features, improvements, and implementations in the compliance module.

---

## Summon Management System

### Overview
Complete summon (legal notice) tracking system for vehicles with payment recording and notification support.

### Features Implemented

#### 1. Summon Type Management
- Create/update/delete summon types
- Type descriptions and categorization
- Many-to-many mapping with agencies

#### 2. Agency Management
- Agency records with code and contact info
- Type-agency associations
- Multi-agency support per summon type

#### 3. Summon CRUD Operations
- Create summon with type, agency, amount
- Track summon date and amount
- Upload original summon document
- Record payment with date, amount, method, reference
- Upload payment receipt

#### 4. Payment Processing
- Record payment details (date, amount, method, reference)
- Upload payment receipt document
- Auto-update status to "paid" when payment recorded
- Support for pending, disputed, and closed statuses

#### 5. Email Notifications
- Summon notification emails to asset owner
- Payment receipt notifications
- Admin CC support via `ADMIN_EMAIL` env var
- HTML email templates with details

---

## Vehicle Assessment System

### Overview
Comprehensive vehicle health inspection and compliance tracking system with NCR (Non-Conformance) management.

### Features Implemented

#### 1. Assessment CRUD
- Create vehicle assessments with date, technician, year
- Record overall health score (1=poor to 4=excellent)
- Add detailed findings and remarks
- Track assessment completion status

#### 2. Assessment Details (Checklist)
- Add individual findings/checklist items to assessment
- Classify findings as NCR (non-conformance) or minor issues
- Link findings to assessment criteria questions
- Record remediation remarks

#### 3. NCR Status Classification
```
adt_ncr = 0: Pass (no issue)
adt_ncr = 1: Minor compliance issue
adt_ncr = 2: Non-conformance (requires action)
```

#### 4. Asset & Ownership Tracking
- Link assessment to specific vehicle/asset
- Track assessment by department, cost center, location
- Record vehicle owner (ramco_id)
- Optional technician assignment

---

## NCR Tracking & Driver Action Correlation

### Overview
Track driver maintenance actions taken in response to NCR items identified during vehicle assessments.

### Implementation

#### 1. Query NCR Actions
- **Endpoint**: `GET /api/compliance/assessments/:id/ncr-actions`
- **Purpose**: Get all driver maintenance requests for NCR items

#### 2. Correlation Logic
1. Fetch assessment record with all details
2. Filter details where `adt_ncr = 2` (non-conformance)
3. Query maintenance requests where:
   - Same asset_id
   - Service option includes '32' (NCR service)
   - Request date >= assessment date
4. Enrich data with asset/owner information

#### 3. Response Structure
```json
{
  "assessment": { /* assessment details */ },
  "ncr_items": [
    {
      "assess_dt_id": 1,
      "adt_finding": "Brake pads worn",
      "adt_ncr": 2
    }
  ],
  "driver_actions": [
    {
      "req_id": 500,
      "req_date": "2025-12-05",
      "svc_opt": "32",
      "drv_stat": 1,
      "approval_stat": 1
    }
  ],
  "summary": {
    "ncr_count": 5,
    "actions_taken": 3,
    "pending_actions": 2
  }
}
```

#### 4. Integration Points
- Links to `applications.vehicle_svc` table (maintenance requests)
- Service option '32' = NCR corrective action
- Tracks driver, verification, recommendation, approval status
- Enables compliance monitoring and follow-up

---

## Computer Assessment (IT Hardware)

### Overview
Comprehensive IT asset health assessment system tracking hardware specifications, security status, and health scoring.

### Features Implemented

#### 1. Assessment Metadata
- Assessment year and date
- Technician assignment
- Overall health score (1-5)
- Detailed remarks

#### 2. Asset Reference
- Link to asset_id
- Register number / device identifier
- Category, brand, model
- Purchase date tracking

#### 3. Asset Ownership
- Cost center, department, location
- Asset owner (ramco_id)
- Multi-level organizational tracking

#### 4. Hardware Specifications
- **OS**: Name, version, patch status
- **CPU**: Manufacturer, model, generation, cores, threads
- **Memory**: Type (DDR4/DDR5), manufacturer, size in GB
- **Storage**: Type (SSD/HDD/NVMe), manufacturer, size in GB
- **Graphics**: Type (Integrated/Discrete), manufacturer, specs
- **Display**: Manufacturer, size, resolution
- **Ports**: USB count, audio jack, SD card, Thunderbolt

#### 5. Security Assessment
- **Antivirus**: Installed, vendor, status, license validity
- **VPN**: Installed, type, username
- Comprehensive security posture

#### 6. Software Tracking
- Installed applications list
- Can track compliance with software policies

#### 7. Unique Constraint
- One assessment per asset per year (duplicate prevention)

---

## IT Asset Assessment Status Integration

### Overview
Comprehensive view of all IT assets with their assessment status showing which devices have been assessed and which haven't.

### Implementation

#### 1. Combined Data View
- **Asset Information**: All IT device details from assets table
- **Assessment Status**: Linked assessment if exists, null if not assessed
- **Status Flag**: Boolean `assessed` field for easy filtering

#### 2. Query Features
```sql
-- Get all IT assets with assessment status for year 2024
SELECT a.*, ca.id as assessment_id, ca.overall_score
FROM assets.asset a
LEFT JOIN compliance.computer_assessment ca 
  ON a.id = ca.asset_id AND ca.assessment_year = 2024
WHERE a.type_id = 1
```

#### 3. Filtering Options
- Filter by `assessment_year` (e.g., "2024")
- Filter by `assessed_only=true` (show only assessed)
- Filter by `not_assessed_only=true` (show unassessed)
- Combination filters supported

#### 4. Response Structure
```json
{
  "asset": {
    "id": 1295,
    "entry_code": "10658",
    "brand": "HP",
    "category": "Laptop",
    "department": "BD",
    "costcenter": "DBTLDM",
    "location": "TLDM Lumut"
  },
  "assessment": {
    "id": 25,
    "assessment_year": "2024",
    "overall_score": 4,
    "technician": "jdoe"
  },
  "assessed": true
}
```

#### 5. Use Cases
- Find unassessed devices due for assessment
- Track assessment completion rate by department
- Compliance reporting on assessment coverage
- Planning assessment schedules

---

## Assessment Criteria & Ownership

### Overview
Configurable assessment questionnaire sets and ownership tracking for criteria management.

### Features Implemented

#### 1. Criteria Questionnaire Sets
- Define assessment questions/criteria
- Categorize by assessment domain
- Support multiple response types:
  - Yes/No questions
  - Scale-based ratings
  - Text responses
- Sequence/ordering of questions
- Active/inactive status

#### 2. Criteria Ownership
- Assign criteria to owners (department, technician, team)
- Track ownership for accountability
- Support multiple ownership types
- Ownership descriptions

#### 3. Assessment Linking
- Link assessment details to specific criteria
- Trace which criteria questions were evaluated
- Support for criteria-based reporting

---

## File Upload & Storage

### Overview
Secure file upload handling for compliance documents.

### Features Implemented

#### 1. Upload Locations
- **Summon**: `/uploads/compliance/summon/`
- **Payment Receipt**: `/uploads/compliance/summon/` (same)
- File organization by module directory

#### 2. File Handling
- Move uploaded files to permanent storage
- Generate public URLs for file access
- Safe file handling with validation
- Support for PDF and image formats

#### 3. Document Tracking
- Store file paths in database
- Link files to summons and payments
- Enable document retrieval and preview

---

## Email Notifications

### Overview
Email notification system for compliance events.

### Features Implemented

#### 1. Summon Notifications
- **File**: Email templates in `src/utils/emailTemplates/`
- **Triggers**: New summon, payment recorded
- **Recipients**: Asset owner, optional admin CC
- **Content**: Summon details, amount, agency, due date

#### 2. Assessment Notifications
- **Vehicle Assessment**: Notification to department/owner
- **IT Assessment**: Notification to IT owner
- **Content**: Assessment date, technician, overall score, findings

#### 3. Email Templates
- HTML formatted templates
- Dynamic data injection
- Professional formatting
- Clear action items and due dates

#### 4. Configuration
```env
ADMIN_EMAIL=admin@example.com  # Optional CC for summons
SMTP_*=config                  # Email service configuration
```

---

## Data Validation & Error Handling

### Overview
Robust validation and error handling throughout the module.

### Features Implemented

#### 1. Input Validation
- Required field validation
- Date format validation (YYYY-MM-DD)
- Numeric range validation
- File type validation for uploads

#### 2. Unique Constraints
- One computer assessment per asset per year
- Prevent duplicate assessments

#### 3. Error Handling
- Try-catch blocks with logging
- Meaningful error messages
- Proper HTTP status codes
- Graceful failure handling

#### 4. Data Integrity
- Foreign key relationships
- Cascading updates for timestamps
- Atomic operations where needed

---

## Performance Optimization

### Features Implemented

#### 1. Indexed Queries
- Index on asset_id for fast lookups
- Index on assessment year/date
- Index on summon status for filtering
- Composite indexes for common queries

#### 2. Selective Data Loading
- Load only required fields
- Lazy load related data
- Filter early in query stage

#### 3. Connection Pooling
- Reuse MySQL connections
- Efficient resource management

---

## Reporting & Analytics

### Features Implemented

#### 1. Assessment Reports
- Filter by year, technician, status
- Export assessment summary
- Drill-down into assessment details

#### 2. Compliance Reports
- Summon status tracking
- Payment status summary
- Overdue summons identification

#### 3. IT Asset Health
- Assessment coverage by department
- Health score distribution
- Unassessed devices report

#### 4. NCR Tracking
- NCR items vs. remediation actions
- Compliance closure tracking
- Driver action follow-up

---

## Integration Points

### External Dependencies
- **Asset Module** (`p.asset`): Vehicle and IT asset data
- **Maintenance Module** (`p.maintenance`): NCR service tracking
- **User Module** (`p.user`): Authentication
- **Admin Module** (`p.admin`): Notifications

### Database References
- `assets.asset` - Vehicle/IT equipment master
- `assets.vehicle` - Vehicle-specific information
- `assets.employee` - User/owner information
- `applications.vehicle_svc` - Maintenance requests (NCR tracking)

---

## Security & Compliance

### Features Implemented

#### 1. Authentication
- Token-based API authentication
- Some endpoints public (summon creation)
- Protected endpoints require Bearer token

#### 2. File Security
- File upload validation
- Safe file storage paths
- Public URL generation for authorized access

#### 3. Data Privacy
- No sensitive data in error messages
- Logged operations for audit trail
- Access control by role (if implemented)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-25 | 2.0 | Documentation consolidated into 4 files |
| 2025-12-15 | 1.5 | IT asset assessment status integration |
| 2025-12-10 | 1.4 | NCR tracking and driver action correlation |
| 2025-12-01 | 1.3 | Computer assessment implementation |
| 2025-11-15 | 1.2 | Vehicle assessment enhancements |
| 2025-11-01 | 1.1 | Payment tracking and receipts |
| 2025-10-01 | 1.0 | Initial summon management system |

---

## Future Enhancements

### Planned Features
- [ ] Bulk summon creation from external source
- [ ] SMS notifications for pending summons
- [ ] Assessment reminder escalation
- [ ] Automated compliance report generation
- [ ] Mobile app for assessments
- [ ] Photo attachments for assessment findings
- [ ] Assessment templates by vehicle type
- [ ] Compliance SLA tracking

### Potential Improvements
- [ ] GraphQL API support
- [ ] Real-time assessment notifications
- [ ] Advanced filtering (cost ranges, date ranges)
- [ ] Export to Excel/PDF
- [ ] Assessment approval workflow
- [ ] Multi-language support
- [ ] Integration with accounting system
- [ ] Vehicle maintenance cost analytics

---

## Testing & Validation

### Unit Testing
- Model layer validation
- Data transformation functions
- Date/time formatting utilities

### Integration Testing
- End-to-end API workflows
- File upload and storage
- Email notification triggers
- Database relationship integrity

### Performance Testing
- Large dataset queries
- Report generation speed
- File upload performance

See [API.md](./API.md) for testing checklist with cURL examples.
