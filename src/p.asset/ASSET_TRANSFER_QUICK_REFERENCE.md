# Asset Transfer Update - Quick Reference

## What Changed?

### 1. Payload Now Includes `transfer_type` Field

Each item in the `details` array now includes a `transfer_type` field:

```typescript
{
  transfer_type: "Asset",  // or "Employee"
  asset_id: 987,
  // ... rest of item fields
}
```

### 2. Email Templates Show Transfer Type

Transfer type is now displayed in all asset transfer emails:
- **Transfer Type**: "Asset" or "Employee"  
- **Asset Type**: Classification from database (e.g., "Computer", "Vehicle")

Example email display:
```
Effective Date: 05/02/2026
Transfer Type: Asset
Asset Type: Computer
Register Number: COMP-001-2024
Reason: Transfer ownership, Relocation
```

### 3. New Asset Owner's HOD Gets Notified

When an asset is transferred to a new department:
- **On Submission**: New Owner's HOD receives T2 "Approval Request" email
- **On Approval**: New Owner's HOD receives T4 "Approved" email

**Important**: If the new department is the same as the current department, HOD notification is sent only once (no duplication).

---

## API Examples

### Create Asset Transfer with Mixed Types

```bash
curl -X POST http://localhost:5000/api/assets/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transfer_date": "2026-02-01 09:00:00",
    "transfer_by": "E12345",
    "costcenter_id": 210,
    "department_id": 501,
    "transfer_status": "submitted",
    "details": [
      {
        "transfer_type": "Asset",
        "asset_id": 987,
        "type_id": 12,
        "current_owner": "E12345",
        "current_costcenter_id": 210,
        "current_department_id": 501,
        "current_location_id": 33,
        "new_owner": "E54321",
        "new_costcenter_id": 310,
        "new_department_id": 520,
        "new_location_id": 42,
        "return_to_asset_manager": false,
        "effective_date": "2026-02-05",
        "reason": "Transfer ownership, Relocation",
        "remarks": "Laptop refresh program"
      },
      {
        "transfer_type": "Employee",
        "asset_id": null,
        "type_id": null,
        "current_owner": "E77777",
        "current_costcenter_id": 210,
        "current_department_id": 501,
        "current_location_id": 33,
        "new_owner": "E99999",
        "new_costcenter_id": 220,
        "new_department_id": 515,
        "new_location_id": 44,
        "return_to_asset_manager": false,
        "effective_date": "2026-02-10",
        "reason": "Transfer ownership, Role Change",
        "remarks": "Replacing outgoing supervisor"
      }
    ]
  }'
```

---

## Database Check

Verify the migration was applied:

```sql
-- Check if transfer_type column exists
SELECT COLUMN_NAME, COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'assets' 
  AND TABLE_NAME = 'transfer_items' 
  AND COLUMN_NAME = 'transfer_type';
```

Expected output:
```
COLUMN_NAME  | COLUMN_TYPE
transfer_type| varchar(50)
```

---

## Workflow Configuration Required

For New Asset Owner's HOD notifications to work, ensure workflow records exist:

```sql
-- Example workflow record
SELECT * FROM workflows 
WHERE module_name = 'asset transfer' 
  AND level_name = 'approver'
  AND department_id = 520;  -- New department ID
```

Must return at least one record with:
- `ramco_id`: Employee ID of the HOD
- `email`: HOD email address (or will be resolved from employees table)

---

## Email Recipients Summary

### On Transfer Submission
1. ✅ **Requestor** → T1 Submission
2. ✅ **Current Asset Owner's HOD** → T2 Approval Request
3. ✅ **New Asset Owner's HOD** → T2 Approval Request (NEW)
4. ✅ **Asset Managers** → Manager Notification
5. ✅ **Current Owner(s)** → Current Owner Notice

### On Transfer Approval
1. ✅ **Requestor** → T4 Approved
2. ✅ **New Owner(s)** → T5 Acceptance (with portal link)
3. ✅ **New Asset Owner's HOD** → T4 Approved (NEW)
4. ✅ **Asset Managers** (CC) → All emails

---

## Troubleshooting

### New HOD Not Receiving Email?

1. **Check workflow records exist**:
   ```sql
   SELECT * FROM workflow 
   WHERE module_name = 'asset transfer' 
   AND level_name = 'approver' 
   AND department_id = {new_department_id};
   ```

2. **Verify employee email**:
   ```sql
   SELECT ramco_id, email FROM employees 
   WHERE ramco_id = 'E12345';
   ```

3. **Check logs** for:
   - "Added New Asset Owner HOD email to notify"
   - "New Asset Owner HOD notification sent to"
   - Any error messages with workflow lookups

### Email Showing Wrong Transfer Type?

1. Verify `transfer_type` field passed in request payload
2. Check `assets.transfer_items` table for the value
3. Email template uses database value, not type.name

### Asset Type Not Showing?

1. If `transfer_type` = "Asset", must have valid `type_id`
2. Check `assets.types` table has the id
3. Asset Type field shows `types.name` only if type_id is present

---

## Code References

- **Payload handling**: `assetController.ts` line ~2975
- **Email enrichment**: `assetController.ts` line ~3065, ~3480
- **HOD notifications**: `assetController.ts` line ~3200, ~3610
- **Email templates**: `assetTransferItemFormat.ts` line ~76, ~142
- **Database insert**: `assetModel.ts` line ~2066

---

## Verification Steps

```bash
# 1. Type check
npm run type-check

# 2. Check database migration
mysql -u user -p -e "SELECT * FROM assets.transfer_items LIMIT 1;"

# 3. Test API
curl -X POST http://localhost:5000/api/assets/transfer \
  -H "Content-Type: application/json" \
  -d '{...payload...}'

# 4. Check logs
tail -f logs/application.log | grep -E "transfer_type|New Asset Owner HOD"
```

---

**Status**: ✅ Complete  
**Type Check**: ✅ Passed  
**Files Modified**: 3  
**Breaking Changes**: None (backward compatible)
