import { pool, pool2 } from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Database and table names
const db = 'billings';
const tables = {
    subscribers: `${db}.subscribers`,
    accounts: `${db}.accounts`,
    contracts: `${db}.contracts`,
    vendors: `${db}.vendors`,
    simCards: `${db}.simcards`,
    accountSubs: `${db}.account_subs`,
    simCardSubs: `${db}.simcard_subs`,
    userSubs: `${db}.user_subs`, // Assuming this is a table for user subscriptions
    deptSubs: `${db}.department_subs`, // Assuming this is a table for department subscriptions
    telcoBilling: `${db}.tbl_util`, // Assuming this is a table for telco billing
    telcoBillingDetails: `${db}.tbl_celcom_det`, // Assuming this is a table for telco billing history
};

// Define the structure of the account data
type AccountData = {
    id: number;
    account_master: string;
    subs: {
        sub_no_id: number;
        sub_no: string;
        account_sub: string;
    }[];
};

// ===================== SUBSCRIBERS =====================
// CRUD for subscribers
export async function getSubscriberById(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers} WHERE id = ?`, [id]);
    return rows[0];
}
export async function getSubscribers() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers}`);
    return rows;
}
export async function createSubscriber(subscriber: any) {
    const { sub_no, account_sub, status, register_date } = subscriber;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.subscribers} (sub_no, account_sub, status, register_date) VALUES (?, ?, ?, ?)`,
        [sub_no, account_sub, status, register_date]
    );
    return result.insertId;
}

/* table involved: subscribers, simcard_subs (createSimCard), user_subs, account_subs */
export async function updateSubscriber(id: number, subscriber: any) {
    const { sub_no, account_sub, status, register_date, costcenter, department, account, simcard, user } = subscriber;
    // 1. Fetch current subscriber
    const [currentRows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers} WHERE id = ?`, [id]);
    const current = currentRows[0];

    // 2. Fetch latest simcard, department, account, user from *_subs tables
    const [[simSub]] = await pool.query<RowDataPacket[]>(`SELECT sim_id FROM ${tables.simCardSubs} WHERE sub_no_id = ? ORDER BY effective_date DESC LIMIT 1`, [id]);
    const [[deptSub]] = await pool.query<RowDataPacket[]>(`SELECT department_id FROM ${tables.deptSubs} WHERE sub_no_id = ? ORDER BY effective_date DESC LIMIT 1`, [id]);
    const [[accSub]] = await pool.query<RowDataPacket[]>(`SELECT account_id FROM ${tables.accountSubs} WHERE sub_no_id = ? ORDER BY id DESC LIMIT 1`, [id]);
    const [[userSub]] = await pool.query<RowDataPacket[]>(`SELECT ramco_id FROM ${tables.userSubs} WHERE sub_no_id = ? ORDER BY id DESC LIMIT 1`, [id]);

    // 3. Insert new row if changed
    if (simcard && (!simSub || simSub.sim_id !== simcard)) {
        await pool.query(`INSERT INTO ${tables.simCardSubs} (sub_no_id, sim_id, effective_date) VALUES (?, ?, NOW())`, [id, simcard]);
    }
    if (department && (!deptSub || deptSub.dept_id !== department)) {
        await pool.query(`INSERT INTO ${tables.deptSubs} (sub_no_id, department_id, effective_date) VALUES (?, ?, NOW())`, [id, department]);
    }
    if (account && (!accSub || accSub.account_id !== account)) {
        await pool.query(`INSERT INTO ${tables.accountSubs} (sub_no_id, account_id, effective_date) VALUES (?, ?, NOW())`, [id, account]);
    }
    if (user && (!userSub || userSub.ramco_id !== user)) {
        await pool.query(`INSERT INTO ${tables.userSubs} (sub_no_id, ramco_id, effective_date) VALUES (?, ?, NOW())`, [id, user]);
    }

    // 4. Update subscribers table for basic fields
    await pool.query(
        `UPDATE ${tables.subscribers} SET sub_no = ?, account_sub = ?, status = ?, register_date = ?, costcenter_id = ?, department_id = ? WHERE id = ?`,
        [sub_no, account_sub, status, register_date, costcenter, department, id]
    );
}
export async function deleteSubscriber(id: number) {
    await pool.query(`DELETE FROM ${tables.subscribers} WHERE id = ?`, [id]);
}

// ===================== SIM CARD - SUBSCRIBER JOINS =====================
export async function getSimCardBySubscriber() {
    // Returns the latest sim card for each subscriber (sub_no_id)
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT s.id as sim_id, s.sim_sn, scs.sub_no_id
        FROM ${tables.simCardSubs} scs
        JOIN ${tables.simCards} s ON scs.sim_id = s.id
        INNER JOIN (
            SELECT sub_no_id, MAX(effective_date) as max_date
            FROM ${tables.simCardSubs}
            GROUP BY sub_no_id
        ) latest ON latest.sub_no_id = scs.sub_no_id AND latest.max_date = scs.effective_date
    `);
    return rows;
}

// ===================== DEPARTMENT - SUBSCRIBER JOINS =====================
export async function getDepartmentSubs() {
    // Returns all department_subs rows (dept_id, sub_no_id)
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.deptSubs} ORDER BY id DESC`);
    return rows;
}
export async function createDepartmentSub(departmentSub: any) {
    const { dept_id, sub_no_id } = departmentSub;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.deptSubs} (dept_id, sub_no_id, effective_date) VALUES (?, ?, NOW())`,
        [dept_id, sub_no_id]
    );
    return result.insertId;
}

// ===================== SIM CARDS =====================
// CRUD for simcards
export async function getSimCards() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards}`);
    return rows;
}
export async function getSimsBySubscriberId(subscriberId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards} WHERE sub_no_id = ?`, [subscriberId]);
    return rows;
}
export async function createSimCard(simCard: any) {
    const { sim_sn, sub_no_id, register_date, reason, note } = simCard;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.simCards} (sim_sn, sub_no_id, register_date, reason, note) VALUES (?, ?, ?, ?, ?)`,
        [sim_sn, sub_no_id, register_date, reason, note]
    );
    return result.insertId;
}
export async function updateSimCard(id: number, simCard: any) {
    const { sim_sn, sub_no_id, register_date, reason, note } = simCard;
    await pool.query(
        `UPDATE ${tables.simCards} SET sim_sn = ?, sub_no_id = ?, register_date = ?, reason = ?, note = ? WHERE id = ?`,
        [sim_sn, sub_no_id, register_date, reason, note, id]
    );
}


// ===================== ACCOUNTS =====================
// CRUD for accounts
export async function getAccounts() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accounts}`);
    return rows;
}
export async function getAccountById(accountId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accounts} WHERE id = ?`, [accountId]);
    return rows[0];
}
export async function createAccount(account: any) {
    const { account_master, description } = account;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.accounts} (account_master, description) VALUES (?, ?)`,
        [account_master, description]
    );
    return result.insertId;
}
export async function updateAccount(id: number, account: any) {
    const { account_master, description } = account;
    await pool.query(
        `UPDATE ${tables.accounts} SET account_master = ?, description = ? WHERE id = ?`,
        [account_master, description, id]
    );
}
export async function deleteAccount(id: number) {
    await pool.query(`DELETE FROM ${tables.accounts} WHERE id = ?`, [id]);
}

// ===================== ACCOUNT SUBS JOINS =====================
// CRUD for account_subs (assign subs to accounts)
export async function getAccountSubs() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accountSubs} WHERE status = 'active' ORDER BY effective_date DESC`);
    return rows;
}
export async function createAccountSub(accountSub: any) {
    const { sub_no_id, account_id } = accountSub;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.accountSubs} (sub_no_id, account_id) VALUES (?, ?)`,
        [sub_no_id, account_id]
    );
    return result.insertId;
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

// ===================== CONTRACTS =====================
// CRUD for contracts
export async function getContracts() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts}`);
    return rows;
}
export async function getContractById(contractId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts} WHERE id = ?`, [contractId]);
    return rows[0];
}
export async function createContract(contract: any) {
    const { account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration } = contract;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.contracts} (account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration]
    );
    return result.insertId;
}

// ===================== VENDORS =====================
// CRUD for vendors
export async function getVendors() {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors}`);
    return rows;
}
export async function getVendorById(vendorId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors} WHERE id = ?`, [vendorId]);
    return rows[0];
}
export async function createVendor(vendor: any) {
    const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${tables.vendors} (name, service_type, register_date, address, contact_name, contact_no, contact_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, service_type, register_date, address, contact_name, contact_no, contact_email, status]
    );
    return result.insertId;
}
export async function updateVendor(id: number, vendor: any) {
    const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
    await pool.query(
        `UPDATE ${tables.vendors} SET name = ?, service_type = ?, register_date = ?, address = ?, contact_name = ?, contact_no = ?, contact_email = ?, status = ? WHERE id = ?`,
        [name, service_type, register_date, address, contact_name, contact_no, contact_email, status, id]
    );
}
export async function deleteVendor(id: number) {
    await pool.query(`DELETE FROM ${tables.vendors} WHERE id = ?`, [id]);
}

// ===================== USER SUBS =====================
export async function getUserSubs() {
    // Returns all user_subs rows (ramco_id, sub_no_id)
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.userSubs}`);
    return rows;
}


// ===================== TELCO BILLING =====================
// CRUD for telcoBilling
export async function getTelcoBillings() {
    const [rows] = await pool2.query<RowDataPacket[]>(`SELECT * FROM ${tables.telcoBilling} WHERE category_id = 5 ORDER BY util_id DESC`);
    return rows;
}

export async function getTelcoBillingById(id: number) {
    const [rows] = await pool2.query<RowDataPacket[]>(`SELECT * FROM ${tables.telcoBilling} WHERE util_id = ?`, [id]);
    return rows[0];
}

export async function createTelcoBilling(billing: any) {
    // Adjust fields as needed for tbl_util
    const { sub_no, account_id, amount, billing_date, remarks, status } = billing;
    const [result] = await pool2.query<ResultSetHeader>(
        `INSERT INTO ${tables.telcoBilling} (sub_no, account_id, amount, billing_date, remarks, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [sub_no, account_id, amount, billing_date, remarks, status]
    );
    return result.insertId;
}

export async function updateTelcoBilling(id: number, billing: any) {
    // Adjust fields as needed for tbl_util
    const { sub_no, account_id, amount, billing_date, remarks, status } = billing;
    await pool2.query(
        `UPDATE ${tables.telcoBilling} SET sub_no = ?, account_id = ?, amount = ?, billing_date = ?, remarks = ?, status = ? WHERE id = ?`,
        [sub_no, account_id, amount, billing_date, remarks, status, id]
    );
}

export async function deleteTelcoBilling(id: number) {
    await pool.query(`DELETE FROM ${tables.telcoBilling} WHERE id = ?`, [id]);
}

// ===================== TELCO BILLING DETAILS =====================
// CRUD for telcoBillingDetails (mapped by util_id)
export async function getTelcoBillingDetailsById(util_id: number) {
    const [rows] = await pool2.query<RowDataPacket[]>(`SELECT * FROM ${tables.telcoBillingDetails} WHERE util_id = ?`, [util_id]);
    return rows;
}

export async function createTelcoBillingDetail(detail: any) {
    // Adjust fields as needed for tbl_celcom_det
    const { util_id, item, amount, remarks, status } = detail;
    const [result] = await pool2.query<ResultSetHeader>(
        `INSERT INTO ${tables.telcoBillingDetails} (util_id, item, amount, remarks, status) VALUES (?, ?, ?, ?, ?)`,
        [util_id, item, amount, remarks, status]
    );
    return result.insertId;
}

export async function updateTelcoBillingDetail(id: number, detail: any) {
    // Adjust fields as needed for tbl_celcom_det
    const { util_id, item, amount, remarks, status } = detail;
    await pool2.query(
        `UPDATE ${tables.telcoBillingDetails} SET util_id = ?, item = ?, amount = ?, remarks = ?, status = ? WHERE id = ?`,
        [util_id, item, amount, remarks, status, id]
    );
}

export async function deleteTelcoBillingDetail(id: number) {
    await pool2.query(`DELETE FROM ${tables.telcoBillingDetails} WHERE id = ?`, [id]);
}