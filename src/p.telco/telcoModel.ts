import { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool, pool2 } from '../utils/db';

// Database and table names
const dbBilling = 'billings'; //
const tables = {
    accounts: `${dbBilling}.telco_accounts`,
    accountSubs: `${dbBilling}.telco_subs_account`, // Subscriber-Account mapping history
    subsAccounts: `${dbBilling}.telco_subs_account`, // Subscriber-Account mapping history
    contracts: `${dbBilling}.telco_contracts`,
    deptSubs: `${dbBilling}.telco_department_subs`, // Assuming this is a table for department subscriptions
    oldSubscribers: `${dbBilling}.celcomsub`, // Assuming this is a table for old subscribers
    simCards: `${dbBilling}.telco_sims`,
    simCardSubs: `${dbBilling}.telco_sims_subs`,
    simsHistory: `${dbBilling}.telco_sims_history`, // SIM history with user, asset tracking
    subsDevices: `${dbBilling}.telco_subs_devices`, // Subscriber device mapping
    subscribers: `${dbBilling}.telco_subs`,
    telcoBilling: `${dbBilling}.telco_bills`, // Assuming this is a table for telco billing
    telcoBillingDetails: `${dbBilling}.telco_bill_details`, // Assuming this is a table for telco billing history
    userSubs: `${dbBilling}.telco_user_subs`, // Assuming this is a table for user subscriptions
    vendors: `${dbBilling}.telco_vendors`,
};

// Define the structure of the account data
interface AccountData {
    account_master: string;
    id: number;
    subs: {
        account_sub: string;
        sub_no: string;
        sub_no_id: number;
    }[];
}

export async function createAccount(account: any) {
    const { account_master, description, plan, provider } = account;
    // Check for duplicate by account_master
    const [dupRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${tables.accounts} WHERE account_master = ? LIMIT 1`, [account_master]);
    if (dupRows && dupRows.length > 0) {
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.accounts} (account_master, provider, description, plan) VALUES (?, ?, ?, ?)`,
        [account_master, provider, description, plan]
    );
    return result.insertId;
}
export async function createAccountSub(accountSub: any) {
    const { account_id, sub_no_id } = accountSub;
    // Check for duplicate assignment
    const [dupRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${tables.accountSubs} WHERE sub_no_id = ? AND account_id = ? AND status = 'active' LIMIT 1`, [sub_no_id, account_id]);
    if (dupRows && dupRows.length > 0) {
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.accountSubs} (sub_no_id, account_id) VALUES (?, ?)`,
        [sub_no_id, account_id]
    );
    return result.insertId;
}
export async function createContract(contract: any) {
    const { account_id, contract_end_date, contract_start_date, duration, plan, price, product_type, status, vendor_id } = contract;
    // Check for duplicate by account_id, product_type, contract_start_date
    const [dupRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${tables.contracts} WHERE account_id = ? AND product_type = ? AND contract_start_date = ? LIMIT 1`, [account_id, product_type, contract_start_date]);
    if (dupRows && dupRows.length > 0) {
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.contracts} (account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration]
    );
    return result.insertId;
}

export async function createDepartmentSub(departmentSub: any) {
    const { dept_id, sub_no_id } = departmentSub;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.deptSubs} (dept_id, sub_no_id, effective_date) VALUES (?, ?, NOW())`,
        [dept_id, sub_no_id]
    );
    return result.insertId;
}
export async function createSimCard(simCard: any) {
    const { status, sim_sn, reason, replacement_sim_id, activated_at } = simCard;
    // Check for duplicate by sim_sn
    const [dupRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${tables.simCards} WHERE sim_sn = ? LIMIT 1`, [sim_sn]);
    if (dupRows && dupRows.length > 0) {
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.simCards} (sim_sn, status, reason, replacement_sim_id, activated_at) VALUES (?, ?, ?, ?, ?)`,
        [sim_sn, status || 'active', reason || 'new', replacement_sim_id || null, activated_at || new Date()]
    );
    return result.insertId;
}

export async function updateSimCardStatus(simId: number, status: string) {
    await pool.query(
        `UPDATE ${tables.simCards} SET status = ? WHERE id = ?`,
        [status, simId]
    );
}

export async function createSubscriber(subscriber: any) {
    const { account_sub, register_date, status, sub_no } = subscriber;
    // Check for duplicate by sub_no
    const [dupRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${tables.subscribers} WHERE sub_no = ? LIMIT 1`, [sub_no]);
    if (dupRows && dupRows.length > 0) {
        // Duplicate found, return existing id (or throw error if preferred)
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.subscribers} (sub_no, account_sub, status, register_date) VALUES (?, ?, ?, ?)`,
        [sub_no, account_sub, status, register_date]
    );
    return result.insertId;
}

export async function createTelcoBilling(billing: any) {
    // Adjust fields as needed for tbl_util
    const { account_id, account_master, bill_date, bill_no, grand_total, rounding, status, subtotal, tax } = billing;
    // Check for duplicate by bill_no and account_id
    const [dupRows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM ${tables.telcoBilling} WHERE bill_no = ? AND account_id = ? AND bill_date = ? LIMIT 1`,
        [bill_no, account_id, bill_date]
    );
    if (dupRows && dupRows.length > 0) {
        // Duplicate found, return existing id (or throw error if preferred)
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.telcoBilling} (account_id, account, bill_no, bill_date, subtotal, tax, rounding, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ account_id, account_master, bill_no, bill_date, subtotal, tax, rounding, grand_total, status ]
    );
    return result.insertId;
}

export async function createTelcoBillingDetail(detail: any) {
    // Adjust fields as needed for tbl_celcom_det
    const { account_id, amount, bill_id, costcenter_id, discount, new_sim_id, old_sim_id, plan, ramco_id, subs_id, usage } = detail;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.telcoBillingDetails} (bill_id, sim_id, new_sim_id, plan, \`usage\`, discount, amount, sub_id, costcenter_id, account_id, ramco_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ bill_id, old_sim_id, new_sim_id, plan, usage, discount, amount, subs_id, costcenter_id, account_id, ramco_id ]
    );
    return result.insertId;
}

export async function createVendor(vendor: any) {
    const { address, contact_email, contact_name, contact_no, name, register_date, service_type, status } = vendor;
    // Check for duplicate by name
    const [dupRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${tables.vendors} WHERE name = ? LIMIT 1`, [name]);
    if (dupRows && dupRows.length > 0) {
        return dupRows[0].id;
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.vendors} (name, service_type, register_date, address, contact_name, contact_no, contact_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, service_type, register_date, address, contact_name, contact_no, contact_email, status]
    );
    return result.insertId;
}
export async function deleteAccount(id: number) {
    await pool.query(`DELETE FROM ${tables.accounts} WHERE id = ?`, [id]);
}

export async function deleteSubscriber(id: number) {
    await pool.query(`DELETE FROM ${tables.subscribers} WHERE id = ?`, [id]);
}
export async function deleteTelcoBilling(id: number) {
    await pool.query(`DELETE FROM ${tables.telcoBilling} WHERE id = ?`, [id]);
}
export async function deleteTelcoBillingDetail(id: number) {
    await pool.query(`DELETE FROM ${tables.telcoBillingDetails} WHERE id = ?`, [id]);
}
export async function deleteVendor(id: number) {
    await pool.query(`DELETE FROM ${tables.vendors} WHERE id = ?`, [id]);
}


export async function getAccountById(accountId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accounts} WHERE id = ?`, [accountId]);
    return rows[0];
}
// ===================== ACCOUNTS =====================
// CRUD for accounts
export async function getAccounts() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accounts}`);
    return rows;
}
// ===================== ACCOUNT SUBS JOINS =====================
// CRUD for account_subs (assign subs to accounts)
export async function getAccountSubs() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accountSubs} WHERE status = 'active' ORDER BY effective_date DESC`);
    return rows;
}
export async function getContractById(contractId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts} WHERE id = ?`, [contractId]);
    return rows[0];
}
// ===================== CONTRACTS =====================
// CRUD for contracts
export async function getContracts() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts}`);
    return rows;
}

// ===================== DEPARTMENT - SUBSCRIBER JOINS =====================
export async function getDepartmentSubs() {
    // Returns all department_subs rows (dept_id, sub_no_id)
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.deptSubs} ORDER BY id DESC`);
    return rows;
}
// ===================== OLD SUBSCRIBERS =====================
export async function getOldSubscriberById(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.oldSubscribers} WHERE sim_id = ?`, [id]);
    return rows[0];
}
export async function getOldSubscribers() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.oldSubscribers}`);
    return rows;
}

// ===================== SIM CARD - SUBSCRIBER JOINS =====================
export async function getSimCardBySubscriber() {
    // Returns the latest sim card for each subscriber (sub_no_id) with account_sub
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT s.id as sim_id, s.sim_sn, s.status, scs.sub_no_id, ts.account_sub
        FROM ${tables.simCardSubs} scs
        JOIN ${tables.simCards} s ON scs.sim_id = s.id
        JOIN ${tables.subscribers} ts ON scs.sub_no_id = ts.id
        INNER JOIN (
            SELECT sub_no_id, MAX(effective_date) as max_date
            FROM ${tables.simCardSubs}
            GROUP BY sub_no_id
        ) latest ON latest.sub_no_id = scs.sub_no_id AND latest.max_date = scs.effective_date
    `);
    return rows;
}

export async function getSimCardHistoryBySubscriber(subId: number) {
    // Returns all sim card history for a subscriber (sub_no_id) from telco_sims_subs, sorted by effective_date DESC
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT DISTINCT scs.effective_date, ts.sub_no
        FROM ${tables.simCardSubs} scs
        JOIN ${tables.subscribers} ts ON scs.sub_no_id = ts.id
        WHERE scs.sub_no_id = ?
        ORDER BY scs.effective_date DESC
    `, [subId]);
    return rows;
}

export async function getSimUserHistoryBySimId(simId: number) {
    // Returns user history for a sim card from telco_user_subs via telco_sims_subs with department, costcenter, location details
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            tus.effective_date, 
            tus.ramco_id,
            u.full_name,
            d.id as dept_id,
            d.name as dept_name,
            cc.id as cc_id,
            cc.name as cc_name,
            l.id as loc_id,
            l.name as loc_name
        FROM ${tables.simCardSubs} scs
        JOIN ${tables.userSubs} tus ON scs.sub_no_id = tus.sub_no_id
        LEFT JOIN assets.employees u ON tus.ramco_id = u.ramco_id
        LEFT JOIN assets.departments d ON u.department_id = d.id
        LEFT JOIN assets.costcenters cc ON u.costcenter_id = cc.id
        LEFT JOIN assets.locations l ON u.location_id = l.id
        WHERE scs.sim_id = ? AND tus.ramco_id IS NOT NULL
        ORDER BY tus.effective_date DESC
    `, [simId]);
    return rows;
}

export async function getSimAssetHistoryBySimId(simId: number) {
    // Returns asset history for a sim card from telco_subs_devices via telco_sims_subs
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            tsd.effective_date,
            tsd.asset_id,
            ad.register_number
        FROM ${tables.simCardSubs} scs
        JOIN ${tables.subsDevices} tsd ON scs.sub_no_id = tsd.sub_no_id
        JOIN assets.assetdata ad ON tsd.asset_id = ad.id
        WHERE scs.sim_id = ? AND tsd.asset_id IS NOT NULL
        ORDER BY tsd.effective_date DESC
    `, [simId]);
    return rows;
}
// ===================== SIM CARDS =====================
// CRUD for simcards
export async function getSimCards() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards} ORDER BY id DESC`);
    return rows;
}
export async function getSimsBySubscriberId(subscriberId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards} WHERE sub_no_id = ?`, [subscriberId]);
    return rows;
}

// ===================== SIM HISTORY =====================
// Add SIM card history record (for tracking sub_no_id, ramco_id, asset_id changes)
export async function createSimHistory(data: {
    sim_id: number;
    sub_no_id?: number | null;
    ramco_id?: string | null;
    asset_id?: number | null;
    effective_date?: string | null;
}): Promise<number> {
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const payload = {
        sim_id: data.sim_id,
        sub_no_id: data.sub_no_id || null,
        ramco_id: data.ramco_id || null,
        asset_id: data.asset_id || null,
        effective_date: data.effective_date || now,
    };
    
    const [result] = await pool.query<ResultSetHeader>(`INSERT INTO ${tables.simsHistory} SET ?`, [payload]);
    return result.insertId;
}

// ===================== SIM SUBS & DEVICES =====================
// Create SIM-Subscriber mapping record
export async function createSimSubsMapping(data: {
    sim_id: number;
    sub_no_id: number;
    effective_date?: string | null;
}): Promise<number> {
    const now = new Date().toISOString().split('T')[0];
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.simCardSubs} (sim_id, sub_no_id, effective_date) VALUES (?, ?, ?)`,
        [data.sim_id, data.sub_no_id, data.effective_date || now]
    );
    return result.insertId;
}

// Create Subscriber-Device mapping record
export async function createSubsDeviceMapping(data: {
    sub_no_id: number;
    asset_id: number;
    effective_date?: string | null;
}): Promise<number> {
    const now = new Date().toISOString().split('T')[0];
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.subsDevices} (sub_no_id, asset_id, effective_date) VALUES (?, ?, ?)`,
        [data.sub_no_id, data.asset_id, data.effective_date || now]
    );
    return result.insertId;
}

// Deactivate SIM card (when replaced)
export async function deactivateSimCard(simId: number, deactivationReason: string, deactivatedAt: string): Promise<void> {
    await pool.query(
        `UPDATE ${tables.simCards} SET status = ?, reason = ?, deactivated_at = ? WHERE id = ?`,
        ['deactivated', deactivationReason, deactivatedAt, simId]
    );
}

// Link old SIM to new SIM (set replacement_sim_id on old SIM)
export async function linkReplacementSim(oldSimId: number, newSimId: number): Promise<void> {
    await pool.query(
        `UPDATE ${tables.simCards} SET replacement_sim_id = ? WHERE id = ?`,
        [newSimId, oldSimId]
    );
}

// ===================== SUBSCRIBERS =====================
// CRUD for subscribers
export async function getSubscriberById(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers} WHERE id = ?`, [id]);
    return rows[0];
}

// Get subscriber with all history records (account, SIM, user, asset)
export async function getSubscriberByIdWithHistory(id: number) {
    // Get subscriber record
    const [subRows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers} WHERE id = ?`, [id]);
    if (!subRows || subRows.length === 0) return null;
    
    const subscriber = subRows[0];
    
    // Fetch all history records in parallel (ordered by effective_date DESC - latest first)
    const [accountHistory, simHistory, userHistory, assetHistory] = await Promise.all([
        pool.query<RowDataPacket[]>(`
            SELECT * FROM ${tables.subsAccounts} 
            WHERE sub_no_id = ? 
            ORDER BY effective_date DESC
        `, [id]),
        pool.query<RowDataPacket[]>(`
            SELECT * FROM ${tables.simCardSubs} 
            WHERE sub_no_id = ? 
            ORDER BY effective_date DESC
        `, [id]),
        pool.query<RowDataPacket[]>(`
            SELECT * FROM ${tables.userSubs} 
            WHERE sub_no_id = ? 
            ORDER BY effective_date DESC
        `, [id]),
        pool.query<RowDataPacket[]>(`
            SELECT * FROM ${tables.subsDevices} 
            WHERE sub_no_id = ? 
            ORDER BY effective_date DESC
        `, [id]),
    ]);
    
    return {
        subscriber,
        history: {
            account: Array.isArray(accountHistory[0]) ? accountHistory[0] : [],
            sim: Array.isArray(simHistory[0]) ? simHistory[0] : [],
            user: Array.isArray(userHistory[0]) ? userHistory[0] : [],
            asset: Array.isArray(assetHistory[0]) ? assetHistory[0] : [],
        }
    };
}
export async function getSubscribers() {
    // Get all subscribers with their latest account, SIM, user, and asset assignments
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            ts.id,
            ts.sub_no,
            ts.account_sub,
            ts.status,
            ts.register_date,
            ts.costcenter_id,
            ts.department_id,
            ts.district_id,
            -- Get latest account from telco_subs_account
            (SELECT account_id FROM ${tables.subsAccounts} WHERE sub_no_id = ts.id ORDER BY effective_date DESC LIMIT 1) as account_id,
            -- Get latest sim from telco_sims_subs
            (SELECT sim_id FROM ${tables.simCardSubs} WHERE sub_no_id = ts.id ORDER BY effective_date DESC LIMIT 1) as sim_id,
            -- Get latest user from telco_user_subs
            (SELECT ramco_id FROM ${tables.userSubs} WHERE sub_no_id = ts.id ORDER BY effective_date DESC LIMIT 1) as ramco_id,
            -- Get latest asset from telco_subs_devices
            (SELECT asset_id FROM ${tables.subsDevices} WHERE sub_no_id = ts.id ORDER BY effective_date DESC LIMIT 1) as asset_id
        FROM ${tables.subscribers} ts
    `);
    return rows;
}
// Costcenter summary by bill ID and date range
export async function getTelcoBillingByAccountDateRange(accountId: number, from: string, to: string) {
    // Return all bills for the account and date range (no GROUP BY)
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT *
         FROM ${tables.telcoBilling}
         WHERE account_id = ? AND bill_date BETWEEN ? AND ?`,
        [accountId, from, to]
    );
    return rows;
}
export async function getTelcoBillingById(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.telcoBilling} WHERE id = ?`, [id]);
    return rows[0];
}
// ===================== TELCO BILLING DETAILS =====================
// CRUD for telcoBillingDetails (mapped by util_id)
export async function getTelcoBillingDetailsById(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.telcoBillingDetails} WHERE bill_id = ?`, [id]);
    return rows;
}

// CRUD for telcoBilling
export async function getTelcoBillings() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.telcoBilling} ORDER BY id DESC`);
    return rows;
}

// ===================== TELCO BILLING =====================
// Get telco bills by multiple IDs
export async function getTelcoBillingsByIds(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM ${tables.telcoBilling} WHERE id IN (${placeholders})`,
        ids
    );
    return rows;
}
// ===================== USER SUBS =====================
export async function getUserSubs() {
    // Returns all user_subs rows (ramco_id, sub_no_id)
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.userSubs}`);
    return rows;
}

export async function getVendorById(vendorId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors} WHERE id = ?`, [vendorId]);
    return rows[0];
}

// ===================== VENDORS =====================
// CRUD for vendors
export async function getVendors() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors}`);
    return rows;
}

export async function moveSubscriberToAccount(subscriberId: number, accountId: number, old_account_id: number, updated_by: string) {
    // 1. Mark all previous account_subs for this subscriber as moved
    await pool.query(
        `UPDATE ${tables.accountSubs} SET status = 'moved', updated_by = ? WHERE sub_no_id = ? AND status = 'active'`,
        [updated_by, subscriberId]
    );
    // 2. Insert a new row in account_subs for assignment history
    await pool.query(
        `INSERT INTO ${tables.accountSubs} (sub_no_id, account_id, effective_date, status, updated_by) VALUES (?, ?, NOW(), 'active', ?)`,
        [subscriberId, accountId, updated_by]
    );
}

export async function updateAccount(id: number, account: any) {
    const { account_master, description, plan, provider } = account;
    await pool.query(
        `UPDATE ${tables.accounts} SET account_master = ?, provider = ?, description = ?, plan = ? WHERE id = ?`,
        [account_master, provider, description, plan, id]
    );
}


export async function updateSimCard(id: number, simCard: any) {
    const { status, reason, register_date, sim_sn, sub_no_id } = simCard;
    await pool.query(
        `UPDATE ${tables.simCards} SET sim_sn = ?, sub_no_id = ?, register_date = ?, reason = ?, status = ? WHERE id = ?`,
        [sim_sn, sub_no_id, register_date, reason, status, id]
    );
}

/* table involved: subscribers, sims_subs, user_subs, subs_account, subs_devices */
export async function updateSubscriber(id: number, subscriber: any) {
    const { account, account_sub, asset_id, register_date, simcard, status, sub_no, user } = subscriber;
    
    // Convert register_date to proper format if it's a string
    const effectiveDate = register_date ? new Date(register_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // 1. Fetch latest records from history tables
    const [[simSub]] = await pool.query<RowDataPacket[]>(`SELECT sim_id FROM ${tables.simCardSubs} WHERE sub_no_id = ? ORDER BY effective_date DESC LIMIT 1`, [id]);
    const [[userSub]] = await pool.query<RowDataPacket[]>(`SELECT ramco_id FROM ${tables.userSubs} WHERE sub_no_id = ? ORDER BY effective_date DESC LIMIT 1`, [id]);
    const [[accSub]] = await pool.query<RowDataPacket[]>(`SELECT account_id FROM ${tables.subsAccounts} WHERE sub_no_id = ? ORDER BY effective_date DESC LIMIT 1`, [id]);
    const [[assetSub]] = await pool.query<RowDataPacket[]>(`SELECT asset_id FROM ${tables.subsDevices} WHERE sub_no_id = ? ORDER BY effective_date DESC LIMIT 1`, [id]);

    // 2. Insert history records if changed (using register_date as effective_date)
    if (asset_id && (!assetSub || assetSub.asset_id !== asset_id)) {
        await pool.query(
            `INSERT INTO ${tables.subsDevices} (sub_no_id, asset_id, effective_date) VALUES (?, ?, ?)`,
            [id, asset_id, effectiveDate]
        );
    }
    
    if (user && (!userSub || userSub.ramco_id !== user)) {
        await pool.query(
            `INSERT INTO ${tables.userSubs} (sub_no_id, ramco_id, effective_date) VALUES (?, ?, ?)`,
            [id, user, effectiveDate]
        );
    }
    
    if (simcard && (!simSub || simSub.sim_id !== simcard)) {
        await pool.query(
            `INSERT INTO ${tables.simCardSubs} (sub_no_id, sim_id, effective_date) VALUES (?, ?, ?)`,
            [id, simcard, effectiveDate]
        );
    }
    
    if (account && (!accSub || accSub.account_id !== account)) {
        await pool.query(
            `INSERT INTO ${tables.subsAccounts} (sub_no_id, account_id, effective_date) VALUES (?, ?, ?)`,
            [id, account, effectiveDate]
        );
    }

    // 3. Update subscribers table - only basic fields (sub_no, account_sub, status, register_date)
    // costcenter_id, department_id, district_id, asset_id removed from update
    await pool.query(
        `UPDATE ${tables.subscribers} SET sub_no = ?, account_sub = ?, status = ?, register_date = ? WHERE id = ?`,
        [sub_no, account_sub, status, register_date, id]
    );
}

export async function updateTelcoBilling(id: number, billing: any) {
    // Adjust fields as needed for tbl_util
    const { account_id, account_master, bill_date, bill_no, grand_total, rounding, status, subtotal, tax } = billing;
    await pool.query(
        `UPDATE ${tables.telcoBilling} SET account_id = ?, account = ?, bill_no = ?, bill_date = ?, subtotal = ?, tax = ?, rounding = ?, grand_total = ?, status = ? WHERE id = ?`,
        [account_id, account_master, bill_no, bill_date, subtotal, tax, rounding, grand_total, status, id]
    );
}

export async function updateTelcoBillingDetail(id: number, detail: any) {
    // Adjust fields as needed for tbl_celcom_det
    const { account_id, amount, bill_id, costcenter_id, discount, new_sim_id, old_sim_id, plan, ramco_id, sub_id, usage } = detail;
    await pool.query(
        `UPDATE ${tables.telcoBillingDetails} SET bill_id = ?, sim_id = ?, new_sim_id = ?, plan = ?, \`usage\` = ?, discount = ?, amount = ?, sub_id = ?, costcenter_id = ?, account_id = ?, ramco_id = ? WHERE id = ?`,
        [ bill_id, old_sim_id, new_sim_id, plan, usage, discount, amount, sub_id, costcenter_id, account_id, ramco_id, id ]
    );
}

export async function updateVendor(id: number, vendor: any) {
    const { address, contact_email, contact_name, contact_no, name, register_date, service_type, status } = vendor;
    await pool.query(
        `UPDATE ${tables.vendors} SET name = ?, service_type = ?, register_date = ?, address = ?, contact_name = ?, contact_no = ?, contact_email = ?, status = ? WHERE id = ?`,
        [name, service_type, register_date, address, contact_name, contact_no, contact_email, status, id]
    );
}