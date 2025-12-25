# Billing Module - Enhancements & Features

## 1. Invoice Status Management

### Status Workflow

The billing system tracks invoices through multiple states:

```
┌─────────┐       ┌──────────────┐       ┌─────────┐       ┌──────────┐
│ Draft   │ ──→ │ Form Uploaded │ ──→ │ Accrued │ ──→ │ Invoiced │
└─────────┘       └──────────────┘       └─────────┘       └──────────┘
                                             │
                                             └──────→ Paid
```

### Status Determination Logic

The `calculateInvStat()` function determines invoice status based on:

```typescript
const calculateInvStat = (inv_no, inv_date, form_upload_date, inv_total): string => {
  const hasInvNo = inv_no && String(inv_no).trim() !== '';
  const hasInvDate = inv_date !== null && inv_date !== undefined;
  const hasFormUpload = form_upload_date !== null && form_upload_date !== undefined;
  const hasAmount = Number(inv_total) > 0;
  
  if (hasInvNo && hasInvDate && hasAmount) return 'invoiced';
  if (!hasInvNo && !hasInvDate && hasFormUpload && hasAmount) return 'accrued';
  if (!hasInvNo && !hasInvDate && hasFormUpload && !hasAmount) return 'form uploaded';
  return 'draft';
};
```

**Status Rules**:
- **Draft**: No invoice number, date, or form uploaded
- **Form Uploaded**: Maintenance form submitted but no invoice details
- **Accrued**: Form uploaded with amount but not yet invoiced
- **Invoiced**: Invoice number and date provided
- **Paid**: Payment recorded (extended enhancement)

### Invoice Status Badge

Real-time badge updates via Socket.IO when:
- Maintenance request form uploaded
- Invoice number assigned
- Invoice marked as paid

---

## 2. Maintenance Billing System

### Features

#### A. Invoice Tracking by Request
- Link maintenance request (svc_order) to invoice
- Track invoice through approval → form upload → accrual → invoicing pipeline
- Query invoices by request ID for complete audit trail

#### B. Vehicle Maintenance Cost Rollup
- Summary reports by vehicle
- Date range filtering (from/to)
- Cost center grouping
- Year-over-year comparison via annual reports

#### C. Parts Management
- Service part master list (BP001: Brake Pad @ 150.00)
- Invoice line items (tbl_inv_part) track parts used per invoice
- Unit pricing for billing calculations
- Part usage history for cost analysis

#### D. Excel Report Generation
- **Summary by Vehicle**: Total maintenance costs per vehicle
- **Summary by Date Range**: Filtered cost breakdown
- Uses `excelGeneratorUtil` for dynamic report creation
- Suitable for cost center allocation and budget reporting

### Implementation Pattern

```typescript
// Get maintenance billings with filters
const billings = await getVehicleMtnBillings(year?: number, from?: string, to?: string);

// Update invoice with form/attachment
await updateVehicleMtnBilling(id, {
  inv_no: 'INV-2024-001',
  inv_date: '2024-12-20',
  inv_total: 5000,
  attachment: file
});

// Generate Excel summary
const excelBuffer = await generateMaintenanceSummary(from, to, costcenter_id?);
```

---

## 3. Fuel Billing System

### Features

#### A. Fuel Statement Management
- Monthly fuel statements (fuel_stmt) from vendors
- Per-vehicle fuel consumption tracking (fuel_stmt_detail)
- Vendor master management (Shell, Petronas, etc.)
- Statement date and amount tracking

#### B. Cost Allocation by Vehicle
- Breakdown of fuel costs per vehicle
- Monthly cost rollup
- Cost center assignment for billing
- Supports multi-month reports

#### C. Cost Center Summary
- Aggregate fuel costs by cost center and month
- Excel report generation with pivot-style grouping
- Monthly breakup for departmental allocation
- Suitable for cost center reconciliation

### Implementation Pattern

```typescript
// Get fuel costs by vehicle and period
const fuelSummary = await getFuelBillingByVehicle(from, to, costcenter_id?);
// Returns: [{vehicle_id, vehicle_name, month, amount, costcenter}]

// Get fuel costs grouped by cost center
const ccSummary = await getFuelCostCenterSummary(from, to);
// Returns: [{costcenter, month, total_amount}]

// Generate Excel summary by vehicle
const excelBuffer = await generateFuelSummary(from, to, costcenter_id?);
```

---

## 4. Fleet Card Management

### Features

#### A. Fleet Card Lifecycle
- **Issuance**: Create card with daily/monthly limits
- **Assignment**: Link card to specific asset/vehicle
- **Usage Tracking**: Monitor spending against limits
- **Return**: Track card return with date

#### B. Card Types & Limits
- Fuel cards (shell, petronas, etc.)
- Toll cards (RFID, Touch 'n Go, etc.)
- Meal/Travel cards (future expansion)
- Daily limits (e.g., 500/day)
- Monthly limits (e.g., 10,000/month)

#### C. Fleet History
- Asset assignment history (fleet_history)
- Track which vehicle had which card and when
- Historical cost allocation for audits
- Support for card reassignment

### Implementation Pattern

```typescript
// Create fleet card
const card = await createFleetCard({
  card_number: '1234567890',
  card_type: 'Fuel',
  daily_limit: 500,
  monthly_limit: 10000
});

// Assign to asset
await assignFleetCard(fleet_id, asset_id, issued_date);

// Return card
await returnFleetCard(fleet_id, returned_date);

// Get assignment history
const history = await getFleetCardHistory(fleet_id);
```

---

## 5. Utilities Billing System

### Features

#### A. Utility Account Management
- Master accounts for Electricity, Water, Internet, Gas, etc.
- Account number tracking
- Service provider mapping (TNB, Syabas, etc.)
- Location/property associations
- Beneficiary contacts for each account

#### B. Utility Bill Tracking
- Monthly bills with due dates
- Payment status (pending/paid/overdue)
- Amount tracking
- Late payment flag support

#### C. Utility Beneficiary Management
- Multiple beneficiaries per account
- Property-level billing for large facilities
- Contact person tracking
- Email notification support (future)

### Implementation Pattern

```typescript
// Create utility account
const account = await createUtilityAccount({
  account_number: '1234-5678',
  account_name: 'Office Electricity',
  util_type: 'Electricity',
  location_id: 5,
  service_provider: 'TNB'
});

// Add beneficiary
await addUtilityBeneficiary(account_id, {
  beneficiary_name: 'Main Office',
  contact_person: 'John Doe',
  contact_email: 'john@example.com'
});

// Record payment
await recordUtilityPayment(util_id, paid_date);
```

---

## 6. Real-Time Integration Features

### Socket.IO Notifications

#### A. Badge Count Updates
When billing status changes, Socket.IO emits badge updates:

```typescript
const io = getSocketIOInstance();
io.emit('badge:billing', {
  count: unseenBillsCount,
  type: 'maintenance',
  timestamp: new Date()
});
```

#### B. Events Triggering Updates
- Form uploaded for maintenance request
- Invoice number assigned
- Payment status changed
- Fleet card issued/returned

#### C. Real-Time Subscriptions
- Clients subscribe to `badge:billing` events
- Count updates reflect in UI badges
- Supports multi-role notifications (finance, operations, etc.)

---

## 7. Reporting & Analytics

### Report Types

#### A. Maintenance Cost Reports
- **By Vehicle**: Total costs per vehicle, sortable/filterable
- **By Date Range**: Period-based cost breakdown
- **By Cost Center**: Departmental allocation
- Excel export for further analysis

#### B. Fuel Analytics
- **Monthly Breakdown**: Costs by month and vehicle
- **Cost Center Allocation**: Departmental fuel budgets
- **Vehicle Consumption**: Fuel efficiency baseline
- Trend analysis over periods

#### C. Fleet Management Reports
- Card assignment history
- Active cards by vehicle
- Card limit utilization
- Reassignment audit trail

### Implementation Pattern

```typescript
// Generate Excel report
const excelGenerator = require('src/utils/excelGeneratorUtil');
const workbook = new excelGenerator();

// Add data sheets
workbook.addSheet('Maintenance', maintenanceData);
workbook.addSheet('Fuel', fuelData);

// Generate and return
const buffer = workbook.generate();
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename="billing-report.xlsx"');
res.send(buffer);
```

---

## 8. Error Handling & Validation

### Input Validation

```typescript
// Invoice update validation
if (!inv_no || !inv_date || !inv_total) {
  return res.status(400).json({
    status: 'error',
    message: 'Invoice number, date, and total amount are required',
    data: null
  });
}

// Date range validation
if (new Date(from) > new Date(to)) {
  return res.status(400).json({
    status: 'error',
    message: 'From date must be before To date',
    data: null
  });
}
```

### Error Scenarios

| Scenario | Status | Response |
|----------|--------|----------|
| Missing required field | 400 | Validation error message |
| Invoice not found | 404 | Record not found |
| Unauthorized access | 401 | Authentication required |
| File upload failure | 400 | Upload error details |
| Database error | 500 | Internal server error |

---

## 9. Database Optimization

### Performance Indexes

All tables have indexes on frequently queried columns:

```sql
-- Maintenance invoices
INDEX idx_inv_vehicle (vehicle_id)
INDEX idx_inv_date (inv_date)
INDEX idx_inv_stat (inv_stat)
INDEX idx_svc_order (svc_order)

-- Fuel statements
INDEX idx_fuel_stmt_date (stmt_date)
INDEX idx_fuel_vendor (fuel_vendor_id)

-- Fleet cards
INDEX idx_card_number (card_number)
INDEX idx_card_status (card_status)

-- Utilities
INDEX idx_util_account (util_account_id)
INDEX idx_util_date (bill_month)
INDEX idx_util_status (status)
```

### Query Patterns

```typescript
// Optimize with indexes
const [billings] = await pool.query(
  'SELECT * FROM billings.tbl_inv WHERE vehicle_id = ? AND inv_date BETWEEN ? AND ?',
  [vehicleId, fromDate, toDate]
);

// Multi-table join for detailed invoice
const [details] = await pool.query(
  `SELECT i.*, ip.part_name, ip.quantity, ip.unit_price
   FROM billings.tbl_inv i
   JOIN billings.tbl_inv_part ip ON i.inv_id = ip.inv_id
   WHERE i.inv_id = ?`,
  [invId]
);
```

---

## 10. Future Enhancements

### Short-term
- [ ] Payment reminder emails for utilities
- [ ] Fleet card spending alerts (approaching limits)
- [ ] Maintenance cost comparisons across similar vehicles
- [ ] Fuel efficiency benchmarking

### Medium-term
- [ ] Automated invoice generation from fuel statements
- [ ] Multi-currency support for international billing
- [ ] Workflow approvals (pending → approved → invoiced)
- [ ] Recurring bill automation for utilities

### Long-term
- [ ] Predictive maintenance cost forecasting
- [ ] Machine learning for fuel consumption optimization
- [ ] Blockchain integration for invoice verification
- [ ] Integration with accounting systems (SAP, NetSuite)

---

## 11. Security Considerations

### Access Control
- All endpoints require Bearer token validation
- Role-based filtering (finance, operations, etc.)
- Department-level cost center restrictions
- Sensitive fields encrypted in transit

### Audit Trail
- All invoice modifications logged
- Payment transactions tracked
- Card assignment changes recorded
- File uploads versioned

### Compliance
- Financial data retained per regulatory requirements
- Backup and disaster recovery procedures
- Regular security audits of billing data
