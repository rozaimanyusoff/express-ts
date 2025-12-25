# Compliance Module (p.compliance)

## Overview

The compliance module manages vehicle and IT compliance assessments including summon tracking, NCR (Non-Conformance) actions, vehicle health inspections, and IT hardware assessments.

## Module Structure

```
/p.compliance/
├── complianceModel.ts           # Database operations and queries
├── complianceController.ts      # Business logic and request handling
├── complianceRoutes.ts          # API endpoint definitions
├── README.md                    # Module overview (this file)
├── SCHEMA.md                    # Database tables, schemas, and interfaces
├── API.md                       # Complete API documentation with examples
└── ENHANCEMENTS.md              # Features, fixes, and improvements
```

## API Base Path

All endpoints are prefixed with `/api/compliance`

## Key Features

### ✅ Summon Management
- Summon type and agency management
- Summon tracking and status
- Payment recording with receipts
- Email notifications
- Agency mapping and categorization

### ✅ Vehicle Compliance Assessment
- Vehicle health inspection assessments
- NCR (Non-Conformance) tracking
- Driver action correlation with maintenance requests
- Assessment details and findings
- Technician assignments

### ✅ IT Asset Assessment
- Computer/laptop IT health assessments
- Hardware specifications tracking
- Security status (antivirus, VPN)
- Assessment filtering by year, technician, owner
- Overall health scoring

### ✅ Assessment Criteria
- Criteria ownership and management
- Assessment questionnaire sets
- Criteria evaluation questions
- Assessment details tracking

## Response Format

All API responses follow standardized format:

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { /* ... */ }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

## Database Configuration

- **Main Database**: `compliance` (MySQL pool)
- **Related Databases**: `applications` (maintenance), `assets` (vehicle/IT data)

Main Tables:
- `summon` - Summon records
- `summon_type` - Summon classifications
- `summon_agency` - Agency information
- `summon_type_agency` - Type-Agency mappings
- `v_assess2` - Vehicle assessments
- `v_assess_dt2` - Vehicle assessment details
- `v_assess_qset` - Assessment criteria/questionnaires
- `computer_assessment` - IT hardware assessments
- `criteria_ownership` - Criteria ownership configuration

See [SCHEMA.md](./SCHEMA.md) for complete database structure.

## Implementation Status

### ✅ Completed Features
- Summon CRUD operations
- Summon type and agency management
- Vehicle assessment CRUD
- Assessment details and findings
- IT computer assessment system
- NCR tracking and driver action correlation
- IT asset assessment status integration
- Email notifications for summons
- Payment receipt tracking
- Assessment criteria and ownership

### 📋 Documentation
- Complete API reference with all endpoints
- Database schema and table definitions
- Assessment workflows and integrations
- Enhancement features and improvements

## Quick Start

### Create Summon Record
```bash
POST /api/compliance/summon
Content-Type: multipart/form-data

Body:
  asset_id: 123
  summon_date: "2025-12-25"
  agency_id: 1
  type_id: 2
  amount: 500
  summon_upl: <file>
```

### Get Vehicle Assessments
```bash
GET /api/compliance/assessments?type=vehicle
Authorization: Bearer <token>
```

### Get IT Assessments
```bash
GET /api/compliance/computer-assessments?assessment_year=2024
Authorization: Bearer <token>
```

### Track NCR Actions
```bash
GET /api/compliance/assessments/:assessmentId/ncr-actions
Authorization: Bearer <token>
```

See [API.md](./API.md) for complete endpoint documentation.

## Architecture Overview

### Summon Workflow
```
Create Summon
  ↓
Record agency, type, amount
  ↓
Upload supporting document
  ↓
Send notification email
  ↓
Record payment receipt
  ↓
Auto-update status to paid
```

### Vehicle Assessment Workflow
```
Create Assessment
  ↓
Add assessment details/findings
  ↓
Identify NCR items (adt_ncr = 2)
  ↓
Track driver maintenance actions
  ↓
Correlate with maintenance requests
  ↓
Monitor remediation progress
```

### IT Assessment Workflow
```
Create Computer Assessment
  ↓
Record hardware specifications
  ↓
Document security status
  ↓
Calculate overall health score
  ↓
Track assessment date and technician
  ↓
Report assessment status by year
```

## Dependencies

- Express.js - Web framework
- MySQL2 - Database driver with connection pooling
- Multer - File upload handling
- Node Mailer - Email notifications
- TypeScript - Type safety

## Error Handling

All routes use `asyncHandler` middleware for consistent error handling. Errors are caught, logged, and returned with appropriate HTTP status codes.

## Related Modules

- [p.asset](../p.asset/) - Asset and IT hardware data
- [p.maintenance](../p.maintenance/) - Maintenance requests and vehicle service
- [p.user](../p.user/) - User authentication and profiles
- [p.admin](../p.admin/) - Admin notifications and operations

## Configuration

Environment variables (in `.env`):
- `SMTP_*` - Email configuration for summon notifications
- `DATABASE_URL` - Primary database connection
- `UPLOAD_BASE_PATH` - File upload base directory

## Contributing

When implementing features:

1. Follow the existing MVC pattern (Model → Controller → Routes)
2. Use `asyncHandler` for all async route handlers
3. Return standardized response format
4. Update documentation (README, API, SCHEMA, ENHANCEMENTS)
5. Test with provided cURL commands in [API.md](./API.md)

For major features:
1. Document in [ENHANCEMENTS.md](./ENHANCEMENTS.md)
2. Update database schema if needed
3. Add comprehensive testing
4. Include error scenarios and edge cases

## Last Updated

- December 25, 2025 - Documentation consolidated into 4 files
- Core features fully implemented and tested
