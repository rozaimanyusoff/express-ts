import pool from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Database and table names
const db = 'billings';
const tables = {
    subscribers: `${db}.subscribers`,
    accountSubs: `${db}.account_subs`,
    accounts: `${db}.accounts`,
    contracts: `${db}.contracts`,
    vendors: `${db}.vendors`,
    simCards: `${db}.simcards`,
    simCardSubs: `${db}.simcard_subs`,
    userSubs: `${db}.user_subs`, // Assuming this is a table for user subscriptions
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

export const TelcoModel = {
    // ===================== SUBSCRIBERS =====================
    // CRUD for subscribers
    async getSubscriberById(id: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers} WHERE id = ?`, [id]);
        return rows[0];
    },
    async getSubscribers() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers}`);
        return rows;
    },
    async createSubscriber(subscriber: any) {
        const { sub_no, account_sub, status, register_date } = subscriber;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.subscribers} (sub_no, account_sub, status, register_date) VALUES (?, ?, ?, ?)` ,
            [sub_no, account_sub, status, register_date]
        );
        return result.insertId;
    },
    async updateSubscriber(id: number, subscriber: any) {
        const { sub_no, account_sub, status, register_date } = subscriber;
        await pool.query(
            `UPDATE ${tables.subscribers} SET sub_no = ?, account_sub = ?, status = ?, register_date = ? WHERE id = ?`,
            [sub_no, account_sub, status, register_date, id]
        );
    },
    async deleteSubscriber(id: number) {
        await pool.query(`DELETE FROM ${tables.subscribers} WHERE id = ?`, [id]);
    },

    // ===================== SIM CARD - SUBSCRIBER JOINS =====================
    async getSimCardBySubscriber() {
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
    },


    // ===================== SIM CARDS =====================
    // CRUD for simcards
    async getSimCards() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards}`);
        return rows;
    },
    async getSimsBySubscriberId(subscriberId: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards} WHERE sub_no_id = ?`, [subscriberId]);
        return rows;
    },
    async createSimCard(simCard: any) {
        const { sim_sn, sub_no_id, register_date, reason, note } = simCard;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.simCards} (sim_sn, sub_no_id, register_date, reason, note) VALUES (?, ?, ?, ?, ?)` ,
            [sim_sn, sub_no_id, register_date, reason, note]
        );
        return result.insertId;
    },
    async updateSimCard(id: number, simCard: any) {
        const { sim_sn, sub_no_id, register_date, reason, note } = simCard;
        await pool.query(
            `UPDATE ${tables.simCards} SET sim_sn = ?, sub_no_id = ?, register_date = ?, reason = ?, note = ? WHERE id = ?`,
            [sim_sn, sub_no_id, register_date, reason, note, id]
        );
    },


    // ===================== ACCOUNTS =====================
    // CRUD for accounts
    async getAccounts() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accounts}`);
        return rows;
    },
    async createAccount(account: any) {
        const { account_master } = account;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.accounts} (account_master) VALUES (?)`,
            [account_master]
        );
        return result.insertId;
    },

    // ===================== ACCOUNT SUBS =====================
    // CRUD for account_subs (assign subs to accounts)
    async getAccountSubs() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accountSubs}`);
        return rows;
    },
    async createAccountSub(accountSub: any) {
        const { sub_no_id, account_id } = accountSub;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.accountSubs} (sub_no_id, account_id) VALUES (?, ?)` ,
            [sub_no_id, account_id]
        );
        return result.insertId;
    },

    // ===================== CONTRACTS =====================
    // CRUD for contracts
    async getContracts() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts}`);
        return rows;
    },
    async getContractById(contractId: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts} WHERE id = ?`, [contractId]);
        return rows[0];
    },
    async createContract(contract: any) {
        const { account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration } = contract;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.contracts} (account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration]
        );
        return result.insertId;
    },

    // ===================== VENDORS =====================
    // CRUD for vendors
    async getVendors() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors}`);
        return rows;
    },
    async getVendorById(vendorId: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors} WHERE id = ?`, [vendorId]);
        return rows[0];
    },
    async createVendor(vendor: any) {
        const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.vendors} (name, service_type, register_date, address, contact_name, contact_no, contact_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
            [name, service_type, register_date, address, contact_name, contact_no, contact_email, status]
        );
        return result.insertId;
    },
    async updateVendor(id: number, vendor: any) {
        const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
        await pool.query(
            `UPDATE ${tables.vendors} SET name = ?, service_type = ?, register_date = ?, address = ?, contact_name = ?, contact_no = ?, contact_email = ?, status = ? WHERE id = ?`,
            [name, service_type, register_date, address, contact_name, contact_no, contact_email, status, id]
        );
    },
    async deleteVendor(id: number) {
        await pool.query(`DELETE FROM ${tables.vendors} WHERE id = ?`, [id]);
    },

    // ===================== USER SUBS =====================
    async getUserSubs() {
        // Returns all user_subs rows (ramco_id, sub_no_id)
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.userSubs}`);
        return rows;
    },

};