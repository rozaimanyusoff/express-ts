# SIM Card History Enhancement - Updated Functions

## Overview

Updated the history retrieval functions in `telcoModel.ts` to populate `sim_user_history` and `sim_asset_history` from the new tables instead of the deprecated `telco_sims_history` table.

## Changes Made

### Updated Model Functions

#### 1. `getSimCardHistoryBySubscriber(subId: number)`
**Changed from:** Querying `telco_sims_history` table  
**Changed to:** Querying `telco_sims_subs` table

**Query:**
```sql
SELECT DISTINCT scs.effective_date, ts.sub_no
FROM telco_sims_subs scs
JOIN telco_subs ts ON scs.sub_no_id = ts.id
WHERE scs.sub_no_id = ?
ORDER BY scs.effective_date DESC
```

**Usage:** Gets all SIM-subscriber relationships for a subscriber, maintaining a historical record of SIM changes.

---

#### 2. `getSimUserHistoryBySimId(simId: number)`
**Changed from:** Querying `telco_sims_history` and joining to employees  
**Changed to:** Querying `telco_user_subs` via `telco_sims_subs` join

**Query:**
```sql
SELECT 
    tus.effective_date, 
    tus.ramco_id,
    u.full_name,
    d.id as dept_id,
    d.name as dept_name,
    cc.id as cc_id,
    cc.name as cc_name,
    l.id as loc_id,
    l.name as loc_name
FROM telco_sims_subs scs
JOIN telco_user_subs tus ON scs.sub_no_id = tus.sub_no_id
LEFT JOIN assets.employees u ON tus.ramco_id = u.ramco_id
LEFT JOIN assets.departments d ON u.department_id = d.id
LEFT JOIN assets.costcenters cc ON u.costcenter_id = cc.id
LEFT JOIN assets.locations l ON u.location_id = l.id
WHERE scs.sim_id = ? AND tus.ramco_id IS NOT NULL
ORDER BY tus.effective_date DESC
```

**Usage:** Gets all users associated with a SIM card through its subscriber mappings, with employee department, costcenter, and location details.

---

#### 3. `getSimAssetHistoryBySimId(simId: number)`
**Changed from:** Querying `telco_sims_history` and joining to assetdata  
**Changed to:** Querying `telco_subs_devices` via `telco_sims_subs` join

**Query:**
```sql
SELECT 
    tsd.effective_date,
    tsd.asset_id,
    ad.register_number
FROM telco_sims_subs scs
JOIN telco_subs_devices tsd ON scs.sub_no_id = tsd.sub_no_id
JOIN assets.assetdata ad ON tsd.asset_id = ad.id
WHERE scs.sim_id = ? AND tsd.asset_id IS NOT NULL
ORDER BY tsd.effective_date DESC
```

**Usage:** Gets all devices/assets associated with a SIM card through its subscriber mappings, with asset register numbers.

---

## Data Flow

### Before (Using telco_sims_history)
```
telco_sims_history (deprecated)
├─ sim_id → SIM history
├─ ramco_id → User history
└─ asset_id → Asset history
```

### After (Using new tables)
```
telco_sims_subs (SIM-Subscriber mapping)
├─ JOIN telco_user_subs → User history (via subscriber)
└─ JOIN telco_subs_devices → Asset history (via subscriber)
```

## Affected Endpoints

Both endpoints now return populated `sim_user_history` and `sim_asset_history`:

### `GET /api/telco/sims/:id`
Returns enriched SIM card data with full user and asset history

### `GET /api/telco/sims`
Returns list of SIM cards with full user and asset history for each

## Response Format

### sim_user_history
```json
{
  "effective_date": "2026-01-21",
  "user": {
    "ramco_id": "EMP001",
    "full_name": "John Doe"
  },
  "department": {
    "id": 1,
    "name": "IT Department"
  },
  "costcenter": {
    "id": 23,
    "name": "HQ"
  },
  "location": {
    "id": 5,
    "name": "Kuala Lumpur"
  }
}
```

### sim_asset_history
```json
{
  "effective_date": "2026-01-21",
  "asset": {
    "asset_id": 42,
    "register_number": "ASSET-2026-001"
  }
}
```

## Benefits

1. **Consistency** - Uses the same tables populated by `createSimCard` workflow
2. **Traceability** - Complete audit trail of SIM changes through subscriber-device-user mappings
3. **Performance** - Joins on indexed columns (foreign keys)
4. **Data Integrity** - History is created atomically with SIM assignment
5. **Deprecation Path** - `telco_sims_history` can be safely removed in future

## Type Check
✅ All changes pass TypeScript compilation with no errors
