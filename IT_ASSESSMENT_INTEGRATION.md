# IT Assets with Assessment Status Integration

## Overview
New endpoint that combines IT hardware assets with their assessment status, showing which IT devices have been assessed and which haven't.

## New Endpoint

### GET `/api/compliance/it-assets-status`

Returns all IT assets (identified by `type_id = 1`) with combined assessment information.

#### Request Parameters
- `assessment_year` (optional): Filter by specific assessment year
- `assessed_only` (optional): Set to `true` to show only assessed assets
- `not_assessed_only` (optional): Set to `true` to show only assets without assessments

#### Response Structure
```json
{
  "status": "success",
  "message": "X IT asset(s) retrieved with assessment status",
  "data": [
    {
      "asset": {
        "age": 2,
        "asset_code": null,
        "brand": {
          "id": 7,
          "name": "HP"
        },
        "category": {
          "id": 3,
          "name": "Laptop"
        },
        "classification": "non-asset",
        "condition_status": null,
        "costcenter": {
          "id": 22,
          "name": "DBTLDM"
        },
        "department": {
          "id": 1,
          "name": "BD"
        },
        "disposed_date": null,
        "entry_code": "10658",
        "id": 1295,
        "location": {
          "id": 20,
          "name": "TLDM Lumut"
        },
        "model": {
          "id": 100,
          "name": "ProBook 450"
        },
        "nbv": null,
        "owner": {
          "full_name": "Employee Name",
          "ramco_id": "000380"
        },
        "purchase_date": "2022-06-30",
        "purchase_id": null,
        "purchase_year": 2022,
        "purpose": "project",
        "record_status": "active",
        "register_number": "220616822105000747",
        "type": {
          "id": 1,
          "name": "Computer"
        },
        "unit_price": null
      },
      "assessed": false,
      "assessment_count": 0,
      "assessments": [],
      "last_assessment": null
    },
    {
      "asset": {
        "age": 2,
        "brand": {
          "id": 2,
          "name": "Dell"
        },
        "category": {
          "id": 2,
          "name": "Desktop"
        },
        "classification": "asset",
        "condition_status": null,
        "costcenter": {
          "id": 22,
          "name": "DBTLDM"
        },
        "department": null,
        "disposed_date": null,
        "entry_code": "10714",
        "id": 1351,
        "location": {
          "id": 20,
          "name": "TLDM Lumut"
        },
        "model": {
          "id": 65,
          "name": "OPTIPLEX TOWER 7010"
        },
        "nbv": null,
        "owner": {
          "full_name": "Zul Azizan Bin Daud",
          "ramco_id": "004534"
        },
        "purchase_date": null,
        "purchase_id": null,
        "purchase_year": 2023,
        "purpose": "project",
        "record_status": "active",
        "register_number": "1C997X3",
        "type": {
          "id": 1,
          "name": "Computer"
        },
        "unit_price": null
      },
      "assessed": true,
      "assessment_count": 2,
      "last_assessment": {
        "id": 45,
        "asset_id": 1351,
        "register_number": "1C997X3",
        "assessment_year": "2025"
      },
      "assessments": [
        {
          "id": 45,
          "asset_id": 1351,
          "register_number": "1C997X3",
          "assessment_year": "2025"
        },
        {
          "id": 42,
          "asset_id": 1351,
          "register_number": "1C997X3",
          "assessment_year": "2024"
        }
      ]
    }
  ]
}
```

## Usage Examples

### Get all IT assets with assessment status
```bash
GET /api/compliance/it-assets-status
```

### Get only assessed IT assets
```bash
GET /api/compliance/it-assets-status?assessed_only=true
```

### Get only unassessed IT assets
```bash
GET /api/compliance/it-assets-status?not_assessed_only=true
```

### Get assessment status for a specific year
```bash
GET /api/compliance/it-assets-status?assessment_year=2025
```

### Combine filters
```bash
GET /api/compliance/it-assets-status?assessment_year=2025&not_assessed_only=true
```
(Shows all IT assets that haven't been assessed in 2025)

## Implementation Details

### Model Method: `getITAssetsWithAssessmentStatus()`
**Location**: `src/p.compliance/complianceModel.ts`

Fetches:
1. All IT assets from `assets.assetdata` where `type_id = 1`
2. All computer assessments from `compliance.computer_assessment`
3. Creates a map of asset_id → assessments for O(1) lookup
4. Combines asset data with assessment information
5. Applies filters if provided

### Controller Method: `getITAssetsWithAssessmentStatus()`
**Location**: `src/p.compliance/complianceController.ts`

**Workflow**:
1. Parses query parameters (filters)
2. Calls model method to get assets with assessment data
3. Fetches 8 lookup tables in parallel:
   - Types, Categories, Brands, Models
   - Departments, Costcenters, Locations
   - Employees
4. Builds Map objects for O(1) lookups
5. Enriches each asset with brand/category/model/costcenter/department/location/owner objects
6. Calculates derived fields: age, nbv
7. Returns standardized response with enriched assets

### Route
**Location**: `src/p.compliance/complianceRoutes.ts`

```typescript
router.get('/it-assets-status', asyncHandler(complianceController.getITAssetsWithAssessmentStatus));
```

## Data Structure

### Asset Object (Enriched)
Each asset is enriched with lookup data matching the regular assets endpoint:
- `age`: Years since purchase (calculated)
- `brand`: Object with `{id, name}`
- `category`: Object with `{id, name}`
- `costcenter`: Object with `{id, name}` or null
- `department`: Object with `{id, name}` or null
- `location`: Object with `{id, name}` or null
- `model`: Object with `{id, name}`
- `owner`: Object with `{full_name, ramco_id}` or null
- `type`: Object with `{id, name}`
- `nbv`: Net Book Value (calculated from unit_price and purchase_year)
- Plus all raw asset fields: `id`, `register_number`, `entry_code`, `classification`, `record_status`, `purpose`, `purchase_year`, etc.

### Assessment Status Fields
- `assessed`: Boolean - true if asset has any computer assessments
- `assessment_count`: Number of assessments for this asset
- `assessments`: Array of assessment records (minimal: id, asset_id, register_number, assessment_year)
- `last_assessment`: Most recent assessment by year (or null if not assessed)

### Asset Type Filter
Only includes assets where `type_id = 1` (IT hardware assets)

## Performance Characteristics
- **Time Complexity**: O(n + m + k) where n = IT assets, m = assessments, k = lookup tables
- **Space Complexity**: O(n + m + k) for Map storage of enrichment data
- **Database Queries**: 9 parallel queries (2 for model/data + 7 for enrichment lookups)

## Use Cases
1. **Compliance Reporting**: Identify which IT assets are missing current year assessments
2. **Asset Audit**: Track assessment coverage across IT inventory
3. **Planning**: Identify IT devices that need assessment
4. **Dashboard**: Show assessment completion status by year with enriched asset details
5. **Export**: Generate reports with full asset information and assessment status

## Related Endpoints
- `GET /api/compliance/it-assess` - Get all computer assessments (different structure)
- `GET /api/compliance/it-assess/:id` - Get single assessment details
- `POST /api/compliance/it-assess` - Create new computer assessment
- `PUT /api/compliance/it-assess/:id` - Update computer assessment
- `DELETE /api/compliance/it-assess/:id` - Delete computer assessment

## Notes
- Response includes the complete asset object for frontend flexibility
- Assessments are sorted by year descending to find the most recent first
- This endpoint complements (not replaces) the existing computer assessment endpoints
- Non-blocking design with proper error handling and 500-level error responses
