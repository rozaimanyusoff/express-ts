# Resend Purchase Notification Implementation

## Overview
Added a new endpoint to resend purchase notifications for existing purchase items. This addresses the issue where recipients sometimes ignore or miss initial notification emails.

## New Endpoint

### POST `/api/purchases/:id/resend-notification`
Resends notification emails for a specific purchase to its assigned asset managers.

### Request
- **URL Parameter**: `id` (purchase ID, required)
- **Method**: POST
- **Authentication**: Required (via tokenValidator middleware)

### Response

#### Success (200 OK)
```json
{
  "status": "success",
  "message": "Notification resent to 2/2 recipient(s)",
  "data": {
    "purchase_id": 123,
    "total_recipients": 2,
    "successful_recipients": [
      {
        "email": "manager1@company.com",
        "name": "Manager One"
      },
      {
        "email": "manager2@company.com",
        "name": "Manager Two"
      }
    ],
    "failed_recipients": []
  }
}
```

#### Error Cases

**404 Not Found** - Purchase doesn't exist
```json
{
  "status": "error",
  "message": "Purchase not found",
  "data": null
}
```

**400 Bad Request** - Cannot determine manager type
```json
{
  "status": "error",
  "message": "Cannot determine manager for this purchase (missing item_type or type_id)",
  "data": null
}
```

**400 Bad Request** - No active managers found
```json
{
  "status": "error",
  "message": "No active managers found for this purchase type",
  "data": null
}
```

**500 Server Error** - General failure
```json
{
  "status": "error",
  "message": "Failed to resend notification",
  "data": null
}
```

## Implementation Details

### Logic Flow

1. **Fetch Purchase**: Retrieve purchase item by ID from `purchases2.purchaseRequestItem`
2. **Fetch Request**: Get parent purchase request (for pr_date, pr_no, request_type)
3. **Determine Manager**: Derive manager ID from:
   - `item_type` (if numeric), OR
   - `type_id` (fallback)
4. **Lookup Managers**: Query `assets.manager` table filtering by:
   - `manager_id` matches the derived ID
   - `is_active = 1` (only active managers)
5. **Resolve Recipients**: Map manager `ramco_id` to employee emails via:
   - `assets.employees` table
   - Only includes managers with valid email addresses
6. **Send Emails**: For each recipient:
   - Generate email HTML using `renderPurchaseNotification()` template
   - Send via `sendMail()` utility
   - Track successful and failed sends
   - Non-blocking error handling (one email failure doesn't stop others)

### Data Sources

**Purchase Item** (`purchases2.purchaseRequestItem`)
- `id`: purchase ID
- `request_id`: parent request ID  
- `item_type`: manager type (numeric or string)
- `type_id`: fallback manager type
- `description`: items description
- `costcenter`: cost center string

**Purchase Request** (`purchases2.purchaseRequest`)
- `pr_no`: purchase order number
- `pr_date`: purchase order date
- `request_type`: type of request

**Managers** (`assets.manager`)
- `manager_id`: manager type identifier
- `ramco_id`: employee ID (links to employees table)
- `is_active`: 1 for active, 0 for inactive

**Employees** (`assets.employees`)
- `ramco_id`: employee ID
- `email`: email address
- `full_name`: employee name

### Email Template

Uses existing `renderPurchaseNotification()` with parameters:
- `brand`: null (not available in purchase item)
- `costcenterName`: from purchase.costcenter
- `items`: from purchase.description
- `itemType`: from item_type or type_id
- `prDate`: from parent request pr_date
- `prNo`: from parent request pr_no
- `recipientName`: manager's full name
- `requestType`: from parent request request_type

### Error Handling

- **Non-blocking email failures**: If one recipient's email fails, others are still attempted
- **Partial success**: Returns 200 with list of successful and failed recipients
- **Graceful validation**: Clear error messages for missing data

## Route Definition

```typescript
router.post('/:id/resend-notification', asyncHandler(purchaseController.resendPurchaseNotification));
```

Located in [purchaseRoutes.ts](src/p.purchase/purchaseRoutes.ts#L46)

## Controller Function

[resendPurchaseNotification()](src/p.purchase/purchaseController.ts#L523) in purchaseController.ts

## Integration Points

- Uses existing asset manager lookup infrastructure
- Reuses email notification template from `createPurchaseRequestItem`
- Follows standard error handling patterns (asyncHandler wrapper)
- Non-blocking email errors (same pattern as create)

## Usage Example

### cURL
```bash
curl -X POST http://localhost:3000/api/purchases/123/resend-notification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Frontend/JavaScript
```typescript
const purchaseId = 123;
const response = await fetch(`/api/purchases/${purchaseId}/resend-notification`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.status === 'success') {
  console.log(`Notification resent to ${result.data.successful_recipients.length} recipients`);
  if (result.data.failed_recipients.length > 0) {
    console.warn('Failed recipients:', result.data.failed_recipients);
  }
}
```

## Status

✅ **Implemented and Type-Checked**
- Function added to purchaseController.ts
- Route added to purchaseRoutes.ts  
- TypeScript compilation passes
- Non-blocking error handling implemented
- Follows existing patterns and conventions
