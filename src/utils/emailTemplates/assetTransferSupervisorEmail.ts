// Asset Transfer Supervisor Email Template
// Usage: import and call with { request, items, requestor, supervisor, actionToken, actionBaseUrl }

import { AssetTransferDetailItem } from '../../p.asset/assetController';

interface EmailData {
  actionBaseUrl?: string; // no longer used
  // Legacy email action links removed; keep optional for backward compatibility
  actionToken?: string; // no longer used
  items: any[];
  portalUrl?: string; // Optional: frontend approval portal URL
  request: any;
  requestor: any;
  supervisor: any;
}

export default function assetTransferSupervisorEmail({ actionBaseUrl, actionToken, items, portalUrl, request, requestor, supervisor }: EmailData) {
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
  const primary = '#1b5e20';
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
  const portalButton = portalUrl
    ? `
    <div style="margin: 0.5em 0 1em 0;">
      <a href="${portalUrl}" style="background: #1976d2; color: #fff; padding: 10px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Open Approval Portal</a>
    </div>
    <div style="font-size: 13px; color: #888; margin-bottom: 1em;">Use the approval portal link above to review and approve/reject this request.</div>
    `
    : '';
  // Email subject
  const subject = `Asset Transfer Request #${safe(reqNo)} - Supervisor Action Required`;
  // Email HTML
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer - Supervisor Action Required</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear Supervisor,</div>
          <div style="margin-bottom:14px;">An asset transfer request <b>#${safe(reqNo)}</b> has been submitted by <b>${safe(requestor?.full_name)}</b> on <span style="color:${primarySoft}; font-weight:700;">${formatDate(reqDate)}</span>.</div>
          <div style="${sectionTitle}">Request Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(reqNo)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Date:</span> <span style="${valueStyle}">${formatDate(reqDate)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Requestor:</span> <span style="${valueStyle}">${safe(requestor?.full_name)} (${safe(requestor?.email)})</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Cost Center:</span> <span style="${valueStyle}">${safe(reqCostCenter)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Department:</span> <span style="${valueStyle}">${safe(reqDepartment)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Location:</span> <span style="${valueStyle}">${safe(reqLocation)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Status:</span> <span style="${valueStyle}">${safe(reqStatus)}</span></div>
          </div>

          <div style="${sectionTitle}">Transfer Items</div>
      ${items.map(item => `
        <div style="${cardStyle}">
          <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(item.effective_date)}</span></div>
          <div style="${rowStyle}"><span style="${labelStyle}">Asset Type:</span> <span style="${valueStyle}">${safe(item.asset_type || item.transfer_type)}</span></div>
          <div style="${rowStyle}"><span style="${labelStyle}">Register Number:</span> <span style="${valueStyle}">${safe(item.register_number || item.identifierDisplay)}</span></div>
          <div style="${rowStyle}"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(item.reasons || item.reason)}</span></div>
          
          <div style="margin-top: 12px; margin-bottom: 8px; border-top: 2px solid ${primarySoft}; padding-top: 10px;">
            <div style="font-weight: 600; color: ${primarySoft}; margin-bottom: 8px;">Transfer Details</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: ${primarySoft}; color: white;">
                  <th style="padding: 8px; text-align: left; border: 1px solid ${border};">Field</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid ${border};">Current</th>
                  <th style="padding: 8px; text-align: left; border: 1px solid ${border};">New</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background-color: #f5f5f5;">
                  <td style="padding: 8px; border: 1px solid ${border}; font-weight: 600;">Owner</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.currOwnerName)}</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.newOwnerName)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid ${border}; font-weight: 600;">Cost Center</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.currCostcenterName)}</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.newCostcenterName)}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                  <td style="padding: 8px; border: 1px solid ${border}; font-weight: 600;">Department</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.currDepartmentCode)}</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.newDepartmentCode)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid ${border}; font-weight: 600;">Location</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.currDistrictCode)}</td>
                  <td style="padding: 8px; border: 1px solid ${border};">${safe(item.newDistrictCode)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
          ${portalButton}
        </div>
      </div>
      <div style="margin-top: 1em; font-size: 12px; color: #607d8b;">
        <b>Disclaimer:</b> If this request has not been made by your team, please contact the IT Asset Management team immediately. This is an automated notification; please do not reply to this email.
      </div>
      <div style="margin-top: 1.2em;">Thank you.</div>
    </div>
  `;
  return { html, subject };
}
