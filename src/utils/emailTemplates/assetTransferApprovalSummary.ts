// Email template: summary to the approver confirming approvals
// Usage: assetTransferApprovalSummaryEmail({ approver, requestIds, approvedDate })

interface AssetTransferApprovalSummaryParams {
  approvedDate?: Date | string;
  approver: { email?: string; full_name?: string; name?: string; ramco_id?: string };
  requestIds: number[];
}

export function assetTransferApprovalSummaryEmail({ approvedDate, approver, requestIds }: AssetTransferApprovalSummaryParams) {
  const name = approver.full_name || approver.name || approver.ramco_id || 'Approver';
  const subject = `You approved ${requestIds.length} asset transfer application(s)`;
  const formatDateTime = (d: any) => {
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };
  const dateStr = formatDateTime(approvedDate || new Date());
  const reqList = requestIds.map(id => `#${id}`).join(', ');
  
  // Green theme styles (matching assetTransferRequest)
  const primary = '#1b5e20'; // dark green
  const primarySoft = '#2e7d32';
  const bgSoft = '#e8f5e9';
  const border = '#c8e6c9';
  const header = `background:${primary}; color:#fff; padding:16px 20px; border-radius:8px 8px 0 0; font-size:18px; font-weight:700;`;
  const container = `border:1px solid ${border}; border-radius:8px; overflow:hidden;`;
  const cardStyle = `background:${bgSoft}; border:1px solid ${border}; border-radius:8px; padding:14px 16px; margin-bottom:14px; font-size:14px; line-height:1.55;`;
  const labelStyle = 'font-weight:600; display:inline-block; min-width:160px; vertical-align:top;';
  const valueStyle = 'display:inline-block; min-width:180px;';
  const rowStyle = 'margin-bottom:6px;';
  
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${name},</div>
          <div style="margin-bottom:14px;">This is a confirmation that you have approved the following <b>asset transfer application(s)</b> on <span style="color:${primarySoft}; font-weight:700;">${dateStr}</span>:</div>
          
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Application IDs:</span> <span style="${valueStyle}">${reqList}</span></div>
          </div>

          <div style="margin-top: 1em; padding:12px; background:#fff3cd; border:1px solid #ffc107; border-radius:6px; font-size:13px;">
            <b>⚠️ Important:</b> If this action was not intended, please contact the system administrator immediately.
          </div>
        </div>
      </div>
      <div style="margin-top: 1em; font-size: 12px; color: #607d8b;">
        <b>Disclaimer:</b> This is an automated notification; please do not reply to this email.
      </div>
      <div style="margin-top: 1.2em;">Thank you.</div>
    </div>
  `;
  return { html, subject };
}
