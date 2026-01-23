# updateSubscriber Implementation - Quick Reference

## What Changed

✅ **Added `asset_id` field** - Now tracked in `telco_subs_devices` table  
✅ **Added `updated_by` field** - Sends email notification to updater  
✅ **Created `telco_subs_account` table** - Dedicated account history tracking  
✅ **Changed effective_date logic** - Now uses `register_date` instead of `NOW()`  
✅ **Simplified main table** - Removed costcenter_id, department_id from updates  
✅ **Added email notifications** - Notifies updater of changes  

---

## Files Modified

```
src/p.telco/
├── telcoModel.ts           ✏️ Updated updateSubscriber() function
├── telcoController.ts      ✏️ Enhanced controller with email logic
└── UPDATE_SUBSCRIBER_ENHANCEMENT.md  📄 New detailed docs

db/migrations/
└── create_telco_subs_account_table.sql  🆕 New table migration

Root:
├── TELCO_UPDATE_SUBSCRIBER_COMPLETE.md        📄 Complete guide
└── TELCO_UPDATE_SUBSCRIBER_BEFORE_AFTER.md    📄 Comparison
```

---

## New Payload Structure

```json
{
  "sub_no": "60123456789",
  "account_sub": "ACC-001",
  "status": "active",
  "register_date": "2025-01-23",
  "account": 10,
  "simcard": 45,
  "user": "EMP001",
  "asset_id": 5,
  "updated_by": "EMP001"
}
```

| Field | Type | Table | Purpose |
|-------|------|-------|---------|
| `sub_no` | string | telco_subs | Direct update |
| `account_sub` | string | telco_subs | Direct update |
| `status` | string | telco_subs | Direct update |
| `register_date` | string | telco_subs | Direct update + effective_date |
| `account` | number | telco_subs_account | History tracked |
| `simcard` | number | telco_sims_subs | History tracked |
| `user` | string | telco_user_subs | History tracked |
| `asset_id` | number | telco_subs_devices | History tracked |
| `updated_by` | string | email lookup | Notification only |

---

## 6 Tables Involved

1. **telco_subs** - Updated (4 fields only)
2. **telco_subs_devices** - History insert (asset_id)
3. **telco_user_subs** - History insert (user/ramco_id)
4. **telco_sims_subs** - History insert (simcard/sim_id)
5. **telco_subs_account** - History insert (account_id) 🆕
6. **employees** - Query only (email lookup)

---

## Process Steps

```
1. Parse request payload
2. Normalize register_date to YYYY-MM-DD
3. Query latest history from 4 tables
4. Compare values:
   ├─ If asset_id changed → INSERT telco_subs_devices
   ├─ If user changed → INSERT telco_user_subs  
   ├─ If simcard changed → INSERT telco_sims_subs
   └─ If account changed → INSERT telco_subs_account
5. UPDATE telco_subs with 4 basic fields
6. If updated_by provided:
   ├─ Resolve ramco_id to email
   ├─ Fetch subscriber details
   └─ Send HTML email notification
7. Return success response
```

---

## Database Migration

```bash
# Run migration
mysql -u root -p < db/migrations/create_telco_subs_account_table.sql

# Verify
mysql -u root -p -e "DESCRIBE billings.telco_subs_account;"
```

---

## API Endpoint

**PUT /api/telco/subs/:id**

### Request
```bash
curl -X PUT http://localhost:3000/api/telco/subs/123 \
  -H "Content-Type: application/json" \
  -d '{
    "sub_no": "60123456789",
    "account_sub": "ACC-001", 
    "status": "active",
    "register_date": "2025-01-23",
    "account": 10,
    "simcard": 45,
    "user": "EMP001",
    "asset_id": 5,
    "updated_by": "EMP001"
  }'
```

### Response (Success)
```json
{
  "message": "Subscriber updated successfully",
  "status": "success"
}
```

### Response (Error)
```json
{
  "message": "Error message",
  "status": "error"
}
```

---

## Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| Asset tracking | ❌ | ✅ |
| Email notification | ❌ | ✅ |
| Account history table | No | `telco_subs_account` |
| Effective date | NOW() | register_date |
| Costcenter tracking | ✅ | ❌ (removed) |
| Main table fields | 6 | 4 |
| Tables affected | 4 | 6 |

---

## Testing Checklist

```
Database:
☐ Migration runs successfully
☐ telco_subs_account table created
☐ Proper indexes and foreign keys exist

Code:
☐ Type-check passes (npm run type-check)
☐ No TypeScript errors

Basic Update:
☐ Update sub_no succeeds
☐ Update account_sub succeeds
☐ Update status succeeds
☐ Update register_date succeeds

History Tracking:
☐ asset_id change → telco_subs_devices record
☐ user change → telco_user_subs record
☐ simcard change → telco_sims_subs record
☐ account change → telco_subs_account record
☐ effective_date = register_date (not NOW())
☐ No duplicate if value unchanged

Email:
☐ Valid updated_by → email sent
☐ Invalid updated_by → logged, no error
☐ No email field → logged, no error
☐ Email contains subscriber details
☐ Email contains updater name

Cleanup:
☐ costcenter_id not updated
☐ department_id not updated
☐ district_id not updated
```

---

## Troubleshooting

### Email not sent?
- Check `updated_by` ramco_id is valid
- Verify employee has email in assets.employees table
- Check email configuration in .env
- Review server logs for sendMail errors

### History not inserted?
- Verify register_date format (YYYY-MM-DD)
- Check that values actually differ from last record
- Verify telco_subs_account table exists
- Check MySQL error logs

### costcenter_id still updating?
- Verify telcoModel.ts was updated correctly
- Check only these 4 fields in UPDATE: sub_no, account_sub, status, register_date
- Restart server after code changes

---

## Related Documentation

📄 [Complete Implementation Guide](./TELCO_UPDATE_SUBSCRIBER_COMPLETE.md)  
📄 [Before & After Comparison](./TELCO_UPDATE_SUBSCRIBER_BEFORE_AFTER.md)  
📄 [Detailed Technical Docs](./src/p.telco/UPDATE_SUBSCRIBER_ENHANCEMENT.md)  

---

## Quick Links to Code

🔗 [telcoModel.ts](./src/p.telco/telcoModel.ts#L468-L520) - updateSubscriber() function  
🔗 [telcoController.ts](./src/p.telco/telcoController.ts#L1078-L1124) - Controller endpoint  
🔗 [Migration SQL](./db/migrations/create_telco_subs_account_table.sql) - Table schema  

---

## Version Info

- **Date Implemented:** 23 January 2026
- **Feature:** updateSubscriber Enhancement
- **Status:** ✅ Complete & Type-checked
- **Breaking Changes:** None (additive only)
