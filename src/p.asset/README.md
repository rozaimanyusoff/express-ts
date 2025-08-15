# Asset Management Module (p.asset)

## Overview
The Asset Management module provides comprehensive functionality for managing organizational assets, including computers, vehicles, and other equipment. It handles asset lifecycle management, ownership tracking, and integration with related organizational data.

## Module Structure

### Core Files
- `assetController.ts` - HTTP request handlers and business logic
- `assetModel.ts` - Database operations and data access layer  
- `assetRoutes.ts` - API route definitions

## API Endpoints

### Assets
- `GET /api/assets` - List all assets with filtering support
- `GET /api/assets/:id` - Get specific asset by ID
- `POST /api/assets` - Create new asset
- `PUT /api/assets/:id` - Update existing asset
- `DELETE /api/assets/:id` - Delete asset

#### Query Parameters for GET /api/assets
- `?type={type_id}` - Filter by asset type (comma-separated for multiple)
- `?status={status}` - Filter by asset status

#### Response Structure
```json
{
  "status": "success",
  "message": "Assets data retrieved successfully",
  "data": [
    {
      "id": 1,
      "classification": "IT Equipment",
      "asset_code": "ASSET001",
      "finance_tag": "FIN001",
      "register_number": "REG001",
      "dop": "2024-01-15",
      "year": 2024,
      "unit_price": 1500.00,
      "depreciation_length": 5,
      "depreciation_rate": 20,
      "costcenter": {
        "id": 5,
        "name": "IT Department"
      },
      "location": {
        "id": 3,
        "name": "Main Office"
      },
      "status": "active",
      "disposed_date": null,
      "types": {
        "id": 1,
        "code": "COMP",
        "name": "Computer"
      }
    }
  ]
}
```

### Asset Types
- `GET /api/asset-types` - List all asset types
- `GET /api/asset-types/:id` - Get specific asset type
- `POST /api/asset-types` - Create new asset type
- `PUT /api/asset-types/:id` - Update asset type
- `DELETE /api/asset-types/:id` - Delete asset type

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get specific category
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

#### Query Parameters for GET /api/categories
- `?type={type_id}` - Filter categories by asset type

### Brands
- `GET /api/brands` - List all brands
- `GET /api/brands/:id` - Get specific brand
- `POST /api/brands` - Create new brand
- `PUT /api/brands/:id` - Update brand
- `DELETE /api/brands/:id` - Delete brand

#### Query Parameters for GET /api/brands
- `?type={type_id}` - Filter by asset type
- `?categories={category_id}` - Filter by categories (comma-separated)

### Models
- `GET /api/models` - List all models
- `GET /api/models/:id` - Get specific model
- `POST /api/models` - Create new model
- `PUT /api/models/:id` - Update model
- `DELETE /api/models/:id` - Delete model

#### Query Parameters for GET /api/models
- `?type={type_id}` - Filter by asset type
- `?brand={brand_id}` - Filter by brands (comma-separated)

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get specific employee by ID
- `GET /api/employees/ramco/:ramco_id` - Get employee by RAMCO ID
- `GET /api/employees/email/:email` - Get employee by email
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

#### Query Parameters for GET /api/employees
- `?status=active` - Filter by employment status

### Organizational Structure
- **Departments**: `GET|POST|PUT|DELETE /api/departments[/:id]`
- **Positions**: `GET|POST|PUT|DELETE /api/positions[/:id]`
- **Sections**: `GET|POST|PUT|DELETE /api/sections[/:id]`
- **Cost Centers**: `GET|POST|PUT|DELETE /api/costcenters[/:id]`
- **Districts**: `GET|POST|PUT|DELETE /api/districts[/:id]`
- **Zones**: `GET|POST|PUT|DELETE /api/zones[/:id]`
- **Modules**: `GET|POST|PUT|DELETE /api/modules[/:id]`
- **Sites**: `GET|POST|PUT|DELETE /api/sites[/:id]`

## Database Integration

### Primary Database: `assetdata`
- **Assets**: `asset_data` - Main asset records
- **Types**: `types` - Asset type definitions
- **Categories**: `categories` - Asset categories
- **Brands**: `brands` - Brand information
- **Models**: `models` - Asset models
- **Employees**: `employees` - Employee records
- **Organizational**: Various tables for departments, positions, etc.

### Key Relationships
- Assets → Types (asset.type_id → types.id)
- Assets → Cost Centers (asset.costcenter_id → costcenters.id)
- Assets → Locations (asset.location_id → locations.id)
- Employees → Departments, Positions, Cost Centers, Districts

## Data Mapping Strategy

### Lookup Maps Pattern
The module uses efficient Map objects for fast O(1) lookups when resolving IDs to names:

```typescript
// Example from getAssets()
const typeMap = new Map(types.map((t: any) => [t.id, t]));
const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
const locationMap = new Map(locations.map((l: any) => [l.id, l]));

// Usage
costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
  ? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
  : null
```

### Removed Features (As of Latest Update)
- ❌ **Ownership Mappings**: Removed complex ownership tracking from `getAssets()`
- ❌ **Fleet Card Integration**: Removed fleet card mappings for vehicles
- ❌ **Computer Specs**: Removed detailed computer specifications lookup
- ❌ **Vehicle Specs**: Removed detailed vehicle specifications lookup

### Current Focus
- ✅ **Core Asset Data**: Basic asset information and metadata
- ✅ **Location Mapping**: Asset location resolution
- ✅ **Cost Center Integration**: Department/cost center associations
- ✅ **Type Classifications**: Asset type and category information
- ✅ **Clean Data Structure**: Simplified, consistent response format

## Error Handling

### Standard Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors)
- `404` - Resource not found
- `500` - Internal server error

## Performance Optimizations

### Bulk Data Loading
- Uses `Promise.all()` for parallel data fetching
- Single database queries per lookup table
- Efficient Map-based lookups vs individual database calls

### Response Optimization
- Removed expensive async operations from asset listing
- Simplified data structure reduces response payload
- Eliminated N+1 query problems with lookup maps

## Recent Changes (August 2025)

### v2.1 - Simplified Asset Listing
- **Removed**: Complex computer/vehicle spec mappings from `getAssets()`
- **Removed**: Ownership data from main asset listing
- **Removed**: Fleet card integration
- **Added**: Location mapping support
- **Improved**: Performance through simplified data structure
- **Enhanced**: Consistent response patterns across endpoints

### Migration Notes
- Applications relying on `specs` field in `getAssets()` response need updates
- Ownership data still available via `getAssetById()` for detailed views
- Location data now available in standard asset responses

## Dependencies

### Internal Dependencies
- `utils/db.ts` - Database connection pool
- `utils/fileUpload.ts` - File handling for images

### External Dependencies
- `mysql2` - Database driver
- `express` - Web framework
- TypeScript for type safety

## Future Enhancements

### Planned Features
- Asset transfer workflow improvements
- Enhanced reporting capabilities
- Bulk import/export functionality
- Asset lifecycle tracking
- Maintenance scheduling integration

### Architecture Considerations
- Consider GraphQL for complex nested data requirements
- Implement caching for frequently accessed lookup data
- Add audit logging for asset changes
- Improve TypeScript interfaces for better type safety

## Testing

### API Testing
```bash
# Test asset listing
curl -X GET "http://localhost:3030/api/assets?type=1&status=active"

# Test asset creation
curl -X POST "http://localhost:3030/api/assets" \
  -H "Content-Type: application/json" \
  -d '{"asset_code":"TEST001","type_id":1,"costcenter_id":5}'
```

### Integration Points
- Ensure consistency with maintenance module (`p.maintenance`)
- Verify billing module integration (`p.billing`)
- Test employee data synchronization

## Support & Maintenance

### Common Issues
1. **Performance**: Monitor query performance on large asset datasets
2. **Data Consistency**: Ensure referential integrity across related tables  
3. **File Uploads**: Handle image upload failures gracefully
4. **Type Safety**: Keep TypeScript interfaces updated with database schema

### Monitoring
- Database query performance
- Response times for asset listing endpoints
- File upload success rates
- Memory usage during bulk operations
