// Asset Transfer HOD Rejected Email Template (T6)
// Usage: assetTransferT6HodRejectedEmail({ request, items, requestor, rejectReason, rejectedBy })
// Note: Uses red color scheme for rejection notification

interface AssetTransferT6HodRejectedParams {
  items?: any[];
  rejectedBy?: any; // HOD employee object
  rejectReason?: string;
  request: any;
  requestor: any;
}

export function assetTransferT6HodRejectedEmail({ items = [], rejectedBy, rejectReason, request, requestor }: AssetTransferT6HodRejectedParams) {
  const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
  const formatDate = (d: any) => {
    if (!d) return '-';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const subject = `Asset Transfer Request #${safe(request?.request_no || request?.id)} - Rejected`;

  // Red theme styles for rejection
  const primary = '#c62828'; // dark red
  const primarySoft = '#e53935';
  const bgSoft = '#ffebee';
  const border = '#ef9a9a';
  const warningBg = '#fff3e0';
  const warningBorder = '#ffb74d';

  const header = `background:${primary}; color:#fff; padding:16px 20px; border-radius:8px 8px 0 0; font-size:18px; font-weight:700;`;
  const container = `border:1px solid ${border}; border-radius:8px; overflow:hidden;`;
  const sectionTitle = `font-size:16px; color:${primarySoft}; margin:16px 0 8px 0;`;
  const cardStyle = `background:${bgSoft}; border:1px solid ${border}; border-radius:8px; padding:14px 16px; margin-bottom:14px; font-size:14px; line-height:1.55;`;
  const labelStyle = 'font-weight:600; display:inline-block; min-width:160px; vertical-align:top;';
  const valueStyle = 'display:inline-block; min-width:180px;';
  const rowStyle = 'margin-bottom:6px;';

  const reqNo = request?.request_no || request?.id || '-';
  const reqDate = request?.request_date || request?.transfer_date || new Date();
  const reqCostCenter = requestor?.costcenter?.name || '-';
  const reqDepartment = requestor?.department?.name || '-';
  const reqLocation = requestor?.district?.name || '-';

  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer Request Rejected</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(requestor?.full_name)},</div>
          <div style="margin-bottom:14px;">Your asset transfer request <b>#${safe(reqNo)}</b> submitted on <span style="color:${primarySoft}; font-weight:700;">${formatDate(reqDate)}</span> has been <b>REJECTED</b> by <b>${safe(rejectedBy?.full_name || rejectedBy?.name || 'Head of Department')}</b>.</div>

          <div style="padding:12px; background:${warningBg}; border:1px solid ${warningBorder}; border-radius:6px; margin-bottom:16px; font-size:13px;">
            <b>Rejection Reason:</b><br/>
            ${safe(rejectReason || 'No specific reason provided')}
          </div>

          <div style="${sectionTitle}">Request Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(reqNo)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Date:</span> <span style="${valueStyle}">${formatDate(reqDate)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requestor:</span> <span style="${valueStyle}">${safe(requestor?.full_name)} (${safe(requestor?.email)})</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Cost Center:</span> <span style="${valueStyle}">${safe(reqCostCenter)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Department:</span> <span style="${valueStyle}">${safe(reqDepartment)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Location:</span> <span style="${valueStyle}">${safe(reqLocation)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Rejected By:</span> <span style="${valueStyle}">${safe(rejectedBy?.full_name || rejectedBy?.name)} (${safe(rejectedBy?.email)})</span></div>
          </div>

          ${items && items.length > 0 ? `
            <div style="${sectionTitle}">Rejected Transfer Items</div>
            ${items.map(item => `
              <div style="${cardStyle}">
                <div style="${rowStyle}"><span style="${labelStyle}">Asset Type:</span> <span style="${valueStyle}">${safe(item.asset_type || item.transfer_type)}</span></div>
                <div style="${rowStyle}"><span style="${labelStyle}">Register Number:</span> <span style="${valueStyle}">${safe(item.register_number || item.identifierDisplay)}</span></div>
                <div style="${rowStyle}"><span style="${labelStyle}">Current Owner:</span> <span style="${valueStyle}">${safe(item.currOwnerName)}</span></div>
                <div style="${rowStyle}"><span style="${labelStyle}">Proposed New Owner:</span> <span style="${valueStyle}">${safe(item.newOwnerName)}</span></div>
              </div>
            `).join('')}
          ` : ''}

          <div style="margin-top:16px; padding:12px; background:#f3e5f5; border:1px solid #ce93d8; border-radius:6px; font-size:13px;">
            <b>Next Steps:</b><br/>
            You may resubmit this request after addressing the rejection reason. Please contact your supervisor or the Asset Management team if you need clarification.
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
