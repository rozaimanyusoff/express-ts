# Asset Transfer System Update - Transfer Type & HOD Notifications

**Date**: January 27, 2026  
**Scope**: Implement transfer_type field and New Asset Owner's HOD notifications

## Summary of Changes

This update implements two major enhancements to the asset transfer system:

1. **Transfer Type Distinction** (`transfer_type`: "Asset" | "Employee")
2. **New Asset Owner's HOD Notifications** - Including HOD of the new department receiving the asset

---

## 1. Database Schema Updates

### Migration File
- **File**: `db/migrations/update_transfer_items_attachments.sql` (already exists)
- **New Column**: `transfer_type` VARCHAR(50) in `assets.transfer_items` table
- **Purpose**: Distinguishes between asset transfers and employee transfers

```sql
ALTER TABLE `assets`.`transfer_items`
ADD COLUMN `transfer_type` varchar(50) DEFAULT NULL AFTER `type_id`;
```

---

## 2. Payload Structure Changes

### Create Asset Transfer Request Payload
```typescript
{
  transfer_date: "2026-02-01 09:00:00",        // string "yyyy-mm-dd HH:MM:SS"
  transfer_by: "E12345",                       // requestor RAMCO/staff id
  costcenter_id: 210,                          // optional
  department_id: 501,                          // optional
  transfer_status: "submitted",                // "draft" | "submitted"
  details: [
    {
      transfer_type: "Asset",                  // NEW: "Asset" or "Employee"
      asset_id: 987,
      type_id: 12,
      current_owner: "E12345",
      current_costcenter_id: 210,
      current_department_id: 501,
      current_location_id: 33,
      new_owner: "E54321",
      new_costcenter_id: 310,
      new_department_id: 520,
      new_location_id: 42,
      return_to_asset_manager: false,
      effective_date: "2026-02-05",
      reason: "Transfer ownership, Relocation",
      remarks: "Laptop refresh program"
    },
    {
      transfer_type: "Employee",               // NEW: "Asset" or "Employee"
      asset_id: null,                          // Not used for employee row
      type_id: null,
      current_owner: "E77777",
      current_costcenter_id: 210,
      current_department_id: 501,
      current_location_id: 33,
      new_owner: "E99999",
      new_costcenter_id: 220,
      new_department_id: 515,
      new_location_id: 44,
      return_to_asset_manager: false,
      effective_date: "2026-02-10",
      reason: "Transfer ownership, Role Change / Promotion",
      remarks: "Replacing outgoing supervisor"
    }
  ]
}
```

---

## 3. Code Changes

### A. Model Layer (`assetModel.ts`)

**Function**: `createAssetTransferItem()`
- **Change**: Added `transfer_type` parameter to INSERT statement
- **Location**: Line ~2066
- **Before**: `transfer_id, effective_date, asset_id, type_id, current_owner, ...`
- **After**: `transfer_id, transfer_type, effective_date, asset_id, type_id, current_owner, ...`

### B. Controller Layer (`assetController.ts`)

#### 1. `createAssetTransfer()` Function

**Change 1**: Item enrichment - Line ~3065
- Separated `transfer_type` (from payload: "Asset" or "Employee") from `assetTypeName` (from types table)
- `transfer_type`: Preserves original payload value for email display
- `assetTypeName`: Asset classification from database

**Change 2**: Pass transfer_type to model - Line ~2975
- Added `transfer_type: d.transfer_type || null` to `createAssetTransferItem()` call

**Change 3**: New Asset Owner's HOD Notification - Line ~3200
- **New Logic Block**: Collects `new_department_id` from all items
- **Workflow Lookup**: Gets HOD via `getWorkflowPicByDepartment()` for each new department
- **Email Resolution**: Resolves email from employees table if not in workflow record
- **Avoid Duplicates**: Skips if new HOD department same as approval department (Current Asset Owner's HOD)
- **Notification**: Sends T2 approval request email to New Asset Owner's HOD

#### 2. `updateAssetTransfersApproval()` Function

**Change 1**: Item enrichment - Line ~3480
- Same as createAssetTransfer: Separated transfer_type and assetTypeName

**Change 2**: New Asset Owner's HOD Notification - Line ~3610
- **New Logic Block**: Adds New Asset Owner's HOD notification logic for approval workflow
- **Workflow Lookup**: Gets HOD via `getWorkflowPicByDepartment()` for each new department
- **Email Resolution**: Resolves email from employees table if needed
- **Notification**: Sends T4 approval email to New Owner's HOD with asset manager CC

### C. Email Template Layer

#### 1. `assetTransferItemFormat.ts`

**Change 1**: Interface update - Line ~16
- Added new interface property: `assetTypeName?: string; // Asset type name from types table`
- Updated comment for `transfer_type`: Changed from "Asset Type" to "Asset" or "Employee" from payload

**Change 2**: Item card generation - Line ~76
- Added "Transfer Type:" field showing `transfer_type` value
- Added conditional "Asset Type:" field showing `assetTypeName` (only if populated)
- Order: Effective Date → Transfer Type → Asset Type → Register Number → Reason

**Change 3**: Acceptance item card - Line ~142
- Same display changes as main item card

#### 2. Email templates using item cards
All templates that use `generateTransferItemCard()` now display transfer_type:
- `assetTransferT1Submission.ts` - T1 Submission
- `assetTransferT2HodApprovalRequest.ts` - T2 HOD Approval Request
- `assetTransferT3HodDecision.ts` - T3 HOD Decision
- `assetTransferT4HodApproved.ts` - T4 HOD Approved
- `assetTransferT5AwaitingAcceptance.ts` - T5 Awaiting Acceptance
- `assetTransferT6HodRejected.ts` - T6 HOD Rejected
- `assetTransferT7TransferCompleted.ts` - T7 Transfer Completed

---

## 4. Email Notification Matrix (Updated)

### Original Recipients
1. **Requestor** - Gets T1 Submission notification
2. **Current Asset Owner's HOD** (via workflow dept_id) - Gets T2 Approval Request
3. **Asset Managers** (by type_id) - Gets manager notification
4. **Current Asset Owner(s)** - Gets current owner notification
5. **New Asset Owner(s)** - Gets T5 Acceptance when approved

### NEW: Additional Recipients
6. **New Asset Owner's HOD** - Gets T2 Approval Request (on submission)
7. **New Asset Owner's HOD** - Gets T4 Approval notification (on approval)

### Notification Flow

| Trigger | Recipient | Email Template | Condition |
|---------|-----------|----------------|-----------|
| **Create Transfer** | Requestor | T1 Submission | Always |
| | Current Owner's HOD | T2 Approval Request | Always |
| | Asset Managers | Manager Notification | If type_id exists |
| | Current Owner(s) | Current Owner Notice | If current_owner exists |
| | **New Owner's HOD** | **T2 Approval Request** | **NEW: If new_dept_id ≠ approval_dept_id** |
| **Approve Transfer** | Requestor | T4 Approved | If status = 'approved' |
| | New Owner(s) | T5 Acceptance | If status = 'approved' |
| | Asset Managers (CC) | All approval emails | If type_id exists |
| | **New Owner's HOD** | **T4 Approved** | **NEW: If new_dept_id exists** |

---

## 5. Business Logic Highlights

### Transfer Type Distinction
- **Asset**: Physical/IT asset transfer between employees (requires type_id)
- **Employee**: Employee transfer (transfer_type only, no asset_id/type_id)
- Email templates display both transfer_type and assetTypeName for clarity

### HOD Notification Strategy
1. **Current Asset Owner's HOD** - Approves transfer (via department_id)
2. **New Asset Owner's HOD** - Gets early notification of incoming assets/employees
3. **Duplicate Prevention** - If same department for both current and new owner, only sends once

### Error Handling
- All email notifications wrapped in try-catch (non-blocking)
- Workflow lookups fail gracefully with console warnings
- Email resolution attempts multiple sources (workflow → employees table)
- Missing approvers logged but don't block transfer creation

---

## 6. Testing Checklist

### Unit Tests
- [ ] Create transfer with transfer_type = "Asset"
- [ ] Create transfer with transfer_type = "Employee"
- [ ] Create transfer with mixed types in details array
- [ ] Verify transfer_type stored correctly in transfer_items table

### Integration Tests
- [ ] Submit transfer triggers T1 + T2 to correct recipients
- [ ] New Owner's HOD receives T2 email on submission
- [ ] Approve transfer triggers T4 to requestor + new owners + new owner's HOD
- [ ] Email templates display transfer_type and assetTypeName correctly
- [ ] New Owner's HOD NOT notified if same dept as Current Owner's HOD

### Email Content Tests
- [ ] Transfer Type field displays "Asset" or "Employee"
- [ ] Asset Type field displays from types.name (only for assets)
- [ ] Register Number shows asset register or employee name
- [ ] Transfer details table shows current → new values

### Workflow Configuration Tests
- [ ] Verify workflow records exist:
  - module_name = 'asset transfer'
  - level_name = 'approver'
  - department_id for each department
- [ ] Email addresses resolved from employees table when workflow incomplete

---

## 7. Files Modified

### Core System Files
1. **assetController.ts** - Item enrichment + HOD notifications
2. **assetModel.ts** - Database insert with transfer_type
3. **assetTransferItemFormat.ts** - Email template formatting

### Dependencies (No changes needed)
- Email sending framework
- Workflow system (getWorkflowPicByDepartment)
- Database pooling

---

## 8. Deployment Notes

### Pre-deployment
- ✅ Type-check: `npm run type-check` (passed)
- [ ] Database migration: Run `update_transfer_items_attachments.sql`
- [ ] Test in staging with mixed "Asset" and "Employee" transfers

### Post-deployment
- Monitor logs for HOD notification delivery
- Verify workflow records configured for asset transfer module
- Test end-to-end transfer flow with multiple recipients

---

## 9. Future Enhancements

- Consider separate email templates for "Asset" vs "Employee" transfers
- Add analytics dashboard showing transfer_type distribution
- Implement bulk transfer operations with mixed types
- Add historical reporting by transfer_type
