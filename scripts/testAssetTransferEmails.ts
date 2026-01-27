/**
 * Test script to send all asset transfer email templates
 * Usage: npx ts-node scripts/testAssetTransferEmails.ts
 */

import assetTransferT1SubmissionEmail from '../src/utils/emailTemplates/assetTransferT1Submission';
import assetTransferT2HodApprovalRequestEmail from '../src/utils/emailTemplates/assetTransferT2HodApprovalRequest';
import { assetTransferApprovalSummaryEmail as assetTransferT3HodDecisionEmail } from '../src/utils/emailTemplates/assetTransferT3HodDecision';
import { assetTransferApprovedRequestorEmail as assetTransferT4HodApprovedEmail } from '../src/utils/emailTemplates/assetTransferT4HodApproved';
import { assetTransferApprovedNewOwnerEmail as assetTransferT5AwaitingAcceptanceEmail } from '../src/utils/emailTemplates/assetTransferT5AwaitingAcceptance';
import { assetTransferT6HodRejectedEmail } from '../src/utils/emailTemplates/assetTransferT6HodRejected';
import { assetTransferAcceptedRequestorEmail as assetTransferT7TransferCompletedEmail } from '../src/utils/emailTemplates/assetTransferT7TransferCompleted';
import { sendMail } from '../src/utils/mailer';

const testEmail = 'rozaiman@ranhill.com.my';

// Mock data
const mockRequestor = {
  id: 1,
  full_name: 'John Doe',
  email: 'john.doe@ranhill.com.my',
  ramco_id: 'EMP001',
  costcenter: { name: 'CC-001' },
  department: { name: 'IT Department' },
  district: { name: 'Kuala Lumpur' }
};

const mockSupervisor = {
  id: 2,
  full_name: 'Jane Smith',
  name: 'Jane Smith',
  email: 'jane.smith@ranhill.com.my',
  ramco_id: 'EMP002'
};

const mockApprover = {
  id: 3,
  full_name: 'Ahmad Hassan',
  name: 'Ahmad Hassan',
  email: 'ahmad.hassan@ranhill.com.my',
  ramco_id: 'EMP003'
};

const mockNewOwner = {
  id: 4,
  full_name: 'Siti Nur',
  name: 'Siti Nur',
  email: 'siti.nur@ranhill.com.my',
  ramco_id: 'EMP004'
};

const mockCurrentOwner = {
  id: 1,
  full_name: 'John Doe',
  email: 'john.doe@ranhill.com.my'
};

const mockRequest = {
  id: 1001,
  request_no: 'ATR-20260122-001',
  request_date: new Date(),
  transfer_date: new Date(),
  request_status: 'Pending',
  transfer_status: 'Pending'
};

const mockItems = [
  {
    id: 101,
    asset_type: 'Laptop',
    transfer_type: 'Asset',
    assetTypeName: 'Laptop',
    register_number: 'ASSET-LAP-001',
    identifierDisplay: 'ASSET-LAP-001',
    effective_date: new Date(),
    reason: 'Employee transfer to new department',
    reasons: 'Employee transfer to new department',
    currOwnerName: 'John Doe',
    newOwnerName: 'Siti Nur',
    currCostcenterName: 'CC-001',
    newCostcenterName: 'CC-002',
    currDepartmentCode: 'IT',
    newDepartmentCode: 'HR',
    currDistrictCode: 'KL',
    newDistrictCode: 'PJ',
    asset: {
      register_number: 'ASSET-LAP-001',
      type: { name: 'Laptop' },
      brand: { name: 'Dell' },
      model: { name: 'Latitude 5540' },
      owner: { full_name: 'John Doe' }
    }
  },
  {
    id: 102,
    asset_type: 'Monitor',
    transfer_type: 'Asset',
    assetTypeName: 'Monitor',
    register_number: 'ASSET-MON-001',
    identifierDisplay: 'ASSET-MON-001',
    effective_date: new Date(),
    reason: 'Equipment refresh',
    reasons: 'Equipment refresh',
    currOwnerName: 'John Doe',
    newOwnerName: 'Siti Nur',
    currCostcenterName: 'CC-001',
    newCostcenterName: 'CC-002',
    currDepartmentCode: 'IT',
    newDepartmentCode: 'HR',
    currDistrictCode: 'KL',
    newDistrictCode: 'PJ',
    asset: {
      register_number: 'ASSET-MON-001',
      type: { name: 'Monitor' },
      brand: { name: 'LG' },
      model: { name: '27UP550' },
      owner: { full_name: 'John Doe' }
    }
  }
];

const mockEmployeeTransferItems = [
  {
    id: 103,
    asset_type: 'Employee',
    transfer_type: 'Employee',
    assetTypeName: 'Employee',
    register_number: null,
    identifierDisplay: null,
    effective_date: new Date(Date.now() + 86400000 * 10), // 10 days from now
    reason: 'Promotion to Senior Manager',
    reasons: 'Promotion to Senior Manager',
    currOwnerName: 'John Doe',
    newOwnerName: 'Siti Nur',
    currCostcenterName: 'CC-001',
    newCostcenterName: 'CC-002',
    currDepartmentCode: 'IT',
    newDepartmentCode: 'HR',
    currDistrictCode: 'KL',
    newDistrictCode: 'PJ',
    asset: {
      type: { name: 'Employee' },
      brand: null,
      model: null,
      owner: { full_name: 'John Doe' }
    }
  }
];

async function testAllTemplates() {
  console.log('\n🚀 Starting asset transfer email template tests...\n');
  console.log(`📧 All emails will be sent to: ${testEmail}\n`);
  console.log('📋 Testing both Asset and Employee transfer types\n');

  try {
    // T1 - Submission (with Asset items)
    console.log('📤 Sending T1 - Submission (Asset Transfer)...');
    const t1 = assetTransferT1SubmissionEmail({
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockSupervisor
    });
    await sendMail(testEmail, `[TEST T1-ASSET] ${t1.subject}`, t1.html);
    console.log('✅ T1 (Asset) sent successfully\n');

    // T1 - Submission (with Employee items)
    console.log('📤 Sending T1 - Submission (Employee Transfer)...');
    const t1emp = assetTransferT1SubmissionEmail({
      items: mockEmployeeTransferItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockSupervisor
    });
    await sendMail(testEmail, `[TEST T1-EMPLOYEE] ${t1emp.subject}`, t1emp.html);
    console.log('✅ T1 (Employee) sent successfully\n');

    // T2 - HOD Approval Request (with Asset items)
    console.log('📤 Sending T2 - HOD Approval Request (Asset Transfer)...');
    const t2 = assetTransferT2HodApprovalRequestEmail({
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockSupervisor,
      portalUrl: 'https://portal.ranhill.com.my/assets/transfer/approval/1001'
    });
    await sendMail(testEmail, `[TEST T2-ASSET] ${t2.subject}`, t2.html);
    console.log('✅ T2 (Asset) sent successfully\n');

    // T2 - HOD Approval Request (with Employee items)
    console.log('📤 Sending T2 - HOD Approval Request (Employee Transfer)...');
    const t2emp = assetTransferT2HodApprovalRequestEmail({
      items: mockEmployeeTransferItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockSupervisor,
      portalUrl: 'https://portal.ranhill.com.my/assets/transfer/approval/1001'
    });
    await sendMail(testEmail, `[TEST T2-EMPLOYEE] ${t2emp.subject}`, t2emp.html);
    console.log('✅ T2 (Employee) sent successfully\n');

    // T3 - HOD Decision
    console.log('📤 Sending T3 - HOD Decision Confirmation...');
    const t3 = assetTransferT3HodDecisionEmail({
      approver: mockApprover,
      requestIds: [1001, 1002, 1003],
      approvedDate: new Date()
    });
    await sendMail(testEmail, `[TEST T3] ${t3.subject}`, t3.html);
    console.log('✅ T3 sent successfully\n');

    // T4 - HOD Approved (with Asset items)
    console.log('📤 Sending T4 - HOD Approved Notification (Asset Transfer)...');
    const t4 = assetTransferT4HodApprovedEmail({
      approver: mockApprover,
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST T4-ASSET] ${t4.subject}`, t4.html);
    console.log('✅ T4 (Asset) sent successfully\n');

    // T4 - HOD Approved (with Employee items)
    console.log('📤 Sending T4 - HOD Approved Notification (Employee Transfer)...');
    const t4emp = assetTransferT4HodApprovedEmail({
      approver: mockApprover,
      items: mockEmployeeTransferItems,
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST T4-EMPLOYEE] ${t4emp.subject}`, t4emp.html);
    console.log('✅ T4 (Employee) sent successfully\n');

    // T5 - Awaiting Acceptance (with Asset items)
    console.log('📤 Sending T5 - Awaiting Acceptance (Asset Transfer)...');
    const t5 = assetTransferT5AwaitingAcceptanceEmail({
      approver: mockApprover,
      credentialCode: 'CRED-ABC123XYZ',
      itemsForNewOwner: mockItems,
      newOwner: mockNewOwner,
      request: mockRequest,
      requestor: mockRequestor,
      transferId: 1001
    });
    await sendMail(testEmail, `[TEST T5-ASSET] ${t5.subject}`, t5.html);
    console.log('✅ T5 (Asset) sent successfully\n');

    // T5 - Awaiting Acceptance (with Employee items)
    console.log('📤 Sending T5 - Awaiting Acceptance (Employee Transfer)...');
    const t5emp = assetTransferT5AwaitingAcceptanceEmail({
      approver: mockApprover,
      credentialCode: 'CRED-ABC123XYZ',
      itemsForNewOwner: mockEmployeeTransferItems,
      newOwner: mockNewOwner,
      request: mockRequest,
      requestor: mockRequestor,
      transferId: 1001
    });
    await sendMail(testEmail, `[TEST T5-EMPLOYEE] ${t5emp.subject}`, t5emp.html);
    console.log('✅ T5 (Employee) sent successfully\n');

    // T6 - HOD Rejected (with Asset items)
    console.log('📤 Sending T6 - HOD Rejected (Asset Transfer)...');
    const t6 = assetTransferT6HodRejectedEmail({
      items: mockItems,
      rejectedBy: mockApprover,
      rejectReason: 'Asset is currently undergoing maintenance. Please resubmit after completion.',
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST T6-ASSET] ${t6.subject}`, t6.html);
    console.log('✅ T6 (Asset) sent successfully\n');

    // T6 - HOD Rejected (with Employee items)
    console.log('📤 Sending T6 - HOD Rejected (Employee Transfer)...');
    const t6emp = assetTransferT6HodRejectedEmail({
      items: mockEmployeeTransferItems,
      rejectedBy: mockApprover,
      rejectReason: 'Employee is currently on leave. Please reschedule the transfer.',
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST T6-EMPLOYEE] ${t6emp.subject}`, t6emp.html);
    console.log('✅ T6 (Employee) sent successfully\n');

    // T7 - Transfer Completed (with Asset items)
    console.log('📤 Sending T7 - Transfer Accepted & Completed (Asset Transfer)...');
    const t7 = assetTransferT7TransferCompletedEmail({
      acceptanceDate: new Date(),
      acceptanceRemarks: 'Assets received in good condition. All items accounted for.',
      items: mockItems,
      newOwner: mockNewOwner,
      request: mockRequest,
      requestor: mockRequestor,
      currentOwner: mockCurrentOwner
    });
    await sendMail(testEmail, `[TEST T7-ASSET] ${t7.subject}`, t7.html);
    console.log('✅ T7 (Asset) sent successfully\n');

    // T7 - Transfer Completed (with Employee items)
    console.log('📤 Sending T7 - Transfer Accepted & Completed (Employee Transfer)...');
    const t7emp = assetTransferT7TransferCompletedEmail({
      acceptanceDate: new Date(),
      acceptanceRemarks: 'Employee successfully transferred to new department.',
      items: mockEmployeeTransferItems,
      newOwner: mockNewOwner,
      request: mockRequest,
      requestor: mockRequestor,
      currentOwner: mockCurrentOwner
    });
    await sendMail(testEmail, `[TEST T7-EMPLOYEE] ${t7emp.subject}`, t7emp.html);
    console.log('✅ T7 (Employee) sent successfully\n');

    console.log('✨ All email templates sent successfully!\n');
    console.log(`📨 Sent 14 test emails (7 templates × 2 types) to ${testEmail}\n`);
    console.log('📋 Check your inbox to verify:\n');
    console.log('   ✓ T1: Submission (Asset & Employee)\n');
    console.log('   ✓ T2: HOD Approval Request (Asset & Employee)\n');
    console.log('   ✓ T3: HOD Decision Confirmation\n');
    console.log('   ✓ T4: HOD Approved (Asset & Employee)\n');
    console.log('   ✓ T5: Awaiting Acceptance (Asset & Employee)\n');
    console.log('   ✓ T6: HOD Rejected (Asset & Employee)\n');
    console.log('   ✓ T7: Transfer Completed (Asset & Employee)\n');

  } catch (error) {
    console.error('❌ Error sending test emails:', error);
    process.exit(1);
  }
}

// Run the test
testAllTemplates();
