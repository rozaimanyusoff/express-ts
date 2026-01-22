/**
 * Test script for asset transfer REJECTION scenario
 * Simulates: HOD rejects a transfer request with remarks
 * Usage: npx tsx scripts/testAssetTransferRejectionScenario.ts
 */

import assetTransferT1SubmissionEmail from '../src/utils/emailTemplates/assetTransferT1Submission';
import assetTransferT2HodApprovalRequestEmail from '../src/utils/emailTemplates/assetTransferT2HodApprovalRequest';
import { assetTransferT6HodRejectedEmail } from '../src/utils/emailTemplates/assetTransferT6HodRejected';
import assetTransferAssetManagerEmail from '../src/utils/emailTemplates/assetTransferAssetManagerEmail';
import { sendMail } from '../src/utils/mailer';

const testEmail = 'rozaiman@ranhill.com.my';

// Mock data for rejection scenario
const mockRequestor = {
  id: 1,
  full_name: 'John Doe',
  email: 'john.doe@ranhill.com.my',
  ramco_id: 'EMP001',
  costcenter: { name: 'CC-001' },
  department: { name: 'IT Department' },
  district: { name: 'Kuala Lumpur' }
};

const mockHod = {
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

const mockRequest = {
  id: 2001,
  request_no: 'ATR-20260122-REJ-001',
  request_date: new Date(),
  transfer_date: new Date(),
  request_status: 'Rejected',
  transfer_status: 'Rejected'
};

const mockItems = [
  {
    id: 201,
    asset_type: 'Desktop Computer',
    transfer_type: 'Desktop Computer',
    register_number: 'ASSET-DES-001',
    identifierDisplay: 'ASSET-DES-001',
    effective_date: new Date(),
    reason: 'Departmental equipment allocation',
    reasons: 'Departmental equipment allocation',
    currOwnerName: 'John Doe',
    newOwnerName: 'Siti Nur',
    currCostcenterName: 'CC-001',
    newCostcenterName: 'CC-002',
    currDepartmentCode: 'IT',
    newDepartmentCode: 'HR',
    currDistrictCode: 'KL',
    newDistrictCode: 'PJ',
    asset: {
      register_number: 'ASSET-DES-001',
      type: { name: 'Desktop Computer' },
      brand: { name: 'HP' },
      model: { name: 'ProDesk 400 G9' },
      owner: { full_name: 'John Doe' }
    }
  },
  {
    id: 202,
    asset_type: 'Keyboard & Mouse Set',
    transfer_type: 'Keyboard & Mouse Set',
    register_number: 'ASSET-KBM-001',
    identifierDisplay: 'ASSET-KBM-001',
    effective_date: new Date(),
    reason: 'Departmental equipment allocation',
    reasons: 'Departmental equipment allocation',
    currOwnerName: 'John Doe',
    newOwnerName: 'Siti Nur',
    currCostcenterName: 'CC-001',
    newCostcenterName: 'CC-002',
    currDepartmentCode: 'IT',
    newDepartmentCode: 'HR',
    currDistrictCode: 'KL',
    newDistrictCode: 'PJ',
    asset: {
      register_number: 'ASSET-KBM-001',
      type: { name: 'Keyboard & Mouse Set' },
      brand: { name: 'Logitech' },
      model: { name: 'MK845' },
      owner: { full_name: 'John Doe' }
    }
  }
];

// Asset manager info
const mockAssetManager = {
  id: 5,
  full_name: 'Syed Ibrahim',
  ramco_id: 'EMP005',
  email: 'syed.ibrahim@ranhill.com.my'
};

async function testRejectionScenario() {
  console.log('\n🚀 Starting ASSET TRANSFER REJECTION SCENARIO TEST...\n');
  console.log(`📧 All rejection notification emails will be sent to: ${testEmail}\n`);
  console.log('📋 Scenario: HOD reviews and REJECTS the transfer request with remarks\n');
  console.log('─'.repeat(80) + '\n');

  try {
    // Step 1: Requestor submits transfer request
    console.log('📝 STEP 1: Requestor submits transfer request\n');
    console.log('📤 Sending T1 - Submission Notification (Full Details)...');
    const t1 = assetTransferT1SubmissionEmail({
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockHod
    });
    await sendMail(testEmail, `[TEST REJECTION - STEP 1] ${t1.subject}`, t1.html);
    console.log('✅ T1 sent - Submission notification to requestor and asset manager\n');

    // Step 2: HOD receives approval request
    console.log('📋 STEP 2: HOD receives the approval request\n');
    console.log('📤 Sending T2 - HOD Approval Request (Full Details)...');
    const t2 = assetTransferT2HodApprovalRequestEmail({
      items: mockItems,
      request: mockRequest,
      requestor: mockRequestor,
      supervisor: mockHod,
      portalUrl: 'https://portal.ranhill.com.my/assets/transfer/approval/2001'
    });
    await sendMail(testEmail, `[TEST REJECTION - STEP 2] ${t2.subject}`, t2.html);
    console.log('✅ T2 sent - HOD receives approval request with portal link\n');

    // Step 3: HOD reviews and REJECTS the request
    console.log('⛔ STEP 3: HOD REJECTS the transfer request\n');
    console.log('📤 Sending T6 - HOD Rejection Notification (with red color scheme)...');
    const t6 = assetTransferT6HodRejectedEmail({
      items: mockItems,
      rejectedBy: mockHod,
      rejectReason: `The assets are currently required for ongoing project deliverables in the IT department. 
        Request to resubmit after Q1 2026 when project completion is expected. 
        Please coordinate with IT management for future scheduling.`,
      request: mockRequest,
      requestor: mockRequestor
    });
    await sendMail(testEmail, `[TEST REJECTION - STEP 3] ${t6.subject}`, t6.html);
    console.log('✅ T6 sent - Rejection notification to requestor (RED theme)\n');

    // Step 4: Asset Manager gets notified of rejection
    console.log('📌 STEP 4: Asset Manager is notified of rejection\n');
    console.log('📤 Sending Asset Manager Rejection Notification...');
    const assetManagerNotif = assetTransferAssetManagerEmail({
      applicant: mockRequestor,
      date: new Date(),
      requestId: mockRequest.id,
      typeNames: ['Desktop Computer', 'Keyboard & Mouse Set']
    });
    await sendMail(
      testEmail,
      `[TEST REJECTION - STEP 4] Asset Transfer Rejection - Request #${mockRequest.request_no}`,
      assetManagerNotif.html
    );
    console.log('✅ Asset Manager notified\n');

    console.log('─'.repeat(80) + '\n');
    console.log('✨ REJECTION SCENARIO TEST COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Rejection Test Summary:');
    console.log('   • Request ID: ' + mockRequest.id);
    console.log('   • Request No: ' + mockRequest.request_no);
    console.log('   • Items Rejected: ' + mockItems.length);
    console.log('   • Rejected By: ' + mockHod.full_name + ' (HOD)');
    console.log('   • Rejection Reason: Project priority in IT department');
    console.log('   • Status: REJECTED\n');
    console.log('📨 All rejection notifications sent to: ' + testEmail + '\n');
    console.log('📬 Check your inbox to verify:');
    console.log('   1. T1 - Initial submission notification');
    console.log('   2. T2 - HOD approval request');
    console.log('   3. T6 - Rejection notification (RED theme)');
    console.log('   4. Asset Manager notification\n');
    console.log('🔍 Expected T6 Characteristics:');
    console.log('   • Color Scheme: RED (indicating rejection)');
    console.log('   • Subject: Asset Transfer Request #... - Rejected');
    console.log('   • Content: Rejection reason with next steps');
    console.log('   • Items: All rejected transfer items listed');
    console.log('   • Recommendation: Resubmit after project completion\n');

  } catch (error) {
    console.error('❌ Error in rejection scenario test:', error);
    process.exit(1);
  }
}

// Run the test
testRejectionScenario();
