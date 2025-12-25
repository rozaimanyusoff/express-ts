# Billing Module (p.billing)

## Overview

The billing module manages all financial operations including vehicle maintenance billing, fuel billing, fleet card management, utilities billing, and financial reports.

## Module Structure

```
/p.billing/
├── billingModel.ts          # Database operations and queries
├── billingController.ts     # Business logic and request handling
├── billingRoutes.ts         # API endpoint definitions
├── README.md                # Module overview (this file)
├── SCHEMA.md                # Database tables, schemas, and interfaces
├── API.md                   # Complete API documentation with examples
└── ENHANCEMENTS.md          # Features, fixes, and improvements
```

## API Base Path

All endpoints are prefixed with `/api/bills`

## Key Features

### ✅ Vehicle Maintenance Billing
- Invoice generation from maintenance requests
- Status tracking (draft, form uploaded, accrued, invoiced)
- Invoice number and date management
- Parts and service cost tracking
- Automatic status updates from maintenance actions

### ✅ Fuel Billing Management
- Fuel statement tracking by vendor
- Per-vehicle fuel cost allocation
- Cost center summary and filtering
- Monthly and yearly cost analysis
- Fleet card and fuel issuer management

### ✅ Utilities Billing
- Utility billing account management
- Bill statement tracking
- Beneficiary management for multiple properties
- Cost allocation by department and location

### ✅ Fleet Management
- Fleet card issuance and history tracking
- Card-to-asset mapping
- Card status and usage tracking
- Fleet card vendor management

### ✅ Financial Reports & Analytics
- Vehicle maintenance summary by asset/date range
- Fuel cost summary by vehicle/cost center
- Utilities cost tracking
- Cost center summary by month/year
- Excel report generation

### ✅ Real-Time Integration
- Socket.IO badge updates for unseen bills
- Automatic count updates on billing status change
- Maintenance request integration with invoice status

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

- **Billings Database**: `billings` (MySQL pool2)
- **Applications DB**: `applications` (maintenance requests)
- **Assets DB**: `assets` (vehicle and IT asset data)

Main Tables:
- `tbl_inv` - Vehicle maintenance invoices
- `tbl_inv_part` - Invoice line items/parts
- `fuel_stmt` - Fuel billing statements
- `fuel_stmt_detail` - Fuel cost per vehicle
- `fuel_vendor` - Fuel vendors/issuers
- `fleet2` - Fleet cards
- `fleet_history` - Fleet card transaction history
- `fleet_asset` - Fleet card to asset mapping
- `tbl_util` - Utility bills
- `util_billing_ac` - Utility billing accounts
- `util_beneficiary` - Utility beneficiary information

See [SCHEMA.md](./SCHEMA.md) for complete database structure.

## Implementation Status

### ✅ Completed Features
- Vehicle maintenance invoice CRUD operations
- Fuel billing statement management
- Utilities billing and account management
- Fleet card and issuer management
- Cost center and vehicle filtering
- Date range filtering and summaries
- Excel report generation
- Invoice status calculation and tracking
- Service parts inventory
- Service options management
- Automatic invoice updates from maintenance approval
- Badge count integration with Socket.IO

### 📋 Documentation
- Complete API reference with all endpoints
- Database schema and table definitions
- Invoice status workflows
- Summary and report generation
- Real-time notification integration

## Quick Start

### Get Vehicle Maintenance Billings
```bash
GET /api/bills/mtn?year=2024
Authorization: Bearer <token>
```

### Create/Update Maintenance Invoice
```bash
PUT /api/bills/mtn/123
Content-Type: multipart/form-data

Body:
  inv_no: "INV-2024-001"
  inv_date: "2025-12-25"
  inv_total: 5000
  attachment: <file>
```

### Get Fuel Billing Summary
```bash
GET /api/bills/fuel/summary?from=2024-01-01&to=2024-12-31
Authorization: Bearer <token>
```

### Get Utilities Billing
```bash
GET /api/bills/utilities
Authorization: Bearer <token>
```

See [API.md](./API.md) for complete endpoint documentation.

## Architecture Overview

### Invoice Status Workflow
```
Draft (no form upload)
  ↓
Form Uploaded (form_upload_date set, inv_total = 0)
  ↓
Amount Set (inv_total > 0)
  ↓
Accrued (no invoice number/date yet)
  ↓
Invoiced (inv_no & inv_date set)
  ↓
Paid/Closed
```

### Real-Time Updates
- When maintenance request approved → Invoice status auto-updates
- Badge count reflects unseen bills (pending invoice status)
- Socket.IO emits `mtn:counts` event with badge updates
- REST fallback endpoint available for polling

### Cost Allocation
- Vehicle maintenance: By workshop, cost center, location
- Fuel: Per vehicle, by cost center and month
- Utilities: By billing account, beneficiary, location

## Dependencies

- Express.js - Web framework
- MySQL2 - Database driver with connection pooling
- Socket.IO - Real-time notifications
- Multer - File upload handling
- ExcelJS - Excel report generation
- Dayjs - Date manipulation

## Error Handling

All routes use `asyncHandler` middleware for consistent error handling. Errors are caught, logged, and returned with appropriate HTTP status codes.

## Performance Optimizations

- **Selective Columns**: Only essential fields retrieved
- **Indexed Queries**: Fast lookups on common filters
- **Connection Pooling**: MySQL connection reuse
- **Lazy Loading**: Related data loaded only when needed
- **Date Range Optimization**: Efficient filtering by date

See [ENHANCEMENTS.md](./ENHANCEMENTS.md#performance) for optimization details.

## Related Modules

- [p.maintenance](../p.maintenance/) - Maintenance requests and approvals
- [p.asset](../p.asset/) - Vehicle and IT asset data
- [p.purchase](../p.purchase/) - Purchase order integration
- [p.compliance](../p.compliance/) - Compliance and assessment tracking

## Configuration

Environment variables (in `.env`):
- `DATABASE_URL_2` - Billings database connection
- `UPLOAD_BASE_PATH` - File upload base directory
- `SMTP_*` - Email configuration for notifications

## Contributing

When implementing features:

1. Follow the existing MVC pattern (Model → Controller → Routes)
2. Use `asyncHandler` for all async route handlers
3. Return standardized response format
4. Calculate invoice status correctly (draft, accrued, invoiced)
5. Update documentation (README, API, SCHEMA, ENHANCEMENTS)
6. Test with provided cURL commands in [API.md](./API.md)

For major features:
1. Document in [ENHANCEMENTS.md](./ENHANCEMENTS.md)
2. Update database schema if needed
3. Include Socket.IO events if real-time needed
4. Add Excel report generation if needed
5. Include comprehensive testing

## Last Updated

- December 25, 2025 - Documentation consolidated into 4 files
- Core features fully implemented and tested
          "months": [
            {
              "month": 12,
              "expenses": "2273.06"
            },
            {
              "month": 11,
              "expenses": "1975.65"
            }
          ]
        },
        ...
      ]
    },
    ...
  ]
}
```

### Notes
- Grouped by cost center, year, and month.
- Each year contains an array of months, each with total expenses for that month.
- Cost center name is mapped from cc_id.
- The output is sorted alphabetically by cost center name.
