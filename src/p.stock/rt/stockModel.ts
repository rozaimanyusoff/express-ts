import {pool} from "../../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// --- DB & TABLE DECLARATIONS ---
const dbName = 'diana';
const stockPurchaseTable = `${dbName}.rt_stock_purchase`;
const stockPurchaseItemsTable = `${dbName}.rt_stock_purchase_items`;
const suppliersTable = `${dbName}.rt_suppliers`;
const teamTable = `${dbName}.rt_team`;
const stockItemsTable = `${dbName}.rt_stock_items`;
const stockCardTable = `${dbName}.rt_stock_card`;
const stockTrackingTable = `${dbName}.rt_stock_tracking`;
const stockRequestTable = `${dbName}.rt_stock_request`;
const stockRequestItemsTable = `${dbName}.rt_stock_request_items`;

// ---- STOCK PURCHASES ----

export const createStockPurchase = async (data: any) => {
    const {
        request_ref_no, requested_by, requested_at,
        verified_by, verified_at, verification_status,
        approved_by, approved_at, approval_status,
        po_no, po_date, supplier_id, inv_no, inv_date,
        do_no, do_date, received_by, received_at,
        total_items, remarks
    } = data;
    const [result] = await pool.query(
        `INSERT INTO ${stockPurchaseTable} (
      request_ref_no, requested_by, requested_at,
      verified_by, verified_at, verification_status,
      approved_by, approved_at, approval_status,
      po_no, po_date, supplier_id, inv_no, inv_date,
      do_no, do_date, received_by, received_at,
      total_items, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            request_ref_no, requested_by, requested_at,
            verified_by, verified_at, verification_status,
            approved_by, approved_at, approval_status,
            po_no, po_date, supplier_id, inv_no, inv_date,
            do_no, do_date, received_by, received_at,
            total_items, remarks
        ]
    );
    return result;
};

export const getStockPurchases = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseTable}`);
    return rows;
};

export const getStockPurchaseById = async (id: number) => {
    if (typeof id !== 'number' || isNaN(id)) throw new Error('Invalid id');
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};

export const updateStockPurchase = async (id: number, data: any) => {
    const {
        request_ref_no, requested_by, requested_at,
        verified_by, verified_at, verification_status,
        approved_by, approved_at, approval_status,
        po_no, po_date, supplier_id, inv_no, inv_date,
        do_no, do_date, received_by, received_at,
        total_items, remarks
    } = data;
    const [result] = await pool.query(
        `UPDATE ${stockPurchaseTable} SET
      request_ref_no=?, requested_by=?, requested_at=?,
      verified_by=?, verified_at=?, verification_status=?,
      approved_by=?, approved_at=?, approval_status=?,
      po_no=?, po_date=?, supplier_id=?, inv_no=?, inv_date=?,
      do_no=?, do_date=?, received_by=?, received_at=?,
      total_items=?, remarks=?
      WHERE id=?`,
        [
            request_ref_no, requested_by, requested_at,
            verified_by, verified_at, verification_status,
            approved_by, approved_at, approval_status,
            po_no, po_date, supplier_id, inv_no, inv_date,
            do_no, do_date, received_by, received_at,
            total_items, remarks, id
        ]
    );
    return result;
};

export const deleteStockPurchase = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockPurchaseTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK PURCHASE ITEMS ----

export const createStockPurchaseItem = async (data: any) => {
    const { purchase_id, item_id, item_code, item_name, qty, received_qty } = data;
    const [result] = await pool.query(
        `INSERT INTO ${stockPurchaseItemsTable} (purchase_id, item_id, item_code, item_name, qty, received_qty) VALUES (?, ?, ?, ?, ?, ?)`,
        [purchase_id, item_id, item_code, item_name, qty, received_qty]
    );
    return result;
};

export const getStockPurchaseItems = async (purchase_id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseItemsTable} WHERE purchase_id = ?`, [purchase_id]);
    return rows;
};

export const getStockPurchaseItemById = async (id: number) => {
    if (typeof id !== 'number' || isNaN(id)) throw new Error('Invalid id');
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseItemsTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};

export const updateStockPurchaseItem = async (id: number, data: any) => {
    const { item_id, item_code, item_name, qty, received_qty } = data;
    const [result] = await pool.query(
        `UPDATE ${stockPurchaseItemsTable} SET item_id=?, item_code=?, item_name=?, qty=?, received_qty=? WHERE id=?`,
        [item_id, item_code, item_name, qty, received_qty, id]
    );
    return result;
};

export const deleteStockPurchaseItem = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockPurchaseItemsTable} WHERE id = ?`, [id]);
    return result;
};

export const getStockPurchaseItemsForPurchases = async (purchaseIds: number[]) => {
    if (!Array.isArray(purchaseIds) || purchaseIds.length === 0) return [];
    const [rows] = await pool.query(
        `SELECT * FROM ${stockPurchaseItemsTable} WHERE purchase_id IN (${purchaseIds.map(() => '?').join(',')})`,
        purchaseIds
    );
    return rows;
};


// ---- SUPPLIERS ----
export const createSupplier = async (data: any) => {
    const { name, contact_name, contact_no } = data;
    const [result] = await pool.query(
        `INSERT INTO ${suppliersTable} (name, contact_name, contact_no) VALUES (?, ?, ?)`,
        [name, contact_name, contact_no]
    );
    return result;
};
export const getSuppliers = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${suppliersTable}`);
    return rows;
};
export const getSupplierById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${suppliersTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};
export const updateSupplier = async (id: number, data: any) => {
    const { name, contact_name, contact_no } = data;
    const [result] = await pool.query(
        `UPDATE ${suppliersTable} SET name=?, contact_name=?, contact_no=? WHERE id=?`,
        [name, contact_name, contact_no, id]
    );
    return result;
};
export const deleteSupplier = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${suppliersTable} WHERE id=?`, [id]);
    return result;
};

// Fetch multiple suppliers by IDs
export const getSuppliersByIds = async (ids: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const [rows] = await pool.query(
        `SELECT id, name FROM ${suppliersTable} WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
    );
    return rows;
};

// ---- TEAM ----
export const createTeam = async (data: any) => {
    const { name } = data;
    const [result] = await pool.query(
        `INSERT INTO ${teamTable} (name) VALUES (?)`,
        [name]
    );
    return result;
};
export const getTeams = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${teamTable}`);
    return rows;
};
export const getTeamById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${teamTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};
export const updateTeam = async (id: number, data: any) => {
    const { name } = data;
    const [result] = await pool.query(
        `UPDATE ${teamTable} SET name=? WHERE id=?`,
        [name, id]
    );
    return result;
};
export const deleteTeam = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${teamTable} WHERE id=?`, [id]);
    return result;
};

// ---- STOCK ITEMS ----
export const createStockItem = async (data: any) => {
    const { item_code, item_name, type_id, category_id, brand_id, model_id, specification, image } = data;
    const [result] = await pool.query(
        `INSERT INTO ${stockItemsTable} (item_code, item_name, type_id, category_id, brand_id, model_id, specification, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item_code, item_name, type_id, category_id, brand_id, model_id, specification, image]
    );
    return result;
};
export const getStockItems = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockItemsTable}`);
    return rows;
};
export const getStockItemById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockItemsTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};
export const updateStockItem = async (id: number, data: any) => {
    const { item_code, item_name, type_id, category_id, brand_id, model_id, specification, image } = data;
    const [result] = await pool.query(
        `UPDATE ${stockItemsTable} SET item_code=?, item_name=?, type_id=?, category_id=?, brand_id=?, model_id=?, specification=?, image=? WHERE id=?`,
        [item_code, item_name, type_id, category_id, brand_id, model_id, specification, image, id]
    );
    return result;
};
export const deleteStockItem = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockItemsTable} WHERE id=?`, [id]);
    return result;
};

// --- STOCK CARD ---
export const getStockCards = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockCardTable}`);
    return rows;
};

export const getStockCardByItemId = async (itemId: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockCardTable} WHERE item_id = ?`, [itemId]);
    return rows;
};

export const createStockCard = async (data: { item_id: number; total_in: number; total_out: number; balance: number; data_issue: string; }) => {
    const [result] = await pool.query(
        `INSERT INTO ${stockCardTable} (item_id, total_in, total_out, balance, data_issue) VALUES (?, ?, ?, ?, ?)`,
        [data.item_id, data.total_in, data.total_out, data.balance, data.data_issue]
    );
    return result;
};

export const updateStockCard = async (id: number, data: { total_in?: number; total_out?: number; balance?: number; data_issue?: string; }) => {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    const [result] = await pool.query(
        `UPDATE ${stockCardTable} SET ${fields} WHERE id = ?`,
        values
    );
    return result;
};

export const deleteStockCard = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockCardTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK TRACKING ----
export const createStockTracking = async (data: any) => {
    const { item_id, purchase_id, delivery_date, item_code, item_name, serial_no, store, status, issue_date, issue_no, issue_to, installed_location, department, team_name, registered_by, updated_by, created_at, updated_at, is_duplicate } = data;
    const [result] = await pool.query(
        `INSERT INTO ${stockTrackingTable} (
      item_id, purchase_id, delivery_date, item_code, item_name, serial_no, store, status, issue_date, issue_no, issue_to, installed_location, department, team_name, registered_by, updated_by, created_at, updated_at, is_duplicate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [item_id, purchase_id, delivery_date, item_code, item_name, serial_no, store, status, issue_date, issue_no, issue_to, installed_location, department, team_name, registered_by, updated_by, created_at, updated_at, is_duplicate]
    );
    return result;
};

export const getStockTrackings = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockTrackingTable}`);
    return rows;
};

export const getStockTrackingById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockTrackingTable} WHERE id = ?`, [id]);
    return (rows as RowDataPacket[])[0];
};

export const updateStockTracking = async (id: number, data: any) => {
    const { item_id, purchase_id, delivery_date, item_code, item_name, serial_no, store, status, issue_date, issue_no, issue_to, installed_location, department, team_name, registered_by, updated_by, created_at, updated_at, is_duplicate } = data;
    const [result] = await pool.query(
        `UPDATE ${stockTrackingTable} SET item_id=?, purchase_id=?, delivery_date=?, item_code=?, item_name=?, serial_no=?, store=?, status=?, issue_date=?, issue_no=?, issue_to=?, installed_location=?, department=?, team_name=?, registered_by=?, updated_by=?, created_at=?, updated_at=?, is_duplicate=? WHERE id=?`,
        [item_id, purchase_id, delivery_date, item_code, item_name, serial_no, store, status, issue_date, issue_no, issue_to, installed_location, department, team_name, registered_by, updated_by, created_at, updated_at, is_duplicate, id]
    );
    return result;
};

export const deleteStockTracking = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockTrackingTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK REQUESTS ----
import { PoolConnection } from 'mysql2/promise';

export const createStockRequest = async (data: any) => {
    const {
        request_ref_no, requested_by, requested_at, verified_by, verified_at, verification_status,
        processed_by, processed_at, collected_by, collected_at, date_out, department, team_name,
        use_for, pic, remarks, total_items, created_at, items
    } = data;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [result]: any = await conn.query(
            `INSERT INTO ${stockRequestTable} (
        request_ref_no, requested_by, requested_at, verified_by, verified_at, verification_status,
        processed_by, processed_at, collected_by, collected_at, date_out, department, team_name,
        use_for, pic, remarks, total_items, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [request_ref_no, requested_by, requested_at, verified_by, verified_at, verification_status,
                processed_by, processed_at, collected_by, collected_at, date_out, department, team_name,
                use_for, pic, remarks, total_items, created_at]
        );
        const requestId = result.insertId;
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                const { item_id, item_code, item_name, qty, approved_qty, remarks } = item;
                await conn.query(
                    `INSERT INTO ${stockRequestItemsTable} (stock_out_id, item_id, item_code, item_name, qty, approved_qty, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [requestId, item_id, item_code, item_name, qty, approved_qty, remarks]
                );
            }
        }
        await conn.commit();
        return { insertId: requestId };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

export const getStockRequests = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockRequestTable}`);
    return rows;
};

export const getStockRequestById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockRequestTable} WHERE id = ?`, [id]);
    const request = (rows as RowDataPacket[])[0];
    if (!request) return null;
    const [items] = await pool.query(`SELECT * FROM ${stockRequestItemsTable} WHERE stock_out_id = ?`, [id]);
    request.items = items;
    return request;
};

export const updateStockRequest = async (id: number, data: any) => {
    // Only update parent table fields, not items
    const {
        request_ref_no, requested_by, requested_at, verified_by, verified_at, verification_status,
        processed_by, processed_at, collected_by, collected_at, date_out, department, team_name,
        use_for, pic, remarks, total_items, created_at
    } = data;
    const [result] = await pool.query(
        `UPDATE ${stockRequestTable} SET
      request_ref_no=?, requested_by=?, requested_at=?, verified_by=?, verified_at=?, verification_status=?,
      processed_by=?, processed_at=?, collected_by=?, collected_at=?, date_out=?, department=?, team_name=?,
      use_for=?, pic=?, remarks=?, total_items=?, created_at=? WHERE id=?`,
        [request_ref_no, requested_by, requested_at, verified_by, verified_at, verification_status,
            processed_by, processed_at, collected_by, collected_at, date_out, department, team_name,
            use_for, pic, remarks, total_items, created_at, id]
    );
    return result;
};

export const deleteStockRequest = async (id: number) => {
    // Delete child items first, then parent
    await pool.query(`DELETE FROM ${stockRequestItemsTable} WHERE stock_out_id = ?`, [id]);
    const [result] = await pool.query(`DELETE FROM ${stockRequestTable} WHERE id = ?`, [id]);
    return result;
};

export const addStockRequestItem = async (stock_out_id: number, item: any) => {
    const { item_id, item_code, item_name, qty, approved_qty, remarks } = item;
    const [result] = await pool.query(
        `INSERT INTO ${stockRequestItemsTable} (stock_out_id, item_id, item_code, item_name, qty, approved_qty, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [stock_out_id, item_id, item_code, item_name, qty, approved_qty, remarks]
    );
    return result;
};

export const updateStockRequestItem = async (id: number, data: any) => {
    const { item_id, item_code, item_name, qty, approved_qty, remarks } = data;
    const [result] = await pool.query(
        `UPDATE ${stockRequestItemsTable} SET item_id=?, item_code=?, item_name=?, qty=?, approved_qty=?, remarks=? WHERE id=?`,
        [item_id, item_code, item_name, qty, approved_qty, remarks, id]
    );
    return result;
};

export const deleteStockRequestItem = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockRequestItemsTable} WHERE id = ?`, [id]);
    return result;
};

// Get all stock transactions for a given item_id
export const getStockTransactionsByItemId = async (item_id: number) => {
    const [rows] = await pool.query('SELECT * FROM stock.rt_stock_tracking WHERE item_id = ?', [item_id]);
    return rows;
};

