import pool from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

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
    /* Show subscriber by ID. ep: /subs/:id/sims */
    async getSubscriberById(id: number) {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM assets.subscribers WHERE id = ?', [id]);
        return rows[0];
    },

    /* List subscribers. ep: /subs */
    async getSubscribers() {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM assets.subscribers');
        return rows;
    },

    /* list full subscriber data. ep: /subs */
    async getSubscribersFullData() {
        const query = `
              SELECT s.id AS subscriber_id, s.sub_no, s.account_sub, s.register_date AS subscriber_register_date, s.status AS subscriber_status,
                     a.id AS account_id, a.account_master,
                     c.id AS contract_id, c.product_type, c.contract_start_date, c.contract_end_date, c.plan, c.status AS contract_status, c.duration, c.price, c.vendor_id,
                     v.id AS vendor_id, v.name AS vendor_name,
                     sim.id AS sim_id, sim.sim_sn AS sim_no, sim.register_date AS sim_register_date, sim.reason, sim.note
              FROM assets.subscribers s
              LEFT JOIN assets.account_subs acs ON s.id = acs.sub_no_id
              LEFT JOIN assets.accounts a ON acs.account_id = a.id
              LEFT JOIN assets.contracts c ON a.id = c.account_id
              LEFT JOIN assets.vendors v ON c.vendor_id = v.id
              LEFT JOIN assets.sim_cards sim ON s.id = sim.sub_no_id
            `;

        const [rows] = await pool.query<RowDataPacket[]>(query);

        // Group data by subscriber_id
        const groupedData: Record<number, any> = {};

        rows.forEach(row => {
            const subscriberId = row.subscriber_id;

            if (!groupedData[subscriberId]) {
                groupedData[subscriberId] = {
                    id: row.subscriber_id,
                    sub_no: row.sub_no,
                    account_sub: row.account_sub,
                    registered_date: row.subscriber_register_date,
                    status: row.subscriber_status,
                    accounts: row.account_id ? {
                        id: row.account_id,
                        account_master: row.account_master,
                        contract: row.contract_id ? {
                            id: row.contract_id,
                            contract_no: row.account_master,
                            product_type: row.product_type,
                            contract_start_date: row.contract_start_date,
                            contract_end_date: row.contract_end_date,
                            duration: row.duration,
                            plan: row.plan,
                            status: row.contract_status,
                            vendor: row.vendor_id ? {
                                id: row.vendor_id,
                                vendor_name: row.vendor_name,
                            } : null,
                            price: row.price,
                        } : null,
                    } : null,
                    sims: [],
                };
            }

            // Add SIM card details
            if (row.sim_id) {
                groupedData[subscriberId].sims.push({
                    id: row.sim_id,
                    sim_no: row.sim_no,
                    status: row.sim_status,
                    registered_date: row.sim_register_date,
                    reason: row.reason,
                    note: row.note,
                });
            }
        });

        return Object.values(groupedData);
    },

    /* Create subs. POST /subs */
    async createSubscriber(subscriber: any) {
        const { sub_no, account_sub, status, register_date } = subscriber;
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO assets.subscribers (sub_no, account_sub, status, register_date) VALUES (?, ?, ?, ?)',
            [sub_no, account_sub, status, register_date]
        );
        return result.insertId;
    },

    /* Update subs by ID. PUT /subs/:id */
    async updateSubscriber(id: number, subscriber: any) {
        const { sub_no, account_sub, status, register_date } = subscriber;
        await pool.query(
            'UPDATE assets.subscribers SET sub_no = ?, account_sub = ?, status = ?, register_date = ? WHERE id = ?',
            [sub_no, account_sub, status, register_date, id]
        );
    },

    /* Delete subs by ID. DELETE /subs/:id */
    async deleteSubscriber(id: number) {
        await pool.query('DELETE FROM assets.subscribers WHERE id = ?', [id]);
    },

    /* list sims by its subsciber ID. endpoints: /subs/:id/sims */
    async getSimsBySubscriberId(subscriberId: number) {
        const query = `
      SELECT id, sim_sn, sub_no_id, register_date, reason, note
      FROM assets.sim_cards
      WHERE sub_no_id = ?
    `;
        const [rows] = await pool.query<RowDataPacket[]>(query, [subscriberId]);
        return rows;
    },

    /* list sim cards. ep: /sims */
    async getSimCards() {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM assets.sim_cards');
        return rows;
    },

    /* Create sim cards. POST /sims */
    async createSimCard(simCard: any) {
        const { sim_sn, sub_no_id, register_date, reason, note } = simCard;
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO assets.sim_cards (sim_sn, sub_no_id, register_date, reason, note) VALUES (?, ?, ?, ?, ?)',
            [sim_sn, sub_no_id, register_date, reason, note]
        );
        return result.insertId;
    },

    /* list account and its subscribers by account id. ep: ['/accounts/:id/subs', '/accounts/subs']  */
    async getAccountsWithSubscribers(): Promise<AccountData[]> {
        const accountsQuery = `
      SELECT a.id AS account_id, a.account_master, 
             s.id AS sub_no_id, s.sub_no, s.account_sub
      FROM assets.accounts a
      LEFT JOIN assets.account_subs acs ON a.id = acs.account_id
      LEFT JOIN assets.subscribers s ON acs.sub_no_id = s.id
    `;

        const [rows] = await pool.query<RowDataPacket[]>(accountsQuery);

        // Group data by account_id
        const groupedData: Record<number, AccountData> = {};

        rows.forEach(row => {
            const accountId = row.account_id;

            if (!groupedData[accountId]) {
                groupedData[accountId] = {
                    id: row.account_id,
                    account_master: row.account_master,
                    subs: [],
                };
            }

            const account = groupedData[accountId];

            // Add subscriber details
            if (row.sub_no_id) {
                account.subs.push({
                    sub_no_id: row.sub_no_id,
                    sub_no: row.sub_no,
                    account_sub: row.account_sub,
                });
            }
        });

        return Object.values(groupedData);
    },

    /* List accounts */
    async getAccounts() {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM assets.accounts');
        return rows;
    },

    /* Create account. POST /accounts */
    async createAccount(account: any) {
        const { account_master } = account;
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO assets.accounts (account_master) VALUES (?)',
            [account_master]
        );
        return result.insertId;
    },

    /* show contract and its accounts details by contract id. ep: /contracts/:id/accounts */
    async getAccountsWithSubscribersByContractId(contractId: number): Promise<AccountData[]> {
        const query = `
          SELECT a.id AS account_id, a.account_master, 
                 s.id AS sub_no_id, s.sub_no, s.account_sub
          FROM assets.accounts a
          INNER JOIN assets.contracts c ON a.id = c.account_id
          LEFT JOIN assets.account_subs acs ON a.id = acs.account_id
          LEFT JOIN assets.subscribers s ON acs.sub_no_id = s.id
          WHERE c.id = ?
        `;

        const [rows] = await pool.query<RowDataPacket[]>(query, [contractId]);

        // Group data by account_id
        const groupedData: Record<number, AccountData> = {};

        rows.forEach(row => {
            const accountId = row.account_id;

            if (!groupedData[accountId]) {
                groupedData[accountId] = {
                    id: row.account_id,
                    account_master: row.account_master,
                    subs: [],
                };
            }

            const account = groupedData[accountId];

            // Add subscriber details
            if (row.sub_no_id) {
                account.subs.push({
                    sub_no_id: row.sub_no_id,
                    sub_no: row.sub_no,
                    account_sub: row.account_sub,
                });
            }
        });

        return Object.values(groupedData);
    },

    /* show contract by ID. ep: /contracts/:id */
    async getContractById(contractId: number) {
        const query = `
      SELECT c.id, account_id, product_type, contract_start_date, contract_end_date, plan, c.status, vendor_id, v.name, price, duration
      FROM assets.contracts c
      LEFT JOIN assets.vendors v ON c.vendor_id = v.id
      WHERE c.id = ?
    `;
        const [rows] = await pool.query<RowDataPacket[]>(query, [contractId]);
        return rows[0];
    },

    /* list contracts. ep: /contracts */
    async getContracts() {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT c.*, v.id as vendor_id, v.name as vendor_name FROM assets.contracts c LEFT JOIN assets.vendors v ON c.vendor_id = v.id');
        return rows;
    },

    /* Create contract. POST /contracts */
    async createContract(contract: any) {
        const { account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration } = contract;
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO assets.contracts (account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [account_id, product_type, contract_start_date, contract_end_date, plan, status, vendor_id, price, duration]
        );
        return result.insertId;
    },

    /* Show vendor by ID. ep: /vendors/:id */
    async getVendorById(vendorId: number) {
        const query = `
      SELECT id, name, service_type, register_date, address, contact_name, contact_no, contact_email, status
      FROM vendors
      WHERE id = ?
    `;
        const [rows] = await pool.query<RowDataPacket[]>(query, [vendorId]);
        return rows[0];
    },

    /* list vendors. ep: /vendors */
    async getVendors() {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM assets.vendors');
        return rows;
    },

    /* Create vendor. POST /vendors */
    async createVendor(vendor: any) {
        const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO assets.vendors (name, service_type, register_date, address, contact_name, contact_no, contact_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, service_type, register_date, address, contact_name, contact_no, contact_email, status]
        );
        return result.insertId;
    },

    /* Update vendor by ID. PUT /vendors/:id */
    async updateVendor(id: number, vendor: any) {
        const { name, service_type, register_date, address, contact_name, contact_no, contact_email, status } = vendor;
        await pool.query(
            'UPDATE assets.vendors SET name = ?, service_type = ?, register_date = ?, address = ?, contact_name = ?, contact_no = ?, contact_email = ?, status = ? WHERE id = ?',
            [name, service_type, register_date, address, contact_name, contact_no, contact_email, status, id]
        );
    },

    /* Delete vendor by ID. DELETE /vendors/:id */
    async deleteVendor(id: number) {
        await pool.query('DELETE FROM assets.vendors WHERE id = ?', [id]);
    },

    /* list account & subs assignment. ep: /account-subs */
    async getAccountSubs() {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM assets.account_subs');
        return rows;
    },

    /* assign subs to accounts. POST /account-subs */
    async createAccountSub(accountSub: any) {
        const { sub_no_id, account_id } = accountSub;
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO assets.account_subs (sub_no_id, account_id) VALUES (?, ?)',
            [sub_no_id, account_id]
        );
        return result.insertId;
    },

};