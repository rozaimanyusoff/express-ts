# NCR (Non-Conformance) Tracking Implementation

## Overview
New endpoint to track driver actions for NCR (Non-Conformance) items identified in vehicle assessments. When a vehicle assessment identifies issues (`adt_ncr = 2`), the driver must take corrective action through the maintenance request system.

## What is NCR?
- **adt_ncr = 2**: Non-conformance item (defect requiring action)
- **adt_ncr = 1**: Minor compliance issue
- **adt_ncr = 0**: Pass/no issue

## Implementation Details

### 1. Model Layer (`src/p.compliance/complianceModel.ts`)
Added new function:
```typescript
export const getNCRActionsByAssetAndAssessmentDate = async (
  assetId: number,
  assessmentDate: string | Date | null
): Promise<any[]>
```

**What it does:**
- Searches maintenance records (`applications.vehicle_svc` table)
- Finds records where `svc_opt` contains '32' (NCR maintenance type)
- Filters for requests made on or after the assessment date
- Returns sorted list by most recent request first

**Database Query:**
```sql
SELECT req_id, asset_id, ramco_id, req_date, svc_opt, req_comment,
       drv_stat, drv_date, verification_stat, verification_date,
       recommendation_stat, recommendation_date, approval_stat, approval_date
FROM applications.vehicle_svc
WHERE asset_id = ? AND FIND_IN_SET('32', svc_opt) > 0 AND req_date >= ?
ORDER BY req_date DESC
```

### 2. Controller Layer (`src/p.compliance/complianceController.ts`)
Added new function:
```typescript
export const trackAssessmentNCRActions = async (req: Request, res: Response)
```

**Workflow:**
1. Fetch assessment by ID
2. Extract all assessment details
3. Filter details where `adt_ncr = 2` (NCR items only)
4. Query maintenance actions taken by driver for this asset after assessment date
5. Enrich data with asset info, cost center, location, vehicle owner
6. Provide summary statistics on driver action status

### 3. Route (`src/p.compliance/complianceRoutes.ts`)
```typescript
router.get('/assessments/:id/ncr-tracking', asyncHandler(complianceController.trackAssessmentNCRActions));
```

**Endpoint:** `GET /api/compliance/assessments/:id/ncr-tracking`

## Response Structure

```json
{
  "status": "success",
  "message": "Assessment NCR tracking retrieved",
  "data": {
    "assessment": {
      "assess_id": 1093,
      "a_date": "2025-12-18T03:42:35.000Z",
      "a_rate": "55.00%",
      "a_remark": "",
      "asset": {
        "age": 19,
        "costcenter": { "id": 25, "name": "NRWMJ8" },
        "id": 226,
        "location": { "code": "BP", "id": 7 },
        "owner": { 
          "full_name": "Mohamad Zainulariffin Bin Mohd Taha",
          "ramco_id": "000486"
        },
        "purchase_date": "2006-07-11T16:00:00.000Z",
        "register_number": "JJU2895"
      }
    },
    "ncr_items": {
      "count": 1,
      "items": [
        {
          "adt_id": 28179,
          "adt_item": "22",
          "adt_ncr": 2,
          "adt_rate": "0",
          "adt_rem": "minyak hitam servis tidak mengikut jadual",
          "qset_desc": "Servis Mengikut Jadual (Sticker Mileage)",
          "qset_type": "NCR",
          "created_at": "2025-12-18T03:42:36.000Z"
        }
      ]
    },
    "driver_actions": {
      "total_taken": 0,
      "approved": 0,
      "pending": 0,
      "rejected": 0,
      "records": [
        {
          "req_id": 12345,
          "req_date": "2025-12-20T10:30:00.000Z",
          "req_comment": "Engine oil service completed",
          "drv_stat": 1,
          "drv_date": "2025-12-20T10:30:00.000Z",
          "verification_stat": 1,
          "verification_date": "2025-12-20T14:00:00.000Z",
          "recommendation_stat": 1,
          "recommendation_date": "2025-12-20T15:00:00.000Z",
          "approval_stat": 1,
          "approval_date": "2025-12-20T16:00:00.000Z"
        }
      ]
    }
  }
}
```

## Key Data Points

### NCR Items Section
Shows all assessment details where non-conformance was identified:
- `adt_id`: Assessment detail ID
- `adt_ncr`: Non-conformance flag (2 = NCR)
- `adt_rem`: Remarks describing the issue
- `qset_desc`: Detailed description of the checked item (in Malay)
- `qset_type`: Category type (NCR, Rating, Selection)

### Driver Actions Section
Shows maintenance requests initiated by driver after assessment:

**Status Fields:**
- `drv_stat`: Driver submission status (0=not submitted, 1=submitted, 2=cancelled)
- `verification_stat`: Workshop verification (0=pending, 1=verified, 2=rejected)
- `recommendation_stat`: Supervisor recommendation (0=pending, 1=recommended, 2=rejected)
- `approval_stat`: Manager approval (0=pending, 1=approved, 2=rejected)

**Statistics:**
- `total_taken`: Total maintenance requests for this assessment
- `approved`: Requests fully approved
- `pending`: Requests awaiting approval
- `rejected`: Requests that were rejected

## Usage Example

### Test with Assessment ID 1093
```bash
curl -s http://localhost:3030/api/compliance/assessments/1093/ncr-tracking | jq .
```

**Result:**
- Assessment has 1 NCR item (Service scheduling issue)
- Vehicle: JJU2895 (owned by employee 000486)
- No maintenance actions taken yet (driver hasn't submitted request)

## Integration Points

### From Compliance Module
- Assessment details with NCR flags
- Assessment criteria for description mapping
- Asset information

### From Maintenance Module
- Vehicle service requests (`applications.vehicle_svc` table)
- Service option codes (svc_opt = 32 for NCR)
- Request dates and approval status tracking
- Driver submission status

### From Asset Module
- Vehicle details (registration, purchase date, cost center)
- Owner/driver information
- Location and cost center mapping

## Technical Notes

1. **Date Filtering**: Maintenance requests must be dated on or after the assessment date to avoid showing pre-assessment actions

2. **Query Optimization**: Uses `FIND_IN_SET()` to search for '32' in comma-separated svc_opt values

3. **Data Enrichment**: Merges compliance assessment data with maintenance module data using asset_id as the key

4. **Error Handling**: Returns empty arrays if maintenance actions don't exist; doesn't fail if asset can't be found

## Related Tables

| Table | Database | Purpose |
|-------|----------|---------|
| `v_assess2` | compliance | Vehicle assessments |
| `v_assess_dt2` | compliance | Assessment details (items being checked) |
| `v_assess_qset` | compliance | Assessment criteria (item descriptions) |
| `vehicle_svc` | applications | Maintenance requests |
| `asset` | assets | Vehicle asset information |

## Future Enhancements

Potential improvements to track NCR closure:
- Add fields for NCR closure date and method
- Track which NCR items have been resolved
- Add bulk filtering by assessment date range
- Add approval workflow notifications
- Link to actual service invoices/billing records
