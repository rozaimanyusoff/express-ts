import { ResultSetHeader, RowDataPacket } from 'mysql2';
import path from 'path';

// src/p.purchase/purchaseModel.ts
import {pool} from '../utils/db';

// Table names
const db = 'assetdata';
const purchaseRequestTable = `${db}.purchase_requests`;
const purchaseRequestDetailsTable = `${db}.purchase_request_details`;
const purchaseRequestRegisterNumbersTable = `${db}.purchase_request_register_numbers`;

// Parent: purchase_request
export interface PurchaseRequest {
    backdated_purchase: boolean;
    costcenter_id: number;
    delivery_remarks: string;
    delivery_status: string;
    department_id: number;
    do_date: string;
    do_no: string;
    id?: number;
    inv_date: string;
    inv_no: string;
    po_date: string;
    po_no: string;
    ramco_id: string; // ramco_id
    request_date: string;
    request_no: string;
    request_reference: string;
    request_type: string;
    request_upload: string;
    supplier: string;
}

// Child: purchase_request_details
export interface PurchaseRequestDetail {
    category_id: number;
    delivery_remarks?: string;
    delivery_status?: string;
    id?: number;
    item_desc: string;
    justification: string;
    pr_id: number;
    quantity: number;
    register_numbers?: string[];
    supplier?: string;
    type_id: number;
    unit_price?: number;
}

export const getAllPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestTable}`);
    return rows as PurchaseRequest[];
};

export const getPurchaseRequestById = async (id: number): Promise<null | PurchaseRequest> => {
    const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
    return (rows as PurchaseRequest[])[0] || null;
};

export const getPurchaseRequestDetails = async (request_id: number): Promise<PurchaseRequestDetail[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestDetailsTable} WHERE pr_id = ?`, [request_id]);
    return rows as PurchaseRequestDetail[];
};

export const createPurchaseRequest = async (data: Partial<PurchaseRequest> & { request_upload_base64?: string }): Promise<number> => {
    let request_upload_filename = '';
    if (data.request_upload) {
        request_upload_filename = data.request_upload;
    }
    const [result] = await pool.query(
        `INSERT INTO ${purchaseRequestTable} (
          request_type, backdated_purchase, request_reference, request_no, request_date, requestor, costcenter_id, department_id, po_no, po_date, do_no, do_date, inv_no, inv_date, request_upload
        ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.request_type,
          data.backdated_purchase,
          data.request_reference,
          data.request_no,
          data.request_date,
          data.ramco_id,
          data.costcenter_id,
          data.department_id,
          data.po_no,
          data.po_date,
          data.do_no,
          data.do_date,
          data.inv_no,
          data.inv_date,
          request_upload_filename
        ]
    );
    return (result as ResultSetHeader).insertId;
};

// Update purchase request by id (partial update)
export const updatePurchaseRequest = async (id: number, data: Partial<PurchaseRequest>): Promise<void> => {
    if (!id || !data || Object.keys(data).length === 0) return;
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    await pool.query(
        `UPDATE ${purchaseRequestTable} SET ${fields} WHERE id = ?`,
        [...values, id]
    );
};

export const createPurchaseRequestDetail = async (data: Partial<PurchaseRequestDetail>): Promise<number> => {
    const [result] = await pool.query(
        `INSERT INTO ${purchaseRequestDetailsTable} (pr_id, type_id, category_id, item_desc, quantity, justification, supplier, unit_price, delivery_status, delivery_remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.pr_id,
          data.type_id,
          data.category_id,
          data.item_desc,
          data.quantity,
          data.justification,
          data.supplier,
          data.unit_price,
          data.delivery_status,
          data.delivery_remarks
        ]
    );
    return (result as ResultSetHeader).insertId;
};

export const deletePurchaseRequest = async (id: number): Promise<void> => {
    await pool.query(`DELETE FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
};

export const deletePurchaseRequestDetails = async (request_id: number): Promise<void> => {
    await pool.query(`DELETE FROM ${purchaseRequestDetailsTable} WHERE request_id = ?`, [request_id]);
};


// Register number row: { purchase_request_detail_id, register_number }
export const createPurchaseRequestRegisterNumber = async (data: { purchase_request_detail_id: number, register_number: string }): Promise<number> => {
    const [result] = await pool.query(
        `INSERT INTO ${purchaseRequestRegisterNumbersTable} (pr_id, register_number) VALUES (?, ?)`,
        [data.purchase_request_detail_id, data.register_number]
    );
    return (result as ResultSetHeader).insertId;
};