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
  
  // Green theme styles (matching assetTransferRequest)
  const primary = '#1b5e20'; // dark green
  const primarySoft = '#2e7d32';
  const bgSoft = '#e8f5e9';
  const border = '#c8e6c9';
  const header = `background:${primary}; color:#fff; padding:16px 20px; border-radius:8px 8px 0 0; font-size:18px; font-weight:700;`;
  const container = `border:1px solid ${border}; border-radius:8px; overflow:hidden;`;
  const sectionTitle = `font-size:16px; color:${primarySoft}; margin:16px 0 8px 0;`;
  const cardStyle = `background:${bgSoft}; border:1px solid ${border}; border-radius:8px; padding:14px 16px; margin-bottom:14px; font-size:14px; line-height:1.55;`;
  const labelStyle = 'font-weight:600; display:inline-block; min-width:160px; vertical-align:top;';
  const valueStyle = 'display:inline-block; min-width:180px;';
  const rowStyle = 'margin-bottom:6px;';
  
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(newOwner?.full_name)},</div>
          <div style="margin-bottom:14px;">The asset transfer application <b>#${safe(request?.request_no || request?.id)}</b> has been <b style="color:${primarySoft};">approved</b>. You are listed as the <b>new owner</b> for the following item(s):</div>
          
          <div style="${sectionTitle}">Approved Items</div>
          ${itemsForNewOwner.map((it: any) => `
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Identifier:</span> <span style="${valueStyle}">${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Transfer Type:</span> <span style="${valueStyle}">${safe(it.transfer_type)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(it.effective_date)}</span></div>
          </div>
          `).join('')}

          <div style="${sectionTitle}">Request Details</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Approved by:</span> <span style="${valueStyle}">${safe(approver?.full_name || approver?.name || approver?.ramco_id)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requested by:</span> <span style="${valueStyle}">${safe(requestor?.full_name || requestor?.ramco_id)}</span></div>
          </div>

          <div style="margin-top: 1em;">
            Our team will coordinate with you for the next steps.
          </div>
        </div>
      </div>
      <div style="margin-top: 1em; font-size: 12px; color: #607d8b;">
        <b>Disclaimer:</b> This is an automated notification; please do not reply to this email.
      </div>
      <div style="margin-top: 1.2em;">Thank you.</div>
    </div>
  `;
  return { subject, html };
}
