// Email template for asset transfer notification to current owner
// Usage: assetTransferCurrentOwnerEmail({ request, item, currentOwner, supervisor })

interface AssetTransferCurrentOwnerEmailParams {
  request: any; // asset_transfer_requests row
  item: any;    // asset_transfer_details row
  currentOwner: any; // employee object (with email, name, etc)
  supervisor: any;   // employee object (with name, email, etc)
}

export function assetTransferCurrentOwnerEmail({ request, item, currentOwner, supervisor }: AssetTransferCurrentOwnerEmailParams) {
  const subject = `Asset Transfer Notification: Request #${request.request_no}`;
  const html = `
    <p>Dear ${currentOwner.full_name || 'Employee'},</p>
    <p>This is to inform you that your supervisor <b>${supervisor.full_name || supervisor.name || supervisor.ramco_id}</b> has <b>approved</b> the asset transfer request <b>#${request.request_no}</b>.</p>
    <p><b>Transfer Details:</b></p>
    <ul>
      <li><b>Request No:</b> ${request.request_no}</li>
      <li><b>Transfer Type:</b> ${item.transfer_type}</li>
      <li><b>Asset/Employee Identifier:</b> ${item.identifier}</li>
      <li><b>Effective Date:</b> ${item.effective_date ? new Date(item.effective_date).toLocaleDateString() : '-'}</li>
  <li><b>Reason:</b> ${item.reasons || item.reason || '-'}</li>
    </ul>
    <p>Please prepare yourself and/or the asset for the transfer process as soon as possible.</p>
    <p>If you have any questions, please contact your supervisor.</p>
    <p>Thank you.</p>
  `;
  return { subject, html };
}
