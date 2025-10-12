import { Request, Response } from 'express';
import path from 'path';
import { promises as fsPromises } from 'fs';
import * as assetModel from '../p.asset/assetModel';
import * as userModel from '../p.user/userModel';
import * as purchaseModel from './purchaseModel';
import { sendMail } from '../utils/mailer';
import { renderPurchaseNotification } from '../utils/emailTemplates/purchaseNotification';
import { renderPurchaseRegistryCompleted } from '../utils/emailTemplates/purchaseRegistryCompleted';
import dayjs from 'dayjs';

// Define procurement admins here (comma-separated RAMCO IDs)
const PROCUREMENT_ADMINS = 'mraco_id,ramco_id';

// module_directory for this module's uploads
const PURCHASE_SUBDIR = 'purchases';
import { buildStoragePath, safeMove, toDbPath, toPublicUrl } from '../utils/uploadUtil';



/* ======= PURCHASE REQUEST ITEMS ======= */
export const getPurchaseRequestItems = async (req: Request, res: Response) => {
  try {
    const { status, costcenter, supplier, startDate, endDate, dateField } = req.query;
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
        let loginUsername: string | null = (req as any).user?.username || null;
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
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
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
      const requestedBy = reqRec && reqRec.ramco_id ? (employeeMap.get(reqRec.ramco_id) ? { ramco_id: reqRec.ramco_id, full_name: (employeeMap.get(reqRec.ramco_id) as any)?.full_name || null } : { ramco_id: reqRec.ramco_id, full_name: null }) : null;
      const reqCostcenter = reqRec && reqRec.costcenter_id ? (ccMap.has(reqRec.costcenter_id) ? { id: reqRec.costcenter_id, name: ccMap.get(reqRec.costcenter_id)?.name || null } : { id: reqRec.costcenter_id, name: null }) : null;
      const reqDept = reqRec && reqRec.department_id ? (deptMap.has(reqRec.department_id) ? { id: reqRec.department_id, name: deptMap.get(reqRec.department_id)?.name || null } : { id: reqRec.department_id, name: null }) : null;

      const enrichedPurchase: any = {
        id: purchase.id,
        request_id: purchase.request_id ?? null,
        request: reqRec ? {
          id: reqRec.id,
          pr_no: reqRec.pr_no ?? null,
          pr_date: reqRec.pr_date ?? null,
          request_type: reqRec.request_type ?? null,
          requested_by: requestedBy,
          costcenter: reqCostcenter,
          department: reqDept,
          created_at: reqRec.created_at ?? null,
          updated_at: reqRec.updated_at ?? null,
        } : null,
        type: purchase.type_id && typeMap.has(purchase.type_id) ? { id: purchase.type_id, name: typeMap.get(purchase.type_id)?.name || null } : null,
        category: purchase.category_id && categoryMap.has(purchase.category_id) ? { id: purchase.category_id, name: categoryMap.get(purchase.category_id)?.name || null } : null,
        brand: purchase.brand_id && brandMap.has(purchase.brand_id) ? { id: purchase.brand_id, name: brandMap.get(purchase.brand_id)?.name || null } : null,
        qty: purchase.qty,
        description: purchase.description || purchase.items || null,
        purpose: purchase.purpose ?? null,
        supplier: purchase.supplier_id && supplierMap.has(purchase.supplier_id) ? { id: purchase.supplier_id, name: supplierMap.get(purchase.supplier_id)?.name || null } : null,
        unit_price: purchase.unit_price !== undefined && purchase.unit_price !== null ? Number(purchase.unit_price).toFixed(2) : null,
        total_price: purchase.total_price !== undefined && purchase.total_price !== null ? Number(purchase.total_price).toFixed(2) : null,
        po_no: purchase.po_no ?? null,
        po_date: purchase.po_date ?? null,
        handover_to: purchase.handover_to ?? null,
        handover_at: purchase.handover_at ?? null,
        created_at: purchase.created_at ?? null,
        updated_at: purchase.updated_at ?? null,
      };

      // Asset registry status: completed if a registry entry exists for this purchase id
      const pidNum = Number(purchase.id || 0);
      enrichedPurchase.asset_registry = (pidNum > 0 && registrySet.has(pidNum)) ? 'completed' : 'incompleted';

      return enrichedPurchase;
    });

    res.json({
      status: 'success',
      message: 'Purchases retrieved successfully',
      data: enrichedPurchases
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to retrieve purchases',
      data: null
    });
  }
};

export const getPurchaseRequestItemById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const purchase: any = await purchaseModel.getPurchaseRequestItemById(id);

    if (!purchase) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase not found',
        data: null
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
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
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
      id: purchase.id,
      request_id: purchase.request_id ?? null,
      request: null,
      type: purchase.type_id && typeMap.has(purchase.type_id) ? { id: purchase.type_id, name: typeMap.get(purchase.type_id)?.name || null } : null,
      category: purchase.category_id && categoryMap.has(purchase.category_id) ? { id: purchase.category_id, name: categoryMap.get(purchase.category_id)?.name || null } : null,
      brand: purchase.brand_id && brandMap.has(purchase.brand_id) ? { id: purchase.brand_id, name: brandMap.get(purchase.brand_id)?.name || null } : null,
      qty: purchase.qty,
      description: purchase.description || purchase.items || null,
      purpose: purchase.purpose ?? null,
      supplier: purchase.supplier_id && supplierMap.has(purchase.supplier_id) ? { id: purchase.supplier_id, name: supplierMap.get(purchase.supplier_id)?.name || null } : null,
      unit_price: purchase.unit_price !== undefined && purchase.unit_price !== null ? Number(purchase.unit_price).toFixed(2) : null,
      total_price: purchase.total_price !== undefined && purchase.total_price !== null ? Number(purchase.total_price).toFixed(2) : null,
      po_no: purchase.po_no ?? null,
      po_date: purchase.po_date ?? null,
      handover_to: purchase.handover_to ?? null,
      handover_at: purchase.handover_at ?? null,
      created_at: purchase.created_at ?? null,
      updated_at: purchase.updated_at ?? null,
    };

    // Attach request object for single purchase if available (with enrichment)
    if (purchase.request_id) {
      const reqRecSingle = await purchaseModel.getPurchaseRequestById(Number(purchase.request_id));
      if (reqRecSingle) {
        const requestedBySingle = reqRecSingle.ramco_id ? (employeeMap.get(reqRecSingle.ramco_id) ? { ramco_id: reqRecSingle.ramco_id, full_name: (employeeMap.get(reqRecSingle.ramco_id) as any)?.full_name || null } : { ramco_id: reqRecSingle.ramco_id, full_name: null }) : null;
        const reqCostcenterSingle = reqRecSingle.costcenter_id ? (ccMap.has(reqRecSingle.costcenter_id) ? { id: reqRecSingle.costcenter_id, name: ccMap.get(reqRecSingle.costcenter_id)?.name || null } : { id: reqRecSingle.costcenter_id, name: null }) : null;
        const reqDeptSingle = reqRecSingle.department_id ? (deptMap.has(reqRecSingle.department_id) ? { id: reqRecSingle.department_id, name: deptMap.get(reqRecSingle.department_id)?.name || null } : { id: reqRecSingle.department_id, name: null }) : null;
        (enrichedPurchase as any).request = {
          id: reqRecSingle.id,
          pr_no: reqRecSingle.pr_no ?? null,
          pr_date: reqRecSingle.pr_date ?? null,
          request_type: reqRecSingle.request_type ?? null,
          requested_by: requestedBySingle,
          costcenter: reqCostcenterSingle,
          department: reqDeptSingle,
          created_at: reqRecSingle.created_at ?? null,
          updated_at: reqRecSingle.updated_at ?? null,
        };
      }
    }

    // Attach deliveries for this purchase item
    try {
      const deliveries = await purchaseModel.getDeliveriesByPurchaseId(purchase.id);
      (enrichedPurchase as any).deliveries = (Array.isArray(deliveries) ? deliveries : []).map((d: any) => ({
        id: d.id,
        purchase_id: d.purchase_id,
        request_id: d.request_id,
        do_no: d.do_no ?? null,
        do_date: d.do_date ?? null,
        inv_no: d.inv_no ?? null,
        inv_date: d.inv_date ?? null,
        grn_no: d.grn_no ?? null,
        grn_date: d.grn_date ?? null,
        upload_path: d.upload_path ?? null,
        upload_url: publicUrl(d.upload_path),
        created_at: d.created_at ?? null,
        updated_at: d.updated_at ?? null,
      }));
    } catch (e) {
      // non-blocking: if deliveries fail, continue without them
      (enrichedPurchase as any).deliveries = [];
    }

    res.json({
      status: 'success',
      message: 'Purchase retrieved successfully',
      data: enrichedPurchase
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to retrieve purchase',
      data: null
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
          status: 'error',
          message: 'Missing required request fields: request_type, pr_date, ramco_id, costcenter_id',
          data: null,
        });
      }
      try {
        requestId = await purchaseModel.createPurchaseRequest({
          request_type,
          pr_no,
          pr_date,
          ramco_id,
          costcenter_id,
          // department_id is not present in payload; leave default/null at DB level if column exists
          // Type definition requires department_id, but model createPurchaseRequest signature does too.
          // To avoid breaking, attempt to infer department_id = 0 if not applicable.
          department_id: (undefined as unknown as number),
        } as any);
      } catch (e) {
        return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create purchase request', data: null });
      }
    }

    const purchaseData: any = {
      request_id: requestId,
      request_type: req.body.request_type ?? null,
      pr_no: req.body.pr_no ?? null,
      pr_date: req.body.pr_date ?? null,
      ramco_id: req.body.ramco_id ?? null,
      type_id: req.body.type_id ? Number(req.body.type_id) : undefined,
      item_type: req.body.item_type ?? undefined,
      category_id: req.body.category_id ? Number(req.body.category_id) : undefined,
      brand_id: req.body.brand_id !== undefined ? Number(req.body.brand_id) : undefined,
      qty: req.body.qty !== undefined ? Number(req.body.qty) : 0,
      description: req.body.description || null,
      purpose: req.body.purpose || null,
      supplier_id: req.body.supplier_id ? Number(req.body.supplier_id) : undefined,
      unit_price: req.body.unit_price !== undefined ? Number(req.body.unit_price) : 0,
      total_price: req.body.total_price !== undefined ? Number(req.body.total_price) : undefined,
      po_no: req.body.po_no ?? null,
      po_date: req.body.po_date ?? null,
      upload_path: req.body.upload_path ?? null,
      handover_to: req.body.handover_to ?? null,
      handover_at: req.body.handover_at ?? null,
      costcenter: req.body.costcenter ?? null,
      costcenter_id: req.body.costcenter_id ? Number(req.body.costcenter_id) : undefined,
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
            purchase_id: insertId,
            request_id: requestId,
            do_no: d.do_no ?? null,
            do_date: d.do_date ?? null,
            inv_no: d.inv_no ?? null,
            inv_date: d.inv_date ?? null,
            grn_no: d.grn_no ?? null,
            grn_date: d.grn_date ?? null,
            upload_path: d.upload_path ?? null,
          } as any;
          const deliveryId = await purchaseModel.createDelivery(payload);
          // If a file uploaded for this delivery index, rename and update
          const fileForThis = filesArr.find((f: any) => f && f.fieldname === `deliveries[${i}][upload_path]`);
          if (fileForThis && fileForThis.path) {
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
      const singleFile = (req as any).file && (req as any).file.path ? (req as any).file : undefined;
      const itemUpload = singleFile || filesArr.find((f: any) => f && f.fieldname === 'upload_path');
      if (itemUpload && itemUpload.path) {
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
              recipientName: r.name,
              prNo: purchaseData.pr_no || String(insertId),
              prDate: purchaseData.pr_date || null,
              requestType: purchaseData.request_type || null,
              itemType: purchaseData.item_type ? String(purchaseData.item_type) : (purchaseData.type_id ? String(purchaseData.type_id) : null),
              items: purchaseData.items || null,
              brand: brandName,
              costcenterName: costcenterName,
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
      status: 'success',
      message: 'Purchase created successfully',
      data: { id: insertId, request_id: requestId }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        status: 'error',
        message: error.message,
        data: null
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create purchase',
        data: null
      });
    }
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
      const singleFile = (req as any).file && (req as any).file.path ? (req as any).file : undefined;
      const itemUpload = singleFile || filesArr.find((f: any) => f && f.fieldname === 'upload_path');
      if (itemUpload && itemUpload.path) {
        const tempPath = itemUpload.path as string;
        const originalName: string = itemUpload.originalname || path.basename(tempPath);
        const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
        const filename = `purchase-${id}-${Date.now()}${ext}`;
        // Attempt to remove previous file if existed
        try {
          const existing = await purchaseModel.getPurchaseRequestItemById(id);
          if (existing && existing.upload_path) {
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
            'costcenter_id',
            'type_id',
            'category_id',
            'qty'
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
            purchase_id: id,
            request_id: reqId,
            do_no: d.do_no ?? null,
            do_date: d.do_date ?? null,
            inv_no: d.inv_no ?? null,
            inv_date: d.inv_date ?? null,
            grn_no: d.grn_no ?? null,
            grn_date: d.grn_date ?? null,
            upload_path: d.upload_path ?? null,
          } as any;
          
          const fileForThis = filesArr.find((f: any) => f && f.fieldname === `deliveries[0][upload_path]`);
          
          if (existingDeliveries.length > 0) {
            // Update the first (and should be only) existing delivery
            const existingDelivery = existingDeliveries[0];
            await purchaseModel.updateDelivery(Number(existingDelivery.id), payload);
            
            if (fileForThis && fileForThis.path) {
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
            if (fileForThis && fileForThis.path) {
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
              purchase_id: id,
              request_id: reqId,
              do_no: d.do_no ?? null,
              do_date: d.do_date ?? null,
              inv_no: d.inv_no ?? null,
              inv_date: d.inv_date ?? null,
              grn_no: d.grn_no ?? null,
              grn_date: d.grn_date ?? null,
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
              if (fileForThis && fileForThis.path) {
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
              if (fileForThis && fileForThis.path) {
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
      status: 'success',
      message: 'Purchase updated successfully',
      data: null
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        status: 'error',
        message: error.message,
        data: null
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update purchase',
        data: null
      });
    }
  }
};

export const deletePurchaseRequestItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deletePurchaseRequestItem(id);

    res.json({
      status: 'success',
      message: 'Purchase deleted successfully',
      data: null
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Purchase record not found') {
      res.status(404).json({
        status: 'error',
        message: error.message,
        data: null
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete purchase',
        data: null
      });
    }
  }
};

export const getPurchaseRequestItemSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await purchaseModel.getPurchaseRequestItemSummary(
      startDate as string,
      endDate as string
    );

    res.json({
      status: 'success',
      message: 'Purchase summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to retrieve purchase summary',
      data: null
    });
  }
};


// HELPER FUNCTION: Calculate purchase status based on process completion
const calculatePurchaseRequestItemStatus = (purchase: any): string => {
  // Completed only when a handover has been made (non-empty handover_to and valid handover_at)
  const handoverTo = (purchase as any).handover_to;
  const handoverAt = (purchase as any).handover_at;
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
function publicUrl(rawPath?: string | null): string | null {
  return toPublicUrl(rawPath || null);
}







/* ======= PURCHASE ASSET REGISTRY -- Asset Manager Scopes ======= */
export const createPurchaseAssetsRegistry = async (req: Request, res: Response) => {
  try {
    const { purchase_id, request_id, assets, created_by, updated_by } = req.body || {}; //
    const purchaseId = Number(purchase_id);
    if (!purchaseId || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload: purchase_id and non-empty assets[] are required', data: null });
    }
    const ids = await purchaseModel.createPurchaseAssetRegistryBatch(purchaseId, request_id, assets, created_by || null);

    // If the registry batch did not create/return ids for all provided assets, abort further processing.
    // This prevents creating master assets, updating handover, or sending notifications when registry insertion failed.
    if (!Array.isArray(ids) || ids.length !== assets.length) {
      const msg = `Failed to register all assets: expected=${assets.length} registered=${Array.isArray(ids) ? ids.length : 0}`;
      console.error('createPurchaseAssetsRegistry:', msg);
      return res.status(500).json({ status: 'error', message: msg, data: { expected: assets.length, registered: Array.isArray(ids) ? ids.length : 0 } });
    }

    // Also create master asset records in assets.assetdata
    try {
      await purchaseModel.createMasterAssetsFromRegistryBatch(purchaseId, assets);
    } catch (e) {
      console.error('registerPurchaseAssetsBatch: create master assets failed', e);
      // If creating master assets failed, we should not proceed to mark handover or send notifications.
      return res.status(500).json({ status: 'error', message: 'Failed to create master asset records', data: null });
    }

    // Update purchase handover fields
    try {
      const who = (typeof updated_by === 'string' && updated_by) ? updated_by : (typeof created_by === 'string' ? created_by : null);
      await purchaseModel.updatePurchaseRequestItemHandover(purchaseId, who ?? null);
    } catch (e) {
      console.error('registerPurchaseAssetsBatch: handover update failed', e);
      // If handover update failed, do not continue to notifications because state may be inconsistent.
      return res.status(500).json({ status: 'error', message: 'Failed to update handover state', data: null });
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
          ? (typeMap.get(itemTypeId) as any)?.name || String(itemTypeId)
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
            recipientName: r.name,
            prNo: purchase.pr_no || String(purchaseId),
            prDate: prDateFormatted,
            itemType: itemTypeName,
            items: purchase.items || null,
            brand: brandName,
            costcenterName,
            itemCount: Array.isArray(assets) ? assets.length : null,
            audience: 'procurement',
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
              recipientName: r.name,
              prNo: purchase.pr_no || String(purchaseId),
              prDate: prDateFormatted,
              itemType: itemTypeName,
              items: purchase.items || null,
              brand: brandName,
              costcenterName,
              itemCount: Array.isArray(assets) ? assets.length : null,
              audience: 'manager',
            });
            try { await sendMail(r.email, subjectMgr, html); } catch { }
          }
        }
      }
    } catch (notifyErr) {
      console.error('registerPurchaseAssetsBatch: notification error', notifyErr);
    }

    return res.status(201).json({ status: 'success', message: `Registered ${ids.length} assets for PR ${purchaseId}`, data: { pr_id: purchaseId, insertIds: ids } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to register assets', data: null });
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

    return res.json({ status: 'success', message: 'Purchase asset registry retrieved', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve registry', data: null });
  }
}

// PURCHASE ASSET REGISTRY — list by PR id
export const getPurchaseAssetRegistryByPrId = async (req: Request, res: Response) => {
  try {
    const purchaseId = Number((req.query.pr as string) || (req.params as any).pr);
    if (!purchaseId) {
      return res.status(400).json({ status: 'error', message: 'pr_id is required', data: null });
    }
    const rows = await purchaseModel.getPurchaseAssetRegistryByPrId(purchaseId);
    return res.json({ status: 'success', message: 'Purchase asset registry retrieved', data: rows });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve registry', data: null });
  }
};

/* ======= PURCHASE DELIVERIES ======= */
export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const rows = await purchaseModel.getDeliveries();
    res.json({ status: 'success', message: 'Deliveries retrieved', data: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve deliveries', data: null });
  }
};

export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rec = await purchaseModel.getDeliveryById(id);
    if (!rec) return res.status(404).json({ status: 'error', message: 'Delivery not found', data: null });
    res.json({ status: 'success', message: 'Delivery retrieved', data: rec });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve delivery', data: null });
  }
};

export const createDelivery = async (req: Request, res: Response) => {
  try {
    const payload: any = {
      purchase_id: req.body.purchase_id ? Number(req.body.purchase_id) : undefined,
      request_id: req.body.request_id ? Number(req.body.request_id) : undefined,
      do_no: req.body.do_no ?? null,
      do_date: req.body.do_date ?? null,
      inv_no: req.body.inv_no ?? null,
      inv_date: req.body.inv_date ?? null,
      grn_no: req.body.grn_no ?? null,
      grn_date: req.body.grn_date ?? null,
      upload_path: req.body.upload_path ?? null,
    };

    const insertId = await purchaseModel.createDelivery(payload);

    // handle uploaded file if present
    if ((req as any).file && (req as any).file.path) {
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

    res.status(201).json({ status: 'success', message: 'Delivery created', data: { id: insertId } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to create delivery', data: null });
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

    if ((req as any).file && (req as any).file.path) {
      const tempPath = (req as any).file.path as string;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      const filename = `delivery-${id}-${Date.now()}${ext}`;
      const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
      await safeMove(tempPath, destPath);
      payload.upload_path = toDbPath(PURCHASE_SUBDIR, filename);
    }

    await purchaseModel.updateDelivery(id, payload);
    res.json({ status: 'success', message: 'Delivery updated', data: null });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to update delivery', data: null });
  }
};

export const deleteDelivery = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deleteDelivery(id);
    res.json({ status: 'success', message: 'Delivery deleted', data: null });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to delete delivery', data: null });
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
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
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
      const requestedBy = r.ramco_id ? (empMap.get(r.ramco_id) ? { ramco_id: r.ramco_id, full_name: (empMap.get(r.ramco_id) as any)?.full_name || null } : { ramco_id: r.ramco_id, full_name: null }) : null;
      const costcenter = r.costcenter_id ? (ccMap.has(r.costcenter_id) ? { id: r.costcenter_id, name: ccMap.get(r.costcenter_id)?.name || null } : { id: r.costcenter_id, name: null }) : null;
      const department = r.department_id ? (deptMap.has(r.department_id) ? { id: r.department_id, name: deptMap.get(r.department_id)?.name || null } : { id: r.department_id, name: null }) : null;
      // Enrich items for this request
      const itemsRaw = itemsByRequestId.get(r.id) || [];
      const items = itemsRaw.map((it: any) => ({
        id: it.id,
        type: it.type_id && typeMap.has(it.type_id) ? { id: it.type_id, name: typeMap.get(it.type_id)?.name || null } : null,
        category: it.category_id && categoryMap.has(it.category_id) ? { id: it.category_id, name: categoryMap.get(it.category_id)?.name || null } : null,
        brand: it.brand_id && brandMap.has(it.brand_id) ? { id: it.brand_id, name: brandMap.get(it.brand_id)?.name || null } : null,
        qty: it.qty,
        description: it.items || it.description || null,
        purpose: it.purpose ?? null,
        supplier: it.supplier_id && supplierMap.has(it.supplier_id) ? { id: it.supplier_id, name: supplierMap.get(it.supplier_id)?.name || null } : null,
        unit_price: it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price).toFixed(2) : null,
        total_price: it.total_price !== undefined && it.total_price !== null ? Number(it.total_price).toFixed(2) : null,
        po_no: it.po_no ?? null,
        po_date: it.po_date ?? null,
        handover_to: it.handover_to ?? null,
        handover_at: it.handover_at ?? null,
      }));
      return {
        id: r.id,
        request_type: r.request_type ?? null,
        pr_no: r.pr_no ?? null,
        pr_date: r.pr_date ?? null,
        requested_by: requestedBy,
        costcenter: costcenter,
        department: department,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
        items,
      };
    });

    return res.json({ status: 'success', message: 'Purchase requests retrieved', data: enriched });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve purchase requests', data: null });
  }
};

export const getPurchaseRequestById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rec = await purchaseModel.getPurchaseRequestById(id);
    if (!rec) return res.status(404).json({ status: 'error', message: 'Purchase request not found', data: null });

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
    const departments = Array.isArray(departmentsRaw) ? departmentsRaw as any[] : [];
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
        id: it.id,
        type: it.type_id && typeMap.has(it.type_id) ? { id: it.type_id, name: typeMap.get(it.type_id)?.name || null } : null,
        category: it.category_id && categoryMap.has(it.category_id) ? { id: it.category_id, name: categoryMap.get(it.category_id)?.name || null } : null,
        brand: it.brand_id && brandMap.has(it.brand_id) ? { id: it.brand_id, name: brandMap.get(it.brand_id)?.name || null } : null,
        qty: it.qty,
        description: it.items || it.description || null,
        purpose: it.purpose ?? null,
        supplier: it.supplier_id && supplierMap.has(it.supplier_id) ? { id: it.supplier_id, name: supplierMap.get(it.supplier_id)?.name || null } : null,
        unit_price: it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price).toFixed(2) : null,
        total_price: it.total_price !== undefined && it.total_price !== null ? Number(it.total_price).toFixed(2) : null,
        pr_no: it.pr_no || null,
        pr_date: it.pr_date || null,
        po_no: it.po_no ?? null,
        po_date: it.po_date ?? null,
        handover_to: it.handover_to ?? null,
        handover_at: it.handover_at ?? null,
        created_at: it.created_at ?? null,
        updated_at: it.updated_at ?? null,
        deliveries: itemDeliveries.map((d: any) => ({
          id: d.id,
          purchase_id: d.purchase_id,
          request_id: d.request_id,
          do_no: d.do_no ?? null,
          do_date: d.do_date ?? null,
          inv_no: d.inv_no ?? null,
          inv_date: d.inv_date ?? null,
          grn_no: d.grn_no ?? null,
          grn_date: d.grn_date ?? null,
          upload_path: d.upload_path ?? null,
          upload_url: publicUrl(d.upload_path),
          created_at: d.created_at ?? null,
          updated_at: d.updated_at ?? null,
        })),
      };
    });

    // Reuse previously loaded lookup maps (employeeMap, ccMap, deptMap) to enrich the request
    const requestedBy = rec.ramco_id ? (employeeMap.get(rec.ramco_id) ? { ramco_id: rec.ramco_id, full_name: (employeeMap.get(rec.ramco_id) as any)?.full_name || null } : { ramco_id: rec.ramco_id, full_name: null }) : null;
    const reqCostcenter = rec.costcenter_id ? (ccMap.has(rec.costcenter_id) ? { id: rec.costcenter_id, name: ccMap.get(rec.costcenter_id)?.name || null } : { id: rec.costcenter_id, name: null }) : null;
    const reqDept = rec.department_id ? (deptMap.has(rec.department_id) ? { id: rec.department_id, name: deptMap.get(rec.department_id)?.name || null } : { id: rec.department_id, name: null }) : null;

    const enrichedRec = {
      id: rec.id,
      pr_no: rec.pr_no ?? null,
      pr_date: rec.pr_date ?? null,
      request_type: rec.request_type ?? null,
      requested_by: requestedBy,
      costcenter: reqCostcenter,
      department: reqDept,
      created_at: rec.created_at ?? null,
      updated_at: rec.updated_at ?? null,
      items: itemsNormalized,
    };

    return res.json({ status: 'success', message: 'Purchase request retrieved', data: enrichedRec });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve purchase request', data: null });
  }
};

export const createPurchaseRequest = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const payload: any = {
      pr_no: body.pr_no ?? null,
      pr_date: String(body.pr_date || '').trim(),
      request_type: String(body.request_type || '').trim(),
      ramco_id: String(body.ramco_id || '').trim(),
      costcenter_id: Number(body.costcenter_id),
    };
    if (!payload.pr_date || !payload.request_type || !payload.ramco_id || !payload.costcenter_id) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields', data: null });
    }
    const id = await purchaseModel.createPurchaseRequest(payload);
    return res.status(201).json({ status: 'success', message: 'Purchase request created', data: { id } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to create purchase request', data: null });
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
    return res.json({ status: 'success', message: 'Purchase request updated' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to update purchase request' });
  }
};

export const deletePurchaseRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deletePurchaseRequest(id);
    return res.json({ status: 'success', message: 'Purchase request deleted' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to delete purchase request' });
  }
};

/* ======= SUPPLIERS ======= */
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await purchaseModel.getSuppliers();
    res.json({
      status: 'success',
      message: 'Suppliers retrieved successfully',
      data: suppliers
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to retrieve suppliers',
      data: null
    });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await purchaseModel.getSupplierById(Number(id));
    if (!supplier) {
      return res.status(404).json({
        status: 'error',
        message: 'Supplier not found',
        data: null
      });
    }
    res.json({
      status: 'success',
      message: 'Supplier retrieved successfully',
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to retrieve supplier',
      data: null
    });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const supplierData = req.body;
    const newSupplierId = await purchaseModel.createSupplier(supplierData);
    res.status(201).json({
      status: 'success',
      message: 'Supplier created successfully',
      data: { id: newSupplierId }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create supplier',
      data: null
    });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplierData = req.body;
    await purchaseModel.updateSupplier(Number(id), supplierData);
    res.json({
      status: 'success',
      message: 'Supplier updated successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update supplier',
      data: null
    });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await purchaseModel.deleteSupplier(Number(id));
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Supplier not found',
        data: null
      });
    }
    res.json({
      status: 'success',
      message: 'Supplier deleted successfully',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete supplier',
      data: null
    });
  }
};
