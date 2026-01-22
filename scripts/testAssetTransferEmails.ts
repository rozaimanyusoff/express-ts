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
    transfer_type: 'Laptop',
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
    transfer_type: 'Monitor',
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

async function testAllTemplates() {
  console.log('\n🚀 Starting asset transfer email template tests...\n');
  console.log(`📧 All emails will be sent to: ${testEmail}\n`);

  try {
    // T1 - Submission
    console.log('📤 Sending T1 - Submission (Full Details)...');
    const t1 = assetTransferT1SubmissionEmail({
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockSupervisor
    });
    await sendMail(testEmail, `[TEST T1] ${t1.subject}`, t1.html);
    console.log('✅ T1 sent successfully\n');

    // T2 - HOD Approval Request
    console.log('📤 Sending T2 - HOD Approval Request (Full Details)...');
    const t2 = assetTransferT2HodApprovalRequestEmail({
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockSupervisor,
      portalUrl: 'https://portal.ranhill.com.my/assets/transfer/approval/1001'
    });
    await sendMail(testEmail, `[TEST T2] ${t2.subject}`, t2.html);
    console.log('✅ T2 sent successfully\n');

    // T3 - HOD Decision
    console.log('📤 Sending T3 - HOD Decision Confirmation...');
    const t3 = assetTransferT3HodDecisionEmail({
      approver: mockApprover,
      requestIds: [1001, 1002, 1003],
      approvedDate: new Date()
    });
    await sendMail(testEmail, `[TEST T3] ${t3.subject}`, t3.html);
    console.log('✅ T3 sent successfully\n');

    // T4 - HOD Approved
    console.log('📤 Sending T4 - HOD Approved Notification...');
    const t4 = assetTransferT4HodApprovedEmail({
      approver: mockApprover,
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST T4] ${t4.subject}`, t4.html);
    console.log('✅ T4 sent successfully\n');

    // T5 - Awaiting Acceptance
    console.log('📤 Sending T5 - Awaiting Acceptance (Full Details)...');
    const t5 = assetTransferT5AwaitingAcceptanceEmail({
      approver: mockApprover,
      credentialCode: 'CRED-ABC123XYZ',
      itemsForNewOwner: mockItems,
      newOwner: mockNewOwner,
      request: mockRequest,
      requestor: mockRequestor,
      transferId: 1001
    });
    await sendMail(testEmail, `[TEST T5] ${t5.subject}`, t5.html);
    console.log('✅ T5 sent successfully\n');

    // T6 - HOD Rejected
    console.log('📤 Sending T6 - HOD Rejected (with red color scheme)...');
    const t6 = assetTransferT6HodRejectedEmail({
      items: mockItems,
      rejectedBy: mockApprover,
      rejectReason: 'Asset is currently undergoing maintenance. Please resubmit after completion.',
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST T6] ${t6.subject}`, t6.html);
    console.log('✅ T6 sent successfully\n');

    // T7 - Transfer Completed
    console.log('📤 Sending T7 - Transfer Accepted & Completed (Full Details)...');
    const t7 = assetTransferT7TransferCompletedEmail({
      acceptanceDate: new Date(),
      acceptanceRemarks: 'Assets received in good condition. All items accounted for.',
      items: mockItems,
      newOwner: mockNewOwner,
      request: mockRequest,
      requestor: mockRequestor,
      currentOwner: mockCurrentOwner
    });
    await sendMail(testEmail, `[TEST T7] ${t7.subject}`, t7.html);
    console.log('✅ T7 sent successfully\n');

    console.log('✨ All email templates sent successfully!\n');
    console.log(`📨 Check your inbox at ${testEmail} to verify the designs.\n`);

  } catch (error) {
    console.error('❌ Error sending test emails:', error);
    process.exit(1);
  }
}

// Run the test
testAllTemplates();
