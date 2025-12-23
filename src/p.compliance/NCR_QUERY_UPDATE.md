# NCR Tracking Implementation Update - Based on Database Findings

## Your Discovery

You found **7 NCR maintenance records** with:
```sql
SELECT * FROM `vehicle_svc` 
WHERE svc_opt = 32 
  AND year(req_date) = '2025' 
  AND form_upload IS NOT NULL
```

This is excellent - these are drivers who have submitted maintenance requests with forms for NCR items.

## Updated Query Logic

The endpoint has been updated to use more flexible filtering:

**Before (Strict):**
```sql
WHERE asset_id = ?
  AND svc_opt = 32
  AND req_date >= assessment_date
  AND form_upload IS NOT NULL
  AND verification_date IS NOT NULL
  AND recommendation_date IS NOT NULL
  AND approval_date IS NOT NULL
```

**After (More Inclusive):**
```sql
WHERE asset_id = ?
  AND svc_opt = 32
  AND form_upload IS NOT NULL
-- No date filtering - shows all NCR actions with forms
```

## Why Records Aren't Showing

The 7 records exist, but assessments aren't showing them because:

### Possibility 1: asset_id Mismatch
The asset_ids in those 7 maintenance records may not match any assessment's asset_id.
- The assessment table stores the vehicle as `asset_id`
- The maintenance table stores it as `asset_id`
- These need to match for the link

**To verify:**
```sql
-- Get asset_ids from the 7 NCR records
SELECT DISTINCT asset_id 
FROM applications.vehicle_svc
WHERE svc_opt = 32 
  AND YEAR(req_date) = 2025 
  AND form_upload IS NOT NULL;

-- Check if those assets have assessments with NCR items
SELECT DISTINCT a.asset_id 
FROM compliance.v_assess2 a
JOIN compliance.v_assess_dt2 dt ON a.assess_id = dt.assess_id
WHERE dt.adt_ncr = 2
  AND a.asset_id IN (
    SELECT DISTINCT asset_id 
    FROM applications.vehicle_svc
    WHERE svc_opt = 32 
      AND YEAR(req_date) = 2025 
      AND form_upload IS NOT NULL
  );
```

### Possibility 2: Data Relationship Issue
There might be a data integrity issue where:
- The maintenance records exist but aren't linked to any assessments
- Assessments and maintenance records use different identifier systems

## Testing Strategy

To verify the endpoint works correctly:

1. **Find an asset_id from the 7 records** - let's say asset_id = 100
2. **Check if assessments exist for that asset:**
   ```bash
   curl http://localhost:3030/api/compliance/assessments?asset_id=100
   ```
3. **If assessments exist, test the tracking endpoint:**
   ```bash
   curl http://localhost:3030/api/compliance/assessments/{ID}/ncr-tracking
   ```

If records still don't show, the asset_ids don't match and we need to:
- Investigate the data structure
- Confirm the column names and values
- May need to add a JOIN or data reconciliation

## Endpoint Response Format

When matches are found, the endpoint returns:

```json
{
  "driver_actions": {
    "total_taken": 1,
    "approved": 0,
    "pending": 1,
    "rejected": 0,
    "records": [
      {
        "req_id": 12345,
        "req_date": "2025-11-20T10:00:00.000Z",
        "req_comment": "NCR repairs - lights and suspension",
        "drv_stat": 1,
        "drv_date": "2025-11-20T10:00:00.000Z",
        "verification_stat": 0,
        "verification_date": null,
        "recommendation_stat": 0,
        "recommendation_date": null,
        "approval_stat": 0,
        "approval_date": null
      }
    ]
  }
}
```

## Next Steps

1. **Identify the asset_ids** from your 7 NCR records
2. **Check if those assets have assessments** with NCR items
3. **If no match:** May need to verify data relationships or add a JOIN condition
4. **If match:** The endpoint will immediately show the records

## Code Changes Made

- Updated `getNCRActionsByAssetAndAssessmentDate()` in `complianceModel.ts`
- Removed strict date filtering (verification_date, recommendation_date, approval_date)
- Now shows ALL NCR actions with form_upload IS NOT NULL
- Approval status fields indicate workflow progress

The endpoint is ready to display your 7 records once they're properly linked via asset_id to assessments with NCR items.
