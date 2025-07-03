// src/p.purchase/purchaseModel.ts
import {pool} from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Table names
const db = 'assetdata';
const purchaseRequestTable = `${db}.purchase_request`;
const purchaseRequestDetailsTable = `${db}.purchase_request_details`;

// Parent: purchase_request
export interface PurchaseRequest {
    id: number;
    req_no: string;
    req_date: string;
    requestor: string;
    dept_id: number;
    costcenter_id: number;
    district_id: number;
    required_date: string;
    purpose: string;
    remarks: string;
    verified_by: number;
    verification_status: number;
    verification_date: string;
    approved_by: number;
    req_status: number;
}

// Child: purchase_request_details
export interface PurchaseRequestDetail {
    id: number;
    request_id: number;
    type_id: number;
    category_id: number;
    item_desc: string;
    quantity: number;
    priority: number;
    justification: string;
    applicant_hod_id: string;
    applicant_hod_verification: number;
    applicant_hod_verification_date: string;
    applicant_hod_verification_remarks: string;
    delivery_location: string;
    assetmgr_id: number;
    assetmgr_remarks: string;
    assetmgr_hod_approval: number;
    assetmgr_hod_approval_date: string;
    procurement_id: number;
    preferred_vendor: number;
    preferred_quotation: number;
    po_no: string;
    uploaded_po: string;
    procurement_hod_approval: string;
    procurement_hod_approval_date: string;
    delivery_date: string;
    delivery_status: number;
    finance_id: number;
    finance_payment_date: string;
    finance_payment_status: number;
    uploaded_payment: string;
}

export const getAllPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestTable}`);
    return rows as PurchaseRequest[];
};

export const getPurchaseRequestById = async (id: number): Promise<PurchaseRequest | null> => {
    const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
    return (rows as PurchaseRequest[])[0] || null;
};

export const getPurchaseRequestDetails = async (request_id: number): Promise<PurchaseRequestDetail[]> => {
    const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestDetailsTable} WHERE pr_id = ?`, [request_id]);
    return rows as PurchaseRequestDetail[];
};

export const createPurchaseRequest = async (data: Partial<PurchaseRequest>): Promise<number> => {
    const [result] = await pool.query(
        `INSERT INTO ${purchaseRequestTable} (req_no, req_date, emp_id, dept_id, costcenter_id, district_id, required_date, purpose, remarks, verified_by, verification_status, verification_date, approved_by, req_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.req_no, data.req_date, data.requestor, data.dept_id, data.costcenter_id, data.district_id, data.required_date, data.purpose, data.remarks, data.verified_by, data.verification_status, data.verification_date, data.approved_by, data.req_status]
    );
    return (result as ResultSetHeader).insertId;
};

export const createPurchaseRequestDetail = async (data: Partial<PurchaseRequestDetail>): Promise<number> => {
    const [result] = await pool.query(
        `INSERT INTO ${purchaseRequestDetailsTable} (request_id, type_id, category_id, item_desc, quantity, priority, justification, applicant_hod_id, applicant_hod_verification, applicant_hod_verification_date, applicant_hod_verification_remarks, delivery_location, assetmgr_id, assetmgr_remarks, assetmgr_hod_approval, assetmgr_hod_approval_date, procurement_id, preferred_vendor, preferred_quotation, po_no, uploaded_po, procurement_hod_approval, procurement_hod_approval_date, delivery_date, delivery_status, finance_id, finance_payment_date, finance_payment_status, uploaded_payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.request_id, data.type_id, data.category_id, data.item_desc, data.quantity, data.priority, data.justification, data.applicant_hod_id, data.applicant_hod_verification, data.applicant_hod_verification_date, data.applicant_hod_verification_remarks, data.delivery_location, data.assetmgr_id, data.assetmgr_remarks, data.assetmgr_hod_approval, data.assetmgr_hod_approval_date, data.procurement_id, data.preferred_vendor, data.preferred_quotation, data.po_no, data.uploaded_po, data.procurement_hod_approval, data.procurement_hod_approval_date, data.delivery_date, data.delivery_status, data.finance_id, data.finance_payment_date, data.finance_payment_status, data.uploaded_payment]
    );
    return (result as ResultSetHeader).insertId;
};

export const deletePurchaseRequest = async (id: number): Promise<void> => {
    await pool.query(`DELETE FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
};

export const deletePurchaseRequestDetails = async (request_id: number): Promise<void> => {
    await pool.query(`DELETE FROM ${purchaseRequestDetailsTable} WHERE request_id = ?`, [request_id]);
};
