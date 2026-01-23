# Telco SIM Card Replacement Workflow Implementation

## Overview

Updated the `createSimCard` endpoint to implement a comprehensive SIM card replacement workflow. When a replacement SIM is provided, the system now properly handles deactivation of the old SIM, linking, and device-subscriber mapping.

## Changes Made

### 1. Database Schema Updates

#### New Table: `telco_subs_devices`
Added to `src/db/billings.sql` and `src/db/billing_module.sql`

```sql
CREATE TABLE `telco_subs_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sub_no_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `effective_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sub_no_id` (`sub_no_id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

This table maintains the relationship between subscribers and their assigned devices/assets.

### 2. Model Updates (`telcoModel.ts`)

Added new table reference:
```typescript
subsDevices: `${dbBilling}.telco_subs_devices`
```

Added four new functions:

#### `createSimSubsMapping(data)`
Creates a mapping between a SIM and a subscriber
- `sim_id`: ID of the SIM card
- `sub_no_id`: ID of the subscriber
- `effective_date`: When the mapping became active

#### `createSubsDeviceMapping(data)`
Creates a mapping between a subscriber and a device/asset
- `sub_no_id`: ID of the subscriber
- `asset_id`: ID of the device/asset
- `effective_date`: When the mapping became active

#### `deactivateSimCard(simId, deactivationReason, deactivatedAt)`
Deactivates a SIM card (when replaced)
- Sets `status` to `'deactivated'`
- Sets `reason` to provided reason (e.g., `'broken'`)
- Sets `deactivated_at` timestamp

#### `linkReplacementSim(oldSimId, newSimId)`
Links the old SIM to the new SIM
- Sets `replacement_sim_id` on the old SIM to point to the new SIM

### 3. Controller Updates (`telcoController.ts`)

Updated `createSimCard` workflow:

#### Request Payload
```json
{
  "sim_sn": "8901411234567890123",
  "replacement_sim": 15,
  "sub_no_id": 5,
  "asset_id": 42,
  "effective_date": "2026-01-21"
}
```

#### New Workflow (When `replacement_sim` is provided)

1. **Create New SIM**
   - `sim_sn`: New SIM serial number
   - `status`: Always set to `'active'`
   - `reason`: `'new'` (or provided reason)
   - `activated_at`: Current timestamp

2. **Deactivate Old SIM**
   - Find the old SIM by ID (`replacement_sim`)
   - Set `status` to `'deactivated'`
   - Set `reason` to `'broken'`
   - Set `deactivated_at` to `effective_date`

3. **Link SIMs**
   - Set `replacement_sim_id` on old SIM to point to new SIM ID

4. **Create SIM-Subscriber Mapping** (if `sub_no_id` provided)
   - Insert into `telco_sims_subs`
   - Maps new SIM to subscriber with `effective_date`

5. **Create Subscriber-Device Mapping** (if both `sub_no_id` and `asset_id` provided)
   - Insert into `telco_subs_devices`
   - Maps subscriber to device/asset with `effective_date`

#### Response
```json
{
  "status": "success",
  "message": "Sim card created successfully",
  "id": 236
}
```

## Removed/Deprecated

- The `ramco_id` parameter is no longer used in the `createSimCard` endpoint
- The `telco_sims_history` table is deprecated and no longer written to during SIM creation
  - Historical tracking is now maintained through:
    - `telco_sims_subs` (SIM-Subscriber history)
    - `telco_subs_devices` (Subscriber-Device history)
    - `telco_sims.deactivated_at` and `telco_sims.replacement_sim_id` (replacement tracking)

## Example Usage

### Creating a New SIM (without replacement)
```bash
curl -X POST http://localhost:3000/api/telco/sims \
  -H "Content-Type: application/json" \
  -d '{
    "sim_sn": "8901411234567890123",
    "sub_no_id": 5,
    "asset_id": 42,
    "effective_date": "2026-01-21"
  }'
```

### Creating a Replacement SIM
```bash
curl -X POST http://localhost:3000/api/telco/sims \
  -H "Content-Type: application/json" \
  -d '{
    "sim_sn": "8901411234567890124",
    "replacement_sim": 15,
    "sub_no_id": 5,
    "asset_id": 42,
    "effective_date": "2026-01-21"
  }'
```

## Database Queries for Verification

### Find SIM replacement chain
```sql
SELECT 
  s1.id as old_sim_id,
  s1.sim_sn as old_sim_sn,
  s1.status,
  s1.reason,
  s1.deactivated_at,
  s2.id as new_sim_id,
  s2.sim_sn as new_sim_sn
FROM telco_sims s1
LEFT JOIN telco_sims s2 ON s1.replacement_sim_id = s2.id
WHERE s1.replacement_sim_id IS NOT NULL;
```

### Find current device for a subscriber
```sql
SELECT 
  sub_no_id,
  asset_id,
  effective_date
FROM telco_subs_devices
WHERE sub_no_id = 5
ORDER BY effective_date DESC
LIMIT 1;
```

### Find SIM-Subscriber mappings
```sql
SELECT 
  sim_id,
  sub_no_id,
  effective_date
FROM telco_sims_subs
WHERE sub_no_id = 5
ORDER BY effective_date DESC;
```

## Rollback Instructions (if needed)

If you need to rollback:
1. Restore the old `telcoController.ts::createSimCard` function
2. Keep the new tables and model functions for data integrity
3. Update the schema files if `telco_subs_devices` table should be removed
