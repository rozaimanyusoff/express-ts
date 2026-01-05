import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

import * as assetModel from '../p.asset/assetModel';
import * as userModel from '../p.user/userModel';
import { pool, pool2 } from '../utils/db';
import { renderPurchaseNotification } from '../utils/emailTemplates/purchaseNotification';
import { renderPurchaseRegistryCompleted } from '../utils/emailTemplates/purchaseRegistryCompleted';
import { sendMail } from '../utils/mailer';
import * as purchaseModel from './purchaseModel';

// Define procurement admins here (comma-separated RAMCO IDs)
const PROCUREMENT_ADMINS = 'mraco_id,ramco_id';

// module_directory for this module's uploads
const PURCHASE_SUBDIR = 'purchases';
import { buildStoragePath, safeMove, toDbPath, toPublicUrl } from '../utils/uploadUtil';



/* ======= PURCHASE REQUEST ITEMS ======= */
export const getPurchaseRequestItems = async (req: Request, res: Response) => {
  try {
    const { costcenter, dateField, endDate, startDate, status, supplier } = req.query;
    let purchases: any[] = [];

    // Filter by status if provided
    if (status && typeof status === 'string') {
      purchases = await purchaseModel.getPurchaseRequestItemByStatus(status);
    }
    // Filter by cost center if provided
    else if (costcenter && typeof costcenter === 'string') {
      purchases = await purchaseModel.getPurchaseRequestItemByCostCenter(costcenter);
    }
    // Filter by supplier if provided
    else if (supplier && typeof supplier === 'string') {
      purchases = await purchaseModel.getPurchaseRequestItemBySupplier(supplier);
    }
    // Filter by date range if provided
    else if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const field = (dateField as any) || 'pr_date';
      purchases = await purchaseModel.getPurchaseRequestItemByDateRange(startDate, endDate, field);
    }
    // Get all purchases
    else {
      purchases = await purchaseModel.getPurchaseRequestItems();
    }

    // Restrict by asset manager's managed types either via query ?managers=<ramco_id[,..]>
    // or (fallback) by the logged-in username (assumed to equal employee ramco_id).
    try {
      const managersParam = typeof req.query.managers === 'string' ? req.query.managers : undefined;
      const requestedRamcos = managersParam
        ? managersParam.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const managersList = await assetModel.getAssetManagers();
      const managersArr: any[] = Array.isArray(managersList) ? managersList : [];

      const buildActiveTypesFor = (ramcos: string[]) => new Set(
        managersArr
          .filter((m: any) => ramcos.some(r => String(m.ramco_id).toLowerCase() === String(r).toLowerCase()))
          .filter((m: any) => m.is_active === 1 || m.is_active === '1' || m.is_active === true || m.is_active === null || m.is_active === undefined)
          .map((m: any) => Number(m.manager_id))
          .filter((n: number) => !Number.isNaN(n))
      );

      let activeMgrTypes = new Set<number>();
      if (requestedRamcos.length > 0) {
        // Param-driven filtering has priority
        activeMgrTypes = buildActiveTypesFor(requestedRamcos);
      } else {
        // Fallback: filter by the logged-in user's username (ramco)
        const userId = (req as any).user?.id ? Number((req as any).user.id) : null;
        let loginUsername: null | string = (req as any).user?.username || null;
        if (!loginUsername && userId) {
          const user = await userModel.getUserById(userId);
          loginUsername = user?.username || null;
        }
        if (loginUsername) {
          activeMgrTypes = buildActiveTypesFor([loginUsername]);
        }
      }

      // Only apply filter if there are active types; otherwise leave result unfiltered
      if (activeMgrTypes.size > 0) {
        purchases = purchases.filter((p: any) => {
          const typeId = p?.type_id !== undefined && p?.type_id !== null ? Number(p.type_id) : undefined;
          const itemTypeStr = p?.item_type ? String(p.item_type) : (typeId !== undefined ? String(typeId) : '');
          const itemTypeId = !Number.isNaN(Number(itemTypeStr)) ? Number(itemTypeStr) : undefined;
          return (typeId !== undefined && activeMgrTypes.has(typeId)) || (itemTypeId !== undefined && activeMgrTypes.has(itemTypeId));
        });
      }
    } catch (filterErr) {
      // Non-blocking: if filtering fails, return unfiltered results
    }

    // Fetch costcenters, types, suppliers, employees and brands to enrich purchase records
    const [typesRaw, categoriesRaw, costcentersRaw, suppliersRaw, employeesRaw, brandsRaw, departmentsRaw] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCategories(),
      assetModel.getCostcenters(),
      purchaseModel.getSuppliers(),
      assetModel.getEmployees(),
      assetModel.getBrands(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([])
    ]);
    const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const typeMap = new Map(types.map((t: any) => [t.id, t]));
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
    const deptMap = new Map(departments.map((d: any) => [d.id, d]));
    const supplierMap = new Map((Array.isArray(suppliersRaw) ? suppliersRaw : []).map((s: any) => [s.id, s]));
    const employeeMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));

    // Calculate derived status for each purchase, add upload_url and resolve costcenter/type
    // Fetch related purchase requests in batch and build a map
    const requestIds = Array.from(new Set((purchases || []).map((p: any) => p.request_id).filter((v: any) => v !== undefined && v !== null).map((v: any) => Number(v))));
    const requestsArr = await Promise.all(requestIds.map(id => purchaseModel.getPurchaseRequestById(id)));
    const requestMap = new Map((requestsArr || []).filter(Boolean).map((r: any) => [r.id, r]));

    // Batch fetch registry rows for purchases to determine asset_registry status
    const purchaseIds = Array.from(new Set((purchases || []).map((p: any) => p.id).filter((v: any) => v !== undefined && v !== null).map((v: any) => Number(v))));
    const registries = await purchaseModel.getRegistriesByPurchaseIds(purchaseIds);
    const registrySet = new Set((registries || []).map(r => Number(r.purchase_id)));

    const enrichedPurchases = purchases.map((purchase: any) => {
      const reqRec = purchase.request_id && requestMap.has(Number(purchase.request_id)) ? requestMap.get(Number(purchase.request_id)) : null;
      const requestedBy = reqRec?.ramco_id ? (employeeMap.get(reqRec.ramco_id) ? { full_name: (employeeMap.get(reqRec.ramco_id))?.full_name || null, ramco_id: reqRec.ramco_id } : { full_name: null, ramco_id: reqRec.ramco_id }) : null;
      const reqCostcenter = reqRec?.costcenter_id ? (ccMap.has(reqRec.costcenter_id) ? { id: reqRec.costcenter_id, name: ccMap.get(reqRec.costcenter_id)?.name || null } : { id: reqRec.costcenter_id, name: null }) : null;
      const reqDept = reqRec?.department_id ? (deptMap.has(reqRec.department_id) ? { id: reqRec.department_id, name: deptMap.get(reqRec.department_id)?.name || null } : { id: reqRec.department_id, name: null }) : null;

      const enrichedPurchase: any = {
        brand: purchase.brand_id && brandMap.has(purchase.brand_id) ? { id: purchase.brand_id, name: brandMap.get(purchase.brand_id)?.name || null } : null,
        category: purchase.category_id && categoryMap.has(purchase.category_id) ? { id: purchase.category_id, name: categoryMap.get(purchase.category_id)?.name || null } : null,
        created_at: purchase.created_at ?? null,
        description: purchase.description || purchase.items || null,
        handover_at: purchase.handover_at ?? null,
        handover_to: purchase.handover_to ?? null,
        id: purchase.id,
        po_date: purchase.po_date ?? null,
        po_no: purchase.po_no ?? null,
        purpose: purchase.purpose ?? null,
        qty: purchase.qty,
        request: reqRec ? {
          costcenter: reqCostcenter,
          created_at: reqRec.created_at ?? null,
          department: reqDept,
          id: reqRec.id,
          pr_date: reqRec.pr_date ?? null,
          pr_no: reqRec.pr_no ?? null,
          request_type: reqRec.request_type ?? null,
          requested_by: requestedBy,
          updated_at: reqRec.updated_at ?? null,
        } : null,
        request_id: purchase.request_id ?? null,
        supplier: purchase.supplier_id && supplierMap.has(purchase.supplier_id) ? { id: purchase.supplier_id, name: supplierMap.get(purchase.supplier_id)?.name || null } : null,
        total_price: purchase.total_price !== undefined && purchase.total_price !== null ? Number(purchase.total_price).toFixed(2) : null,
        type: purchase.type_id && typeMap.has(purchase.type_id) ? { id: purchase.type_id, name: typeMap.get(purchase.type_id)?.name || null } : null,
        unit_price: purchase.unit_price !== undefined && purchase.unit_price !== null ? Number(purchase.unit_price).toFixed(2) : null,
        updated_at: purchase.updated_at ?? null,
      };

      // Asset registry status: completed if a registry entry exists for this purchase id
      const pidNum = Number(purchase.id || 0);
      enrichedPurchase.asset_registry = (pidNum > 0 && registrySet.has(pidNum)) ? 'completed' : 'incompleted';

      return enrichedPurchase;
    });

    res.json({
      data: enrichedPurchases,
      message: 'Purchases retrieved successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to retrieve purchases',
      status: 'error'
    });
  }
};

export const getPurchaseRequestItemById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const purchase: any = await purchaseModel.getPurchaseRequestItemById(id);

    if (!purchase) {
      return res.status(404).json({
        data: null,
        message: 'Purchase not found',
        status: 'error'
      });
    }

    // Fetch lookups and deliveries to enrich the single purchase response and its items
    const [typesRaw, categoriesRaw, costcentersRaw, suppliersRaw, employeesRaw, brandsRaw, departmentsRaw, deliveriesRaw] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCategories(),
      assetModel.getCostcenters(),
      purchaseModel.getSuppliers(),
      assetModel.getEmployees(),
      assetModel.getBrands(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      // load all deliveries for this request in one query to avoid N+1
      purchaseModel.getDeliveriesByRequestId(id),
    ]);
    const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const typeMap = new Map(types.map((t: any) => [t.id, t]));
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
    const deptMap = new Map(departments.map((d: any) => [d.id, d]));
    const supplierMap = new Map((Array.isArray(suppliersRaw) ? suppliersRaw : []).map((s: any) => [s.id, s]));
    const employeesArr = Array.isArray(employeesRaw) ? employeesRaw : [];
    const employeeMap = new Map(employeesArr.map((e: any) => [e.ramco_id, e]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));

    // Group deliveries by purchase_id for quick lookup
    const deliveriesArr = Array.isArray(deliveriesRaw) ? deliveriesRaw as any[] : [];
    const deliveriesMap = new Map<number, any[]>();
    for (const d of deliveriesArr) {
      const pid = Number(d.purchase_id);
      if (!deliveriesMap.has(pid)) deliveriesMap.set(pid, []);
      deliveriesMap.get(pid)!.push(d);
    }

    // Add derived status, upload_url, and resolved costcenter/type
    const enrichedPurchase = {
      brand: purchase.brand_id && brandMap.has(purchase.brand_id) ? { id: purchase.brand_id, name: brandMap.get(purchase.brand_id)?.name || null } : null,
      category: purchase.category_id && categoryMap.has(purchase.category_id) ? { id: purchase.category_id, name: categoryMap.get(purchase.category_id)?.name || null } : null,
      created_at: purchase.created_at ?? null,
      description: purchase.description || purchase.items || null,
      handover_at: purchase.handover_at ?? null,
      handover_to: purchase.handover_to ?? null,
      id: purchase.id,
      po_date: purchase.po_date ?? null,
      po_no: purchase.po_no ?? null,
      purpose: purchase.purpose ?? null,
      qty: purchase.qty,
      request: null,
      request_id: purchase.request_id ?? null,
      supplier: purchase.supplier_id && supplierMap.has(purchase.supplier_id) ? { id: purchase.supplier_id, name: supplierMap.get(purchase.supplier_id)?.name || null } : null,
      total_price: purchase.total_price !== undefined && purchase.total_price !== null ? Number(purchase.total_price).toFixed(2) : null,
      type: purchase.type_id && typeMap.has(purchase.type_id) ? { id: purchase.type_id, name: typeMap.get(purchase.type_id)?.name || null } : null,
      unit_price: purchase.unit_price !== undefined && purchase.unit_price !== null ? Number(purchase.unit_price).toFixed(2) : null,
      updated_at: purchase.updated_at ?? null,
    };

    // Attach request object for single purchase if available (with enrichment)
    if (purchase.request_id) {
      const reqRecSingle = await purchaseModel.getPurchaseRequestById(Number(purchase.request_id));
      if (reqRecSingle) {
        const requestedBySingle = reqRecSingle.ramco_id ? (employeeMap.get(reqRecSingle.ramco_id) ? { full_name: (employeeMap.get(reqRecSingle.ramco_id))?.full_name || null, ramco_id: reqRecSingle.ramco_id } : { full_name: null, ramco_id: reqRecSingle.ramco_id }) : null;
        const reqCostcenterSingle = reqRecSingle.costcenter_id ? (ccMap.has(reqRecSingle.costcenter_id) ? { id: reqRecSingle.costcenter_id, name: ccMap.get(reqRecSingle.costcenter_id)?.name || null } : { id: reqRecSingle.costcenter_id, name: null }) : null;
        const reqDeptSingle = reqRecSingle.department_id ? (deptMap.has(reqRecSingle.department_id) ? { id: reqRecSingle.department_id, name: deptMap.get(reqRecSingle.department_id)?.name || null } : { id: reqRecSingle.department_id, name: null }) : null;
        (enrichedPurchase as any).request = {
          costcenter: reqCostcenterSingle,
          created_at: reqRecSingle.created_at ?? null,
          department: reqDeptSingle,
          id: reqRecSingle.id,
          pr_date: reqRecSingle.pr_date ?? null,
          pr_no: reqRecSingle.pr_no ?? null,
          request_type: reqRecSingle.request_type ?? null,
          requested_by: requestedBySingle,
          updated_at: reqRecSingle.updated_at ?? null,
        };
      }
    }

    // Attach deliveries for this purchase item
    try {
      const deliveries = await purchaseModel.getDeliveriesByPurchaseId(purchase.id);
      (enrichedPurchase as any).deliveries = (Array.isArray(deliveries) ? deliveries : []).map((d: any) => ({
        created_at: d.created_at ?? null,
        do_date: d.do_date ?? null,
        do_no: d.do_no ?? null,
        grn_date: d.grn_date ?? null,
        grn_no: d.grn_no ?? null,
        id: d.id,
        inv_date: d.inv_date ?? null,
        inv_no: d.inv_no ?? null,
        purchase_id: d.purchase_id,
        request_id: d.request_id,
        updated_at: d.updated_at ?? null,
        upload_path: d.upload_path ?? null,
        upload_url: publicUrl(d.upload_path),
      }));
    } catch (e) {
      // non-blocking: if deliveries fail, continue without them
      (enrichedPurchase as any).deliveries = [];
    }

    res.json({
      data: enrichedPurchase,
      message: 'Purchase retrieved successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to retrieve purchase',
      status: 'error'
    });
  }
};

export const createPurchaseRequestItem = async (req: Request, res: Response) => {
  try {
    // If request_id is not provided, create a parent request record first
    let requestId: number | undefined = req.body.request_id ? Number(req.body.request_id) : undefined;
    if (!requestId) {
      const request_type = req.body.request_type ?? null;
      const pr_no = req.body.pr_no ?? null;
      const pr_date = req.body.pr_date ?? null;
      const ramco_id = req.body.ramco_id ?? null;
      const costcenter_id = req.body.costcenter_id !== undefined ? Number(req.body.costcenter_id) : undefined;

      if (!request_type || !pr_date || !ramco_id || !costcenter_id) {
        return res.status(400).json({
          data: null,
          message: 'Missing required request fields: request_type, pr_date, ramco_id, costcenter_id',
          status: 'error',
        });
      }
      try {
        requestId = await purchaseModel.createPurchaseRequest({
          costcenter_id,
          // department_id is not present in payload; leave default/null at DB level if column exists
          // Type definition requires department_id, but model createPurchaseRequest signature does too.
          // To avoid breaking, attempt to infer department_id = 0 if not applicable.
          department_id: (undefined as unknown as number),
          pr_date,
          pr_no,
          ramco_id,
          request_type,
        } as any);
      } catch (e) {
        return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create purchase request', status: 'error' });
      }
    }

    const purchaseData: any = {
      brand_id: req.body.brand_id !== undefined ? Number(req.body.brand_id) : undefined,
      category_id: req.body.category_id ? Number(req.body.category_id) : undefined,
      costcenter: req.body.costcenter ?? null,
      costcenter_id: req.body.costcenter_id ? Number(req.body.costcenter_id) : undefined,
      description: req.body.description || null,
      handover_at: req.body.handover_at ?? null,
      handover_to: req.body.handover_to ?? null,
      item_type: req.body.item_type ?? undefined,
      po_date: req.body.po_date ?? null,
      po_no: req.body.po_no ?? null,
      pr_date: req.body.pr_date ?? null,
      pr_no: req.body.pr_no ?? null,
      purpose: req.body.purpose || null,
      qty: req.body.qty !== undefined ? Number(req.body.qty) : 0,
      ramco_id: req.body.ramco_id ?? null,
      request_id: requestId,
      request_type: req.body.request_type ?? null,
      supplier_id: req.body.supplier_id ? Number(req.body.supplier_id) : undefined,
      total_price: req.body.total_price !== undefined ? Number(req.body.total_price) : undefined,
      type_id: req.body.type_id ? Number(req.body.type_id) : undefined,
      unit_price: req.body.unit_price !== undefined ? Number(req.body.unit_price) : 0,
      upload_path: req.body.upload_path ?? null,
    };

    // If a file was uploaded by multer, we'll rename it after insert to include the module id

    // Auto-calculate total_price if not provided
    if (!purchaseData.total_price && purchaseData.qty && purchaseData.unit_price) {
      purchaseData.total_price = purchaseData.qty * purchaseData.unit_price;
    }

    // Insert first to obtain ID (two-step upload flow)
    const insertId = await purchaseModel.createPurchaseRequestItem(purchaseData);

    // If deliveries[] present in payload, create delivery rows linked to this item and request
    try {
      const deliveries = Array.isArray(req.body.deliveries) ? req.body.deliveries : [];
      if (deliveries.length > 0 && requestId) {
        const filesArr: any[] = Array.isArray((req as any).files) ? (req as any).files : [];
        for (let i = 0; i < deliveries.length; i++) {
          const d = deliveries[i];
          const payload = {
            do_date: d.do_date ?? null,
            do_no: d.do_no ?? null,
            grn_date: d.grn_date ?? null,
            grn_no: d.grn_no ?? null,
            inv_date: d.inv_date ?? null,
            inv_no: d.inv_no ?? null,
            purchase_id: insertId,
            request_id: requestId,
            upload_path: d.upload_path ?? null,
          } as any;
          const deliveryId = await purchaseModel.createDelivery(payload);
          // If a file uploaded for this delivery index, rename and update
          const fileForThis = filesArr.find((f: any) => f && f.fieldname === `deliveries[${i}][upload_path]`);
          if (fileForThis?.path) {
            try {
              const tempPath = fileForThis.path as string;
              const originalName: string = fileForThis.originalname || path.basename(tempPath);
              const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
              const filename = `delivery-${deliveryId}-${Date.now()}${ext}`;
              const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
              await safeMove(tempPath, destPath);
              await purchaseModel.updateDelivery(deliveryId, { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
            } catch (fileErr) {
              // non-blocking
            }
          }
        }
      }
    } catch (e) {
      // Non-blocking: if delivery creation fails, continue
      console.error('createPurchase: deliveries insert error', e);
    }

    // If a file was uploaded, rename and update stored path to include module id
    {
      const filesArr: any[] = Array.isArray((req as any).files) ? (req as any).files : [];
      const singleFile = (req as any).file?.path ? (req as any).file : undefined;
      const itemUpload = singleFile || filesArr.find((f: any) => f && f.fieldname === 'upload_path');
      if (itemUpload?.path) {
        const tempPath = itemUpload.path as string;
        const originalName: string = itemUpload.originalname || path.basename(tempPath);
        const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
        const filename = `purchase-${insertId}-${Date.now()}${ext}`;
        const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
        const destDir = path.dirname(destPath);
        await fsPromises.mkdir(destDir, { recursive: true }).catch(() => { });
        await safeMove(tempPath, destPath);
        await purchaseModel.updatePurchaseRequestItem(insertId, { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
      }
    }

    // After creating the purchase, notify relevant asset managers by manager_id match
    try {
      // Manager match rule: item_type equals assets.manager_id (fallback to type_id if item_type not numeric)
      const managerId = (() => {
        const t = purchaseData.item_type;
        const numeric = t !== undefined && t !== null && String(t).trim() !== '' ? Number(t) : undefined;
        if (numeric !== undefined && !Number.isNaN(numeric)) return numeric;
        return purchaseData.type_id !== undefined ? Number(purchaseData.type_id) : undefined;
      })();

      if (managerId !== undefined && !Number.isNaN(managerId)) {
        const [managersRaw, employeesRaw, costcentersRaw, brandsRaw] = await Promise.all([
          assetModel.getAssetManagers(),
          assetModel.getEmployees(),
          assetModel.getCostcenters(),
          assetModel.getBrands(),
        ]);

        const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
        const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
        const brands = Array.isArray(brandsRaw) ? brandsRaw as any[] : [];
        const typesRaw = await assetModel.getTypes();
        const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
        const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
        const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
        const brandMap = new Map(brands.map((b: any) => [b.id, b]));

        // Filter managers by manager_id and active flag
        const targetManagers = (Array.isArray(managersRaw) ? managersRaw as any[] : [])
          .filter((m: any) => Number(m.manager_id) === Number(managerId))
          .filter((m: any) => m.is_active === 1 || m.is_active === '1' || m.is_active === true);

        // Resolve email recipients from employees by ramco_id
        const recipients = targetManagers
          .map((m: any) => empMap.get(m.ramco_id))
          .filter(Boolean)
          .map((e: any) => ({ email: e.email || null, name: e.full_name || e.name || null }))
          .filter((x: any) => x.email);

        if (recipients.length > 0) {
          const brandName = purchaseData.brand || (purchaseData.brand_id && brandMap.get(purchaseData.brand_id)?.name) || null;
          const costcenterName = purchaseData.costcenter || (purchaseData.costcenter_id && ccMap.get(purchaseData.costcenter_id)?.name) || null;
          const subject = `Purchase Created — PR ${purchaseData.pr_no || insertId} (Handover Preparation Required)`;

          for (const r of recipients) {
            const html = renderPurchaseNotification({
              brand: brandName,
              costcenterName: costcenterName,
              items: purchaseData.items || null,
              itemType: purchaseData.item_type ? String(purchaseData.item_type) : (purchaseData.type_id ? String(purchaseData.type_id) : null),
              prDate: purchaseData.pr_date || null,
              prNo: purchaseData.pr_no || String(insertId),
              recipientName: r.name,
              requestType: purchaseData.request_type || null,
            });
            try {
              await sendMail(r.email, subject, html);
            } catch (mailErr) {
              // Non-blocking: log and continue
              console.error('createPurchase: mail send error to', r.email, mailErr);
            }
          }
        }
      }
    } catch (notifyErr) {
      // Non-blocking: log and continue
      console.error('createPurchase: notification error', notifyErr);
    }

    res.status(201).json({
      data: { id: insertId, request_id: requestId },
      message: 'Purchase created successfully',
      status: 'success'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        data: null,
        message: error.message,
        status: 'error'
      });
    } else {
      res.status(500).json({
        data: null,
        message: error instanceof Error ? error.message : 'Failed to create purchase',
        status: 'error'
      });
    }
  }
};

export const resendPurchaseNotification = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Fetch purchase details
    const purchase = await purchaseModel.getPurchaseRequestItemById(id);
    if (!purchase) {
      return res.status(404).json({
        data: null,
        message: 'Purchase not found',
        status: 'error'
      });
    }

    // Fetch the parent request to get pr_date, pr_no, request_type, brand_id
    let purchaseRequest = null;
    if (purchase.request_id) {
      purchaseRequest = await purchaseModel.getPurchaseRequestById(Number(purchase.request_id));
    }

    // Derive managerId from item_type (numeric) or type_id
    const managerId = (() => {
      const t = purchase.item_type;
      const numeric = t !== undefined && t !== null && String(t).trim() !== '' ? Number(t) : undefined;
      if (numeric !== undefined && !Number.isNaN(numeric)) return numeric;
      return purchase.type_id !== undefined ? Number(purchase.type_id) : undefined;
    })();

    if (!managerId || Number.isNaN(managerId)) {
      return res.status(400).json({
        data: null,
        message: 'Cannot determine manager for this purchase (missing item_type or type_id)',
        status: 'error'
      });
    }

    // Fetch required lookup data
    const [managersRaw, employeesRaw, costcentersRaw, brandsRaw] = await Promise.all([
      assetModel.getAssetManagers(),
      assetModel.getEmployees(),
      assetModel.getCostcenters(),
      assetModel.getBrands(),
    ]);

    const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const brands = Array.isArray(brandsRaw) ? brandsRaw as any[] : [];
    const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const brandMap = new Map(brands.map((b: any) => [b.id, b]));

    // Filter managers by manager_id and active flag
    const targetManagers = (Array.isArray(managersRaw) ? managersRaw as any[] : [])
      .filter((m: any) => Number(m.manager_id) === Number(managerId))
      .filter((m: any) => m.is_active === 1 || m.is_active === '1' || m.is_active === true);

    // Resolve email recipients from employees by ramco_id
    const recipients = targetManagers
      .map((m: any) => empMap.get(m.ramco_id))
      .filter(Boolean)
      .map((e: any) => ({ email: e.email || null, name: e.full_name || e.name || null }))
      .filter((x: any) => x.email);

    if (recipients.length === 0) {
      return res.status(400).json({
        data: null,
        message: 'No active managers found for this purchase type',
        status: 'error'
      });
    }

    // Send notification emails
    const prDate = purchaseRequest?.pr_date || null;
    const prNo = purchaseRequest?.pr_no || String(id);
    const requestType = purchaseRequest?.request_type || null;
    const costcenterName = purchase.costcenter || null;
    const subject = `Purchase Notification Resend — PR ${prNo} (Handover Preparation Required)`;

    const successfulRecipients: any[] = [];
    const failedRecipients: any[] = [];

    for (const r of recipients) {
      try {
        const html = renderPurchaseNotification({
          brand: null,
          costcenterName: costcenterName,
          items: purchase.description || null,
          itemType: purchase.item_type ? String(purchase.item_type) : (purchase.type_id ? String(purchase.type_id) : null),
          prDate: prDate,
          prNo: prNo,
          recipientName: r.name,
          requestType: requestType,
        });
        await sendMail(r.email, subject, html);
        successfulRecipients.push({ email: r.email, name: r.name });
      } catch (mailErr) {
        console.error('resendNotification: mail send error to', r.email, mailErr);
        failedRecipients.push({ email: r.email, name: r.name, error: mailErr instanceof Error ? mailErr.message : String(mailErr) });
      }
    }

    res.json({
      data: {
        purchase_id: id,
        successful_recipients: successfulRecipients,
        failed_recipients: failedRecipients,
        total_recipients: recipients.length,
      },
      message: `Notification resent to ${successfulRecipients.length}/${recipients.length} recipient(s)`,
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to resend notification',
      status: 'error'
    });
  }
};

export const updatePurchaseRequestItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    // Build update data from request body, coercing types, but exclude 'deliveries'
    const updateData: any = {};
    const numFields = ['costcenter_id', 'type_id', 'supplier_id', 'brand_id', 'qty', 'unit_price', 'total_price'];
    for (const key in req.body) {
      if (Object.prototype.hasOwnProperty.call(req.body, key) && key !== 'deliveries') {
        if (numFields.includes(key)) {
          updateData[key] = req.body[key] !== undefined && req.body[key] !== null && req.body[key] !== '' ? Number(req.body[key]) : undefined;
        } else {
          updateData[key] = req.body[key];
        }
      }
    }

    // If a file was uploaded, perform move/rename into canonical storage and update DB
    {
      const filesArr: any[] = Array.isArray((req as any).files) ? (req as any).files : [];
      const singleFile = (req as any).file?.path ? (req as any).file : undefined;
      const itemUpload = singleFile || filesArr.find((f: any) => f && f.fieldname === 'upload_path');
      if (itemUpload?.path) {
        const tempPath = itemUpload.path as string;
        const originalName: string = itemUpload.originalname || path.basename(tempPath);
        const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
        const filename = `purchase-${id}-${Date.now()}${ext}`;
        // Attempt to remove previous file if existed
        try {
          const existing = await purchaseModel.getPurchaseRequestItemById(id);
          if (existing?.upload_path) {
            const prevFilename = path.basename(existing.upload_path);
            const base = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
            const prevFull = path.join(base, PURCHASE_SUBDIR, prevFilename);
            await fsPromises.unlink(prevFull).catch(() => { });
          }
        } catch {
          // ignore errors
        }
        const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
        await safeMove(tempPath, destPath);
        updateData.upload_path = toDbPath(PURCHASE_SUBDIR, filename);
      }
    }

    // Auto-calculate total_price if qty or unit_price is updated
    if ((updateData.qty !== undefined || updateData.unit_price !== undefined) && updateData.total_price === undefined) {
      const existingPurchase = await purchaseModel.getPurchaseRequestItemById(id);
      if (existingPurchase) {
        const qty = updateData.qty !== undefined ? updateData.qty : existingPurchase.qty;
        const unit_price = updateData.unit_price !== undefined ? updateData.unit_price : existingPurchase.unit_price;
        updateData.total_price = qty * unit_price;
      }
    }


    // Update purchaseRequestTable if relevant fields are present
    const purchaseItem = await purchaseModel.getPurchaseRequestItemById(id);
    const requestId = purchaseItem?.request_id ? Number(purchaseItem.request_id) : (req.body.request_id ? Number(req.body.request_id) : undefined);
    if (requestId) {
      // List of fields belonging to purchaseRequestTable
      const prFields = [
        'request_type',
        'pr_date',
        'pr_no',
        'ramco_id',
        'costcenter_id',
        'type_id',
        'category_id',
        'description',
        'qty',
      ];
      const prUpdate: any = {};
      for (const key of prFields) {
        if (req.body[key] !== undefined) {
          // Coerce numeric fields
          if ([
            'category_id',
            'costcenter_id',
            'qty',
            'type_id'
          ].includes(key)) {
            prUpdate[key] = req.body[key] !== null && req.body[key] !== '' ? Number(req.body[key]) : undefined;
          } else {
            prUpdate[key] = req.body[key];
          }
        }
      }
      if (Object.keys(prUpdate).length > 0) {
        await purchaseModel.updatePurchaseRequest(requestId, prUpdate);
      }
    }

    await purchaseModel.updatePurchaseRequestItem(id, updateData);

    // If deliveries[] present, upsert and handle per-delivery file uploads
    try {
      const deliveries = Array.isArray(req.body.deliveries) ? req.body.deliveries : [];
      if (deliveries.length > 0) {
        const filesArr: any[] = Array.isArray((req as any).files) ? (req as any).files : [];
        // Get purchase to fetch its request_id
        const existingPurchase = await purchaseModel.getPurchaseRequestItemById(id);
        const reqId = existingPurchase?.request_id ? Number(existingPurchase.request_id) : (req.body.request_id ? Number(req.body.request_id) : undefined);

        // Fetch existing deliveries for this purchase to avoid duplicates
        const existingDeliveries = await purchaseModel.getDeliveriesByPurchaseId(id);

        // Use qty to determine delivery strategy
        const purchaseQty = updateData.qty !== undefined ? Number(updateData.qty) :
          (existingPurchase?.qty !== undefined ? Number(existingPurchase.qty) : 1);

        if (purchaseQty === 1) {
          // For qty = 1, only allow ONE delivery record - update existing or create single new one
          const d = deliveries[0]; // Only process first delivery for qty=1
          const payload = {
            do_date: d.do_date ?? null,
            do_no: d.do_no ?? null,
            grn_date: d.grn_date ?? null,
            grn_no: d.grn_no ?? null,
            inv_date: d.inv_date ?? null,
            inv_no: d.inv_no ?? null,
            purchase_id: id,
            request_id: reqId,
            upload_path: d.upload_path ?? null,
          } as any;

          const fileForThis = filesArr.find((f: any) => f && f.fieldname === `deliveries[0][upload_path]`);

          if (existingDeliveries.length > 0) {
            // Update the first (and should be only) existing delivery
            const existingDelivery = existingDeliveries[0];
            await purchaseModel.updateDelivery(Number(existingDelivery.id), payload);

            if (fileForThis?.path) {
              try {
                const tempPath = fileForThis.path as string;
                const originalName: string = fileForThis.originalname || path.basename(tempPath);
                const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
                const filename = `delivery-${Number(existingDelivery.id)}-${Date.now()}${ext}`;
                const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
                await safeMove(tempPath, destPath);
                await purchaseModel.updateDelivery(Number(existingDelivery.id), { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
              } catch {
                // non-blocking
              }
            }

            // Delete any extra deliveries beyond the first one for qty=1
            for (let i = 1; i < existingDeliveries.length; i++) {
              try {
                await purchaseModel.deleteDelivery(Number(existingDeliveries[i].id));
              } catch {
                // non-blocking - continue even if delete fails
              }
            }
          } else if (reqId) {
            // Create single new delivery for qty=1
            const newId = await purchaseModel.createDelivery(payload);
            if (fileForThis?.path) {
              try {
                const tempPath = fileForThis.path as string;
                const originalName: string = fileForThis.originalname || path.basename(tempPath);
                const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
                const filename = `delivery-${newId}-${Date.now()}${ext}`;
                const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
                await safeMove(tempPath, destPath);
                await purchaseModel.updateDelivery(newId, { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
              } catch {
                // non-blocking
              }
            }
          }
        } else {
          // For qty > 1, use the original logic but simplified matching
          // Build a map of existing deliveries by purchase_id for simpler matching
          const existingDeliveryMap = new Map();

          for (let idx = 0; idx < existingDeliveries.length; idx++) {
            const existing = existingDeliveries[idx];
            existingDeliveryMap.set(`INDEX:${idx}`, existing);
            if (existing.id) {
              existingDeliveryMap.set(`ID:${existing.id}`, existing);
            }
          }

          for (let i = 0; i < Math.min(deliveries.length, purchaseQty); i++) {
            const d = deliveries[i];
            const payload = {
              do_date: d.do_date ?? null,
              do_no: d.do_no ?? null,
              grn_date: d.grn_date ?? null,
              grn_no: d.grn_no ?? null,
              inv_date: d.inv_date ?? null,
              inv_no: d.inv_no ?? null,
              purchase_id: id,
              request_id: reqId,
              upload_path: d.upload_path ?? null,
            } as any;

            const fileForThis = filesArr.find((f: any) => f && f.fieldname === `deliveries[${i}][upload_path]`);

            // Try to find existing delivery to update
            let existingDelivery = null;

            // First, try to match by ID if provided
            if (d.id) {
              existingDelivery = existingDeliveryMap.get(`ID:${d.id}`);
            }

            // Fallback: match by index position for multi-qty items
            if (!existingDelivery) {
              existingDelivery = existingDeliveryMap.get(`INDEX:${i}`);
            }

            if (existingDelivery) {
              // Update existing delivery
              await purchaseModel.updateDelivery(Number(existingDelivery.id), payload);
              if (fileForThis?.path) {
                try {
                  const tempPath = fileForThis.path as string;
                  const originalName: string = fileForThis.originalname || path.basename(tempPath);
                  const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
                  const filename = `delivery-${Number(existingDelivery.id)}-${Date.now()}${ext}`;
                  const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
                  await safeMove(tempPath, destPath);
                  await purchaseModel.updateDelivery(Number(existingDelivery.id), { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
                } catch {
                  // non-blocking
                }
              }
            } else if (reqId && existingDeliveries.length < purchaseQty) {
              // Create new delivery only if we haven't reached the qty limit
              const newId = await purchaseModel.createDelivery(payload);
              if (fileForThis?.path) {
                try {
                  const tempPath = fileForThis.path as string;
                  const originalName: string = fileForThis.originalname || path.basename(tempPath);
                  const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
                  const filename = `delivery-${newId}-${Date.now()}${ext}`;
                  const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
                  await safeMove(tempPath, destPath);
                  await purchaseModel.updateDelivery(newId, { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
                } catch {
                  // non-blocking
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Non-blocking: continue even if deliveries update fails
      console.error('updatePurchase: deliveries upsert error', e);
    }

    res.json({
      data: null,
      message: 'Purchase updated successfully',
      status: 'success'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        data: null,
        message: error.message,
        status: 'error'
      });
    } else {
      res.status(500).json({
        data: null,
        message: error instanceof Error ? error.message : 'Failed to update purchase',
        status: 'error'
      });
    }
  }
};

export const deletePurchaseRequestItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deletePurchaseRequestItem(id);

    res.json({
      data: null,
      message: 'Purchase deleted successfully',
      status: 'success'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Purchase record not found') {
      res.status(404).json({
        data: null,
        message: error.message,
        status: 'error'
      });
    } else {
      res.status(500).json({
        data: null,
        message: error instanceof Error ? error.message : 'Failed to delete purchase',
        status: 'error'
      });
    }
  }
};

export const getPurchaseRequestItemSummary = async (req: Request, res: Response) => {
  try {
    const { endDate, startDate } = req.query;

    const summary = await purchaseModel.getPurchaseRequestItemSummary(
      startDate as string,
      endDate as string
    );

    res.json({
      data: summary,
      message: 'Purchase summary retrieved successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to retrieve purchase summary',
      status: 'error'
    });
  }
};


// HELPER FUNCTION: Calculate purchase status based on process completion
const calculatePurchaseRequestItemStatus = (purchase: any): string => {
  // Completed only when a handover has been made (non-empty handover_to and valid handover_at)
  const handoverTo = (purchase).handover_to;
  const handoverAt = (purchase).handover_at;
  const hasHandoverTo = handoverTo !== undefined && handoverTo !== null && String(handoverTo).trim() !== '';
  const handoverAtInvalid = !handoverAt || String(handoverAt) === '0000-00-00' || String(handoverAt) === '0000-00-00 00:00:00';
  if (hasHandoverTo && !handoverAtInvalid) return 'completed';

  // If GRN exists but handover hasn't happened yet, consider it delivered
  if (purchase.grn_no) return 'delivered';

  // Invoiced after INV present
  if (purchase.inv_no) return 'invoiced';

  // Delivered if DO present (fallback)
  if (purchase.do_no) return 'delivered';

  if (purchase.po_no) return 'ordered';
  if (purchase.pr_no) return 'requested';
  return 'draft';
};

// Helpers: publicUrl and normalizeStoredPath (same behavior as billingController helpers)
function publicUrl(rawPath?: null | string): null | string {
  return toPublicUrl(rawPath || null);
}







/* ======= PURCHASE ASSET REGISTRY -- Asset Manager Scopes ======= */
export const createPurchaseAssetsRegistry = async (req: Request, res: Response) => {
  try {
    const { assets, created_by, purchase_id, request_id, updated_by } = req.body || {}; //
    const purchaseId = Number(purchase_id);
    if (!purchaseId || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ data: null, message: 'Invalid payload: purchase_id and non-empty assets[] are required', status: 'error' });
    }

    // Check for duplicate register_numbers in assets.assetdata
    const duplicateRegisterNumbers: string[] = [];
    for (const asset of assets) {
      if (asset.register_number) {
        const dupCheck = await purchaseModel.checkRegisterNumberExists(asset.register_number);
        if (dupCheck.exists) {
          duplicateRegisterNumbers.push(asset.register_number);
        }
      }
    }

    if (duplicateRegisterNumbers.length > 0) {
      return res.status(409).json({
        data: { duplicate_register_numbers: duplicateRegisterNumbers },
        message: `Register numbers already exist in assets: ${duplicateRegisterNumbers.join(', ')}`,
        status: 'error'
      });
    }

    const ids = await purchaseModel.createPurchaseAssetRegistryBatch(purchaseId, request_id, assets, created_by || null);

    // If the registry batch did not create/return ids for all provided assets, abort further processing.
    // This prevents creating master assets, updating handover, or sending notifications when registry insertion failed.
    if (!Array.isArray(ids) || ids.length !== assets.length) {
      const msg = `Failed to register all assets: expected=${assets.length} registered=${Array.isArray(ids) ? ids.length : 0}`;
      console.error('createPurchaseAssetsRegistry:', msg);
      return res.status(500).json({ data: { expected: assets.length, registered: Array.isArray(ids) ? ids.length : 0 }, message: msg, status: 'error' });
    }

    // Also create master asset records in assets.assetdata
    try {
      await purchaseModel.createMasterAssetsFromRegistryBatch(purchaseId, assets);
    } catch (e) {
      console.error('registerPurchaseAssetsBatch: create master assets failed', e);
      // If creating master assets failed, we should not proceed to mark handover or send notifications.
      return res.status(500).json({ data: null, message: 'Failed to create master asset records', status: 'error' });
    }

    // Sync model_id from purchase_asset_registry to assets.assetdata for all created registry entries
    try {
      const registryEntries = await purchaseModel.getPurchaseAssetRegistryByPrId(purchaseId);
      for (const entry of registryEntries) {
        if (entry.model_id) {
          await purchaseModel.updateAssetDataModelId(purchaseId, entry.model_id);
        }
      }
    } catch (e) {
      console.error('createPurchaseAssetsRegistry: sync model_id to assetdata failed', e);
      // Non-blocking error: continue with notification
    }

    // Update purchase handover fields
    try {
      const who = (typeof updated_by === 'string' && updated_by) ? updated_by : (typeof created_by === 'string' ? created_by : null);
      await purchaseModel.updatePurchaseRequestItemHandover(purchaseId, who ?? null);
    } catch (e) {
      console.error('registerPurchaseAssetsBatch: handover update failed', e);
      // If handover update failed, do not continue to notifications because state may be inconsistent.
      return res.status(500).json({ data: null, message: 'Failed to update handover state', status: 'error' });
    }

    // Notify procurement admins and asset managers
    try {
      // Load purchase and lookups
      const purchase: any = await purchaseModel.getPurchaseRequestItemById(purchaseId);
      if (purchase) {
        const [employeesRaw, costcentersRaw, brandsRaw, managersRaw, typesRaw] = await Promise.all([
          assetModel.getEmployees(),
          assetModel.getCostcenters(),
          assetModel.getBrands(),
          assetModel.getAssetManagers(),
          assetModel.getTypes(),
        ]);
        const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
        const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
        const brands = Array.isArray(brandsRaw) ? brandsRaw as any[] : [];
        const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
        const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
        const brandMap = new Map(brands.map((b: any) => [b.id, b]));
        const types = Array.isArray(typesRaw) ? (typesRaw as any[]) : [];

        const brandName = purchase.brand || (purchase.brand_id ? brandMap.get(purchase.brand_id)?.name : null) || null;
        const costcenterName = purchase.costcenter || (purchase.costcenter_id ? ccMap.get(purchase.costcenter_id)?.name : null) || null;
        const itemTypeStr = purchase.item_type ? String(purchase.item_type) : (purchase.type_id ? String(purchase.type_id) : null);
        const typeMap = new Map(types.map((t: any) => [Number(t.id), t]));
        const itemTypeId = purchase.type_id !== undefined && purchase.type_id !== null
          ? Number(purchase.type_id)
          : (itemTypeStr && !isNaN(Number(itemTypeStr)) ? Number(itemTypeStr) : undefined);
        const itemTypeName = (itemTypeId !== undefined && typeMap.has(itemTypeId))
          ? (typeMap.get(itemTypeId))?.name || String(itemTypeId)
          : (isNaN(Number(itemTypeStr || '')) ? (itemTypeStr || null) : (itemTypeStr ? String(itemTypeStr) : null));
        const prDateFormatted = purchase.pr_date ? dayjs(purchase.pr_date).format('D/M/YYYY') : null;

        // Procurement admins: configure via env PROC_ADMIN_RAMCOS (comma-separated ramco_ids) or leave empty
        const PROCUREMENT_ADMIN_RAMCOS: string[] = (PROCUREMENT_ADMINS || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const procurementRecipients = PROCUREMENT_ADMIN_RAMCOS
          .map((rid: string) => empMap.get(rid))
          .filter(Boolean)
          .map((e: any) => ({ email: e.email || null, name: e.full_name || e.name || null }))
          .filter((x: any) => x.email);
        const subjectAdmin = `Assets Registered — PR ${purchase.pr_no || purchaseId}`;
        for (const r of procurementRecipients) {
          const html = renderPurchaseRegistryCompleted({
            audience: 'procurement',
            brand: brandName,
            costcenterName,
            itemCount: Array.isArray(assets) ? assets.length : null,
            items: purchase.items || null,
            itemType: itemTypeName,
            prDate: prDateFormatted,
            prNo: purchase.pr_no || String(purchaseId),
            recipientName: r.name,
          });
          try { await sendMail(r.email, subjectAdmin, html); } catch { }
        }

        // Asset managers by manager_id match
        const managerId = itemTypeStr ? Number(itemTypeStr) : undefined;
        if (managerId !== undefined && !Number.isNaN(managerId)) {
          const targetManagers = (Array.isArray(managersRaw) ? managersRaw as any[] : [])
            .filter((m: any) => Number(m.manager_id) === Number(managerId))
            .filter((m: any) => m.is_active === 1 || m.is_active === '1' || m.is_active === true);
          const managerRecipients = targetManagers
            .map((m: any) => empMap.get(m.ramco_id))
            .filter(Boolean)
            .map((e: any) => ({ email: e.email || null, name: e.full_name || e.name || null }))
            .filter((x: any) => x.email);
          const subjectMgr = `Registration Successful — PR ${purchase.pr_no || purchaseId}`;
          for (const r of managerRecipients) {
            const html = renderPurchaseRegistryCompleted({
              audience: 'manager',
              brand: brandName,
              costcenterName,
              itemCount: Array.isArray(assets) ? assets.length : null,
              items: purchase.items || null,
              itemType: itemTypeName,
              prDate: prDateFormatted,
              prNo: purchase.pr_no || String(purchaseId),
              recipientName: r.name,
            });
            try { await sendMail(r.email, subjectMgr, html); } catch { }
          }
        }
      }
    } catch (notifyErr) {
      console.error('registerPurchaseAssetsBatch: notification error', notifyErr);
    }

    return res.status(201).json({ data: { insertIds: ids, pr_id: purchaseId }, message: `Registered ${ids.length} assets for PR ${purchaseId}`, status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to register assets', status: 'error' });
  }
};

// PURCHASE ASSET REGISTRY — list all
export const getPurchaseAssetRegistry = async (req: Request, res: Response) => {
  try {
    // Fetch all registry rows
    const rows = await purchaseModel.getPurchaseAssetRegistry();

    // Optional filter by ?type=<type_id>
    const typeParamRaw = req.query.type;
    let data = Array.isArray(rows) ? rows : [];
    if (typeof typeParamRaw === 'string' && typeParamRaw.trim() !== '') {
      const typeId = Number(typeParamRaw);
      if (!Number.isNaN(typeId)) {
        data = data.filter((r: any) => Number(r.type_id) === typeId);
      }
    }

    return res.json({ data, message: 'Purchase asset registry retrieved', status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to retrieve registry', status: 'error' });
  }
}

// PURCHASE ASSET REGISTRY — list by PR id
export const getPurchaseAssetRegistryByPrId = async (req: Request, res: Response) => {
  try {
    const purchaseId = Number((req.query.pr as string) || (req.params as any).pr);
    if (!purchaseId) {
      return res.status(400).json({ data: null, message: 'pr_id is required', status: 'error' });
    }
    const rows = await purchaseModel.getPurchaseAssetRegistryByPrId(purchaseId);
    return res.json({ data: rows, message: 'Purchase asset registry retrieved', status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to retrieve registry', status: 'error' });
  }
};

// PURCHASE ASSET REGISTRY — update
export const updatePurchaseAssetsRegistry = async (req: Request, res: Response) => {
  try {
    const registryId = Number(req.params.id);
    if (!registryId) {
      return res.status(400).json({ data: null, message: 'Registry ID is required', status: 'error' });
    }

    const { brand_id, category_id, classification, costcenter_id, description, item_condition, location_id, model, model_id, register_number, type_id, warranty_period } = req.body || {};

    // Get current registry entry to track old values for audit
    const registry = await purchaseModel.getPurchaseAssetRegistry();
    const registryEntry = (registry || []).find((r: any) => r.id === registryId);
    if (!registryEntry) {
      return res.status(404).json({ data: null, message: 'Registry entry not found', status: 'error' });
    }

    const updateData: any = {};
    const auditChanges: Array<{ fieldName: string; oldValue: any; newValue: any }> = [];

    // Track all changes for audit trail
    if (brand_id !== undefined) {
      updateData.brand_id = brand_id ? Number(brand_id) : null;
      auditChanges.push({ fieldName: 'brand_id', oldValue: registryEntry.brand_id, newValue: updateData.brand_id });
    }
    if (category_id !== undefined) {
      updateData.category_id = category_id ? Number(category_id) : null;
      auditChanges.push({ fieldName: 'category_id', oldValue: registryEntry.category_id, newValue: updateData.category_id });
    }
    if (classification !== undefined) {
      updateData.classification = classification;
      auditChanges.push({ fieldName: 'classification', oldValue: registryEntry.classification, newValue: classification });
    }
    if (costcenter_id !== undefined) {
      updateData.costcenter_id = costcenter_id ? Number(costcenter_id) : null;
      auditChanges.push({ fieldName: 'costcenter_id', oldValue: registryEntry.costcenter_id, newValue: updateData.costcenter_id });
    }
    if (description !== undefined) {
      updateData.description = description;
      auditChanges.push({ fieldName: 'description', oldValue: registryEntry.description, newValue: description });
    }
    if (item_condition !== undefined) {
      updateData.item_condition = item_condition;
      auditChanges.push({ fieldName: 'item_condition', oldValue: registryEntry.item_condition, newValue: item_condition });
    }
    if (location_id !== undefined) {
      updateData.location_id = location_id ? Number(location_id) : null;
      auditChanges.push({ fieldName: 'location_id', oldValue: registryEntry.location_id, newValue: updateData.location_id });
    }
    if (model !== undefined) {
      updateData.model = model;
      auditChanges.push({ fieldName: 'model', oldValue: registryEntry.model, newValue: model });
    }
    if (register_number !== undefined) {
      updateData.register_number = register_number;
      auditChanges.push({ fieldName: 'register_number', oldValue: registryEntry.register_number, newValue: register_number });
    }
    if (type_id !== undefined) {
      updateData.type_id = type_id ? Number(type_id) : null;
      auditChanges.push({ fieldName: 'type_id', oldValue: registryEntry.type_id, newValue: updateData.type_id });
    }
    if (warranty_period !== undefined) {
      updateData.warranty_period = warranty_period ? Number(warranty_period) : null;
      auditChanges.push({ fieldName: 'warranty_period', oldValue: registryEntry.warranty_period, newValue: updateData.warranty_period });
    }

    // Handle model_id: direct value or lookup from model name
    let resolvedModelId: number | null = null;
    if (model_id !== undefined) {
      // Direct model_id provided from frontend
      resolvedModelId = model_id ? Number(model_id) : null;
      updateData.model_id = resolvedModelId;
      auditChanges.push({ fieldName: 'model_id', oldValue: registryEntry.model_id, newValue: resolvedModelId });
    } else if (model !== undefined && model && model.trim() !== '') {
      // Lookup model_id from model name using model layer
      resolvedModelId = await purchaseModel.getModelIdByName(model);
      updateData.model_id = resolvedModelId;
      auditChanges.push({ fieldName: 'model_id', oldValue: registryEntry.model_id, newValue: resolvedModelId });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ data: null, message: 'No fields to update', status: 'error' });
    }

    // Get user and IP for audit trail
    const changedBy = (req as any).user?.ramco_id || (req as any).user?.id || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    // Update the registry record with all fields including model_id
    await purchaseModel.updatePurchaseAssetRegistry(registryId, updateData);

    // Log all changes to audit trail
    if (auditChanges.length > 0) {
      await purchaseModel.logRegistryAuditBatch(
        registryId,
        registryEntry.purchase_id || null,
        auditChanges,
        changedBy,
        ipAddress,
        'Registry correction by purchaser - synced to assets.assetdata'
      );
    }

    // Sync changes to assetdata table to keep asset info in sync
    // Fields to sync: register_number, brand_id, category_id, classification, costcenter_id, location_id, model_id
    if (registryEntry && registryEntry.purchase_id) {
      const purchaseId = registryEntry.purchase_id;
      
      // Build assetdata update payload with fields that were changed
      const assetDataUpdate: any = {};
      if (register_number !== undefined) assetDataUpdate.register_number = register_number;
      if (brand_id !== undefined) assetDataUpdate.brand_id = brand_id ? Number(brand_id) : null;
      if (category_id !== undefined) assetDataUpdate.category_id = category_id ? Number(category_id) : null;
      if (classification !== undefined) assetDataUpdate.classification = classification;
      if (costcenter_id !== undefined) assetDataUpdate.costcenter_id = costcenter_id ? Number(costcenter_id) : null;
      if (location_id !== undefined) assetDataUpdate.location_id = location_id ? Number(location_id) : null;
      if (model_id !== undefined) assetDataUpdate.model_id = resolvedModelId;
      
      // Update assetdata with the sync fields
      if (Object.keys(assetDataUpdate).length > 0) {
        await purchaseModel.updateAssetDataFromRegistry(purchaseId, assetDataUpdate);
      }
    }

    return res.json({ data: null, message: 'Purchase asset registry updated successfully', status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to update registry', status: 'error' });
  }
};

/* ======= PURCHASE DELIVERIES ======= */
export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const rows = await purchaseModel.getDeliveries();
    res.json({ data: rows, message: 'Deliveries retrieved', status: 'success' });
  } catch (error) {
    res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to retrieve deliveries', status: 'error' });
  }
};

export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rec = await purchaseModel.getDeliveryById(id);
    if (!rec) return res.status(404).json({ data: null, message: 'Delivery not found', status: 'error' });
    res.json({ data: rec, message: 'Delivery retrieved', status: 'success' });
  } catch (error) {
    res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to retrieve delivery', status: 'error' });
  }
};

export const createDelivery = async (req: Request, res: Response) => {
  try {
    const payload: any = {
      do_date: req.body.do_date ?? null,
      do_no: req.body.do_no ?? null,
      grn_date: req.body.grn_date ?? null,
      grn_no: req.body.grn_no ?? null,
      inv_date: req.body.inv_date ?? null,
      inv_no: req.body.inv_no ?? null,
      purchase_id: req.body.purchase_id ? Number(req.body.purchase_id) : undefined,
      request_id: req.body.request_id ? Number(req.body.request_id) : undefined,
      upload_path: req.body.upload_path ?? null,
    };

    const insertId = await purchaseModel.createDelivery(payload);

    // handle uploaded file if present
    if ((req as any).file?.path) {
      const tempPath = (req as any).file.path as string;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      const filename = `delivery-${insertId}-${Date.now()}${ext}`;
      const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
      const destDir = path.dirname(destPath);
      await fsPromises.mkdir(destDir, { recursive: true }).catch(() => { });
      await safeMove(tempPath, destPath);
      await purchaseModel.updateDelivery(insertId, { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
    }

    res.status(201).json({ data: { id: insertId }, message: 'Delivery created', status: 'success' });
  } catch (error) {
    res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to create delivery', status: 'error' });
  }
};

export const updateDelivery = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const payload: any = {};
    if (req.body.purchase_id !== undefined) payload.purchase_id = Number(req.body.purchase_id);
    if (req.body.request_id !== undefined) payload.request_id = Number(req.body.request_id);
    if (req.body.do_no !== undefined) payload.do_no = req.body.do_no;
    if (req.body.do_date !== undefined) payload.do_date = req.body.do_date;
    if (req.body.inv_no !== undefined) payload.inv_no = req.body.inv_no;
    if (req.body.inv_date !== undefined) payload.inv_date = req.body.inv_date;
    if (req.body.grn_no !== undefined) payload.grn_no = req.body.grn_no;
    if (req.body.grn_date !== undefined) payload.grn_date = req.body.grn_date;

    if ((req as any).file?.path) {
      const tempPath = (req as any).file.path as string;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      const filename = `delivery-${id}-${Date.now()}${ext}`;
      const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
      await safeMove(tempPath, destPath);
      payload.upload_path = toDbPath(PURCHASE_SUBDIR, filename);
    }

    await purchaseModel.updateDelivery(id, payload);
    res.json({ data: null, message: 'Delivery updated', status: 'success' });
  } catch (error) {
    res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to update delivery', status: 'error' });
  }
};

export const deleteDelivery = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deleteDelivery(id);
    res.json({ data: null, message: 'Delivery deleted', status: 'success' });
  } catch (error) {
    res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to delete delivery', status: 'error' });
  }
};



/* ======= PURCHASE REQUEST - for new form ======= */
export const getPurchaseRequests = async (req: Request, res: Response) => {
  try {
    const rows = await purchaseModel.getPurchaseRequests();
    const requestIds = rows.map((r: any) => r.id).filter((id: any) => id != null);
    const allItems = await purchaseModel.getPurchaseRequestItems();
    // Group items by request_id
    const itemsByRequestId = new Map<number, any[]>();
    for (const item of allItems) {
      if (item.request_id != null) {
        if (!itemsByRequestId.has(item.request_id)) itemsByRequestId.set(item.request_id, []);
        itemsByRequestId.get(item.request_id)!.push(item);
      }
    }

    // Enrich ramco_id -> requested_by, costcenter_id -> costcenter, department_id -> department
    const [employeesRaw, costcentersRaw, departmentsRaw, typesRaw, categoriesRaw, suppliersRaw, brandsRaw] = await Promise.all([
      assetModel.getEmployees(),
      assetModel.getCostcenters(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      assetModel.getTypes(),
      assetModel.getCategories(),
      purchaseModel.getSuppliers(),
      assetModel.getBrands(),
    ]);
    const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
    const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
    const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw as any[] : [];
    const brands = Array.isArray(brandsRaw) ? brandsRaw as any[] : [];
    const empMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const deptMap = new Map(departments.map((d: any) => [d.id, d]));
    const typeMap = new Map(types.map((t: any) => [t.id, t]));
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
    const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]));
    const brandMap = new Map(brands.map((b: any) => [b.id, b]));

    // Optionally, fetch all deliveries and group by purchase_id for enrichment
    const allDeliveries = await purchaseModel.getDeliveries();
    const deliveriesMap = new Map<number, any[]>();
    for (const d of allDeliveries) {
      const pid = Number(d.purchase_id);
      if (!deliveriesMap.has(pid)) deliveriesMap.set(pid, []);
      deliveriesMap.get(pid)!.push(d);
    }

    const enriched = (rows || []).map((r: any) => {
      const requestedBy = r.ramco_id ? (empMap.get(r.ramco_id) ? { full_name: (empMap.get(r.ramco_id))?.full_name || null, ramco_id: r.ramco_id } : { full_name: null, ramco_id: r.ramco_id }) : null;
      const costcenter = r.costcenter_id ? (ccMap.has(r.costcenter_id) ? { id: r.costcenter_id, name: ccMap.get(r.costcenter_id)?.name || null } : { id: r.costcenter_id, name: null }) : null;
      const department = r.department_id ? (deptMap.has(r.department_id) ? { id: r.department_id, name: deptMap.get(r.department_id)?.name || null } : { id: r.department_id, name: null }) : null;
      // Enrich items for this request
      const itemsRaw = itemsByRequestId.get(r.id) || [];
      const items = itemsRaw.map((it: any) => ({
        brand: it.brand_id && brandMap.has(it.brand_id) ? { id: it.brand_id, name: brandMap.get(it.brand_id)?.name || null } : null,
        category: it.category_id && categoryMap.has(it.category_id) ? { id: it.category_id, name: categoryMap.get(it.category_id)?.name || null } : null,
        description: it.items || it.description || null,
        handover_at: it.handover_at ?? null,
        handover_to: it.handover_to ?? null,
        id: it.id,
        po_date: it.po_date ?? null,
        po_no: it.po_no ?? null,
        purpose: it.purpose ?? null,
        qty: it.qty,
        supplier: it.supplier_id && supplierMap.has(it.supplier_id) ? { id: it.supplier_id, name: supplierMap.get(it.supplier_id)?.name || null } : null,
        total_price: it.total_price !== undefined && it.total_price !== null ? Number(it.total_price).toFixed(2) : null,
        type: it.type_id && typeMap.has(it.type_id) ? { id: it.type_id, name: typeMap.get(it.type_id)?.name || null } : null,
        unit_price: it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price).toFixed(2) : null,
      }));
      return {
        costcenter: costcenter,
        created_at: r.created_at ?? null,
        department: department,
        id: r.id,
        items,
        pr_date: r.pr_date ?? null,
        pr_no: r.pr_no ?? null,
        request_type: r.request_type ?? null,
        requested_by: requestedBy,
        updated_at: r.updated_at ?? null,
      };
    });

    return res.json({ data: enriched, message: 'Purchase requests retrieved', status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to retrieve purchase requests', status: 'error' });
  }
};

export const getPurchaseRequestById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rec = await purchaseModel.getPurchaseRequestById(id);
    if (!rec) return res.status(404).json({ data: null, message: 'Purchase request not found', status: 'error' });

    // Fetch child purchase_data items linked by request_id
    const items = await purchaseModel.getPurchaseRequestItemByRequestId(id);

    // Load lookups and deliveries for this request to enrich items (batch to avoid N+1)
    const [typesRaw, categoriesRaw, costcentersRaw, suppliersRaw, employeesRaw, brandsRaw, departmentsRaw, deliveriesRaw] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCategories(),
      assetModel.getCostcenters(),
      purchaseModel.getSuppliers(),
      assetModel.getEmployees(),
      assetModel.getBrands(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      purchaseModel.getDeliveriesByRequestId(id),
    ]);
    const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const typeMap = new Map(types.map((t: any) => [t.id, t]));
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
    const deptMap = new Map(departments.map((d: any) => [d.id, d]));
    const supplierMap = new Map((Array.isArray(suppliersRaw) ? suppliersRaw : []).map((s: any) => [s.id, s]));
    const employeesArr = Array.isArray(employeesRaw) ? employeesRaw : [];
    const employeeMap = new Map(employeesArr.map((e: any) => [e.ramco_id, e]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));

    // Group deliveries by purchase_id for quick lookup
    const deliveriesArr = Array.isArray(deliveriesRaw) ? deliveriesRaw as any[] : [];
    const deliveriesMap = new Map<number, any[]>();
    for (const d of deliveriesArr) {
      const pid = Number(d.purchase_id);
      if (!deliveriesMap.has(pid)) deliveriesMap.set(pid, []);
      deliveriesMap.get(pid)!.push(d);
    }

    // Normalize items to include only relevant fields for the request
    const itemsNormalized = (items || []).map((it: any) => {
      const itemDeliveries = deliveriesMap.has(Number(it.id)) ? deliveriesMap.get(Number(it.id))! : [];
      return {
        brand: it.brand_id && brandMap.has(it.brand_id) ? { id: it.brand_id, name: brandMap.get(it.brand_id)?.name || null } : null,
        category: it.category_id && categoryMap.has(it.category_id) ? { id: it.category_id, name: categoryMap.get(it.category_id)?.name || null } : null,
        created_at: it.created_at ?? null,
        deliveries: itemDeliveries.map((d: any) => ({
          created_at: d.created_at ?? null,
          do_date: d.do_date ?? null,
          do_no: d.do_no ?? null,
          grn_date: d.grn_date ?? null,
          grn_no: d.grn_no ?? null,
          id: d.id,
          inv_date: d.inv_date ?? null,
          inv_no: d.inv_no ?? null,
          purchase_id: d.purchase_id,
          request_id: d.request_id,
          updated_at: d.updated_at ?? null,
          upload_path: d.upload_path ?? null,
          upload_url: publicUrl(d.upload_path),
        })),
        description: it.items || it.description || null,
        handover_at: it.handover_at ?? null,
        handover_to: it.handover_to ?? null,
        id: it.id,
        po_date: it.po_date ?? null,
        po_no: it.po_no ?? null,
        pr_date: it.pr_date || null,
        pr_no: it.pr_no || null,
        purpose: it.purpose ?? null,
        qty: it.qty,
        supplier: it.supplier_id && supplierMap.has(it.supplier_id) ? { id: it.supplier_id, name: supplierMap.get(it.supplier_id)?.name || null } : null,
        total_price: it.total_price !== undefined && it.total_price !== null ? Number(it.total_price).toFixed(2) : null,
        type: it.type_id && typeMap.has(it.type_id) ? { id: it.type_id, name: typeMap.get(it.type_id)?.name || null } : null,
        unit_price: it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price).toFixed(2) : null,
        updated_at: it.updated_at ?? null,
      };
    });

    // Reuse previously loaded lookup maps (employeeMap, ccMap, deptMap) to enrich the request
    const requestedBy = rec.ramco_id ? (employeeMap.get(rec.ramco_id) ? { full_name: (employeeMap.get(rec.ramco_id))?.full_name || null, ramco_id: rec.ramco_id } : { full_name: null, ramco_id: rec.ramco_id }) : null;
    const reqCostcenter = rec.costcenter_id ? (ccMap.has(rec.costcenter_id) ? { id: rec.costcenter_id, name: ccMap.get(rec.costcenter_id)?.name || null } : { id: rec.costcenter_id, name: null }) : null;
    const reqDept = rec.department_id ? (deptMap.has(rec.department_id) ? { id: rec.department_id, name: deptMap.get(rec.department_id)?.name || null } : { id: rec.department_id, name: null }) : null;

    const enrichedRec = {
      costcenter: reqCostcenter,
      created_at: rec.created_at ?? null,
      department: reqDept,
      id: rec.id,
      items: itemsNormalized,
      pr_date: rec.pr_date ?? null,
      pr_no: rec.pr_no ?? null,
      request_type: rec.request_type ?? null,
      requested_by: requestedBy,
      updated_at: rec.updated_at ?? null,
    };

    return res.json({ data: enrichedRec, message: 'Purchase request retrieved', status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to retrieve purchase request', status: 'error' });
  }
};

export const createPurchaseRequest = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const payload: any = {
      costcenter_id: Number(body.costcenter_id),
      pr_date: String(body.pr_date || '').trim(),
      pr_no: body.pr_no ?? null,
      ramco_id: String(body.ramco_id || '').trim(),
      request_type: String(body.request_type || '').trim(),
    };
    if (!payload.pr_date || !payload.request_type || !payload.ramco_id || !payload.costcenter_id) {
      return res.status(400).json({ data: null, message: 'Missing required fields', status: 'error' });
    }
    const id = await purchaseModel.createPurchaseRequest(payload);
    return res.status(201).json({ data: { id }, message: 'Purchase request created', status: 'success' });
  } catch (error) {
    return res.status(500).json({ data: null, message: error instanceof Error ? error.message : 'Failed to create purchase request', status: 'error' });
  }
};

export const updatePurchaseRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const data: any = {};
    if (body.pr_no !== undefined) data.pr_no = body.pr_no;
    if (body.pr_date !== undefined) data.pr_date = body.pr_date;
    if (body.request_type !== undefined) data.request_type = body.request_type;
    if (body.ramco_id !== undefined) data.ramco_id = body.ramco_id;
    if (body.costcenter_id !== undefined) data.costcenter_id = Number(body.costcenter_id);
    await purchaseModel.updatePurchaseRequest(id, data);
    return res.json({ message: 'Purchase request updated', status: 'success' });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update purchase request', status: 'error' });
  }
};

export const deletePurchaseRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deletePurchaseRequest(id);
    return res.json({ message: 'Purchase request deleted', status: 'success' });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete purchase request', status: 'error' });
  }
};

/* ======= SUPPLIERS ======= */
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await purchaseModel.getSuppliers();
    res.json({
      data: suppliers,
      message: 'Suppliers retrieved successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to retrieve suppliers',
      status: 'error'
    });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await purchaseModel.getSupplierById(Number(id));
    if (!supplier) {
      return res.status(404).json({
        data: null,
        message: 'Supplier not found',
        status: 'error'
      });
    }
    res.json({
      data: supplier,
      message: 'Supplier retrieved successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to retrieve supplier',
      status: 'error'
    });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const supplierData = req.body;
    const newSupplierId = await purchaseModel.createSupplier(supplierData);
    res.status(201).json({
      data: { id: newSupplierId },
      message: 'Supplier created successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to create supplier',
      status: 'error'
    });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplierData = req.body;
    await purchaseModel.updateSupplier(Number(id), supplierData);
    res.json({
      data: null,
      message: 'Supplier updated successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to update supplier',
      status: 'error'
    });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await purchaseModel.deleteSupplier(Number(id));
    if (!deleted) {
      return res.status(404).json({
        data: null,
        message: 'Supplier not found',
        status: 'error'
      });
    }
    res.json({
      data: null,
      message: 'Supplier deleted successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to delete supplier',
      status: 'error'
    });
  }
};

/* ======= MATCH MODELS - For Frontend Input ======= */
export const matchModels = async (req: Request, res: Response) => {
  try {
    const { model_name } = req.body || {};

    if (!model_name || typeof model_name !== 'string' || model_name.trim() === '') {
      return res.status(400).json({
        data: null,
        message: 'model_name is required and must be a non-empty string',
        status: 'error'
      });
    }

    // Trim the input model name and split into words (limit to 3 words)
    const trimmedModelName = model_name.trim();
    const words = trimmedModelName.split(/\s+/).slice(0, 3).filter(w => w.length > 0);

    if (words.length === 0) {
      return res.status(400).json({
        data: null,
        message: 'model_name must contain at least one word',
        status: 'error'
      });
    }

    // Build LIKE queries for each word to find matching models
    // Normalize by removing special characters (dashes, etc) from both search words and model names
    const matchesMap = new Map<number, { id: number; name: string; matchedWords: string[] }>();

    for (const word of words) {
      const [modelRows] = await pool.query(
        `SELECT id, name FROM assets.models 
         WHERE name IS NOT NULL AND name != '' 
         AND REPLACE(REPLACE(REPLACE(UPPER(name), '-', ''), ' ', ''), '_', '') LIKE CONCAT('%', REPLACE(REPLACE(REPLACE(UPPER(?), '-', ''), ' ', ''), '_', ''), '%')
         ORDER BY name ASC`,
        [word]
      );
      
      const models = (modelRows as any[]) || [];
      for (const model of models) {
        if (!matchesMap.has(model.id)) {
          matchesMap.set(model.id, {
            id: model.id,
            name: model.name,
            matchedWords: [word]
          });
        } else {
          // Add word to matched words if not already present
          const existing = matchesMap.get(model.id)!;
          if (!existing.matchedWords.includes(word)) {
            existing.matchedWords.push(word);
          }
        }
      }
    }

    // Convert to array and sort by:
    // 1. Number of matched words (descending)
    // 2. Model name (ascending)
    const matches = Array.from(matchesMap.values()).sort((a, b) => {
      if (b.matchedWords.length !== a.matchedWords.length) {
        return b.matchedWords.length - a.matchedWords.length;
      }
      return a.name.localeCompare(b.name);
    });

    // Limit to top 15 results
    const topMatches = matches.slice(0, 15).map(m => ({
      id: m.id,
      name: m.name,
      matched_words: m.matchedWords
    }));

    return res.json({
      data: {
        input_model: trimmedModelName,
        search_words: words,
        total_matches: topMatches.length,
        matches: topMatches
      },
      message: topMatches.length > 0 ? `Found ${topMatches.length} matching models` : 'No matching models found',
      status: 'success'
    });
  } catch (error) {
    return res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to match models',
      status: 'error'
    });
  }
};

/* ======= PURCHASE REGISTRY MODEL CHECKER ======= */
/* ======= HELPER: Levenshtein Distance for String Similarity ======= */
const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[len1][len2];
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(str1.toUpperCase(), str2.toUpperCase());
  return ((maxLen - distance) / maxLen) * 100;
};

/* ======= PURCHASE REGISTRY MODEL CHECKER ======= */
export const checkRegistryModels = async (req: Request, res: Response) => {
  try {
    // Get all registry entries with purchase_id and model
    const [registryRows] = await pool.query(
      `SELECT purchase_id, model FROM purchases2.purchase_asset_registry WHERE model IS NOT NULL AND model != '' ORDER BY purchase_id, model`
    );
    const registryEntries = (registryRows as any[]) || [];

    // Get all available models with their IDs
    const [modelRows] = await pool.query(
      `SELECT id, name FROM assets.models WHERE name IS NOT NULL AND name != ''`
    );
    const availableModels = new Map((modelRows as any[]).map((m: any) => [m.name, m.id]));
    const availableModelsList = Array.from(availableModels.keys());

    // Get all registered assets in assetdata that have purchase_id and model_id
    const [assetDataRows] = await pool.query(
      `SELECT purchase_id, model_id FROM assets.assetdata WHERE purchase_id IS NOT NULL AND model_id IS NOT NULL`
    );

    // Build a set of registered (purchase_id, model_id) combinations
    const registeredAssets = new Set<string>();
    for (const asset of (assetDataRows as any[])) {
      const key = `${asset.purchase_id}:${asset.model_id}`;
      registeredAssets.add(key);
    }

    // Find unregistered models (registry entries without corresponding assetdata records)
    const unregisteredModels: Array<{ purchase_id: number; model: string; model_id?: number | null; matches_90?: Array<{ id: number; name: string; similarity: number }> }> = [];
    const registeredCount = registryEntries.filter((entry: any) => {
      const purchaseId = entry.purchase_id;
      const modelName = entry.model;
      const modelId = availableModels.get(modelName) || null;

      const registryKey = `${purchaseId}:${modelId}`;
      const isRegistered = modelId && registeredAssets.has(registryKey);

      if (!isRegistered) {
        // Find 90%+ matches for this unregistered model
        const highMatchesList: Array<{ id: number; name: string; similarity: number }> = [];
        for (const availableModel of availableModelsList) {
          const similarity = calculateSimilarity(modelName, availableModel);
          if (similarity >= 90) {
            const mid = availableModels.get(availableModel);
            if (mid) {
              highMatchesList.push({
                id: mid,
                name: availableModel,
                similarity: Math.round(similarity)
              });
            }
          }
        }

        // Sort by similarity (highest first) and limit to top 5
        highMatchesList.sort((a, b) => b.similarity - a.similarity);

        unregisteredModels.push({
          purchase_id: purchaseId,
          model: modelName,
          model_id: modelId,
          matches_90: highMatchesList.length > 0 ? highMatchesList.slice(0, 5) : undefined
        });
      }

      return isRegistered;
    }).length;

    // Find similar models for unregistered ones
    const almostMatches: Array<{
      purchase_id: number;
      model: string;
      model_id?: number | null;
      matches: Array<{ id: number; name: string; similarity: number }>
    }> = [];
    const SIMILARITY_THRESHOLD = 80; // 80% similarity threshold

    for (const unreg of unregisteredModels) {
      const similarMatches: Array<{ id: number; name: string; similarity: number }> = [];

      for (const availableModel of availableModelsList) {
        const similarity = calculateSimilarity(unreg.model, availableModel);
        if (similarity >= SIMILARITY_THRESHOLD) {
          const modelId = availableModels.get(availableModel);
          if (modelId) {
            similarMatches.push({
              id: modelId,
              name: availableModel,
              similarity: Math.round(similarity)
            });
          }
        }
      }

      // Sort by similarity (highest first)
      similarMatches.sort((a, b) => b.similarity - a.similarity);

      if (similarMatches.length > 0) {
        almostMatches.push({
          purchase_id: unreg.purchase_id,
          model: unreg.model,
          model_id: unreg.model_id,
          matches: similarMatches.slice(0, 10) // Limit to top 10 matches
        });
      }
    }

    const report = {
      checked_at: new Date().toISOString(),
      total_registry_entries: registryEntries.length,
      total_registered: registeredCount,
      total_unregistered: unregisteredModels.length,
      unregistered_models: unregisteredModels.length > 0
        ? unregisteredModels.map(m => ({
          purchase_id: m.purchase_id,
          model: m.model,
          model_id: m.model_id,
          matches_90: m.matches_90 && m.matches_90.length > 0 ? m.matches_90 : undefined
        }))
        : [],
      almost_matches: almostMatches.length > 0 ? almostMatches : null
    };

    // Write report to log file
    const logDir = path.join(process.cwd(), 'src', 'p.purchase');
    const logFilePath = path.join(logDir, 'purchase_registry_model_report.log');

    const almostMatchesSection = almostMatches.length > 0
      ? `\nAlmost Matches (Similar Models Found - ${SIMILARITY_THRESHOLD}% similarity threshold):\n${almostMatches.map((item, i) =>
        `${i + 1}. Purchase ID: ${item.purchase_id}, Model: "${item.model}" (model_id: ${item.model_id || 'null'})\n   Suggestions: ${item.matches.map((m: any) => `${m.name} (ID: ${m.id}, ${m.similarity}%)`).join(', ')}`
      ).join('\n')}\n`
      : '\nAlmost Matches: None\n';

    const unregisteredSection = unregisteredModels.length > 0
      ? unregisteredModels.map((m, i) => {
        const baseInfo = `${i + 1}. Purchase ID: ${m.purchase_id}, Model: "${m.model}" (model_id: ${m.model_id || 'null'})`;
        const matchInfo = m.matches_90 && m.matches_90.length > 0
          ? `\n   90%+ Matches: ${m.matches_90.map((match: any) => `${match.name} (ID: ${match.id}, ${match.similarity}%)`).join(', ')}`
          : '';
        return baseInfo + matchInfo;
      }).join('\n')
      : 'None';

    const logContent = `
=== Purchase Registry Model Check Report ===
Checked At: ${report.checked_at}
Total Registry Entries: ${report.total_registry_entries}
Total Registered (in assetdata): ${report.total_registered}
Total Unregistered: ${report.total_unregistered}

Unregistered Models:
${unregisteredSection}
${almostMatchesSection}
=====================================\n`;

    await fsPromises.appendFile(logFilePath, logContent, 'utf-8');

    // Generate Excel file
    try {
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Summary Report
      const summarySheet = workbook.addWorksheet('Summary Report');
      summarySheet.columns = [
        { header: 'Item', key: 'item', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];

      const summaryData = [
        { item: 'Check Date & Time', value: report.checked_at },
        { item: 'Total Registry Entries', value: report.total_registry_entries },
        { item: 'Total Registered', value: report.total_registered },
        { item: 'Total Unregistered', value: report.total_unregistered },
        { item: 'Registration Rate (%)', value: ((report.total_registered / report.total_registry_entries) * 100).toFixed(2) }
      ];

      summarySheet.addRows(summaryData);

      // Style summary header
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

      // Sheet 2: Unregistered Models with 90%+ Matches
      const unregSheet = workbook.addWorksheet('Unregistered Models');
      unregSheet.columns = [
        { header: '#', key: 'index', width: 5 },
        { header: 'Purchase ID', key: 'purchase_id', width: 12 },
        { header: 'Model Name', key: 'model', width: 40 },
        { header: 'Model ID', key: 'model_id', width: 12 },
        { header: '90%+ Match Name', key: 'match_name', width: 40 },
        { header: 'Match ID', key: 'match_id', width: 12 },
        { header: 'Match %', key: 'match_similarity', width: 10 }
      ];

      let rowIndex = 1;
      for (const unreg of unregisteredModels) {
        if (!unreg.matches_90 || unreg.matches_90.length === 0) {
          unregSheet.addRow({
            index: rowIndex,
            purchase_id: unreg.purchase_id,
            model: unreg.model,
            model_id: unreg.model_id || '-',
            match_name: '-',
            match_id: '-',
            match_similarity: '-'
          });
          rowIndex++;
        } else {
          // Add first match on same row as model
          for (let i = 0; i < unreg.matches_90.length; i++) {
            const match = unreg.matches_90[i];
            unregSheet.addRow({
              index: i === 0 ? rowIndex : '',
              purchase_id: i === 0 ? unreg.purchase_id : '',
              model: i === 0 ? unreg.model : '',
              model_id: i === 0 ? (unreg.model_id || '-') : '',
              match_name: match.name,
              match_id: match.id,
              match_similarity: match.similarity
            });
            if (i === 0) rowIndex++;
          }
        }
      }

      // Style unregistered header
      unregSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B6B' } };
      unregSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

      // Sheet 3: Almost Matches (80%+)
      const almostSheet = workbook.addWorksheet('Almost Matches 80%+');
      almostSheet.columns = [
        { header: '#', key: 'index', width: 5 },
        { header: 'Purchase ID', key: 'purchase_id', width: 12 },
        { header: 'Unregistered Model', key: 'model', width: 40 },
        { header: 'Model ID', key: 'model_id', width: 12 },
        { header: 'Similar Model Name', key: 'match_name', width: 40 },
        { header: 'Match ID', key: 'match_id', width: 12 },
        { header: 'Similarity %', key: 'match_similarity', width: 12 }
      ];

      rowIndex = 1;
      for (const almost of almostMatches) {
        for (let i = 0; i < almost.matches.length; i++) {
          const match = almost.matches[i];
          almostSheet.addRow({
            index: i === 0 ? rowIndex : '',
            purchase_id: i === 0 ? almost.purchase_id : '',
            model: i === 0 ? almost.model : '',
            model_id: i === 0 ? (almost.model_id || '-') : '',
            match_name: match.name,
            match_id: match.id,
            match_similarity: match.similarity
          });
          if (i === 0) rowIndex++;
        }
      }

      // Style almost matches header
      almostSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } };
      almostSheet.getRow(1).font = { bold: true, color: { argb: '000000' } };

      // Save Excel file
      const excelDir = path.join(process.cwd(), 'src', 'p.purchase');
      const excelFileName = `purchase_registry_model_report_${dayjs(report.checked_at).format('YYYY-MM-DD_HHmmss')}.xlsx`;
      const excelFilePath = path.join(excelDir, excelFileName);

      await workbook.xlsx.writeFile(excelFilePath);
    } catch (excelErr) {
      console.error('Failed to generate Excel report:', excelErr);
    }

    res.json({
      data: report,
      message: 'Registry model check completed successfully',
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to check registry models',
      status: 'error'
    });
  }
};