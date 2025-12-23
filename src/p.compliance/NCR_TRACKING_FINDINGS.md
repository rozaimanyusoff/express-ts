# NCR Tracking Endpoint - Data Analysis Report

## Overview
Analysis of the NCR (Non-Conformance) tracking endpoint showing current data state and what's needed to see driver action results.

## Current Status

### Summary Statistics
- **Total Assessments in System:** 867
- **Assessments with NCR Items:** ~130+ (preliminary count)
- **Assessments with Matching Driver Actions (NCR count = Actions count):** **0**

### Why Zero Matches?

The endpoint query filters for maintenance records where ALL of these conditions are met:

```sql
WHERE asset_id = ?
  AND FIND_IN_SET('32', svc_opt) > 0          -- NCR service type
  AND req_date >= ?                            -- After assessment date
  AND form_upload IS NOT NULL                  -- ✓ Form uploaded
  AND verification_date IS NOT NULL            -- ✓ Workshop verified
  AND recommendation_date IS NOT NULL          -- ✓ Supervisor recommended
  AND approval_date IS NOT NULL                -- ✓ Manager approved
```

**Current Finding:** No maintenance requests (`vehicle_svc` table) have ALL four of these fields populated with non-null values simultaneously.

## Examples of Assessments with NCR Items

These assessments have identified NCR (Non-Conformance) items but drivers haven't yet submitted or completed maintenance requests:

### Assessment 1045
- **Vehicle:** JQB4611 (Toyota Alphard)
- **Owner:** Mohamad Luqmanul Hakim Bin Abdul Aziz (000534)
- **Assessment Date:** 2025-11-05
- **Assessment Rating:** 66.88%
- **NCR Items:** 2
  - Brake system issues
  - Lighting problems
- **Driver Actions:** 0 (No maintenance request submitted yet)

### Assessment 1030
- **Vehicle:** JPG2025
- **Owner:** Mohamad Hasraf Bin Mohd Hasbullah (004916)
- **Assessment Date:** 2025-11-04
- **Assessment Rating:** 61.25%
- **NCR Items:** 2
  - Broken rear lights (Lampu Belakang & Lampu Brek)
  - Non-functional 3rd brake light (Lampu Brek Ketiga)
- **Driver Actions:** 0

### Other Assessments with NCR Items
| ID | Vehicle | NCR Count | Actions | Status |
|----|---------|-----------|---------|--------|
| 1002 | - | 1 | 0 | Pending driver action |
| 1003 | - | 1 | 0 | Pending driver action |
| 1005 | - | 1 | 0 | Pending driver action |
| 1007 | - | 1 | 0 | Pending driver action |
| 1020 | - | 1 | 0 | Pending driver action |
| 1031 | - | 1 | 0 | Pending driver action |
| 933 | - | 2 | 0 | Pending driver action |
| 937 | - | 1 | 0 | Pending driver action |

## What Would Show Driver Actions?

For an assessment to display driver actions, a corresponding maintenance request must exist in `applications.vehicle_svc` table with:

### Example Scenario
```
Assessment 1045 (asset_id=229, a_date=2025-11-05)
  ↓
  NCR Items: 2 (defects requiring maintenance)
  ↓
  Driver submits Maintenance Request with svc_opt containing '32'
  req_date >= 2025-11-05
  ↓
  Record must have:
    ✓ form_upload = /path/to/form.pdf
    ✓ verification_date = 2025-11-06 (workshop verified)
    ✓ recommendation_date = 2025-11-07 (supervisor recommended)
    ✓ approval_date = 2025-11-08 (manager approved)
  ↓
  Result: This maintenance request appears in driver_actions with approval_stat=1
```

## Maintenance Workflow Stages

When a driver submits maintenance for NCR items, it goes through these stages:

1. **Driver Submission** (`drv_stat`)
   - 0: Not submitted
   - 1: Submitted
   - 2: Cancelled

2. **Workshop Verification** (`verification_stat`, `verification_date`)
   - 0: Pending
   - 1: Verified ✓
   - 2: Rejected

3. **Supervisor Recommendation** (`recommendation_stat`, `recommendation_date`)
   - 0: Pending
   - 1: Recommended ✓
   - 2: Rejected

4. **Manager Approval** (`approval_stat`, `approval_date`)
   - 0: Pending
   - 1: Approved ✓
   - 2: Rejected

## Endpoint Response Structure

When driver actions exist, the response includes:

```json
{
  "driver_actions": {
    "total_taken": 1,
    "approved": 1,
    "pending": 0,
    "rejected": 0,
    "records": [
      {
        "req_id": 12345,
        "req_date": "2025-11-05T10:00:00.000Z",
        "req_comment": "Complete engine service with NCR fixes",
        "drv_stat": 1,
        "drv_date": "2025-11-05T10:00:00.000Z",
        "verification_stat": 1,
        "verification_date": "2025-11-06T14:00:00.000Z",
        "recommendation_stat": 1,
        "recommendation_date": "2025-11-07T09:00:00.000Z",
        "approval_stat": 1,
        "approval_date": "2025-11-08T16:00:00.000Z"
      }
    ]
  }
}
```

## Test Endpoint

To view assessment with NCR items:
```bash
GET /api/compliance/assessments/1045/ncr-tracking
```

Returns:
- Assessment details with vehicle info
- All NCR items identified
- Driver action records (currently empty arrays)

## Next Steps to Generate Matching Data

To see driver actions appear in this endpoint:

1. **Create test maintenance request** for an assessment with NCR items
2. **Set svc_opt** to include '32' (NCR maintenance type)
3. **Set all workflow dates:**
   - `form_upload` - Upload evidence/form
   - `verification_date` - Workshop confirms work done
   - `recommendation_date` - Supervisor reviews & recommends
   - `approval_date` - Manager approves

4. **Result:** When all dates are set, the assessment's NCR tracking endpoint will show:
   ```
   driver_actions.total_taken = number of maintenance requests
   ncr_items.count = number of NCR defects
   ```

## Data Integrity Check

The endpoint correctly:
- ✓ Identifies all NCR items in assessments
- ✓ Filters for NCR maintenance requests only (svc_opt = 32)
- ✓ Matches by asset_id between assessment and maintenance
- ✓ Filters for completed workflow (all dates not null)
- ✓ Counts and summarizes approval status

Current state shows **no data corruption** - simply no completed driver actions exist yet in the database.

## Related API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/compliance/assessments` | List all assessments |
| `GET /api/compliance/assessments/:id` | Get single assessment details |
| `GET /api/compliance/assessments/:id/ncr-tracking` | **NEW** - Track driver actions for NCR items |
| `GET /api/compliance/assessments/details/ncr` | Get NCR items by asset |

## Database Tables Involved

| Table | Database | Purpose |
|-------|----------|---------|
| `v_assess2` | compliance | Vehicle assessments |
| `v_assess_dt2` | compliance | Assessment details (NCR items) |
| `v_assess_qset` | compliance | Assessment criteria definitions |
| `vehicle_svc` | applications | Maintenance requests |

## Summary

The NCR Tracking endpoint is **fully functional** and correctly filtering data. The reason no driver actions appear is that:

- **Assessments with NCR items exist** (130+ cases)
- **But drivers haven't yet submitted completed maintenance requests** where all workflow stages (form upload, verification, recommendation, approval) are done

Once drivers submit and complete maintenance workflows for NCR items, the endpoint will show:
- How many NCR issues were found
- How many maintenance actions the driver took
- Matching count when driver addresses all NCR items in one maintenance request
