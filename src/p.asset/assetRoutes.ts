import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import invalidateAssetCache from '../utils/cacheInvalidation';
import * as assetController from './assetController';

const router = Router();

// Middleware to invalidate cache on write operations (POST, PUT, DELETE)
const cacheInvalidationMiddleware = asyncHandler(async (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function (data: any) {
      // Invalidate cache after sending response
      invalidateAssetCache().catch(err => {
        console.error('Cache invalidation failed:', err);
      });
      return originalJson.call(this, data);
    };
  }
  next();
});

router.use(cacheInvalidationMiddleware);

/**
 * @swagger
 * tags:
 *   - name: Asset Types
 *     description: Asset type management
 *   - name: Asset Categories
 *     description: Asset category management
 *   - name: Asset Brands
 *     description: Asset brand management
 *   - name: Asset Models
 *     description: Asset model management
 *   - name: Asset Spec Properties
 *     description: Asset specification property management
 *   - name: Asset Departments
 *     description: Department management
 *   - name: Asset Positions
 *     description: Position management
 *   - name: Asset Sections
 *     description: Section management
 *   - name: Asset Cost Centers
 *     description: Cost center management
 *   - name: Asset Employees
 *     description: Employee management
 *   - name: Asset Districts
 *     description: District management
 *   - name: Asset Zones
 *     description: Zone management
 *   - name: Asset Modules
 *     description: Module management
 *   - name: Asset Sites
 *     description: Site management
 *   - name: Asset Softwares
 *     description: Software management
 *   - name: Asset Transfers
 *     description: Asset transfer request management
 *   - name: Asset Transfer Items
 *     description: Asset transfer item management
 *   - name: Asset Transfer Checklist
 *     description: Transfer checklist management
 *   - name: Asset Managers
 *     description: Asset manager management
 *   - name: Asset Brand-Category
 *     description: Brand to category relationship management
 *   - name: Asset Locations
 *     description: Location management
 *   - name: Assets
 *     description: Core asset registry management
 */

// TYPES

/**
 * @swagger
 * /assets/types:
 *   get:
 *     summary: Get all asset types
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of asset types
 *       401:
 *         description: Unauthorized
 */
router.get('/types', asyncHandler(assetController.getTypes));

/**
 * @swagger
 * /assets/types/{id}:
 *   get:
 *     summary: Get asset type by ID
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset type object
 *       404:
 *         description: Not found
 */
router.get('/types/:id', asyncHandler(assetController.getTypeById));

/**
 * @swagger
 * /assets/types:
 *   post:
 *     summary: Create a new asset type
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset type created
 */
router.post('/types', asyncHandler(assetController.createType));

/**
 * @swagger
 * /assets/types/{id}:
 *   put:
 *     summary: Update an asset type
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Asset type updated
 */
router.put('/types/:id', asyncHandler(assetController.updateType));

/**
 * @swagger
 * /assets/types/{id}:
 *   delete:
 *     summary: Delete an asset type
 *     tags: [Asset Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset type deleted
 */
router.delete('/types/:id', asyncHandler(assetController.deleteType));

// CATEGORIES

/**
 * @swagger
 * /assets/categories:
 *   get:
 *     summary: Get all asset categories
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Comma-separated type IDs to filter by
 *     responses:
 *       200:
 *         description: List of asset categories
 */
router.get('/categories', asyncHandler(assetController.getCategories)); // ?type={type_id1,type_id2}

/**
 * @swagger
 * /assets/categories/{id}:
 *   get:
 *     summary: Get asset category by ID
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset category object
 */
router.get('/categories/:id', asyncHandler(assetController.getCategoryById));

/**
 * @swagger
 * /assets/categories:
 *   post:
 *     summary: Create a new asset category
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/categories', asyncHandler(assetController.createCategory));

/**
 * @swagger
 * /assets/categories/{id}:
 *   put:
 *     summary: Update an asset category
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/categories/:id', asyncHandler(assetController.updateCategory));

/**
 * @swagger
 * /assets/categories/{id}:
 *   delete:
 *     summary: Delete an asset category
 *     tags: [Asset Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/categories/:id', asyncHandler(assetController.deleteCategory));

// BRANDS

/**
 * @swagger
 * /assets/brands:
 *   get:
 *     summary: Get all asset brands
 *     tags: [Asset Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *         description: Filter by type ID
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated category IDs
 *     responses:
 *       200:
 *         description: List of brands
 */
router.get('/brands', asyncHandler(assetController.getBrands)); // ?type={type_id}&categories={category_id1,category_id2}

/**
 * @swagger
 * /assets/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Asset Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Brand object
 */
router.get('/brands/:id', asyncHandler(assetController.getBrandById));

/**
 * @swagger
 * /assets/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Asset Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Brand created
 */
router.post('/brands', asyncHandler(assetController.createBrand));

/**
 * @swagger
 * /assets/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Asset Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Brand updated
 */
router.put('/brands/:id', asyncHandler(assetController.updateBrand));

/**
 * @swagger
 * /assets/brands/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Asset Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Brand deleted
 */
router.delete('/brands/:id', asyncHandler(assetController.deleteBrand));

// MODELS

/**
 * @swagger
 * /assets/models:
 *   get:
 *     summary: Get all asset models
 *     tags: [Asset Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *         description: Filter by type ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Comma-separated brand IDs
 *     responses:
 *       200:
 *         description: List of models
 */
router.get('/models', asyncHandler(assetController.getModels)); // ?type={type_id}&brand={brand_id1,brand_id2}

/**
 * @swagger
 * /assets/models/{id}:
 *   get:
 *     summary: Get model by ID
 *     tags: [Asset Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Model object
 */
router.get('/models/:id', asyncHandler(assetController.getModelById));

/**
 * @swagger
 * /assets/models:
 *   post:
 *     summary: Create a new asset model
 *     tags: [Asset Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Model created
 */
router.post('/models', asyncHandler(assetController.createModel));

/**
 * @swagger
 * /assets/models/{id}:
 *   put:
 *     summary: Update an asset model
 *     tags: [Asset Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Model updated
 */
router.put('/models/:id', asyncHandler(assetController.updateModel));

/**
 * @swagger
 * /assets/models/{id}:
 *   delete:
 *     summary: Delete an asset model
 *     tags: [Asset Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Model deleted
 */
router.delete('/models/:id', asyncHandler(assetController.deleteModel));

// SPEC PROPERTIES (master table)

/**
 * @swagger
 * /assets/spec-properties:
 *   get:
 *     summary: Get all spec properties
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *         description: Filter by asset type ID
 *     responses:
 *       200:
 *         description: List of spec properties
 */
router.get('/spec-properties', asyncHandler(assetController.getSpecProperties)); // ?type={type_id}

/**
 * @swagger
 * /assets/spec-properties:
 *   post:
 *     summary: Create a new spec property
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Spec property created
 */
router.post('/spec-properties', asyncHandler(assetController.createSpecProperty));

/**
 * @swagger
 * /assets/spec-properties/{id}/apply:
 *   post:
 *     summary: Apply a spec property (ALTER TABLE) for a given type
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Spec property applied
 */
// Trigger applying metadata to the per-type spec table (ALTER TABLE)
router.post('/spec-properties/:id/apply', asyncHandler(assetController.applySpecProperty));

/**
 * @swagger
 * /assets/spec-properties/apply-pending:
 *   post:
 *     summary: Apply all pending spec properties
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *         description: Optional type filter
 *     responses:
 *       200:
 *         description: Pending spec properties applied
 */
// Apply all pending spec properties (optionally filter by ?type=)
router.post('/spec-properties/apply-pending', asyncHandler(assetController.applyPendingSpecProperties));

/**
 * @swagger
 * /assets/spec-properties/{id}:
 *   put:
 *     summary: Update a spec property
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Spec property updated
 */
router.put('/spec-properties/:id', asyncHandler(assetController.updateSpecProperty));

/**
 * @swagger
 * /assets/spec-properties/{id}:
 *   delete:
 *     summary: Delete a spec property
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Spec property deleted
 */
router.delete('/spec-properties/:id', asyncHandler(assetController.deleteSpecProperty));

// ASSET SPECS (per-asset type-specific specs)

/**
 * @swagger
 * /assets/specs/{asset_id}:
 *   put:
 *     summary: Update asset basic specs for a specific asset
 *     tags: [Asset Spec Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asset_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Asset specs updated
 */
router.put('/specs/:asset_id', asyncHandler(assetController.updateAssetBasicSpecs));


// DEPARTMENTS

/**
 * @swagger
 * /assets/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Asset Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get('/departments', asyncHandler(assetController.getDepartments));

/**
 * @swagger
 * /assets/departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Asset Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Department object
 */
router.get('/departments/:id', asyncHandler(assetController.getDepartmentById));

/**
 * @swagger
 * /assets/departments:
 *   post:
 *     summary: Create a department
 *     tags: [Asset Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/departments', asyncHandler(assetController.createDepartment));

/**
 * @swagger
 * /assets/departments/{id}:
 *   put:
 *     summary: Update a department
 *     tags: [Asset Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/departments/:id', asyncHandler(assetController.updateDepartment));

/**
 * @swagger
 * /assets/departments/{id}:
 *   delete:
 *     summary: Delete a department
 *     tags: [Asset Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Department deleted
 */
router.delete('/departments/:id', asyncHandler(assetController.deleteDepartment));

// POSITIONS

/**
 * @swagger
 * /assets/positions:
 *   get:
 *     summary: Get all positions
 *     tags: [Asset Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of positions
 */
router.get('/positions', asyncHandler(assetController.getPositions));

/**
 * @swagger
 * /assets/positions/{id}:
 *   get:
 *     summary: Get position by ID
 *     tags: [Asset Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Position object
 */
router.get('/positions/:id', asyncHandler(assetController.getPositionById));

/**
 * @swagger
 * /assets/positions:
 *   post:
 *     summary: Create a position
 *     tags: [Asset Positions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Position created
 */
router.post('/positions', asyncHandler(assetController.createPosition));

/**
 * @swagger
 * /assets/positions/{id}:
 *   put:
 *     summary: Update a position
 *     tags: [Asset Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Position updated
 */
router.put('/positions/:id', asyncHandler(assetController.updatePosition));

/**
 * @swagger
 * /assets/positions/{id}:
 *   delete:
 *     summary: Delete a position
 *     tags: [Asset Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Position deleted
 */
router.delete('/positions/:id', asyncHandler(assetController.deletePosition));

// SECTIONS

/**
 * @swagger
 * /assets/sections:
 *   get:
 *     summary: Get all sections
 *     tags: [Asset Sections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sections
 */
router.get('/sections', asyncHandler(assetController.getSections));

/**
 * @swagger
 * /assets/sections/{id}:
 *   get:
 *     summary: Get section by ID
 *     tags: [Asset Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Section object
 */
router.get('/sections/:id', asyncHandler(assetController.getSectionById));

/**
 * @swagger
 * /assets/sections:
 *   post:
 *     summary: Create a section
 *     tags: [Asset Sections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Section created
 */
router.post('/sections', asyncHandler(assetController.createSection));

/**
 * @swagger
 * /assets/sections/{id}:
 *   put:
 *     summary: Update a section
 *     tags: [Asset Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Section updated
 */
router.put('/sections/:id', asyncHandler(assetController.updateSection));

/**
 * @swagger
 * /assets/sections/{id}:
 *   delete:
 *     summary: Delete a section
 *     tags: [Asset Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Section deleted
 */
router.delete('/sections/:id', asyncHandler(assetController.deleteSection));

// COSTCENTERS

/**
 * @swagger
 * /assets/costcenters:
 *   get:
 *     summary: Get all cost centers
 *     tags: [Asset Cost Centers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cost centers
 */
router.get('/costcenters', asyncHandler(assetController.getCostcenters));

/**
 * @swagger
 * /assets/costcenters/{id}:
 *   get:
 *     summary: Get cost center by ID
 *     tags: [Asset Cost Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cost center object
 */
router.get('/costcenters/:id', asyncHandler(assetController.getCostcenterById));

/**
 * @swagger
 * /assets/costcenters:
 *   post:
 *     summary: Create a cost center
 *     tags: [Asset Cost Centers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Cost center created
 */
router.post('/costcenters', asyncHandler(assetController.createCostcenter));

/**
 * @swagger
 * /assets/costcenters/{id}:
 *   put:
 *     summary: Update a cost center
 *     tags: [Asset Cost Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cost center updated
 */
router.put('/costcenters/:id', asyncHandler(assetController.updateCostcenter));

/**
 * @swagger
 * /assets/costcenters/{id}:
 *   delete:
 *     summary: Delete a cost center
 *     tags: [Asset Cost Centers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cost center deleted
 */
router.delete('/costcenters/:id', asyncHandler(assetController.deleteCostcenter));

// EMPLOYEES

/**
 * @swagger
 * /assets/employees/search:
 *   get:
 *     summary: Search employees
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term (name, email, ramco_id, etc.)
 *     responses:
 *       200:
 *         description: Matching employees
 */
router.get('/employees/search', asyncHandler(assetController.searchEmployees));

/**
 * @swagger
 * /assets/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee object
 */
router.get('/employees/:id', asyncHandler(assetController.getEmployeeById));

/**
 * @swagger
 * /assets/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 */
router.get('/employees', asyncHandler(assetController.getEmployees));

/**
 * @swagger
 * /assets/employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Employee created
 */
router.post('/employees', asyncHandler(assetController.createEmployee));

/**
 * @swagger
 * /assets/employees/update-resign:
 *   put:
 *     summary: Bulk update employee resignation status by ramco_id list
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ramco_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Employee resignations updated
 */
// Bulk update resignation by ramco_id list
router.put('/employees/update-resign', asyncHandler(assetController.updateEmployeeResignation));

/**
 * @swagger
 * /assets/employees/{id}:
 *   put:
 *     summary: Update an employee
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Employee updated
 */
router.put('/employees/:id', asyncHandler(assetController.updateEmployee));

/**
 * @swagger
 * /assets/employees/{id}:
 *   delete:
 *     summary: Delete an employee
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee deleted
 */
router.delete('/employees/:id', asyncHandler(assetController.deleteEmployee));

/**
 * @swagger
 * /assets/employees/ramco/{ramco_id}:
 *   get:
 *     summary: Get employee by Ramco ID
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ramco_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee object
 */
router.get('/employees/ramco/:ramco_id', asyncHandler(assetController.getEmployeeByRamco));

/**
 * @swagger
 * /assets/employees/email/{email}:
 *   get:
 *     summary: Get employee by email
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee object
 */
router.get('/employees/email/:email', asyncHandler(assetController.getEmployeeByEmail));

/**
 * @swagger
 * /assets/employees/contact/{contact}:
 *   get:
 *     summary: Get employee by contact number
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contact
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee object
 */
router.get('/employees/contact/:contact', asyncHandler(assetController.getEmployeeByContact));

/**
 * @swagger
 * /assets/employees/lookup/{username}:
 *   get:
 *     summary: Lookup employee by username
 *     tags: [Asset Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee object
 */
router.get('/employees/lookup/:username', asyncHandler(assetController.getEmployeeByUsername));


// DISTRICTS

/**
 * @swagger
 * /assets/districts:
 *   get:
 *     summary: Get all districts
 *     tags: [Asset Districts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of districts
 */
router.get('/districts', asyncHandler(assetController.getDistricts));

/**
 * @swagger
 * /assets/districts/{id}:
 *   get:
 *     summary: Get district by ID
 *     tags: [Asset Districts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: District object
 */
router.get('/districts/:id', asyncHandler(assetController.getDistrictById));

/**
 * @swagger
 * /assets/districts:
 *   post:
 *     summary: Create a district
 *     tags: [Asset Districts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: District created
 */
router.post('/districts', asyncHandler(assetController.createDistrict));

/**
 * @swagger
 * /assets/districts/{id}:
 *   put:
 *     summary: Update a district
 *     tags: [Asset Districts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: District updated
 */
router.put('/districts/:id', asyncHandler(assetController.updateDistrict));

/**
 * @swagger
 * /assets/districts/{id}:
 *   delete:
 *     summary: Delete a district
 *     tags: [Asset Districts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: District deleted
 */
router.delete('/districts/:id', asyncHandler(assetController.deleteDistrict));

// ZONES

/**
 * @swagger
 * /assets/zones:
 *   get:
 *     summary: Get all zones
 *     tags: [Asset Zones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of zones
 */
router.get('/zones', asyncHandler(assetController.getZones));

/**
 * @swagger
 * /assets/zones/{id}:
 *   get:
 *     summary: Get zone by ID
 *     tags: [Asset Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zone object
 */
router.get('/zones/:id', asyncHandler(assetController.getZoneById));

/**
 * @swagger
 * /assets/zones:
 *   post:
 *     summary: Create a zone
 *     tags: [Asset Zones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Zone created
 */
router.post('/zones', asyncHandler(assetController.createZone));

/**
 * @swagger
 * /assets/zones/{id}:
 *   put:
 *     summary: Update a zone
 *     tags: [Asset Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Zone updated
 */
router.put('/zones/:id', asyncHandler(assetController.updateZone));

/**
 * @swagger
 * /assets/zones/{id}:
 *   delete:
 *     summary: Delete a zone
 *     tags: [Asset Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zone deleted
 */
router.delete('/zones/:id', asyncHandler(assetController.deleteZone));

// MODULES

/**
 * @swagger
 * /assets/modules:
 *   get:
 *     summary: Get all modules
 *     tags: [Asset Modules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of modules
 */
router.get('/modules', asyncHandler(assetController.getModules));

/**
 * @swagger
 * /assets/modules/{id}:
 *   get:
 *     summary: Get module by ID
 *     tags: [Asset Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Module object
 */
router.get('/modules/:id', asyncHandler(assetController.getModuleById));

/**
 * @swagger
 * /assets/modules:
 *   post:
 *     summary: Create a module
 *     tags: [Asset Modules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Module created
 */
router.post('/modules', asyncHandler(assetController.createModule));

/**
 * @swagger
 * /assets/modules/{id}:
 *   put:
 *     summary: Update a module
 *     tags: [Asset Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Module updated
 */
router.put('/modules/:id', asyncHandler(assetController.updateModule));

/**
 * @swagger
 * /assets/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Asset Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Module deleted
 */
router.delete('/modules/:id', asyncHandler(assetController.deleteModule));

// SITES

/**
 * @swagger
 * /assets/sites:
 *   get:
 *     summary: Get all sites
 *     tags: [Asset Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sites
 */
router.get('/sites', asyncHandler(assetController.getSites));

/**
 * @swagger
 * /assets/sites/{id}:
 *   get:
 *     summary: Get site by ID
 *     tags: [Asset Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Site object
 */
router.get('/sites/:id', asyncHandler(assetController.getSiteById));

/**
 * @swagger
 * /assets/sites:
 *   post:
 *     summary: Create a site
 *     tags: [Asset Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Site created
 */
router.post('/sites', asyncHandler(assetController.createSite));

/**
 * @swagger
 * /assets/sites/{id}:
 *   put:
 *     summary: Update a site
 *     tags: [Asset Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Site updated
 */
router.put('/sites/:id', asyncHandler(assetController.updateSite));

/**
 * @swagger
 * /assets/sites/{id}:
 *   delete:
 *     summary: Delete a site
 *     tags: [Asset Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Site deleted
 */
router.delete('/sites/:id', asyncHandler(assetController.deleteSite));

// SOFTWARES

/**
 * @swagger
 * /assets/softwares:
 *   get:
 *     summary: Get all softwares
 *     tags: [Asset Softwares]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of softwares
 */
router.get('/softwares', asyncHandler(assetController.getSoftwares));

/**
 * @swagger
 * /assets/softwares/{id}:
 *   get:
 *     summary: Get software by ID
 *     tags: [Asset Softwares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Software object
 */
router.get('/softwares/:id', asyncHandler(assetController.getSoftwareById));

/**
 * @swagger
 * /assets/softwares:
 *   post:
 *     summary: Create a software record
 *     tags: [Asset Softwares]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Software created
 */
router.post('/softwares', asyncHandler(assetController.createSoftware));

/**
 * @swagger
 * /assets/softwares/{id}:
 *   put:
 *     summary: Update a software record
 *     tags: [Asset Softwares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Software updated
 */
router.put('/softwares/:id', asyncHandler(assetController.updateSoftware));

/**
 * @swagger
 * /assets/softwares/{id}:
 *   delete:
 *     summary: Delete a software record
 *     tags: [Asset Softwares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Software deleted
 */
router.delete('/softwares/:id', asyncHandler(assetController.deleteSoftware));


// ASSET TRANSFER ITEMS (direct access)

/**
 * @swagger
 * /assets/transfers/items:
 *   get:
 *     summary: Get all asset transfer items
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all transfer items
 */
router.get('/transfers/items', asyncHandler(assetController.getAssetTransferItems)); // all items

/**
 * @swagger
 * /assets/transfers/{id}/items:
 *   get:
 *     summary: Get transfer items for a specific transfer
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transfer ID
 *       - in: query
 *         name: new_owner
 *         schema:
 *           type: string
 *         description: Filter by new owner ramco_id
 *     responses:
 *       200:
 *         description: Transfer items for the given transfer
 */
router.get('/transfers/:id/items', asyncHandler(assetController.getAssetTransferItemsByTransfer)); // items for a specific transfer (?new_owner={ramco_id} to filter by new owner)

/**
 * @swagger
 * /assets/transfers/{transferId}/items/{itemId}:
 *   get:
 *     summary: Get enriched single item within a transfer
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transfer item detail
 */
router.get('/transfers/:transferId/items/:itemId', asyncHandler(assetController.getAssetTransferItemByTransfer)); // enriched single item within transfer

/**
 * @swagger
 * /assets/transfers/{id}/items:
 *   post:
 *     summary: Add an item to a transfer
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Transfer item created
 */
router.post('/transfers/:id/items', asyncHandler(assetController.createAssetTransferItem));

/**
 * @swagger
 * /assets/transfer-items/{itemId}:
 *   get:
 *     summary: Get a single transfer item by item ID
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transfer item object
 */
router.get('/transfer-items/:itemId', asyncHandler(assetController.getAssetTransferItem));

/**
 * @swagger
 * /assets/transfer-items/{itemId}:
 *   put:
 *     summary: Update a transfer item
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Transfer item updated
 */
router.put('/transfer-items/:itemId', asyncHandler(assetController.updateAssetTransferItem));

/**
 * @swagger
 * /assets/transfer-items/{itemId}:
 *   delete:
 *     summary: Remove a transfer item
 *     tags: [Asset Transfer Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transfer item deleted
 */
router.delete('/transfer-items/:itemId', asyncHandler(assetController.deleteAssetTransferItem));

// ASSET TRANSFER REQUESTS
const acceptanceUploader = createUploader('assets/transfers/acceptance');

/**
 * @swagger
 * /assets/transfers/{id}:
 *   get:
 *     summary: Get asset transfer by ID
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transfer object
 */
router.get('/transfers/:id', asyncHandler(assetController.getAssetTransferById));

/**
 * @swagger
 * /assets/transfers:
 *   get:
 *     summary: Get all asset transfers
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: dept
 *         schema:
 *           type: string
 *       - in: query
 *         name: requester
 *         schema:
 *           type: string
 *       - in: query
 *         name: supervisor
 *         schema:
 *           type: string
 *       - in: query
 *         name: hod
 *         schema:
 *           type: string
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of asset transfers
 */
router.get('/transfers', asyncHandler(assetController.getAssetTransfers)); // ?status=&dept=&requester=&supervisor=&hod=&from_date=&to_date=

/**
 * @swagger
 * /assets/transfers:
 *   post:
 *     summary: Create a new asset transfer request
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Transfer request created
 */
router.post('/transfers', asyncHandler(assetController.createAssetTransfer));

/**
 * @swagger
 * /assets/transfers/approval:
 *   put:
 *     summary: Bulk or individual approval of asset transfers
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transfer_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfers approved/rejected
 */
router.put('/transfers/approval', asyncHandler(assetController.updateAssetTransfersApproval)); // bulk/individual approval

/**
 * @swagger
 * /assets/transfers/{id}/acceptance:
 *   put:
 *     summary: Set acceptance for a transfer with optional attachment uploads
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               attachment1:
 *                 type: string
 *                 format: binary
 *               attachment2:
 *                 type: string
 *                 format: binary
 *               attachment3:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Transfer acceptance set
 */
router.put('/transfers/:id/acceptance', acceptanceUploader.fields([
  { name: 'attachment1', maxCount: 1 },
  { name: 'attachment2', maxCount: 1 },
  { name: 'attachment3', maxCount: 1 }
]), asyncHandler(assetController.setAssetTransferAcceptance)); // implement in asset-transfer-acceptance-portal

/**
 * @swagger
 * /assets/transfers/{id}:
 *   put:
 *     summary: Update an asset transfer
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Transfer updated
 */
router.put('/transfers/:id', asyncHandler(assetController.updateAssetTransfer));

/**
 * @swagger
 * /assets/transfers/{id}:
 *   delete:
 *     summary: Delete an asset transfer
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transfer deleted
 */
router.delete('/transfers/:id', asyncHandler(assetController.deleteAssetTransfer));

// TRANSFER COMMITMENT (Phase 2)

/**
 * @swagger
 * /assets/transfer-commit/{transfer_id}:
 *   post:
 *     summary: Asset Manager commits accepted transfers
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transfer_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transfer committed
 */
router.post('/transfer-commit/:transfer_id', asyncHandler(assetController.commitTransfer)); // Asset Manager commits accepted transfers (POST /transfer-commit/{transfer_id})

/**
 * @swagger
 * /assets/transfer-commit/pending:
 *   get:
 *     summary: Get uncommitted transfers (requires type_id filter)
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset type ID to filter by
 *     responses:
 *       200:
 *         description: List of uncommitted transfers
 */
router.get('/transfer-commit/pending', asyncHandler(assetController.getUncommittedTransfers)); // REQUIRED: ?type_id=1 to filter by asset type

// RESEND APPROVAL NOTIFICATION

/**
 * @swagger
 * /assets/transfers/{id}/resend-approval-notification:
 *   post:
 *     summary: Resend approval notification email for a transfer
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval notification resent
 */
router.post('/transfers/:id/resend-approval-notification', asyncHandler(assetController.resendApprovalNotification));

// RESEND ACCEPTANCE NOTIFICATION

/**
 * @swagger
 * /assets/transfers/{id}/resend-acceptance-notification:
 *   post:
 *     summary: Resend acceptance notification email for a transfer
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Acceptance notification resent
 */
router.post('/transfers/:id/resend-acceptance-notification', asyncHandler(assetController.resendAcceptanceNotification));

// ASSET TRANSFER APPROVAL (for supervisor approve/reject buttons)

/**
 * @swagger
 * /assets/transfer-requests/{id}/approval:
 *   post:
 *     summary: Supervisor approves or rejects a transfer request
 *     tags: [Asset Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval status updated
 */
router.post('/transfer-requests/:id/approval', asyncHandler(assetController.updateAssetTransferApprovalStatusById));



// EMAIL APPROVAL/REJECTION LINKS

/**
 * @swagger
 * /assets/asset-transfer/approve:
 *   get:
 *     summary: Approve asset transfer via email link (no auth required)
 *     tags: [Asset Transfers]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT token embedded in approval email link
 *     responses:
 *       200:
 *         description: Transfer approved
 *       400:
 *         description: Invalid or expired token
 */
router.get('/asset-transfer/approve', asyncHandler(assetController.approveAssetTransferByEmail));

/**
 * @swagger
 * /assets/asset-transfer/reject:
 *   get:
 *     summary: Reject asset transfer via email link (no auth required)
 *     tags: [Asset Transfers]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT token embedded in rejection email link
 *     responses:
 *       200:
 *         description: Transfer rejected
 *       400:
 *         description: Invalid or expired token
 */
router.get('/asset-transfer/reject', asyncHandler(assetController.rejectAssetTransferByEmail));

// TRANSFER CHECKLIST

/**
 * @swagger
 * /assets/transfer-checklist:
 *   get:
 *     summary: Get all transfer checklist items
 *     tags: [Asset Transfer Checklist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of checklist items
 */
router.get('/transfer-checklist', asyncHandler(assetController.getTransferChecklist));

/**
 * @swagger
 * /assets/transfer-checklist/{id}:
 *   get:
 *     summary: Get transfer checklist item by ID
 *     tags: [Asset Transfer Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Checklist item
 */
router.get('/transfer-checklist/:id', asyncHandler(assetController.getTransferChecklistById));

/**
 * @swagger
 * /assets/transfer-checklist:
 *   post:
 *     summary: Create a transfer checklist item
 *     tags: [Asset Transfer Checklist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Checklist item created
 */
router.post('/transfer-checklist', asyncHandler(assetController.createTransferChecklist));

/**
 * @swagger
 * /assets/transfer-checklist/{id}:
 *   put:
 *     summary: Update a transfer checklist item
 *     tags: [Asset Transfer Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Checklist item updated
 */
router.put('/transfer-checklist/:id', asyncHandler(assetController.updateTransferChecklist));

/**
 * @swagger
 * /assets/transfer-checklist/{id}:
 *   delete:
 *     summary: Delete a transfer checklist item
 *     tags: [Asset Transfer Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Checklist item deleted
 */
router.delete('/transfer-checklist/:id', asyncHandler(assetController.deleteTransferChecklist));

// ASSET MANAGERS

/**
 * @swagger
 * /assets/managers:
 *   get:
 *     summary: Get all asset managers
 *     tags: [Asset Managers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of asset managers
 */
router.get('/managers', asyncHandler(assetController.getAssetManagers));

/**
 * @swagger
 * /assets/managers/{id}:
 *   get:
 *     summary: Get asset manager by ID
 *     tags: [Asset Managers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset manager object
 */
router.get('/managers/:id', asyncHandler(assetController.getAssetManagerById));

/**
 * @swagger
 * /assets/managers:
 *   post:
 *     summary: Create an asset manager
 *     tags: [Asset Managers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Asset manager created
 */
router.post('/managers', asyncHandler(assetController.createAssetManager));

/**
 * @swagger
 * /assets/managers/{id}:
 *   put:
 *     summary: Update an asset manager
 *     tags: [Asset Managers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Asset manager updated
 */
router.put('/managers/:id', asyncHandler(assetController.updateAssetManager));

/**
 * @swagger
 * /assets/managers/{id}:
 *   delete:
 *     summary: Delete an asset manager
 *     tags: [Asset Managers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset manager deleted
 */
router.delete('/managers/:id', asyncHandler(assetController.deleteAssetManager));

// BRAND-CATEGORY RELATIONSHIP

/**
 * @swagger
 * /assets/brands/{brand_code}/categories/{category_code}:
 *   post:
 *     summary: Assign a category to a brand
 *     tags: [Asset Brand-Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brand_code
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: category_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Category assigned to brand
 */
router.post('/brands/:brand_code/categories/:category_code', asyncHandler(assetController.assignCategoryToBrand));

/**
 * @swagger
 * /assets/brands/{brand_code}/categories/{category_code}:
 *   delete:
 *     summary: Unassign a category from a brand
 *     tags: [Asset Brand-Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brand_code
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: category_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category unassigned from brand
 */
router.delete('/brands/:brand_code/categories/:category_code', asyncHandler(assetController.unassignCategoryFromBrand));

/**
 * @swagger
 * /assets/brands/{brand_code}/categories:
 *   get:
 *     summary: Get all categories for a brand
 *     tags: [Asset Brand-Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brand_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of categories for the brand
 */
router.get('/brands/:brand_code/categories', asyncHandler(assetController.getCategoriesForBrand));

/**
 * @swagger
 * /assets/categories/{category_code}/brands:
 *   get:
 *     summary: Get all brands for a category
 *     tags: [Asset Brand-Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of brands for the category
 */
router.get('/categories/:category_code/brands', asyncHandler(assetController.getBrandsForCategory));

/**
 * @swagger
 * /assets/brand-category-mappings:
 *   get:
 *     summary: Get all brand-category associations
 *     tags: [Asset Brand-Category]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All brand-category mappings
 */
// Get all brand-category associations (for frontend mapping)
router.get('/brand-category-mappings', asyncHandler(assetController.getAllBrandCategoryMappings));

// LOCATIONS

/**
 * @swagger
 * /assets/locations:
 *   get:
 *     summary: Get all locations
 *     tags: [Asset Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of locations
 */
router.get('/locations', asyncHandler(assetController.getLocations));

/**
 * @swagger
 * /assets/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Asset Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location object
 */
router.get('/locations/:id', asyncHandler(assetController.getLocationById));

/**
 * @swagger
 * /assets/locations:
 *   post:
 *     summary: Create a location
 *     tags: [Asset Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Location created
 */
router.post('/locations', asyncHandler(assetController.createLocation));

/**
 * @swagger
 * /assets/locations/{id}:
 *   put:
 *     summary: Update a location
 *     tags: [Asset Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Location updated
 */
router.put('/locations/:id', asyncHandler(assetController.updateLocation));

/**
 * @swagger
 * /assets/locations/{id}:
 *   delete:
 *     summary: Delete a location
 *     tags: [Asset Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location deleted
 */
router.delete('/locations/:id', asyncHandler(assetController.deleteLocation));

// BY EMPLOYEE, SUPERVISOR, HOD (deprecated; use unified /api/assets with query params)

// ASSETS

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: Get all assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *         description: Filter by asset type ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by record status
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Filter by owner ramco_id
 *       - in: query
 *         name: dept
 *         schema:
 *           type: integer
 *         description: Filter by department ID
 *     responses:
 *       200:
 *         description: List of assets
 */
router.get('/', asyncHandler(assetController.getAssets));

/**
 * @swagger
 * /assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset object
 *       404:
 *         description: Asset not found
 */
router.get('/:id', asyncHandler(assetController.getAssetById));

/**
 * @swagger
 * /assets:
 *   post:
 *     summary: Create a new asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Asset created
 */
router.post('/', asyncHandler(assetController.createAsset));

/**
 * @swagger
 * /assets/register-batch:
 *   post:
 *     summary: Batch register purchased assets into the registry
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assets:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Assets batch registered
 */
// Batch register purchased assets into registry table (purchases.purchase_asset_registry)
router.post('/register-batch', asyncHandler(assetController.registerAssetsBatch));

/**
 * @swagger
 * /assets/{id}:
 *   put:
 *     summary: Update an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Asset updated
 */
router.put('/:id', asyncHandler(assetController.updateAsset));

/**
 * @swagger
 * /assets/{id}/update-status:
 *   put:
 *     summary: Update asset status with audit trail
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classification:
 *                 type: string
 *               record_status:
 *                 type: string
 *               condition_status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset status updated
 */
// Update asset status (classification, record_status, condition_status) with audit trail
router.put('/:id/update-status', asyncHandler(assetController.updateAssetStatus));

/**
 * @swagger
 * /assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset deleted
 */
router.delete('/:id', asyncHandler(assetController.deleteAsset));


export default router;
