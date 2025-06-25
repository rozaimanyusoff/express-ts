// src/p.purchase/purchaseController.ts
import { Request, Response } from 'express';
import * as purchaseModel from './purchaseModel';
import * as assetModel from '../p.asset/assetModel';
import { PurchaseRequest } from './purchaseModel';

export const getAllPurchaseRequests = async (req: Request, res: Response) => {
  const requests: PurchaseRequest[] = await purchaseModel.getAllPurchaseRequests();
  // Fetch all employees, departments, costcenters, districts, types, categories for mapping
  const [employeesRaw, departmentsRaw, costcentersRaw, districtsRaw, typesRaw, categoriesRaw] = await Promise.all([
    assetModel.getEmployees(),
    assetModel.getDepartments(),
    assetModel.getCostcenters(),
    assetModel.getDistricts(),
    assetModel.getTypes(),
    assetModel.getCategories()
  ]);
  // Ensure arrays
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  // Build lookup maps
  const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  const deptMap = new Map(departments.map((d: any) => [d.id, d]));
  const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));
  const typeMap = new Map(types.map((t: any) => [t.id, t]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  // Fetch all details for all requests
  const allDetails = await Promise.all(requests.map(r => purchaseModel.getPurchaseRequestDetails(r.id)));
  // Enrich each request and omit dept_id, costcenter_id, district_id, requestor
  const enriched = (Array.isArray(requests) ? requests : []).map((req: PurchaseRequest, idx: number) => {
    const requestorEmp = empMap.get(req.requestor);
    const deptObj = deptMap.get(req.dept_id);
    const costcenterObj = costcenterMap.get(req.costcenter_id);
    const districtObj = districtMap.get(req.district_id);
    let details = allDetails[idx] || [];
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
    // Omit dept_id, costcenter_id, district_id, requestor
    const { dept_id, costcenter_id, district_id, requestor, ...rest } = req;
    return {
      ...rest,
      requestor: requestorEmp && requestorEmp.ramco_id && requestorEmp.full_name
        ? { ramco_id: requestorEmp.ramco_id, name: requestorEmp.full_name }
        : req.requestor,
      department: deptObj && deptObj.id && deptObj.name ? { id: deptObj.id, name: deptObj.name } : null,
      costcenter: costcenterObj && costcenterObj.id && costcenterObj.name ? { id: costcenterObj.id, name: costcenterObj.name } : null,
      district: districtObj && districtObj.id && districtObj.name ? { id: districtObj.id, name: districtObj.name } : null,
      total_items: details.length,
      details
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
  let details = await purchaseModel.getPurchaseRequestDetails(request.id);
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
  // Omit dept_id, costcenter_id, district_id, requestor
  const { dept_id, costcenter_id, district_id, requestor, ...rest } = request;
  const requestorEmp = empMap.get(request.requestor);
  const deptObj = deptMap.get(request.dept_id);
  const costcenterObj = costcenterMap.get(request.costcenter_id);
  const districtObj = districtMap.get(request.district_id);
  const enriched = {
    ...rest,
    requestor: requestorEmp && requestorEmp.ramco_id && requestorEmp.full_name
      ? { ramco_id: requestorEmp.ramco_id, name: requestorEmp.full_name }
      : request.requestor,
    department: deptObj && deptObj.id && deptObj.name ? { id: deptObj.id, name: deptObj.name } : null,
    costcenter: costcenterObj && costcenterObj.id && costcenterObj.name ? { id: costcenterObj.id, name: costcenterObj.name } : null,
    district: districtObj && districtObj.id && districtObj.name ? { id: districtObj.id, name: districtObj.name } : null,
    total_items: details.length,
    details
  };
  res.json({ status: 'success', message: 'Purchase request retrieved successfully', data: enriched });
};

export const createPurchaseRequest = async (req: Request, res: Response) => {
  const { parent, details } = req.body;
  // parent: purchase_request fields, details: array of purchase_request_details
  const insertId = await purchaseModel.createPurchaseRequest(parent);
  if (Array.isArray(details)) {
    for (const detail of details) {
      await purchaseModel.createPurchaseRequestDetail({ ...detail, purchase_request_id: insertId });
    }
  }
  res.status(201).json({ status: 'success', message: 'Purchase request created successfully', id: insertId });
};

export const deletePurchaseRequest = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await purchaseModel.deletePurchaseRequest(id);
  await purchaseModel.deletePurchaseRequestDetails(id);
  res.json({ status: 'success', message: 'Purchase request and details deleted successfully' });
};
