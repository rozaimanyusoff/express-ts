# updateSubscriber Enhancement - Complete Implementation

## Quick Summary

The `updateSubscriber` endpoint has been completely refactored to:
1. ✅ Add `asset_id` and `updated_by` fields to payload
2. ✅ Implement history tracking for 4 relationships (asset, user, simcard, account)
3. ✅ Use `register_date` as the effective date for all history records
4. ✅ Separate read-only fields from tracked fields
5. ✅ Send email notification to `updated_by` user
6. ✅ Create new `telco_subs_account` table for account history

---

## Implementation Details

### 1. New Database Table

**Table Name:** `telco_subs_account`
**Location:** `db/migrations/create_telco_subs_account_table.sql`

Structure:
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
sub_no_id       INT (FK to telco_subs)
account_id      INT (FK to telco_accounts)
effective_date  DATE (when assignment became effective)
created_at      TIMESTAMP (record creation time)
```

### 2. Updated Payload Schema

```typescript
{
  // Direct Update Fields (only these update telco_subs)
  sub_no?: string;           // subscriber number
  account_sub?: string;      // sub account code
  status?: string;           // subscription status
  register_date?: string;    // YYYY-MM-DD (also used as effective_date for history)
  
  // History Tracked Fields (insert into history tables)
  account?: number;          // account id → telco_subs_account
  simcard?: number;          // simcard id → telco_sims_subs
  user?: string;             // ramco_id → telco_user_subs
  asset_id?: number;         // asset id → telco_subs_devices
  
  // Control Field
  updated_by?: string;       // ramco_id (resolves to email for notification)
}
```

### 3. Updated Process Steps

**Input:** Subscriber ID + Updated data with all fields

**Processing:**

| Step | Operation | Tables Involved |
|------|-----------|-----------------|
| 1 | Parse payload & normalize register_date | (none) |
| 2 | Query latest records from 4 history tables | sims_subs, user_subs, subs_account, subs_devices |
| 3 | Insert asset history if changed | subs_devices |
| 4 | Insert user history if changed | user_subs |
| 5 | Insert simcard history if changed | sims_subs |
| 6 | Insert account history if changed | subs_account |
| 7 | Update main subscriber record | subs |
| 8 | Send email notification | (email service) |

**Output:** 
- Database updated with new history records
- Main subscriber record updated with current values only
- Email sent to updater (if provided)

### 4. Code Files Modified

#### `src/p.telco/telcoModel.ts`
- Added `subsAccounts: 'billings.telco_subs_account'` to tables constant
- Completely rewrote `updateSubscriber()` function with new logic

**Key changes:**
```typescript
// OLD: Used NOW() as effective_date, updated all fields
await pool.query(
  `UPDATE subscribers SET ... costcenter_id, department_id ... WHERE id = ?`
);

// NEW: Uses register_date as effective_date, only updates 4 basic fields
await pool.query(
  `UPDATE subscribers SET sub_no, account_sub, status, register_date WHERE id = ?`
);
```

#### `src/p.telco/telcoController.ts`
- Added imports: `userModel`, `sendMail`
- Enhanced `updateSubscriber()` controller with email notification

**Key additions:**
```typescript
// Resolve updated_by ramco_id to email
const updater = await userModel.getEmployeeByRamcoId(updated_by);

// Send notification email
if (updater && updater.email) {
  await sendMail(updater.email, subject, emailBody);
}
```

### 5. All 6 Tables Involved

1. **telco_subs** - Main subscriber record
   - Updated: `sub_no`, `account_sub`, `status`, `register_date`
   - Removed from updates: `costcenter_id`, `department_id`, `district_id`, `asset_id`

2. **telco_subs_devices** - Asset assignment history
   - Inserted if `asset_id` differs from last record
   - Uses `register_date` as `effective_date`

3. **telco_user_subs** - User/Ramco assignment history
   - Inserted if `user` (ramco_id) differs from last record
   - Uses `register_date` as `effective_date`

4. **telco_sims_subs** - SIM card assignment history
   - Inserted if `simcard` (sim_id) differs from last record
   - Uses `register_date` as `effective_date`

5. **telco_subs_account** - Account assignment history (NEW)
   - Inserted if `account` (account_id) differs from last record
   - Uses `register_date` as `effective_date`

6. **employees** (assets.employees)
   - Used only to resolve `updated_by` to email for notifications
   - No updates made

---

## Database Initialization

Run the migration to create the new table:

```bash
# Option 1: Direct SQL execution
mysql -u root -p < db/migrations/create_telco_subs_account_table.sql

# Option 2: Through Node migration script
node scripts/run-migrations.js
```

**Check table was created:**
```sql
DESCRIBE billings.telco_subs_account;
SELECT * FROM billings.telco_subs_account LIMIT 1;
```

---

## API Usage Examples

### Example 1: Update subscriber with all tracked fields
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

### Example 2: Update only basic fields (no history changes)
```bash
curl -X PUT http://localhost:3000/api/telco/subs/123 \
  -H "Content-Type: application/json" \
  -d '{
    "sub_no": "60123456789",
    "account_sub": "ACC-001",
    "status": "inactive",
    "register_date": "2025-01-23"
  }'
```

### Example 3: Change only asset (history tracked)
```bash
curl -X PUT http://localhost:3000/api/telco/subs/123 \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": 8,
    "updated_by": "EMP001"
  }'
```

**Response:**
```json
{
  "message": "Subscriber updated successfully",
  "status": "success"
}
```

---

## Testing Checklist

- [ ] Migration runs without errors
- [ ] New `telco_subs_account` table created with proper schema
- [ ] Update basic fields (sub_no, account_sub, status, register_date)
- [ ] Verify only these 4 fields update in telco_subs
- [ ] Verify costcenter_id, department_id, district_id not in UPDATE query
- [ ] Change asset_id and verify record inserted in telco_subs_devices
- [ ] Change user (ramco_id) and verify record inserted in telco_user_subs
- [ ] Change simcard and verify record inserted in telco_sims_subs
- [ ] Change account and verify record inserted in telco_subs_account
- [ ] Verify effective_date = register_date (not current timestamp)
- [ ] Verify no duplicate history if value hasn't changed
- [ ] Send update with valid updated_by ramco_id and verify email sent
- [ ] Verify email contains subscriber details and updater name
- [ ] Send update with invalid updated_by and verify error logged (not failing request)
- [ ] Type-check passes: `npm run type-check`

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Fields Tracked** | Department, Account only | Asset, User, SIM Card, Account |
| **Effective Date** | Current timestamp (NOW()) | register_date parameter |
| **Main Table Size** | Large (costcenter, dept, asset stored) | Lean (only current basic fields) |
| **Account History** | Not tracked | Tracked in new table |
| **Asset History** | Not tracked separately | Tracked in subs_devices |
| **Notifications** | None | Email to updater |
| **User Context** | Lost after update | Stored in history |
| **Query Performance** | Slow joins with old data | Fast with indexed history tables |

---

## Architecture Diagram

```
PUT /api/telco/subs/:id
│
├─► Extract Payload
│   ├─ Basic Fields: sub_no, account_sub, status, register_date
│   ├─ History Fields: account, simcard, user, asset_id
│   └─ Control Field: updated_by
│
├─► Query Current History
│   ├─ telco_sims_subs (latest sim)
│   ├─ telco_user_subs (latest user)
│   ├─ telco_subs_account (latest account)
│   └─ telco_subs_devices (latest asset)
│
├─► Insert New History Records (if changed)
│   ├─ asset_id → telco_subs_devices [effective_date = register_date]
│   ├─ user → telco_user_subs [effective_date = register_date]
│   ├─ simcard → telco_sims_subs [effective_date = register_date]
│   └─ account → telco_subs_account [effective_date = register_date]
│
├─► Update Main Record
│   └─ telco_subs: SET sub_no, account_sub, status, register_date
│
├─► Send Notification (if updated_by)
│   ├─ Resolve ramco_id → employee (email)
│   ├─ Fetch subscriber details
│   └─ Send email with update summary
│
└─► Response: 200 OK { message, status }
```

---

## Notes

- **Effective Date Strategy:** Using `register_date` instead of `NOW()` allows meaningful tracking of when changes become effective in business terms
- **Email Failures:** Non-blocking design ensures update succeeds even if email fails
- **Change Detection:** Only inserts history if value actually differs from last record
- **Backward Compatibility:** Old `costcenter_id`, `department_id` fields in telco_subs remain (not deleted), but no longer updated
- **Foreign Keys:** Both history and main tables use proper FK constraints for data integrity

---

## Support

For questions about this implementation, refer to:
- `/src/p.telco/UPDATE_SUBSCRIBER_ENHANCEMENT.md` - Detailed technical documentation
- `/src/p.telco/telcoModel.ts` - updateSubscriber() function
- `/src/p.telco/telcoController.ts` - updateSubscriber() endpoint
- `/db/migrations/create_telco_subs_account_table.sql` - Table schema
