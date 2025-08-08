// src/p.purchase/purchaseController.ts
import { Request, Response } from 'express';
import * as purchaseModel from './purchaseModel';
import * as assetModel from '../p.asset/assetModel';
import { PurchaseRequest } from './purchaseModel';


export const getPurchaseRequests = async (req: Request, res: Response) => {
  const requests = await purchaseModel.getAllPurchaseRequests();
  // Fetch lookup data for costcenters, employees, and departments
  const [costcentersRaw, employeesRaw, departmentsRaw] = await Promise.all([
    assetModel.getCostcenters(),
    assetModel.getEmployees(),
    assetModel.getDepartments()
  ]);
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
  const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  const departmentMap = new Map(departments.map((d: any) => [d.id, d]));

  // Enrich each request with costcenter, department, and requestor (employee) objects
  const enriched = requests.map((req: any) => {
    const costcenterObj = req.costcenter_id && costcenterMap.has(req.costcenter_id)
      ? costcenterMap.get(req.costcenter_id)
      : null;
    const requestorObj = req.requestor && employeeMap.has(req.requestor)
      ? employeeMap.get(req.requestor)
      : null;
    const departmentObj = req.department_id && departmentMap.has(req.department_id)
      ? departmentMap.get(req.department_id)
      : null;
    const costcenter = costcenterObj ? { id: costcenterObj.id, name: costcenterObj.name } : null;
    const requestor = requestorObj ? { ramco_id: requestorObj.ramco_id, full_name: requestorObj.full_name } : null;
    const department = departmentObj ? { id: departmentObj.id, name: departmentObj.name } : null;
    // Remove costcenter_id and department_id from the response
    const { costcenter_id, department_id, ...rest } = req;
    return {
      ...rest,
      costcenter,
      department,
      requestor
    };
  });
  res.json({ status: 'success', message: 'Purchase requests retrieved successfully', data: enriched });
};

export const getPurchaseRequestById = async (req: Request, res: Response) => {
  const request = await purchaseModel.getPurchaseRequestById(Number(req.params.id));
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Purchase request not found' });
  }
  // Fetch details
  let details = await purchaseModel.getPurchaseRequestDetails(Number(request.id));
  // Fetch lookup data
  const [employeesRaw, departmentsRaw, costcentersRaw, districtsRaw, typesRaw, categoriesRaw] = await Promise.all([
    assetModel.getEmployees(),
    assetModel.getDepartments(),
    assetModel.getCostcenters(),
    assetModel.getDistricts(),
    assetModel.getTypes(),
    assetModel.getCategories()
  ]);
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  const deptMap = new Map(departments.map((d: any) => [d.id, d]));
  const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));
  const typeMap = new Map(types.map((t: any) => [t.id, t]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  // Enrich details: type_id => type, category_id => category
  details = details.map((item: any) => {
    const typeObj = typeMap.get(item.type_id);
    const categoryObj = categoryMap.get(item.category_id);
    const { type_id, category_id, ...rest } = item;
    return {
      ...rest,
      type: typeObj ? { id: typeObj.id, name: typeObj.name } : null,
      category: categoryObj ? { id: categoryObj.id, name: categoryObj.name } : null
    };
  });
  // Only enrich details with type/category mapping
  details = details.map((item: any) => {
    const typeObj = typeMap.get(item.type_id);
    const categoryObj = categoryMap.get(item.category_id);
    const { type_id, category_id, ...rest } = item;
    return {
      ...rest,
      type: typeObj ? { id: typeObj.id, name: typeObj.name } : null,
      category: categoryObj ? { id: categoryObj.id, name: categoryObj.name } : null
    };
  });
  const enriched = {
    ...request,
    total_items: details.length,
    details
  };
  res.json({ status: 'success', message: 'Purchase request retrieved successfully', data: enriched });
};

export const createPurchaseRequest = async (req: Request, res: Response) => {
  try {
    // All fields in req.body are strings (from multipart/form-data)
    const {
      request_type = '',
      backdated_purchase = 'false',
      request_reference = '',
      request_no = '',
      request_date = '',
      ramco_id = '',
      costcenter_id = '',
      department_id = '',
      po_no = '',
      po_date = '',
      supplier = '',
      do_no = '',
      do_date = '',
      inv_no = '',
      inv_date = '',
      items = '[]'
    } = req.body;

    // Handle uploaded file: move from multer temp to correct location if present
    let request_upload = undefined;
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');
      const purchaseDir = path.join(uploadBase, 'purchase');
      if (!fs.existsSync(purchaseDir)) {
        fs.mkdirSync(purchaseDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || '';
      const filename = `purchase_${Date.now()}${ext}`;
      const destPath = path.join(purchaseDir, filename);
      fs.copyFileSync(req.file.path, destPath);
      fs.unlinkSync(req.file.path);
      request_upload = filename;
    }

    // Parse booleans and numbers, and ensure date fields are null if empty
    let parent = {
      request_type,
      backdated_purchase: backdated_purchase === 'true' || backdated_purchase === true,
      request_reference,
      request_no,
      request_date: request_date && request_date !== '' ? request_date : null,
      ramco_id: ramco_id,
      costcenter_id: costcenter_id ? Number(costcenter_id) : undefined,
      department_id: department_id ? Number(department_id) : undefined,
      po_no,
      po_date: po_date && po_date !== '' ? po_date : null,
      supplier,
      do_no,
      do_date: do_date && do_date !== '' ? do_date : null,
      inv_no,
      inv_date: inv_date && inv_date !== '' ? inv_date : null,
      request_upload
    };
    // Insert first to get insertId
    const insertId = await purchaseModel.createPurchaseRequest(parent);

    // If not backdated, generate request_no if not provided
    if (!(backdated_purchase === 'true' || backdated_purchase === true)) {
      if (!request_no || request_no === '') {
        const padded = String(insertId).padStart(6, '0');
        const year = new Date().getFullYear();
        const generatedNo = `PR/${padded}/${year}`;
        // Update the request_no in DB
        await purchaseModel.updatePurchaseRequest(insertId, { request_no: generatedNo });
      }
    }

    // Parse items (should be a JSON string)
    let itemsArr: any[] = [];
    try {
      itemsArr = typeof items === 'string' ? JSON.parse(items) : Array.isArray(items) ? items : [];
    } catch (e) {
      itemsArr = [];
    }

    // Insert items (details)
    if (Array.isArray(itemsArr)) {
      for (const item of itemsArr) {
        const {
          type_id = null,
          category_id = null,
          qty = null,
          description = '',
          justification = '',
          supplier = '',
          unit_price = null,
          delivery_status = '',
          delivery_remarks = '',
          register_numbers = []
        } = item;
        // Insert detail row (use correct property names for model)
        const detailId = await purchaseModel.createPurchaseRequestDetail({
          pr_id: insertId,
          type_id: type_id ? Number(type_id) : undefined,
          category_id: category_id ? Number(category_id) : undefined,
          item_desc: description,
          quantity: qty ? Number(qty) : undefined,
          justification,
          supplier,
          unit_price: unit_price !== null && unit_price !== undefined && unit_price !== '' ? Number(unit_price) : undefined,
          delivery_status,
          delivery_remarks
        });
        // Insert register_numbers if present
        if (Array.isArray(register_numbers) && register_numbers.length > 0) {
          for (const reg of register_numbers) {
            await purchaseModel.createPurchaseRequestRegisterNumber({
              purchase_request_detail_id: detailId,
              register_number: reg
            });
          }
        }
      }
    }
    res.status(201).json({ status: 'success', message: 'Purchase request created successfully', id: insertId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
};

export const deletePurchaseRequest = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await purchaseModel.deletePurchaseRequest(id);
  await purchaseModel.deletePurchaseRequestDetails(id);
  res.json({ status: 'success', message: 'Purchase request and details deleted successfully' });
};
