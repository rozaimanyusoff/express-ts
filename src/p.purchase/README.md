# Purchase Module

**Location**: `src/p.purchase/`  
**Database**: `purchases2.*`  
**Endpoints**: `/api/purchases/`

## Quick Overview

The Purchase module manages the complete procurement lifecycle: from purchase requests through supplier management, asset registry tracking, and delivery workflows. It supports multi-item purchase orders with status tracking from request to completion.

## Key Features

- **Purchase Requests**: Create and manage purchase requisitions with date and cost center tracking
- **Purchase Items**: Line items within requests with quantity, pricing, and supplier assignment
- **Supplier Management**: Master supplier records with contact and status tracking
- **Asset Registry**: Link purchased items to company assets for inventory management
- **Delivery Tracking**: Track purchase deliveries with document uploads and status workflow
- **Filtering & Search**: Filter purchases by status, cost center, supplier, and date range
- **Type Management**: Asset types tied to manager assignments (role-based filtering)
- **User Access Control**: Asset manager role filtering based on assigned asset types

## Architecture

### MVC Structure
```
p.purchase/
├── purchaseController.ts  (19 endpoints, 1513 lines)
├── purchaseModel.ts       (6 tables, 796 lines)
└── purchaseRoutes.ts      (40+ route definitions)
```

### Database Design
```
purchases2.purchase_request        ┐
       ↓                           │
purchases2.purchase_items          ├── Core Procurement
       ↓                           │
purchases2.purchase_delivery       ┘
       ↑
purchases2.purchase_supplier       (Supplier reference)
purchases2.purchase_asset_registry (Asset linkage)
purchases2.purchase_registry       (Purchase→Asset join)
```

## Main Workflows

### 1. Create Purchase Request
1. Requester creates PR with date and cost center
2. PR assigned to procurement admin
3. Items added to PR (line items)
4. Supplier assigned to each item
5. Status: requested → ordered → delivered

### 2. Supplier Management
1. Master supplier records maintained
2. Supplier tied to purchase items
3. Contact info tracked
4. Active/inactive status management

### 3. Asset Registry
1. Company assets registered for tracking
2. Purchased items linked to assets
3. Asset manager assignments by type
4. Inventory visibility per cost center

### 4. Delivery Workflow
1. Deliveries created for purchase items
2. Document uploads (GRN, receipts)
3. Status tracking: do_no, inv_no, grn_no
4. Email notifications on delivery completion

## Quick Start Examples

### Get all purchase requests
```bash
curl -X GET 'http://localhost:3030/api/purchases/requests'
```

### Create purchase request
```bash
curl -X POST 'http://localhost:3030/api/purchases/requests' \
  -H 'Content-Type: application/json' \
  -d '{
    "pr_no": "PR-2024-001",
    "pr_date": "2024-12-01",
    "request_type": "goods",
    "ramco_id": "user_123",
    "costcenter_id": 5
  }'
```

### Filter purchases by status
```bash
curl -X GET 'http://localhost:3030/api/purchases/?status=ordered'
```

### Create supplier
```bash
curl -X POST 'http://localhost:3030/api/purchases/suppliers' \
  -H 'Content-Type: application/json' \
  -d '{
    "supplier_name": "Tech Solutions Ltd",
    "contact_email": "contact@tech.com",
    "contact_phone": "123-456-7890"
  }'
```

## Module Dependencies

| Module | Usage |
|--------|-------|
| `p.asset` | Asset types, categories, cost centers, employees, departments |
| `p.user` | User lookup for requester details |
| `utils.emailTemplates` | Purchase notification emails |
| `utils.mailer` | Send purchase status notifications |
| `utils.uploadUtil` | File storage and public URL generation |

## Technologies Used

- **Database**: MySQL2 with connection pooling (`purchases2` database)
- **File Handling**: Multer for multi-file uploads in purchase items and deliveries
- **Notifications**: Email via Node Mailer with HTML templates
- **Validation**: Input validation on request creation and updates
- **Date Handling**: dayjs for date parsing and manipulation

## Access Control

- **Authentication**: Bearer token required (from `tokenValidator` middleware)
- **Manager Filtering**: Asset managers see only their assigned asset types
- **Role-Based**: Procurement admin vs. requester vs. asset manager
- **Department Filtering**: Cost center visibility per department

## Key Metrics

- **6 database tables** (purchase_request, purchase_items, purchase_delivery, supplier, asset_registry, registry)
- **19 API endpoints** for full CRUD operations
- **3 filter types**: Status, cost center, supplier, date range
- **Multi-file upload support** for attachments and documents

## Common Error Scenarios

| Scenario | Status | Message |
|----------|--------|---------|
| Missing required field | 400 | Validation error |
| Purchase not found | 404 | Record not found |
| Duplicate PR | 400 | Purchase request already exists |
| Unauthorized access | 401 | Authentication required |
| File upload failed | 400 | Upload error details |

## Next Steps

- Review [SCHEMA.md](SCHEMA.md) for database structure and TypeScript interfaces
- Check [API.md](API.md) for complete endpoint documentation
- See [ENHANCEMENTS.md](ENHANCEMENTS.md) for feature details and workflows
