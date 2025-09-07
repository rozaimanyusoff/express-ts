import { Request, Response } from 'express';
import path from 'path';
import * as assetModel from '../p.asset/assetModel';
import * as userModel from '../p.user/userModel';
import { promises as fsPromises } from 'fs';
import * as purchaseModel from './purchaseModel';
import { PurchaseRecord } from './purchaseModel';
import { sendMail } from '../utils/mailer';
import { renderPurchaseNotification } from '../utils/emailTemplates/purchaseNotification';
import { createPurchaseAssetRegistryBatch, getPurchaseAssetRegistryByPrId, markPurchaseHandover, createMasterAssetsFromRegistryBatch } from './purchaseModel';
import { renderPurchaseRegistryCompleted } from '../utils/emailTemplates/purchaseRegistryCompleted';
import dayjs from 'dayjs';

// Define procurement admins here (comma-separated RAMCO IDs)
const PROCUREMENT_ADMINS = 'mraco_id,ramco_id';

// module_directory for this module's uploads
const PURCHASE_SUBDIR = 'purchases';
import { buildStoragePath, safeMove, toDbPath, toPublicUrl } from '../utils/uploadUtil';
import { createPurchaseRequestItems, getLastPrNoByDate, getLastPrNoByLatestDate, PurchaseRequestItemRecord } from './purchaseModel';

// GET ALL PURCHASES
export const getPurchases = async (req: Request, res: Response) => {
  try {
    const { status, costcenter, supplier, startDate, endDate, dateField } = req.query;
    let purchases: PurchaseRecord[] = [];

    // Filter by status if provided
    if (status && typeof status === 'string') {
      purchases = await purchaseModel.getPurchasesByStatus(status);
    }
    // Filter by cost center if provided
    else if (costcenter && typeof costcenter === 'string') {
      purchases = await purchaseModel.getPurchasesByCostCenter(costcenter);
    }
    // Filter by supplier if provided
    else if (supplier && typeof supplier === 'string') {
      purchases = await purchaseModel.getPurchasesBySupplier(supplier);
    }
    // Filter by date range if provided
    else if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const field = (dateField as any) || 'pr_date';
      purchases = await purchaseModel.getPurchasesByDateRange(startDate, endDate, field);
    }
    // Get all purchases
    else {
      purchases = await purchaseModel.getPurchases();
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
    const [typesRaw, costcentersRaw, suppliersRaw, employeesRaw, brandsRaw] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCostcenters(),
      purchaseModel.getSuppliers(),
      assetModel.getEmployees(),
      assetModel.getBrands()
    ]);
    const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const typeMap = new Map(types.map((t: any) => [t.id, t]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const supplierMap = new Map((Array.isArray(suppliersRaw) ? suppliersRaw : []).map((s: any) => [s.id, s]));
    const employeeMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));

    // Calculate derived status for each purchase, add upload_url and resolve costcenter/type
    const enrichedPurchases = purchases.map(purchase => {
      // remove raw costcenter and type_id from response
      const { costcenter, costcenter_id, type_id, supplier, supplier_id, brand_id, ramco_id, ...rest } = purchase as any;
      return {
        ...rest,
        status: calculatePurchaseStatus(purchase),
        upload_url: publicUrl(purchase.upload_path),
        costcenter: purchase.costcenter_id && ccMap.has(purchase.costcenter_id) ? { id: purchase.costcenter_id, name: ccMap.get(purchase.costcenter_id)?.name || null } : null,
        type: purchase.type_id && typeMap.has(purchase.type_id) ? { id: purchase.type_id, name: typeMap.get(purchase.type_id)?.name || null } : null,
        supplier: purchase.supplier_id && supplierMap.has(purchase.supplier_id) ? { id: purchase.supplier_id, name: supplierMap.get(purchase.supplier_id)?.name || null } : null,
        brand: purchase.brand_id && brandMap.has(purchase.brand_id) ? { id: purchase.brand_id, name: brandMap.get(purchase.brand_id)?.name || null } : null,
        requestor: purchase.ramco_id && employeeMap.has(purchase.ramco_id) ? { ramco_id: purchase.ramco_id, full_name: (employeeMap.get(purchase.ramco_id) as any)?.full_name || null } : null
      };
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

// GET PURCHASE BY ID
export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const purchase = await purchaseModel.getPurchaseById(id);

    if (!purchase) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase not found',
        data: null
      });
    }

    // Fetch costcenters and types to enrich the single purchase response
    const [typesRaw, costcentersRaw, suppliersRaw, employeesRaw, brandsRaw] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCostcenters(),
      purchaseModel.getSuppliers(),
      assetModel.getEmployees(),
      assetModel.getBrands()
    ]);
    const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const typeMap = new Map(types.map((t: any) => [t.id, t]));
    const ccMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const supplierMap = new Map((Array.isArray(suppliersRaw) ? suppliersRaw : []).map((s: any) => [s.id, s]));
    const employeesArr = Array.isArray(employeesRaw) ? employeesRaw : [];
    const employeeMap = new Map(employeesArr.map((e: any) => [e.ramco_id, e]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));

    // Add derived status, upload_url, and resolved costcenter/type
    const { costcenter, costcenter_id, type_id, supplier, supplier_id, brand_id, ramco_id, ...rest } = purchase as any;
    const enrichedPurchase = {
      ...rest,
      status: calculatePurchaseStatus(purchase),
      upload_url: publicUrl(purchase.upload_path),
      costcenter_detail: purchase.costcenter_id && ccMap.has(purchase.costcenter_id) ? { id: purchase.costcenter_id, name: ccMap.get(purchase.costcenter_id)?.name || null } : null,
      type_detail: purchase.type_id && typeMap.has(purchase.type_id) ? { id: purchase.type_id, name: typeMap.get(purchase.type_id)?.name || null } : null,
      supplier: purchase.supplier_id && supplierMap.has(purchase.supplier_id) ? { id: purchase.supplier_id, name: supplierMap.get(purchase.supplier_id)?.name || null } : null,
      brand: purchase.brand_id && brandMap.has(purchase.brand_id) ? { id: purchase.brand_id, name: brandMap.get(purchase.brand_id)?.name || null } : null,
      requestor: purchase.ramco_id && employeeMap.has(purchase.ramco_id) ? { ramco_id: purchase.ramco_id, full_name: (employeeMap.get(purchase.ramco_id) as any)?.full_name || null } : null
    };

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

// CREATE PURCHASE
export const createPurchase = async (req: Request, res: Response) => {
  try {
    const purchaseData: Omit<PurchaseRecord, 'id' | 'created_at' | 'updated_at'> = {
      request_type: req.body.request_type,
      costcenter: req.body.costcenter,
      costcenter_id: req.body.costcenter_id,
      pic: req.body.pic,
      ramco_id: req.body.ramco_id,
      item_type: req.body.item_type,
      type_id: req.body.type_id ? Number(req.body.type_id) : undefined,
      items: req.body.items,
      supplier: req.body.supplier,
      supplier_id: req.body.supplier_id ? Number(req.body.supplier_id) : undefined,
      brand: req.body.brand,
      brand_id: req.body.brand_id ? Number(req.body.brand_id) : undefined,
      qty: Number(req.body.qty),
      unit_price: Number(req.body.unit_price),
      total_price: Number(req.body.total_price),
      pr_date: req.body.pr_date,
      pr_no: req.body.pr_no,
      po_date: req.body.po_date,
      po_no: req.body.po_no,
      do_date: req.body.do_date,
      do_no: req.body.do_no,
      inv_date: req.body.inv_date,
      inv_no: req.body.inv_no,
      grn_date: req.body.grn_date,
      grn_no: req.body.grn_no
    };

    // If a file was uploaded by multer, we'll rename it after insert to include the module id

    // Auto-calculate total_price if not provided
    if (!purchaseData.total_price && purchaseData.qty && purchaseData.unit_price) {
      purchaseData.total_price = purchaseData.qty * purchaseData.unit_price;
    }

    // Insert first to obtain ID (two-step upload flow)
    const insertId = await purchaseModel.createPurchase(purchaseData);

    // If a file was uploaded, rename and update stored path to include module id
    if ((req as any).file && (req as any).file.path) {
      const tempPath = (req as any).file.path as string;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      const filename = `purchase-${insertId}-${Date.now()}${ext}`;
      const destPath = await buildStoragePath(PURCHASE_SUBDIR, filename);
      const destDir = path.dirname(destPath);
      await fsPromises.mkdir(destDir, { recursive: true }).catch(() => { });
      await safeMove(tempPath, destPath);
      await purchaseModel.updatePurchase(insertId, { upload_path: toDbPath(PURCHASE_SUBDIR, filename) } as any);
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
      data: { id: insertId }
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

// UPDATE PURCHASE
export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Build update data from request body
    const updateData: Partial<Omit<PurchaseRecord, 'id' | 'created_at' | 'updated_at'>> = {};

    if (req.body.request_type !== undefined) updateData.request_type = req.body.request_type;
    if (req.body.costcenter !== undefined) updateData.costcenter = req.body.costcenter;
    if (req.body.costcenter_id !== undefined) updateData.costcenter_id = req.body.costcenter_id;
    if (req.body.pic !== undefined) updateData.pic = req.body.pic;
    if (req.body.ramco_id !== undefined) updateData.ramco_id = req.body.ramco_id;
    if (req.body.item_type !== undefined) updateData.item_type = req.body.item_type;
    if (req.body.type_id !== undefined) updateData.type_id = Number(req.body.type_id);
    if (req.body.items !== undefined) updateData.items = req.body.items;
    if (req.body.supplier !== undefined) updateData.supplier = req.body.supplier;
    if (req.body.supplier_id !== undefined) updateData.supplier_id = Number(req.body.supplier_id);
    if (req.body.brand !== undefined) updateData.brand = req.body.brand;
    if (req.body.brand_id !== undefined) updateData.brand_id = Number(req.body.brand_id);
    if (req.body.qty !== undefined) updateData.qty = Number(req.body.qty);
    if (req.body.unit_price !== undefined) updateData.unit_price = Number(req.body.unit_price);
    if (req.body.total_price !== undefined) updateData.total_price = Number(req.body.total_price);
    if (req.body.pr_date !== undefined) updateData.pr_date = req.body.pr_date;
    if (req.body.pr_no !== undefined) updateData.pr_no = req.body.pr_no;
    if (req.body.po_date !== undefined) updateData.po_date = req.body.po_date;
    if (req.body.po_no !== undefined) updateData.po_no = req.body.po_no;
    if (req.body.do_date !== undefined) updateData.do_date = req.body.do_date;
    if (req.body.do_no !== undefined) updateData.do_no = req.body.do_no;
    if (req.body.inv_date !== undefined) updateData.inv_date = req.body.inv_date;
    if (req.body.inv_no !== undefined) updateData.inv_no = req.body.inv_no;
    if (req.body.grn_date !== undefined) updateData.grn_date = req.body.grn_date;
    if (req.body.grn_no !== undefined) updateData.grn_no = req.body.grn_no;

    // If a file was uploaded, perform move/rename into canonical storage and update DB
    if ((req as any).file && (req as any).file.path) {
      const tempPath = (req as any).file.path as string;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      const filename = `purchase-${id}-${Date.now()}${ext}`;
      // Attempt to remove previous file if existed
      try {
        const existing = await purchaseModel.getPurchaseById(id);
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

    // Auto-calculate total_price if qty or unit_price is updated
    if ((updateData.qty !== undefined || updateData.unit_price !== undefined) && updateData.total_price === undefined) {
      const existingPurchase = await purchaseModel.getPurchaseById(id);
      if (existingPurchase) {
        const qty = updateData.qty !== undefined ? updateData.qty : existingPurchase.qty;
        const unit_price = updateData.unit_price !== undefined ? updateData.unit_price : existingPurchase.unit_price;
        updateData.total_price = qty * unit_price;
      }
    }

    await purchaseModel.updatePurchase(id, updateData);

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

// DELETE PURCHASE
export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await purchaseModel.deletePurchase(id);

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

// BULK IMPORT PURCHASES
export const importPurchases = async (req: Request, res: Response) => {
  try {
    const purchases: Omit<PurchaseRecord, 'id' | 'created_at' | 'updated_at'>[] = req.body;

    if (!Array.isArray(purchases) || purchases.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid import data. Expected array of purchase records.',
        data: null
      });
    }

    // Validate and process each purchase
    const processedPurchases = purchases.map(purchase => {
      // Auto-calculate total_price if not provided
      if (!purchase.total_price && purchase.qty && purchase.unit_price) {
        purchase.total_price = purchase.qty * purchase.unit_price;
      }
      return purchase;
    });

    const insertIds = await purchaseModel.bulkInsertPurchases(processedPurchases);

    res.json({
      status: 'success',
      message: `Successfully imported ${insertIds.length} out of ${purchases.length} purchase records`,
      data: {
        imported: insertIds.length,
        total: purchases.length,
        insertIds
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to import purchases',
      data: null
    });
  }
};

// GET PURCHASE SUMMARY
export const getPurchaseSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await purchaseModel.getPurchaseSummary(
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
const calculatePurchaseStatus = (purchase: PurchaseRecord): string => {
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
function normalizeStoredPath(filePath?: string | null): string | null {
  if (!filePath) return null;
  const filename = path.basename(String(filePath).replace(/\\/g, '/'));
  return toDbPath(PURCHASE_SUBDIR, filename);
}

/* ======= SUPPLIER QUERIES ======= */
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

// CREATE PURCHASE REQUEST ITEMS
// Body example:
// {
//   request_type: "OPEX",
//   pr_date: "2025-09-07",
//   costcenter_id: "26",
//   department_id: "16",
//   position_id: "2",
//   ramco_id: "000277",
//   request_items: [
//     { type_id: "5", description: "Desktop computer", qty: 1, purpose: "Replacement" },
//     { type_id: "9", description: "24\" monitor", qty: 2, purpose: "New staff" }
//   ],
//   items: "Desktop computer; 24\" monitor",
//   qty: 3
// }
export const createPurchaseRequestItemsHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const header = {
      request_type: String(body.request_type || '').trim(),
      pr_date: String(body.pr_date || '').trim(),
      costcenter_id: Number(body.costcenter_id),
      department_id: Number(body.department_id),
      position_id: body.position_id !== undefined && body.position_id !== null ? Number(body.position_id) : null,
      ramco_id: String(body.ramco_id || '').trim(),
    };
    const itemsRaw = Array.isArray(body.request_items) ? body.request_items : [];
    type ReqItem = { type_id: number; category_id?: number | null; description: string; qty: number; purpose?: string | null };
    const items: ReqItem[] = itemsRaw
      .map((it: any): ReqItem => ({
        type_id: Number(it.type_id),
        category_id: it.category_id !== undefined && it.category_id !== null ? Number(it.category_id) : null,
        description: String(it.description || ''),
        qty: Number(it.qty || 0),
        purpose: it.purpose !== undefined ? String(it.purpose) : null,
      }))
      .filter((it: ReqItem) => !!it.type_id && !!it.description && it.qty > 0);

    if (!header.request_type || !header.pr_date || !header.costcenter_id || !header.department_id || !header.ramco_id) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields', data: null });
    }
    if (items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'request_items is required and must be non-empty', data: null });
    }

    // Determine last PR number using the latest pr_date in purchase_data (not the payload date)
    const latest = await getLastPrNoByLatestDate();
    const lastPrNo = latest.pr_no;
    const baseDate = latest.pr_date || header.pr_date;
    // Compute next PR number (numeric increment if possible, else start at '1')
    const nextPrNo = (() => {
      const n = lastPrNo && /^\d+$/.test(String(lastPrNo)) ? Number(lastPrNo) : null;
      if (n !== null) return String(n + 1);
      return '1';
    })();

    // Store items
    const insertIds = await createPurchaseRequestItems({ ...header, pr_no: nextPrNo, pr_date: baseDate }, items);

    // Prepare and send notifications to requestor and asset managers
    try {
      // Lookups
      const [employeesRaw, managersRaw, typesRaw, costcentersRaw] = await Promise.all([
        assetModel.getEmployees(),
        assetModel.getAssetManagers(),
        assetModel.getTypes(),
        assetModel.getCostcenters(),
      ]);
      const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];
      const empByRamco = new Map(employees.map((e: any) => [String(e.ramco_id), e]));
      const types = Array.isArray(typesRaw) ? typesRaw as any[] : [];
      const typeById = new Map(types.map((t: any) => [Number(t.id), t]));
      const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
      const ccById = new Map(costcenters.map((c: any) => [Number(c.id), c]));

      const typeNums: number[] = items.map((i: ReqItem) => Number(i.type_id)).filter((n: number) => !Number.isNaN(n));
      const uniqueTypeIds: number[] = Array.from(new Set<number>(typeNums));
      const itemTypeName = uniqueTypeIds.length === 1
        ? (typeById.get(uniqueTypeIds[0])?.name || String(uniqueTypeIds[0]))
        : (uniqueTypeIds.length > 1 ? 'Multiple Types' : null);
      const costcenterName = ccById.get(Number(header.costcenter_id))?.name || null;
      const itemsSummary = items.map((i: ReqItem) => `${i.description} (x${i.qty})`).join('; ');

      const subject = `Purchase Request Created — PR ${nextPrNo}`;
      const htmlFor = (recipientName?: string | null) => renderPurchaseNotification({
        recipientName: recipientName || null,
        prNo: nextPrNo,
        prDate: baseDate,
        requestType: header.request_type,
        itemType: itemTypeName,
        items: itemsSummary,
        brand: null,
        costcenterName,
      });

      // Requestor
      const requestor = empByRamco.get(String(header.ramco_id));
      const requestorEmail = requestor?.email || null;
      const requestorName = requestor?.full_name || requestor?.name || null;
      if (requestorEmail) {
        try { await sendMail(requestorEmail, subject, htmlFor(requestorName)); } catch {}
      }

      // Asset managers for each unique type_id
      const managersArr: any[] = Array.isArray(managersRaw) ? managersRaw as any[] : [];
      const managerRamcos = new Set<string>();
      for (const tid of uniqueTypeIds) {
        managersArr
          .filter((m: any) => Number(m.manager_id) === Number(tid))
          .filter((m: any) => m.is_active === 1 || m.is_active === '1' || m.is_active === true || m.is_active === null || m.is_active === undefined)
          .forEach((m: any) => managerRamcos.add(String(m.ramco_id)));
      }
      for (const rid of managerRamcos) {
        const mgr = empByRamco.get(rid);
        const email = mgr?.email || null;
        const name = mgr?.full_name || mgr?.name || null;
        if (email) {
          try { await sendMail(email, subject, htmlFor(name)); } catch {}
        }
      }
    } catch (notifyErr) {
      // non-blocking
    }

    return res.status(201).json({
      status: 'success',
      message: 'Purchase request items created',
      data: {
        insertIds,
        last_pr_no: lastPrNo,
        pr_no: nextPrNo,
        pr_date: baseDate,
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to create request items', data: null });
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

// PURCHASE ASSET REGISTRY — batch insert
export const registerPurchaseAssetsBatch = async (req: Request, res: Response) => {
  try {
    const { pr_id, assets, created_by, updated_by } = req.body || {};
    const prIdNum = Number(pr_id);
    if (!prIdNum || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload: pr_id and non-empty assets[] are required', data: null });
    }
    const ids = await createPurchaseAssetRegistryBatch(prIdNum, assets, created_by || null);
    // Also create master asset records in assets.assetdata
    try {
      await createMasterAssetsFromRegistryBatch(prIdNum, assets);
    } catch (e) {
      console.error('registerPurchaseAssetsBatch: create master assets failed', e);
    }

    // Update purchase handover fields
    try {
      const who = (typeof updated_by === 'string' && updated_by) ? updated_by : (typeof created_by === 'string' ? created_by : null);
      await markPurchaseHandover(prIdNum, who ?? null);
    } catch (e) {
      console.error('registerPurchaseAssetsBatch: handover update failed', e);
    }

    // Notify procurement admins and asset managers
    try {
      // Load purchase and lookups
      const purchase = await purchaseModel.getPurchaseById(prIdNum);
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
        const subjectAdmin = `Assets Registered — PR ${purchase.pr_no || prIdNum}`;
        for (const r of procurementRecipients) {
          const html = renderPurchaseRegistryCompleted({
            recipientName: r.name,
            prNo: purchase.pr_no || String(prIdNum),
            prDate: prDateFormatted,
            itemType: itemTypeName,
            items: purchase.items || null,
            brand: brandName,
            costcenterName,
            itemCount: Array.isArray(assets) ? assets.length : null,
            audience: 'procurement',
          });
          try { await sendMail(r.email, subjectAdmin, html); } catch {}
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
          const subjectMgr = `Registration Successful — PR ${purchase.pr_no || prIdNum}`;
          for (const r of managerRecipients) {
            const html = renderPurchaseRegistryCompleted({
              recipientName: r.name,
              prNo: purchase.pr_no || String(prIdNum),
              prDate: prDateFormatted,
              itemType: itemTypeName,
              items: purchase.items || null,
              brand: brandName,
              costcenterName,
              itemCount: Array.isArray(assets) ? assets.length : null,
              audience: 'manager',
            });
            try { await sendMail(r.email, subjectMgr, html); } catch {}
          }
        }
      }
    } catch (notifyErr) {
      console.error('registerPurchaseAssetsBatch: notification error', notifyErr);
    }

    return res.status(201).json({ status: 'success', message: `Registered ${ids.length} assets for PR ${prIdNum}`, data: { pr_id: prIdNum, insertIds: ids } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to register assets', data: null });
  }
};

// PURCHASE ASSET REGISTRY — list by PR id
export const getPurchaseAssetRegistry = async (req: Request, res: Response) => {
  try {
    const prIdNum = Number((req.query.pr_id as string) || (req.params as any).pr_id);
    if (!prIdNum) {
      return res.status(400).json({ status: 'error', message: 'pr_id is required', data: null });
    }
    const rows = await getPurchaseAssetRegistryByPrId(prIdNum);
    return res.json({ status: 'success', message: 'Purchase asset registry retrieved', data: rows });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to retrieve registry', data: null });
  }
};
