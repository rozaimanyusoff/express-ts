import { Request, Response } from 'express';
import * as purchaseModel from './purchaseModel';
import { PurchaseRecord } from './purchaseModel';

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

    // Calculate derived status for each purchase
    const enrichedPurchases = purchases.map(purchase => ({
      ...purchase,
      status: calculatePurchaseStatus(purchase)
    }));

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

    // Add derived status
    const enrichedPurchase = {
      ...purchase,
      status: calculatePurchaseStatus(purchase)
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
      pic: req.body.pic,
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

    // Auto-calculate total_price if not provided
    if (!purchaseData.total_price && purchaseData.qty && purchaseData.unit_price) {
      purchaseData.total_price = purchaseData.qty * purchaseData.unit_price;
    }

    const insertId = await purchaseModel.createPurchase(purchaseData);

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
    if (req.body.pic !== undefined) updateData.pic = req.body.pic;
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
  if (purchase.grn_no) return 'completed';
  if (purchase.inv_no) return 'invoiced';
  if (purchase.do_no) return 'delivered';
  if (purchase.po_no) return 'ordered';
  if (purchase.pr_no) return 'requested';
  return 'draft';
};
