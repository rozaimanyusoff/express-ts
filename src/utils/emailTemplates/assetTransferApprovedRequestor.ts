// Email template: notify requestor that transfer application approved
// Usage: assetTransferApprovedRequestorEmail({ request, items, requestor, approver })

interface AssetTransferApprovedRequestorParams {
  request: any;
  items: any[];
  requestor: any; // employee object with full_name, email
  approver: any;  // approver employee object
}

export function assetTransferApprovedRequestorEmail({ request, items, requestor, approver }: AssetTransferApprovedRequestorParams) {
  const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US') : '-';
  const subject = `Asset Transfer Approved - Request #${safe(request?.request_no || request?.id)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <p>Dear ${safe(requestor?.full_name)},</p>
      <p>Your asset transfer application <b>#${safe(request?.request_no || request?.id)}</b> has been <b>approved</b> by <b>${safe(approver?.full_name || approver?.name || approver?.ramco_id)}</b>.</p>
      <p><b>Request Summary</b></p>
      <ul>
        <li><b>Request No:</b> ${safe(request?.request_no || request?.id)}</li>
        <li><b>Request Date:</b> ${formatDate(request?.request_date || request?.transfer_date)}</li>
        <li><b>Status:</b> ${safe(request?.transfer_status || 'approved')}</li>
      </ul>
      <p><b>Approved Items</b></p>
      <ul>
        ${items.map((it: any) => `<li>${safe(it.transfer_type)} - ${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)} (Effective: ${formatDate(it.effective_date)})</li>`).join('')}
      </ul>
      <p>Next, the asset team will proceed with the transfer process.</p>
      <p>Thank you.</p>
    </div>
  `;
  return { subject, html };
}
