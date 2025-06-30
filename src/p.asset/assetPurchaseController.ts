import { Request, Response } from 'express';
import * as assetPurchaseModel from './assetPurchaseModel';
import * as assetModel from './assetModel';

// Helper function to map asset purchase with related data
const mapAssetPurchaseWithDetails = async (assetPurchases: any[]) => {
  // Get all unique IDs for batch fetching
  const assetIds = [...new Set(assetPurchases.map(ap => ap.asset_id).filter(Boolean))];
  const departmentIds = [...new Set(assetPurchases.map(ap => ap.department_id).filter(Boolean))];
  const costcenterIds = [...new Set(assetPurchases.map(ap => ap.costcenter_id).filter(Boolean))];
  const ramcoIds = [...new Set(assetPurchases.map(ap => ap.ramco_id).filter(Boolean))];

  // Batch fetch related data
  const [assets, departments, costcenters, employees] = await Promise.all([
    assetIds.length > 0 ? assetModel.getAssetsByIds(assetIds) : [],
    Promise.all(departmentIds.map(id => assetModel.getDepartmentById(id))),
    Promise.all(costcenterIds.map(id => assetModel.getCostcenterById(id))),
    Promise.all(ramcoIds.map(id => assetModel.getEmployeeByRamco(id.toString())))
  ]);

  // Create lookup maps
  const assetMap = new Map((assets as any[]).map(a => [a.id, a]));
  const departmentMap = new Map(departments.filter(Boolean).map((d: any) => [d.id, d]));
  const costcenterMap = new Map(costcenters.filter(Boolean).map((cc: any) => [cc.id, cc]));
  const employeeMap = new Map(employees.filter(Boolean).map((e: any) => [e.ramco_id, e]));

  // Map asset purchases with related data
  return assetPurchases.map(ap => ({
    ...ap,
    asset: assetMap.get(ap.asset_id) || null,
    department: departmentMap.get(ap.department_id) || null,
    costcenter: costcenterMap.get(ap.costcenter_id) || null,
    employee: employeeMap.get(ap.ramco_id) || null
  }));
};

// Get all asset purchases
export const getAssetPurchases = async (req: Request, res: Response) => {
  try {
    const rows = await assetPurchaseModel.getAssetPurchases();
    const mappedData = await mapAssetPurchaseWithDetails(rows as any[]);
    
    res.json({
      status: 'success',
      message: 'Asset purchases retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve asset purchases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get asset purchase by ID
export const getAssetPurchaseById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid asset purchase ID',
        data: null
      });
    }

    const row = await assetPurchaseModel.getAssetPurchaseById(id);
    if (!row) {
      return res.status(404).json({
        status: 'error',
        message: 'Asset purchase not found',
        data: null
      });
    }

    const mappedData = await mapAssetPurchaseWithDetails([row]);

    res.json({
      status: 'success',
      message: 'Asset purchase retrieved successfully',
      data: mappedData[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve asset purchase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get asset purchases by asset ID
export const getAssetPurchasesByAssetId = async (req: Request, res: Response) => {
  try {
    const assetId = Number(req.params.assetId);
    if (isNaN(assetId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid asset ID',
        data: null
      });
    }

    const rows = await assetPurchaseModel.getAssetPurchasesByAssetId(assetId);
    const mappedData = await mapAssetPurchaseWithDetails(rows as any[]);
    
    res.json({
      status: 'success',
      message: 'Asset purchases retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve asset purchases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get asset purchases by department
export const getAssetPurchasesByDepartment = async (req: Request, res: Response) => {
  try {
    const departmentId = Number(req.params.departmentId);
    if (isNaN(departmentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid department ID',
        data: null
      });
    }

    const rows = await assetPurchaseModel.getAssetPurchasesByDepartment(departmentId);
    const mappedData = await mapAssetPurchaseWithDetails(rows as any[]);
    
    res.json({
      status: 'success',
      message: 'Asset purchases retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve asset purchases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get asset purchases by cost center
export const getAssetPurchasesByCostCenter = async (req: Request, res: Response) => {
  try {
    const costcenterId = Number(req.params.costcenterId);
    if (isNaN(costcenterId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid cost center ID',
        data: null
      });
    }

    const rows = await assetPurchaseModel.getAssetPurchasesByCostCenter(costcenterId);
    const mappedData = await mapAssetPurchaseWithDetails(rows as any[]);
    
    res.json({
      status: 'success',
      message: 'Asset purchases retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve asset purchases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get asset purchases by employee
export const getAssetPurchasesByEmployee = async (req: Request, res: Response) => {
  try {
    const ramcoId = Number(req.params.ramcoId);
    if (isNaN(ramcoId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid employee RAMCO ID',
        data: null
      });
    }

    const rows = await assetPurchaseModel.getAssetPurchasesByEmployee(ramcoId);
    const mappedData = await mapAssetPurchaseWithDetails(rows as any[]);
    
    res.json({
      status: 'success',
      message: 'Asset purchases retrieved successfully',
      data: mappedData
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve asset purchases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create asset purchase
export const createAssetPurchase = async (req: Request, res: Response) => {
  try {
    const assetPurchaseData: assetPurchaseModel.AssetPurchase = req.body;

    // Validate required fields
    if (!assetPurchaseData.asset_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Asset ID is required',
        data: null
      });
    }

    const result = await assetPurchaseModel.createAssetPurchase(assetPurchaseData);
    
    if (result.affectedRows > 0) {
      const newAssetPurchase = await assetPurchaseModel.getAssetPurchaseById(result.insertId);
      const mappedData = await mapAssetPurchaseWithDetails([newAssetPurchase]);
      
      res.status(201).json({
        status: 'success',
        message: 'Asset purchase created successfully',
        data: mappedData[0]
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Failed to create asset purchase',
        data: null
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create asset purchase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update asset purchase
export const updateAssetPurchase = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid asset purchase ID',
        data: null
      });
    }

    const assetPurchaseData: assetPurchaseModel.AssetPurchase = req.body;

    // Check if asset purchase exists
    const existingAssetPurchase = await assetPurchaseModel.getAssetPurchaseById(id);
    if (!existingAssetPurchase) {
      return res.status(404).json({
        status: 'error',
        message: 'Asset purchase not found',
        data: null
      });
    }

    // Validate required fields
    if (!assetPurchaseData.asset_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Asset ID is required',
        data: null
      });
    }

    const result = await assetPurchaseModel.updateAssetPurchase(id, assetPurchaseData);
    
    if (result.affectedRows > 0) {
      const updatedAssetPurchase = await assetPurchaseModel.getAssetPurchaseById(id);
      const mappedData = await mapAssetPurchaseWithDetails([updatedAssetPurchase]);
      
      res.json({
        status: 'success',
        message: 'Asset purchase updated successfully',
        data: mappedData[0]
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Failed to update asset purchase',
        data: null
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update asset purchase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete asset purchase
export const deleteAssetPurchase = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid asset purchase ID',
        data: null
      });
    }

    // Check if asset purchase exists
    const existingAssetPurchase = await assetPurchaseModel.getAssetPurchaseById(id);
    if (!existingAssetPurchase) {
      return res.status(404).json({
        status: 'error',
        message: 'Asset purchase not found',
        data: null
      });
    }

    const result = await assetPurchaseModel.deleteAssetPurchase(id);
    
    if (result.affectedRows > 0) {
      res.json({
        status: 'success',
        message: 'Asset purchase deleted successfully',
        data: null
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Failed to delete asset purchase',
        data: null
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete asset purchase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
