// Email template: summary to the approver confirming approvals
// Usage: assetTransferApprovalSummaryEmail({ approver, requestIds, approvedDate })

interface AssetTransferApprovalSummaryParams {
  approver: { full_name?: string; name?: string; email?: string; ramco_id?: string };
  requestIds: number[];
  approvedDate?: string | Date;
}

export function assetTransferApprovalSummaryEmail({ approver, requestIds, approvedDate }: AssetTransferApprovalSummaryParams) {
  const name = approver?.full_name || approver?.name || approver?.ramco_id || 'Approver';
  const subject = `You approved ${requestIds.length} asset transfer application(s)`;
  const dateStr = approvedDate ? new Date(approvedDate).toLocaleString() : new Date().toLocaleString();
  const reqList = requestIds.map(id => `#${id}`).join(', ');
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <p>Dear ${name},</p>
      <p>This is a confirmation that you have approved the following asset transfer application(s) on <b>${dateStr}</b>:</p>
      <p><b>Application IDs:</b> ${reqList}</p>
      <p>If this action was not intended, please contact the system administrator immediately.</p>
      <p>Thank you.</p>
    </div>
  `;
  return { subject, html };
}
