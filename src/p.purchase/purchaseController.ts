import { Request, Response } from 'express';
import path from 'path';
import * as assetModel from '../p.asset/assetModel';
import { promises as fsPromises } from 'fs';
import * as purchaseModel from './purchaseModel';
import { PurchaseRecord } from './purchaseModel';

// Keep purchase subfolder consistent across uploader, DB, and public URL
const PURCHASE_SUBDIR = 'purchases/docs';

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
      items: req.body.items,
      supplier: req.body.supplier,
      brand: req.body.brand,
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

    // If a file was uploaded by multer, store the DB-friendly path using our subdir
    if ((req as any).file && (req as any).file.path) {
      const filename = path.basename((req as any).file.path);
      (purchaseData as any).upload_path = `upload/${PURCHASE_SUBDIR}/${filename}`;
    }

    // Auto-calculate total_price if not provided
    if (!purchaseData.total_price && purchaseData.qty && purchaseData.unit_price) {
      purchaseData.total_price = purchaseData.qty * purchaseData.unit_price;
    }

    // Insert first to obtain ID (two-step upload flow)
    const insertId = await purchaseModel.createPurchase(purchaseData);

    // No further file move needed: multer already placed the file in the correct directory

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
    if (req.body.items !== undefined) updateData.items = req.body.items;
    if (req.body.supplier !== undefined) updateData.supplier = req.body.supplier;
    if (req.body.brand !== undefined) updateData.brand = req.body.brand;
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
      const filename = path.basename((req as any).file.path);
      // Attempt to remove previous file if existed
      try {
        const existing = await purchaseModel.getPurchaseById(id);
        if (existing && existing.upload_path) {
          const prevFilename = path.basename(existing.upload_path);
          const base = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : path.join(process.cwd(), 'uploads');
          const prevFull = path.join(base, PURCHASE_SUBDIR, prevFilename);
          await fsPromises.unlink(prevFull).catch(() => {});
        }
      } catch {
        // ignore errors
      }
      updateData.upload_path = `upload/${PURCHASE_SUBDIR}/${filename}`;
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
  // Completed only when a release has been made (non-empty released_to and valid released_at)
  const hasReleasedTo = purchase.released_to !== undefined && purchase.released_to !== null && String(purchase.released_to).trim() !== '';
  const releasedAt = purchase.released_at ?? null;
  const releasedAtInvalid = !releasedAt || String(releasedAt) === '0000-00-00' || String(releasedAt) === '0000-00-00 00:00:00';
  if (hasReleasedTo && !releasedAtInvalid) return 'completed';

  // If GRN exists but release hasn't happened yet, consider it delivered
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
  if (!rawPath) return null;
  const baseUrl = process.env.BACKEND_URL || '';
  // Ensure we produce BACKEND_URL/upload/purchases/<filename>
  const filename = path.basename(String(rawPath).replace(/\\/g, '/'));
  const normalized = `upload/${PURCHASE_SUBDIR}/${filename}`;
  return `${baseUrl.replace(/\/$/, '')}/${normalized.replace(/^\/+/, '')}`;
}
function normalizeStoredPath(filePath?: string | null): string | null {
  if (!filePath) return null;
  // Normalize to a canonical storage path: upload/purchases/<filename>
  const filename = path.basename(String(filePath).replace(/\\/g, '/'));
  return `upload/${PURCHASE_SUBDIR}/${filename}`;
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
