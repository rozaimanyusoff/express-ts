// Email template: HOD Approved notification to Requestor (T4)
// Usage: assetTransferApprovedRequestorEmail({ request, items, requestor, approver })

interface AssetTransferT4HodApprovedParams {
  approver: any;  // approver employee object
  items: any[];
  request: any;
  requestor: any; // employee object with full_name, email
}

export function assetTransferApprovedRequestorEmail({ approver, items, request, requestor }: AssetTransferT4HodApprovedParams) {
  const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
  const formatDate = (d: any) => {
    if (!d) return '-';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const subject = `Asset Transfer Approved - Request #${safe(request?.request_no || request?.id)}`;
  
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
  // Table styles for Transfer Details
  const tableStyle = 'width:100%; border-collapse:collapse; margin-top:12px;';
  const thStyle = `background:${primarySoft}; color:#fff; padding:10px; text-align:left; font-weight:600; font-size:13px; border:1px solid ${border};`;
  const tdStyle = `padding:10px; border:1px solid ${border}; font-size:13px;`;
  const tdLabelStyle = `${tdStyle} background:${bgSoft}; font-weight:600;`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(requestor?.full_name)},</div>
          <div style="margin-bottom:14px;">Your asset transfer application <b>#${safe(request?.request_no || request?.id)}</b> has been <b style="color:${primarySoft};">approved</b> by <b>${safe(approver?.full_name || approver?.name || approver?.ramco_id)}</b>.</div>
          
          <div style="${sectionTitle}">Request Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(request?.request_no || request?.id)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Request Date:</span> <span style="${valueStyle}">${formatDate(request?.request_date || request?.transfer_date)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Status:</span> <span style="${valueStyle}">${safe(request?.transfer_status || 'approved')}</span></div>
          </div>

          <div style="${sectionTitle}">Approved Items</div>
          ${items.map((it: any) => `
          <div style="${cardStyle}">
            <div style="margin-bottom:12px;">
              <div style="margin-bottom:6px;"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(it.effective_date)}</span></div>
              <div style="margin-bottom:6px;"><span style="${labelStyle}">Asset Type:</span> <span style="${valueStyle}">${safe(it.transfer_type)}</span></div>
              <div style="margin-bottom:6px;"><span style="${labelStyle}">Register Number:</span> <span style="${valueStyle}">${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)}</span></div>
              <div style="margin-bottom:6px;"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(it.reason)}</span></div>
            </div>
            
            <div style="margin-top:16px; font-weight:600; color:${primarySoft}; font-size:13px; margin-bottom:8px;">Transfer Details</div>
            <table style="${tableStyle}">
              <tr>
                <th style="${thStyle}">Field</th>
                <th style="${thStyle}">Current</th>
                <th style="${thStyle}">New</th>
              </tr>
              <tr>
                <td style="${tdLabelStyle}">Owner</td>
                <td style="${tdStyle}">${safe(it.currOwnerName)}</td>
                <td style="${tdStyle}">${safe(it.newOwnerName)}</td>
              </tr>
              <tr>
                <td style="${tdLabelStyle}">Cost Center</td>
                <td style="${tdStyle}">${safe(it.currCostcenterName)}</td>
                <td style="${tdStyle}">${safe(it.newCostcenterName)}</td>
              </tr>
              <tr>
                <td style="${tdLabelStyle}">Department</td>
                <td style="${tdStyle}">${safe(it.currDepartmentCode)}</td>
                <td style="${tdStyle}">${safe(it.newDepartmentCode)}</td>
              </tr>
              <tr>
                <td style="${tdLabelStyle}">Location</td>
                <td style="${tdStyle}">${safe(it.currDistrictCode)}</td>
                <td style="${tdStyle}">${safe(it.newDistrictCode)}</td>
              </tr>
            </table>
          </div>
          `).join('')}

          <div style="margin-top: 1em;">
            Next, the asset team will proceed with the transfer process.
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
