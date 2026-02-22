# Deployment Guide - updateSubscriber Enhancement

## Pre-Deployment Checklist

- [ ] Code reviewed
- [ ] Type-check passed: `npm run type-check`
- [ ] All tests pass
- [ ] Database backup taken
- [ ] Maintenance window scheduled (if needed)

---

## Deployment Steps

### Step 1: Database Migration

```bash
# 1. Connect to database
mysql -u root -p billings

# 2. Run migration script
SOURCE /path/to/db/migrations/create_telco_subs_account_table.sql;

# 3. Verify table created
SHOW TABLES LIKE 'telco_subs_account';
DESCRIBE telco_subs_account;
```

**Expected Output:**
```
+-------------------------+
| Tables_in_billings (telco_subs_account) |
+-------------------------+
| telco_subs_account      |
+-------------------------+

MySQL> DESCRIBE telco_subs_account;
+-----------------+-----------+------+-----+---------+----------------+
| Field           | Type      | Null | Key | Default | Extra          |
+-----------------+-----------+------+-----+---------+----------------+
| id              | int       | NO   | PRI | NULL    | auto_increment |
| sub_no_id       | int       | NO   | MUL | NULL    |                |
| account_id      | int       | NO   | MUL | NULL    |                |
| effective_date  | date      | NO   | MUL | CURDATE() |              |
| created_at      | timestamp | NO   |     | CURRENT | ...            |
+-----------------+-----------+------+-----+---------+----------------+
```

### Step 2: Deploy Code

```bash
# 1. Navigate to project directory
cd /path/to/express-ts

# 2. Pull latest code (if using Git)
git pull origin main

# 3. Run type-check
npm run type-check

# 4. If build needed
npm run build

# 5. Restart server
npm run dev  # or your production start script
```

### Step 3: Verify Deployment

```bash
# 1. Check server is running
curl http://localhost:3000/api/telco/subs

# 2. Test update endpoint with simple data
curl -X PUT http://localhost:3000/api/telco/subs/1 \
  -H "Content-Type: application/json" \
  -d '{
    "sub_no": "60123456789",
    "account_sub": "ACC-001",
    "status": "active",
    "register_date": "2025-01-23"
  }'

# 3. Verify response
# Expected: {"message":"Subscriber updated successfully","status":"success"}

# 4. Check database
mysql -u root -p -e "SELECT * FROM billings.telco_subs WHERE id = 1 LIMIT 1;"
```

### Step 4: Test Full Functionality

```bash
# Test with all fields including updated_by
curl -X PUT http://localhost:3000/api/telco/subs/1 \
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

# Check if history records created
mysql -u root -p -e "SELECT * FROM billings.telco_subs_account WHERE sub_no_id = 1 ORDER BY id DESC LIMIT 1;"
mysql -u root -p -e "SELECT * FROM billings.telco_user_subs WHERE sub_no_id = 1 ORDER BY effective_date DESC LIMIT 1;"
mysql -u root -p -e "SELECT * FROM billings.telco_sims_subs WHERE sub_no_id = 1 ORDER BY effective_date DESC LIMIT 1;"
mysql -u root -p -e "SELECT * FROM billings.telco_subs_devices WHERE sub_no_id = 1 ORDER BY effective_date DESC LIMIT 1;"

# Check email in logs (if configured)
tail -f /var/log/telco-app.log | grep "Subscriber Account Update"
```

---

## Rollback Procedure

If issues occur, follow these steps:

### Quick Rollback (Keep Data)

```bash
# 1. Revert to previous code commit
git checkout HEAD~1 src/p.telco/telcoModel.ts
git checkout HEAD~1 src/p.telco/telcoController.ts

# 2. Rebuild and restart
npm run build
npm run dev

# 3. Database data remains intact
# Tables telco_subs_account will have data but not be used
```

### Full Rollback (If Data Corrupted)

```bash
# 1. Stop server
npm stop

# 2. Restore database from backup
mysql -u root -p < /backup/billings_pre_update.sql

# 3. Revert code
git checkout HEAD~1 src/p.telco/

# 4. Restart
npm run dev
```

### Drop New Table (If Needed)

```sql
-- Only if table causes issues
DROP TABLE IF EXISTS billings.telco_subs_account;

-- Restore old behavior (revert code to git HEAD~1)
```

---

## Monitoring Post-Deployment

### 1. Check Application Logs

```bash
# Look for errors
tail -f logs/error.log | grep -i subscriber

# Look for email send status
tail -f logs/app.log | grep -i "subscriber account"
```

### 2. Monitor Database

```sql
-- Check for errors in inserts
SELECT COUNT(*) FROM telco_subs_account;

-- Verify recent updates
SELECT * FROM telco_subs_account 
ORDER BY created_at DESC LIMIT 10;

-- Check for orphaned records
SELECT * FROM telco_subs_account 
WHERE sub_no_id NOT IN (SELECT id FROM telco_subs);
```

### 3. Test Email Notifications

```bash
# Send test update with valid employee
curl -X PUT http://localhost:3000/api/telco/subs/123 \
  -H "Content-Type: application/json" \
  -d '{"updated_by":"EMP001"}'

# Check email service logs
tail -f logs/email.log
```

### 4. Performance Metrics

```bash
# Monitor query performance
SHOW SLOW QUERY LOG;

# Check index usage
SELECT * FROM telco_subs_account WHERE sub_no_id = 123;
EXPLAIN EXTENDED SELECT * FROM telco_subs_account WHERE sub_no_id = 123;
```

---

## Troubleshooting Guide

### Issue: Type-check fails

```bash
# Solution: Check for missing imports or syntax errors
npm run type-check

# Review error messages carefully
# Common issues:
# - Missing userModel import
# - Missing sendMail import
# - Incorrect table reference
```

### Issue: Migration fails

```bash
# Check if table already exists
SHOW TABLES LIKE 'telco_subs_account';

# If exists, check schema
DESCRIBE telco_subs_account;

# If schema wrong, drop and recreate
DROP TABLE telco_subs_account;
SOURCE db/migrations/create_telco_subs_account_table.sql;
```

### Issue: Email not sending

```bash
# Check email configuration
echo $EMAIL_USER
echo $EMAIL_HOST
echo $EMAIL_PORT

# Verify employee exists
SELECT * FROM assets.employees WHERE ramco_id = 'EMP001';

# Check mailer logs
grep -i "error.*mail" logs/app.log
```

### Issue: History not tracking

```bash
# Verify tables exist
SHOW TABLES LIKE 'telco_%';

# Check for data
SELECT COUNT(*) FROM telco_subs_account;

# Verify inserts
SELECT * FROM telco_subs_account WHERE sub_no_id = 123;

# Check if effective_date matches register_date
SELECT register_date FROM telco_subs WHERE id = 123;
SELECT effective_date FROM telco_subs_account WHERE sub_no_id = 123;
```

### Issue: Costcenter still updating

```bash
# Verify code was deployed
grep "costcenter_id" src/p.telco/telcoModel.ts
# Should NOT return the UPDATE statement

# Check compiled code
grep "costcenter_id" dist/p.telco/telcoModel.js
# Should NOT be in the UPDATE query

# Restart server
npm run dev
```

---

## Performance Tuning (Post-Deployment)

### Add Additional Indexes

```sql
-- If queries are slow, add these indexes
ALTER TABLE telco_subs_account 
ADD INDEX idx_sub_account (sub_no_id, account_id);

ALTER TABLE telco_user_subs 
ADD INDEX idx_sub_user (sub_no_id, ramco_id);

-- Verify indexes created
SHOW INDEXES FROM telco_subs_account;
```

### Monitor Query Performance

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Monitor
SHOW PROCESSLIST;
SHOW FULL PROCESSLIST;
```

---

## Verification Queries

### Verify All Components Working

```sql
-- 1. Check new table structure
DESCRIBE billings.telco_subs_account;

-- 2. Verify history tracking
SELECT 
    'telco_subs_account' as table_name,
    COUNT(*) as record_count
FROM telco_subs_account
UNION ALL
SELECT 'telco_subs_devices', COUNT(*) FROM telco_subs_devices
UNION ALL
SELECT 'telco_user_subs', COUNT(*) FROM telco_user_subs
UNION ALL
SELECT 'telco_sims_subs', COUNT(*) FROM telco_sims_subs;

-- 3. Verify foreign keys
SHOW CREATE TABLE telco_subs_account\G

-- 4. Check recent updates
SELECT * FROM telco_subs_account 
WHERE created_at > NOW() - INTERVAL 1 HOUR
ORDER BY created_at DESC;
```

---

## Communication Template

### To: Deployment Team

**Subject:** updateSubscriber Enhancement - Deployment Complete

**Body:**
```
The updateSubscriber endpoint has been successfully enhanced with the following changes:

✅ NEW: telco_subs_account table for account history tracking
✅ ENHANCED: asset_id field now tracked in telco_subs_devices
✅ ENHANCED: Email notifications sent to updater (updated_by field)
✅ IMPROVED: register_date now used as effective_date for all history records
✅ SIMPLIFIED: telco_subs table now only stores 4 basic fields (costcenter/department removed from updates)

Database: 1 new table created
Code: 2 files modified (telcoModel.ts, telcoController.ts)
Breaking Changes: None
Rollback: Simple (revert code, data remains)

Monitoring: Check logs for "Subscriber Account Update"
Support: All documentation in TELCO_UPDATE_SUBSCRIBER_QUICK_REF.md
```

---

## Documentation Location

All implementation details available in:
- `TELCO_UPDATE_SUBSCRIBER_QUICK_REF.md` - Quick reference
- `TELCO_UPDATE_SUBSCRIBER_COMPLETE.md` - Complete guide
- `TELCO_UPDATE_SUBSCRIBER_BEFORE_AFTER.md` - Side-by-side comparison
- `src/p.telco/UPDATE_SUBSCRIBER_ENHANCEMENT.md` - Technical details

---

## Success Criteria

✅ Migration runs without errors
✅ telco_subs_account table created with proper structure
✅ Code compiles without TypeScript errors
✅ updateSubscriber endpoint responds successfully
✅ History records created in 4 tables when values change
✅ Email sent when updated_by provided
✅ Costcenter/department not updated in telco_subs
✅ Effective_date matches register_date (not NOW())
✅ No duplicate history for unchanged values
✅ Application runs without errors in logs
