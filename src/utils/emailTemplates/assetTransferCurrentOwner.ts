// Asset Transfer Current Owner Notification Email Template
// Usage: Notifies current owners that assets they own are being transferred

interface EmailData {
  items: any[];
  request: any;
  requestor: any;
  currentOwner: any;
}

export default function assetTransferCurrentOwnerEmail({ items, request, requestor, currentOwner }: EmailData) {
  // Helpers
  const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
  const formatDate = (d: any) => {
    if (!d) return '-';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const reqCostCenter = requestor?.costcenter?.name || '-';
  const reqDepartment = requestor?.department?.name || '-';
  const reqLocation = requestor?.district?.name || '-';
  const reqStatus = request?.request_status || request?.transfer_status || '-';
  const reqNo = request?.request_no || request?.id || '-';
  const reqDate = request?.request_date || request?.transfer_date || new Date();

  // Green theme styles
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

  // Email subject
  const subject = `Asset Transfer Notification #${safe(reqNo)} - Assets Being Transferred`;

  // Email HTML
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer Notification</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(currentOwner?.full_name)},</div>
          <div style="margin-bottom:14px;">This is to notify you that asset(s) currently under your ownership are being transferred. Below are the details of the transfer request.</div>

          <div style="${sectionTitle}">Request Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(reqNo)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Date:</span> <span style="${valueStyle}">${formatDate(reqDate)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requestor:</span> <span style="${valueStyle}">${safe(requestor?.full_name)} (${safe(requestor?.email)})</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requestor Cost Center:</span> <span style="${valueStyle}">${safe(reqCostCenter)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requestor Department:</span> <span style="${valueStyle}">${safe(reqDepartment)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requestor Location:</span> <span style="${valueStyle}">${safe(reqLocation)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Status:</span> <span style="${valueStyle}">${safe(reqStatus)}</span></div>
          </div>

          <div style="${sectionTitle}">Assets Being Transferred</div>
      ${items.map(item => `
        <div style="${cardStyle}">
          <div style="margin-bottom:12px;">
            <div style="margin-bottom:6px;"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(item.effective_date)}</span></div>
            <div style="margin-bottom:6px;"><span style="${labelStyle}">Asset Type:</span> <span style="${valueStyle}">${safe(item.transfer_type)}</span></div>
            <div style="margin-bottom:6px;"><span style="${labelStyle}">Register Number:</span> <span style="${valueStyle}">${safe(item.identifierDisplay)}</span></div>
            <div style="margin-bottom:6px;"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(item.reasons || item.reason)}</span></div>
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
              <td style="${tdStyle}">${safe(item.currOwnerName)}</td>
              <td style="${tdStyle}">${safe(item.newOwnerName)}</td>
            </tr>
            <tr>
              <td style="${tdLabelStyle}">Cost Center</td>
              <td style="${tdStyle}">${safe(item.currCostcenterName)}</td>
              <td style="${tdStyle}">${safe(item.newCostcenterName)}</td>
            </tr>
            <tr>
              <td style="${tdLabelStyle}">Department</td>
              <td style="${tdStyle}">${safe(item.currDepartmentCode)}</td>
              <td style="${tdStyle}">${safe(item.newDepartmentCode)}</td>
            </tr>
            <tr>
              <td style="${tdLabelStyle}">Location</td>
              <td style="${tdStyle}">${safe(item.currDistrictCode)}</td>
              <td style="${tdStyle}">${safe(item.newDistrictCode)}</td>
            </tr>
          </table>
        </div>
      `).join('')}

          <div style="margin-top: 1.5em; padding: 12px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
            <span style="color: #e65100; font-weight: 600;">Note:</span> This is a notification only. No action is required from you.
          </div>
        </div>
      </div>
      <div style="margin-top: 1em; font-size: 12px; color: #607d8b;">
        <b>Disclaimer:</b> If you believe this notification is in error, please contact the IT Asset Management team immediately. This is an automated notification; please do not reply to this email.
      </div>
      <div style="margin-top: 1.2em;">Thank you.</div>
    </div>
  `;

  return { html, subject };
}
