import { pool } from "../../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// --- DB & TABLE DECLARATIONS ---
const dbName = 'web_stock';
const stockPurchaseTable = `${dbName}.nrw_stock_purchase`;
const stockPurchaseItemsTable = `${dbName}.nrw_stock_purchase_items`;
const suppliersTable = `${dbName}.nrw_suppliers`;
const teamTable = `${dbName}.nrw_team`;
const fixedAssetTable = `${dbName}.fixed_asset`;
const stockCardTable = `${dbName}.nrw_stock_card`;
const stockTrackingTable = `${dbName}.nrw_stock_tracking`;
const stockRequestTable = `${dbName}.nrw_stock_request`;
const stockRequestItemsTable = `${dbName}.nrw_stock_request_items`;

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
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseTable} ORDER BY id DESC`);
    return rows;
};

export const getStockPurchaseById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const updateStockPurchase = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${stockPurchaseTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockPurchase = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockPurchaseTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK PURCHASE ITEMS ----

export const createStockPurchaseItem = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${stockPurchaseItemsTable} SET ?`, [data]);
    return result;
};

export const getStockPurchaseItems = async (purchaseId: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseItemsTable} WHERE purchase_id = ?`, [purchaseId]);
    return rows;
};

export const getStockPurchaseItemById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseItemsTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getStockPurchaseItemsForPurchases = async (purchaseIds: number[]) => {
    if (!purchaseIds || purchaseIds.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${stockPurchaseItemsTable} WHERE purchase_id IN (?)`, [purchaseIds]);
    return rows;
};

export const updateStockPurchaseItem = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${stockPurchaseItemsTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockPurchaseItem = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockPurchaseItemsTable} WHERE id = ?`, [id]);
    return result;
};

// ---- SUPPLIERS ----

export const createSupplier = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${suppliersTable} SET ?`, [data]);
    return result;
};

export const getSuppliers = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${suppliersTable} ORDER BY id DESC`);
    return rows;
};

export const getSupplierById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${suppliersTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getSuppliersByIds = async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const [rows] = await pool.query(`SELECT * FROM ${suppliersTable} WHERE id IN (?)`, [ids]);
    return rows;
};

export const updateSupplier = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${suppliersTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteSupplier = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${suppliersTable} WHERE id = ?`, [id]);
    return result;
};

// ---- TEAM ----

export const createTeam = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${teamTable} SET ?`, [data]);
    return result;
};

export const getTeams = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${teamTable} ORDER BY id DESC`);
    return rows;
};

export const getTeamById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${teamTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const updateTeam = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${teamTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteTeam = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${teamTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK ITEMS ----

export const createStockItem = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${fixedAssetTable} SET ?`, [data]);
    return result;
};

export const getStockItems = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${fixedAssetTable} ORDER BY id DESC`);
    return rows;
};

export const getStockItemById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${fixedAssetTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const updateStockItem = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${fixedAssetTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockItem = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${fixedAssetTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK CARD ----

export const createStockCard = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${stockCardTable} SET ?`, [data]);
    return result;
};

export const getStockCards = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockCardTable} ORDER BY id DESC`);
    return rows;
};

export const getStockCardByItemId = async (itemId: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockCardTable} WHERE item_id = ?`, [itemId]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const updateStockCard = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${stockCardTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockCard = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockCardTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK TRACKING ----

export const createStockTracking = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${stockTrackingTable} SET ?`, [data]);
    return result;
};

export const getStockTrackings = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockTrackingTable} ORDER BY id DESC`);
    return rows;
};

export const getStockTrackingById = async (id: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockTrackingTable} WHERE id = ?`, [id]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getStockTransactionsByItemId = async (itemId: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockTrackingTable} WHERE item_id = ? ORDER BY transaction_date DESC`, [itemId]);
    return rows;
};

export const updateStockTracking = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${stockTrackingTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockTracking = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockTrackingTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK REQUEST ----

export const createStockRequest = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${stockRequestTable} SET ?`, [data]);
    return result;
};

export const getStockRequests = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${stockRequestTable} ORDER BY id DESC`);
    return rows;
};

export const getStockRequestById = async (id: number) => {
    const [requestRows] = await pool.query(`SELECT * FROM ${stockRequestTable} WHERE id = ?`, [id]);
    const request = Array.isArray(requestRows) && requestRows.length > 0 ? requestRows[0] : null;
    
    if (request) {
        const [itemRows] = await pool.query(`SELECT * FROM ${stockRequestItemsTable} WHERE stock_out_id = ?`, [id]);
        (request as any).items = Array.isArray(itemRows) ? itemRows : [];
    }
    
    return request;
};

export const updateStockRequest = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${stockRequestTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockRequest = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockRequestTable} WHERE id = ?`, [id]);
    return result;
};

// ---- STOCK REQUEST ITEMS ----

export const addStockRequestItem = async (data: any) => {
    const [result] = await pool.query(`INSERT INTO ${stockRequestItemsTable} SET ?`, [data]);
    return result;
};

export const getStockRequestItems = async (requestId: number) => {
    const [rows] = await pool.query(`SELECT * FROM ${stockRequestItemsTable} WHERE stock_out_id = ?`, [requestId]);
    return rows;
};

export const updateStockRequestItem = async (id: number, data: any) => {
    const [result] = await pool.query(`UPDATE ${stockRequestItemsTable} SET ? WHERE id = ?`, [data, id]);
    return result;
};

export const deleteStockRequestItem = async (id: number) => {
    const [result] = await pool.query(`DELETE FROM ${stockRequestItemsTable} WHERE id = ?`, [id]);
    return result;
};
