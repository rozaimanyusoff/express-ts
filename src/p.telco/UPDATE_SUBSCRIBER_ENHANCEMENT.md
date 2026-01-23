# updateSubscriber Enhancement - Implementation Summary

## Overview
The `updateSubscriber` endpoint has been enhanced to implement a comprehensive history tracking system with email notifications. The new process separates read-only fields from tracked history fields and uses `register_date` as the effective date for all history records.

## Changes Made

### 1. Database Table Updates

#### New Table: `telco_subs_account`
**Location:** `db/migrations/create_telco_subs_account_table.sql`

```sql
CREATE TABLE `billings`.`telco_subs_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no_id` int NOT NULL,
  `account_id` int NOT NULL,
  `effective_date` date NOT NULL DEFAULT (CURDATE()),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sub_no_id` (`sub_no_id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_effective_date` (`effective_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Purpose:** Tracks subscriber-account assignment history with effective dates.

#### Modified Table: `telco_subs`
**Removed fields from UPDATE operation:**
- `costcenter_id`
- `department_id`
- `district_id`
- `asset_id`

These fields are now tracked in history tables only.

### 2. Updated API Payload

**Endpoint:** `PUT /api/telco/subs/:id`

```typescript
{
  sub_no?: string;           // subscriber number (updated directly)
  account_sub?: string;      // sub account (updated directly)
  status?: string;           // status (updated directly)
  register_date?: string;    // YYYY-MM-DD (updated directly & used as effective_date)
  account?: number;          // account id (history tracked)
  simcard?: number;          // simcard id (history tracked)
  user?: string;             // ramco_id (history tracked)
  asset_id?: number;         // asset id (history tracked)
  updated_by?: string;       // ramco_id of person making the change (for email notification)
}
```

### 3. Updated Process Flow

The new `updateSubscriber` process follows these steps:

#### Step 1: Extract Data
- Extract `account`, `account_sub`, `asset_id`, `register_date`, `simcard`, `status`, `sub_no`, `user`, and `updated_by` from request body
- Normalize `register_date` to YYYY-MM-DD format for use as `effective_date`

#### Step 2: Query Latest History Records
- Fetch latest `sim_id` from `telco_sims_subs` table
- Fetch latest `ramco_id` from `telco_user_subs` table
- Fetch latest `account_id` from `telco_subs_account` table
- Fetch latest `asset_id` from `telco_subs_devices` table

#### Step 3: Insert History Records (if changed)
**A) Asset Assignment** - Insert into `telco_subs_devices` if:
- `asset_id` is provided AND
- Last record has different `asset_id` OR no previous record exists

```sql
INSERT INTO billings.telco_subs_devices 
  (sub_no_id, asset_id, effective_date) 
VALUES (?, ?, register_date)
```

**B) User Assignment** - Insert into `telco_user_subs` if:
- `user` (ramco_id) is provided AND
- Last record has different `ramco_id` OR no previous record exists

```sql
INSERT INTO billings.telco_user_subs 
  (sub_no_id, ramco_id, effective_date) 
VALUES (?, ?, register_date)
```

**C) SIM Card Assignment** - Insert into `telco_sims_subs` if:
- `simcard` is provided AND
- Last record has different `sim_id` OR no previous record exists

```sql
INSERT INTO billings.telco_sims_subs 
  (sub_no_id, sim_id, effective_date) 
VALUES (?, ?, register_date)
```

**D) Account Assignment** - Insert into `telco_subs_account` if:
- `account` is provided AND
- Last record has different `account_id` OR no previous record exists

```sql
INSERT INTO billings.telco_subs_account 
  (sub_no_id, account_id, effective_date) 
VALUES (?, ?, register_date)
```

#### Step 4: Update Main Subscriber Record
Update only these fields in `telco_subs`:
- `sub_no`
- `account_sub`
- `status`
- `register_date`

```sql
UPDATE billings.telco_subs 
SET sub_no = ?, account_sub = ?, status = ?, register_date = ? 
WHERE id = ?
```

#### Step 5: Send Notification Email
If `updated_by` ramco_id is provided:
1. Resolve `ramco_id` to employee record using `getEmployeeByRamcoId()`
2. Extract email from employee record
3. Fetch updated subscriber data for context
4. Send HTML email with update details

**Email Details:**
- **To:** Email from resolved employee
- **Subject:** `Subscriber Account Updated - {sub_no}`
- **Body:** Contains subscriber number, account sub, status, register date, and updater name

### 4. Code Changes

#### File: `src/p.telco/telcoModel.ts`

**Changes:**
1. Added `subsAccounts` table to `tables` constant pointing to `telco_subs_account`
2. Rewrote `updateSubscriber()` function with new logic:
   - Uses `register_date` as `effective_date` for all history inserts
   - Checks all four history tables for differences before inserting
   - Updates only 4 basic fields in `telco_subs`
   - Removed references to `costcenter`, `department`, `deptSubs` from update

#### File: `src/p.telco/telcoController.ts`

**Changes:**
1. Added imports:
   - `import * as userModel from '../p.user/userModel'`
   - `import { sendMail } from '../utils/mailer'`

2. Updated `updateSubscriber()` controller:
   - Extracts `updated_by` from request body
   - Calls model's `updateSubscriber()` as before
   - If `updated_by` is provided:
     - Resolves ramco_id to employee using `userModel.getEmployeeByRamcoId()`
     - Fetches updated subscriber data
     - Sends email notification with update details
     - Logs errors but doesn't fail the main request if email fails
   - Returns success response

### 5. Tables Involved in History Tracking

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `telco_subs` | Main subscriber record | sub_no, account_sub, status, register_date |
| `telco_sims_subs` | SIM card assignment history | sim_id, effective_date |
| `telco_user_subs` | User assignment history | ramco_id, effective_date |
| `telco_subs_account` | Account assignment history | account_id, effective_date |
| `telco_subs_devices` | Asset assignment history | asset_id, effective_date |

## Migration Instructions

1. **Apply SQL migration:**
```bash
mysql -u root -p < db/migrations/create_telco_subs_account_table.sql
```

2. **Restart application** to load updated code

3. **Test endpoint:**
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

## Benefits

1. **Audit Trail:** Complete history of account, SIM, user, and asset assignments
2. **Effective Dating:** All changes tracked with a meaningful effective date (register_date)
3. **Change Detection:** Only inserts history records when values actually change
4. **Notifications:** Automatic email alerts to the user making the change
5. **Data Integrity:** Separation of read-only fields from tracked fields
6. **Clean Main Table:** `telco_subs` stays lean with only current data

## Error Handling

- **Email Failures:** Non-blocking - logged but don't fail the request
- **Invalid Employee:** Warning logged if `updated_by` user not found or no email
- **Database Errors:** Propagated up through error handler middleware

## Notes

- `register_date` is now the effective date for all history records (not current timestamp)
- All history inserts include `created_at` timestamp for audit trail
- Foreign keys ensure referential integrity
- Indexes on `sub_no_id`, `account_id`, and `effective_date` for query performance
