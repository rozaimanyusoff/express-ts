// Email template: notify new owner that transfer application approved
// Usage: assetTransferApprovedNewOwnerEmail({ request, itemsForNewOwner, newOwner, requestor, approver })

interface AssetTransferApprovedNewOwnerParams {
  request: any;
  itemsForNewOwner: any[]; // subset of items that affect this new owner
  newOwner: any; // employee
  requestor?: any; // requestor employee
  approver?: any; // approver
}

export function assetTransferApprovedNewOwnerEmail({ request, itemsForNewOwner, newOwner, requestor, approver }: AssetTransferApprovedNewOwnerParams) {
  const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US') : '-';
  const subject = `Asset Transfer Approved - You are the new owner (Request #${safe(request?.request_no || request?.id)})`;
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <p>Dear ${safe(newOwner?.full_name)},</p>
      <p>The asset transfer application <b>#${safe(request?.request_no || request?.id)}</b> has been <b>approved</b>. You are listed as the <b>new owner</b> for the following item(s):</p>
      <ul>
        ${itemsForNewOwner.map((it: any) => `<li>${safe(it.transfer_type)} - ${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)} (Effective: ${formatDate(it.effective_date)})</li>`).join('')}
      </ul>
      <p><b>Approved by:</b> ${safe(approver?.full_name || approver?.name || approver?.ramco_id)}</p>
      <p><b>Requested by:</b> ${safe(requestor?.full_name || requestor?.ramco_id)}</p>
      <p>Our team will coordinate with you for the next steps.</p>
      <p>Thank you.</p>
    </div>
  `;
  return { subject, html };
}
