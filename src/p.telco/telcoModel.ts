import pool from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Database and table names
const db = 'assets';
const tables = {
    subscribers: `${db}.subscribers`,
    accountSubs: `${db}.account_subs`,
    accounts: `${db}.accounts`,
    contracts: `${db}.contracts`,
    vendors: `${db}.vendors`,
    simCards: `${db}.sim_cards`,
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
    // Basic fetches only, no joins or grouping
    async getSubscriberById(id: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers} WHERE id = ?`, [id]);
        return rows[0];
    },
    async getSubscribers() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.subscribers}`);
        return rows;
    },
    async getSimCards() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards}`);
        return rows;
    },
    async getSimsBySubscriberId(subscriberId: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.simCards} WHERE sub_no_id = ?`, [subscriberId]);
        return rows;
    },
    async getAccounts() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accounts}`);
        return rows;
    },
    async getAccountSubs() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.accountSubs}`);
        return rows;
    },
    async getContracts() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts}`);
        return rows;
    },
    async getContractById(contractId: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.contracts} WHERE id = ?`, [contractId]);
        return rows[0];
    },
    async getVendors() {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors}`);
        return rows;
    },
    async getVendorById(vendorId: number) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tables.vendors} WHERE id = ?`, [vendorId]);
        return rows[0];
    },
    /* Create subs. POST /subs */
    async createSubscriber(subscriber: any) {
        const { sub_no, account_sub, status, register_date } = subscriber;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.subscribers} (sub_no, account_sub, status, register_date) VALUES (?, ?, ?, ?)` ,
            [sub_no, account_sub, status, register_date]
        );
        return result.insertId;
    },

    /* Update subs by ID. PUT /subs/:id */
    async updateSubscriber(id: number, subscriber: any) {
        const { sub_no, account_sub, status, register_date } = subscriber;
        await pool.query(
            `UPDATE ${tables.subscribers} SET sub_no = ?, account_sub = ?, status = ?, register_date = ? WHERE id = ?`,
            [sub_no, account_sub, status, register_date, id]
        );
    },

    /* Delete subs by ID. DELETE /subs/:id */
    async deleteSubscriber(id: number) {
        await pool.query(`DELETE FROM ${tables.subscribers} WHERE id = ?`, [id]);
    },

    /* Create sim cards. POST /sims */
    async createSimCard(simCard: any) {
        const { sim_sn, sub_no_id, register_date, reason, note } = simCard;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.simCards} (sim_sn, sub_no_id, register_date, reason, note) VALUES (?, ?, ?, ?, ?)` ,
            [sim_sn, sub_no_id, register_date, reason, note]
        );
        return result.insertId;
    },

    /* Create account. POST /accounts */
    async createAccount(account: any) {
        const { account_master } = account;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.accounts} (account_master) VALUES (?)`,
            [account_master]
        );
        return result.insertId;
    },

    /* Create contract. POST /contracts */
    async createContract(contract: any) {
        const { account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration } = contract;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.contracts} (account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration]
        );
        return result.insertId;
    },

    /* Create vendor. POST /vendors */
    async createVendor(vendor: any) {
        const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.vendors} (name, service_type, register_date, address, contact_name, contact_no, contact_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
            [name, service_type, register_date, address, contact_name, contact_no, contact_email, status]
        );
        return result.insertId;
    },

    /* Update vendor by ID. PUT /vendors/:id */
    async updateVendor(id: number, vendor: any) {
        const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
        await pool.query(
            `UPDATE ${tables.vendors} SET name = ?, service_type = ?, register_date = ?, address = ?, contact_name = ?, contact_no = ?, contact_email = ?, status = ? WHERE id = ?`,
            [name, service_type, register_date, address, contact_name, contact_no, contact_email, status, id]
        );
    },

    /* Delete vendor by ID. DELETE /vendors/:id */
    async deleteVendor(id: number) {
        await pool.query(`DELETE FROM ${tables.vendors} WHERE id = ?`, [id]);
    },


    /* assign subs to accounts. POST /account-subs */
    async createAccountSub(accountSub: any) {
        const { sub_no_id, account_id } = accountSub;
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO ${tables.accountSubs} (sub_no_id, account_id) VALUES (?, ?)` ,
            [sub_no_id, account_id]
        );
        return result.insertId;
    },

};