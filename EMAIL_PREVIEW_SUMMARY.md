# Email Template Preview - Transfer Type Comparison

## Quick Visual Guide

### Asset Transfer Email (T1 - Submission)

```
┌─────────────────────────────────────────────────────┐
│ SUBJECT: Asset Transfer Request #ATR-20260127-001  │
│          Submitted                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ REQUEST SUMMARY                                      │
├─────────────────────────────────────────────────────┤
│ Request No:     ATR-20260127-001                    │
│ Date:           01/02/2026                          │
│ Requestor:      John Doe (john.doe@ranhill.com.my) │
│ Cost Center:    Cost Center 210                     │
│ Department:     IT Department                       │
│ Location:       Kuala Lumpur                        │
│ Status:         submitted                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TRANSFER ITEM                                        │
├─────────────────────────────────────────────────────┤
│ Effective Date: 05/02/2026                          │
│ ★ Transfer Type: Asset                              │
│ ★ Asset Type: Computer                              │
│ Register Number: COMP-001-2024                      │
│ Reason: Transfer ownership, Relocation              │
│                                                      │
│ TRANSFER DETAILS                                     │
│ ┌────────────────┬──────────┬──────────┐            │
│ │ Field          │ Current  │ New      │            │
│ ├────────────────┼──────────┼──────────┤            │
│ │ Owner          │ John Doe │ Siti Nur │            │
│ │ Cost Center    │ CC-001   │ CC-002   │            │
│ │ Department     │ IT       │ HR       │            │
│ │ Location       │ KL       │ PJ       │            │
│ └────────────────┴──────────┴──────────┘            │
└─────────────────────────────────────────────────────┘
```

---

### Employee Transfer Email (T1 - Submission)

```
┌─────────────────────────────────────────────────────┐
│ SUBJECT: Asset Transfer Request #ATR-20260127-002  │
│          Submitted                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ REQUEST SUMMARY                                      │
├─────────────────────────────────────────────────────┤
│ Request No:       ATR-20260127-002                  │
│ Date:             01/02/2026                        │
│ Requestor:        Sarah Johnson                     │
│                   (sarah.johnson@ranhill.com.my)    │
│ Cost Center:      Cost Center 210                   │
│ Department:       Operations                        │
│ Location:         Kuala Lumpur                      │
│ Status:           submitted                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TRANSFER ITEM                                        │
├─────────────────────────────────────────────────────┤
│ Effective Date: 10/02/2026                          │
│ ★ Transfer Type: Employee                           │
│ Register Number: E77777                             │
│ Reason: Transfer ownership, Role Change / Promotion │
│                                                      │
│ TRANSFER DETAILS                                     │
│ ┌────────────────┬─────────────┬────────────┐       │
│ │ Field          │ Current     │ New        │       │
│ ├────────────────┼─────────────┼────────────┤       │
│ │ Owner          │ Sarah John. │ Amir Khal. │       │
│ │ Cost Center    │ CC-210      │ CC-220     │       │
│ │ Department     │ OPS         │ SALES      │       │
│ │ Location       │ KL          │ PJ         │       │
│ └────────────────┴─────────────┴────────────┘       │
└─────────────────────────────────────────────────────┘
```

---

## Key Differences

### Transfer Type Field

| Aspect | Asset Transfer | Employee Transfer |
|--------|----------------|-------------------|
| **Transfer Type** | `Asset` | `Employee` |
| **Asset Type** | `Computer` (shown) | _(hidden)_ |
| **Register Number** | `COMP-001-2024` | `E77777` (Employee ID) |
| **Type ID** | Present (12) | Null |
| **Asset ID** | Present (987) | Null |

---

## Email Template Matrix

### T1 - Submission

**Asset Transfer:**
```
✅ Transfer Type: Asset
✅ Asset Type: Computer
✅ Register: COMP-001-2024
```

**Employee Transfer:**
```
✅ Transfer Type: Employee
✅ Asset Type: (hidden)
✅ Register: E77777
```

---

### T2 - HOD Approval Request

**Asset Transfer (To Current Owner's HOD + New Owner's HOD):**
```
✅ Transfer Type: Asset
✅ Asset Type: Computer
✅ Action Buttons: [Approve] [Reject]
✅ Portal Link: Yes
```

**Employee Transfer (To Current Owner's HOD + New Owner's HOD):**
```
✅ Transfer Type: Employee
✅ Asset Type: (hidden)
✅ Action Buttons: [Approve] [Reject]
✅ Portal Link: Yes
```

---

### T5 - Awaiting Acceptance

**Asset Transfer (To New Owner):**
```
✅ Transfer Type: Asset
✅ Asset Type: Computer
✅ Acceptance Portal Link
✅ Credential Code: cred-code-abc123
```

**Employee Transfer (To New Owner):**
```
✅ Transfer Type: Employee
✅ Asset Type: (hidden)
✅ Acceptance Portal Link
✅ Credential Code: cred-code-def456
```

---

## All 7 Email Templates Tested

| # | Template | Asset | Employee | Status |
|---|----------|:-----:|:--------:|--------|
| 1 | T1 - Submission | ✅ | ✅ | ✅ PASSED |
| 2 | T2 - HOD Approval Request | ✅ | ✅ | ✅ PASSED |
| 3 | T3 - HOD Decision | ✅ | ✅ | ✅ PASSED |
| 4 | T4 - HOD Approved | ✅ | ✅ | ✅ PASSED |
| 5 | T5 - Awaiting Acceptance | ✅ | ✅ | ✅ PASSED |
| 6 | T6 - HOD Rejected | ✅ | ✅ | ✅ PASSED |
| 7 | T7 - Transfer Completed | ✅ | ✅ | ✅ PASSED |

---

## Recipient Notifications

### Asset Transfer (Request #1001)

**Recipients for Each Template:**

| Template | Recipient | Count |
|----------|-----------|-------|
| **T1** | Requestor | 1 |
| **T2** | Current Owner's HOD + **New Owner's HOD** | 2 |
| **T3** | Approver | 1 |
| **T4** | Requestor + **New Owner's HOD** | 2 |
| **T5** | New Owner | 1 |
| **T6** | Requestor | 1 |
| **T7** | Requestor + New Owner | 2 |

---

### Employee Transfer (Request #1002)

**Recipients for Each Template:**

| Template | Recipient | Count |
|----------|-----------|-------|
| **T1** | Requestor | 1 |
| **T2** | Current Owner's HOD + **New Owner's HOD** | 2 |
| **T3** | Approver | 1 |
| **T4** | Requestor + **New Owner's HOD** | 2 |
| **T5** | New Owner | 1 |
| **T6** | Requestor | 1 |
| **T7** | Requestor + New Owner | 2 |

---

## Email Rendering Test Results

✅ **Asset Transfer Emails:**
- Clear distinction with "Transfer Type: Asset"
- Shows detailed asset information
- Asset Type properly displayed
- All formatting preserved

✅ **Employee Transfer Emails:**
- Clear distinction with "Transfer Type: Employee"
- Asset Type field intelligently hidden
- Employee ID shown as identifier
- All formatting preserved

✅ **New HOD Notifications:**
- Both templates notify New Owner's HOD
- Different from Current Owner's HOD (when different department)
- Uses same workflowHelper pattern
- Email sent on submission AND approval

---

## Files to Review

### Email Preview Files
📧 Check your inbox for 14 emails from the test script:
- 7 Asset Transfer emails
- 7 Employee Transfer emails

### HTML Output Directory
📁 **Location**: `/Users/rozaiman/express-ts/test-email-outputs/`

**View in Browser:**
```bash
# Open all test emails
open /Users/rozaiman/express-ts/test-email-outputs/

# Or view specific template
open /Users/rozaiman/express-ts/test-email-outputs/T1__Asset_Submission.html
```

### Test Script
📄 **Location**: `scripts/testAssetTransferEmailsWithTransferType.ts`

**Run Again:**
```bash
npx tsx scripts/testAssetTransferEmailsWithTransferType.ts
```

---

## Summary

✅ **All Templates Tested**: 7 templates × 2 types = 14 total  
✅ **Transfer Type Field**: Properly displayed in all emails  
✅ **Asset Type Field**: Shown for assets, hidden for employees  
✅ **New HOD Notifications**: Working correctly  
✅ **Email Delivery**: All 14 emails sent successfully  
✅ **HTML Outputs**: 14 files generated for preview  

**Status**: 🎉 **READY FOR PRODUCTION DEPLOYMENT**
