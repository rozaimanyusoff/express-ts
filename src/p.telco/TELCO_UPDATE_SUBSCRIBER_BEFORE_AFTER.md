# updateSubscriber - Before & After Comparison

## Payload Comparison

### BEFORE
```typescript
{
  account?: number;           
  account_sub?: string;       
  costcenter?: number;        // Removed from tracking
  department?: number;        // Removed from tracking
  register_date?: string;     
  simcard?: number;           
  status?: string;
  sub_no?: string;
  user?: string;
}
```

### AFTER
```typescript
{
  // Direct Update Fields
  sub_no?: string;           
  account_sub?: string;      
  status?: string;
  register_date?: string;    // YYYY-MM-DD (also used as effective_date)
  
  // History Tracked Fields  
  account?: number;          
  simcard?: number;          
  user?: string;             
  asset_id?: number;         // NEW - tracked in subs_devices
  
  // Control Field
  updated_by?: string;       // NEW - for email notification
}
```

---

## Model Function Comparison

### BEFORE

```typescript
export async function updateSubscriber(id: number, subscriber: any) {
    const { account, account_sub, costcenter, department, register_date, 
            simcard, status, sub_no, user } = subscriber;
    
    // 1. Fetch current subscriber
    const [currentRows] = await pool.query(...);
    const current = currentRows[0];

    // 2. Fetch latest records
    const [[simSub]] = await pool.query(`SELECT sim_id FROM telco_sims_subs ...`);
    const [[deptSub]] = await pool.query(`SELECT department_id FROM telco_department_subs ...`);
    const [[accSub]] = await pool.query(`SELECT account_id FROM telco_account_subs ...`);
    const [[userSub]] = await pool.query(`SELECT ramco_id FROM telco_user_subs ...`);

    // 3. Insert new row if changed
    if (simcard && (!simSub || simSub.sim_id !== simcard)) {
        await pool.query(`INSERT INTO telco_sims_subs ... NOW()`, ...);
    }
    if (department && (!deptSub || deptSub.dept_id !== department)) {
        await pool.query(`INSERT INTO telco_department_subs ... NOW()`, ...);
    }
    if (account && (!accSub || accSub.account_id !== account)) {
        await pool.query(`INSERT INTO telco_account_subs ... NOW()`, ...);
    }
    if (user && (!userSub || userSub.ramco_id !== user)) {
        await pool.query(`INSERT INTO telco_user_subs ... NOW()`, ...);
    }

    // 4. Update subscribers table
    await pool.query(
        `UPDATE telco_subs SET sub_no, account_sub, status, register_date, 
                              costcenter_id, department_id WHERE id = ?`,
        [sub_no, account_sub, status, register_date, costcenter, department, id]
    );
}
```

### AFTER

```typescript
export async function updateSubscriber(id: number, subscriber: any) {
    const { account, account_sub, asset_id, register_date, simcard, 
            status, sub_no, user } = subscriber;
    
    // Normalize register_date
    const effectiveDate = register_date 
        ? new Date(register_date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];

    // 1. Fetch latest records from history tables
    const [[simSub]] = await pool.query(`SELECT sim_id FROM telco_sims_subs ...`);
    const [[userSub]] = await pool.query(`SELECT ramco_id FROM telco_user_subs ...`);
    const [[accSub]] = await pool.query(`SELECT account_id FROM telco_subs_account ...`);
    const [[assetSub]] = await pool.query(`SELECT asset_id FROM telco_subs_devices ...`);

    // 2. Insert history records if changed (using register_date as effective_date)
    if (asset_id && (!assetSub || assetSub.asset_id !== asset_id)) {
        await pool.query(
            `INSERT INTO telco_subs_devices (sub_no_id, asset_id, effective_date) VALUES (?, ?, ?)`,
            [id, asset_id, effectiveDate]
        );
    }
    
    if (user && (!userSub || userSub.ramco_id !== user)) {
        await pool.query(
            `INSERT INTO telco_user_subs (sub_no_id, ramco_id, effective_date) VALUES (?, ?, ?)`,
            [id, user, effectiveDate]
        );
    }
    
    if (simcard && (!simSub || simSub.sim_id !== simcard)) {
        await pool.query(
            `INSERT INTO telco_sims_subs (sub_no_id, sim_id, effective_date) VALUES (?, ?, ?)`,
            [id, simcard, effectiveDate]
        );
    }
    
    if (account && (!accSub || accSub.account_id !== account)) {
        await pool.query(
            `INSERT INTO telco_subs_account (sub_no_id, account_id, effective_date) VALUES (?, ?, ?)`,
            [id, account, effectiveDate]
        );
    }

    // 3. Update subscribers table - only basic fields
    await pool.query(
        `UPDATE telco_subs SET sub_no = ?, account_sub = ?, status = ?, register_date = ? WHERE id = ?`,
        [sub_no, account_sub, status, register_date, id]
    );
}
```

---

## Controller Function Comparison

### BEFORE

```typescript
export const updateSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const subscriber = req.body;
        await telcoModel.updateSubscriber(id, subscriber);
        res.status(200).json({ message: 'Subscriber updated' });
    } catch (error) {
        next(error);
    }
};
```

### AFTER

```typescript
export const updateSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const subscriber = req.body;
        const { updated_by } = subscriber;
        
        // Update subscriber in database
        await telcoModel.updateSubscriber(id, subscriber);
        
        // Send notification email to updated_by user if provided
        if (updated_by) {
            try {
                const updater = await userModel.getEmployeeByRamcoId(updated_by);
                if (updater && updater.email) {
                    const subscriberData = await telcoModel.getSubscriberById(id);
                    const emailSubject = `Subscriber Account Updated - ${subscriberData?.sub_no || `ID: ${id}`}`;
                    const emailBody = `
                        <h3>Subscriber Account Update Notification</h3>
                        <p>The following subscriber account has been updated:</p>
                        <ul>
                            <li><strong>Subscriber Number:</strong> ${subscriberData?.sub_no || 'N/A'}</li>
                            <li><strong>Account Sub:</strong> ${subscriberData?.account_sub || 'N/A'}</li>
                            <li><strong>Status:</strong> ${subscriberData?.status || 'N/A'}</li>
                            <li><strong>Register Date:</strong> ${subscriberData?.register_date || 'N/A'}</li>
                        </ul>
                        <p><strong>Updated by:</strong> ${updater.full_name || updated_by}</p>
                        <p>Please log in to the system to review the changes.</p>
                    `;
                    
                    await sendMail(updater.email, emailSubject, emailBody);
                } else {
                    console.warn(`Could not send notification email: User ${updated_by} not found or has no email`);
                }
            } catch (emailErr) {
                console.error('Error sending subscriber update notification email:', emailErr);
                // Don't fail the main request if email fails
            }
        }
        
        res.status(200).json({ message: 'Subscriber updated successfully', status: 'success' });
    } catch (error) {
        next(error);
    }
};
```

---

## Tables Affected

### BEFORE

| Table | Operation | Fields |
|-------|-----------|--------|
| `telco_subs` | UPDATE | sub_no, account_sub, status, register_date, **costcenter_id, department_id** |
| `telco_sims_subs` | INSERT | sim_id, **effective_date=NOW()** |
| `telco_user_subs` | INSERT | ramco_id, **effective_date=NOW()** |
| `telco_account_subs` | INSERT | account_id, **effective_date=NOW()** |
| `telco_department_subs` | INSERT | department_id |
| - | - | - |

### AFTER

| Table | Operation | Fields |
|-------|-----------|--------|
| `telco_subs` | UPDATE | sub_no, account_sub, status, register_date |
| `telco_sims_subs` | INSERT | sim_id, **effective_date=register_date** |
| `telco_user_subs` | INSERT | ramco_id, **effective_date=register_date** |
| `telco_subs_account` | INSERT | **account_id, effective_date=register_date** (NEW TABLE) |
| `telco_subs_devices` | INSERT | **asset_id, effective_date=register_date** (NOW USED) |
| `assets.employees` | QUERY | (resolves updated_by to email) |
| `Mailer Service` | SEND | Email notification (NEW) |

---

## Key Differences Summary

| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| **Asset Tracking** | No | Yes | ✅ Added |
| **Effective Date** | NOW() | register_date | ✅ Semantic dating |
| **Account History Table** | telco_account_subs | telco_subs_account | ✅ New dedicated table |
| **Email Notification** | None | Yes | ✅ Added |
| **Costcenter in Update** | Yes | No | ✅ Removed |
| **Department in Update** | Yes | No | ✅ Removed |
| **Main Table Fields** | 6 | 4 | ✅ Simplified |
| **updated_by Support** | No | Yes | ✅ Added |
| **Employee Resolution** | N/A | Yes | ✅ Added |
| **Response Format** | {message} | {message, status} | ✅ Enhanced |

---

## Migration Path

### 1. Run Migration
```bash
mysql -u root -p < db/migrations/create_telco_subs_account_table.sql
```

### 2. Verify Table
```sql
SHOW TABLES LIKE 'telco_subs_account';
DESCRIBE telco_subs_account;
```

### 3. Test Endpoint
```bash
curl -X PUT http://localhost:3000/api/telco/subs/123 \
  -H "Content-Type: application/json" \
  -d '{
    "sub_no": "60123456789",
    "account_sub": "ACC-001",
    "status": "active",
    "register_date": "2025-01-23",
    "account": 10,
    "updated_by": "EMP001"
  }'
```

### 4. Verify Changes
```sql
-- Check main record updated
SELECT sub_no, account_sub, status, register_date FROM telco_subs WHERE id = 123;

-- Check account history inserted
SELECT * FROM telco_subs_account WHERE sub_no_id = 123 ORDER BY id DESC LIMIT 1;

-- Check no costcenter_id or department_id updated
SELECT costcenter_id, department_id FROM telco_subs WHERE id = 123;
```

---

## Rollback Plan

If needed to revert:

```typescript
// Restore OLD updateSubscriber function:
export async function updateSubscriber(id: number, subscriber: any) {
    const { account, account_sub, costcenter, department, register_date, 
            simcard, status, sub_no, user } = subscriber;
    
    const [currentRows] = await pool.query(...);
    const current = currentRows[0];

    const [[simSub]] = await pool.query(`SELECT sim_id FROM ${tables.simCardSubs} ...`);
    const [[deptSub]] = await pool.query(`SELECT department_id FROM ${tables.deptSubs} ...`);
    const [[accSub]] = await pool.query(`SELECT account_id FROM ${tables.accountSubs} ...`);
    const [[userSub]] = await pool.query(`SELECT ramco_id FROM ${tables.userSubs} ...`);

    if (simcard && (!simSub || simSub.sim_id !== simcard)) {
        await pool.query(`INSERT INTO ${tables.simCardSubs} ... NOW()`, [id, simcard]);
    }
    if (department && (!deptSub || deptSub.dept_id !== department)) {
        await pool.query(`INSERT INTO ${tables.deptSubs} ... NOW()`, [id, department]);
    }
    if (account && (!accSub || accSub.account_id !== account)) {
        await pool.query(`INSERT INTO ${tables.accountSubs} ... NOW()`, [id, account]);
    }
    if (user && (!userSub || userSub.ramco_id !== user)) {
        await pool.query(`INSERT INTO ${tables.userSubs} ... NOW()`, [id, user]);
    }

    await pool.query(
        `UPDATE ${tables.subscribers} 
         SET sub_no = ?, account_sub = ?, status = ?, register_date = ?, 
             costcenter_id = ?, department_id = ? 
         WHERE id = ?`,
        [sub_no, account_sub, status, register_date, costcenter, department, id]
    );
}
```

**Note:** Data in `telco_subs_account` table will remain (can be archived or deleted if not needed)
