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
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US') : '-';
  const reqCostCenter = requestor?.costcenter?.name || '-';
  const reqDepartment = requestor?.department?.name || '-';
  const reqDistrict = requestor?.district?.name || '-';
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
            <div style="${rowStyle}"><span style="${labelStyle}">District:</span> <span style="${valueStyle}">${safe(reqDistrict)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Status:</span> <span style="${valueStyle}">${safe(reqStatus)}</span></div>
          </div>

          <div style="${sectionTitle}">Transfer Items</div>
      ${items.map(item => `
        <div style="${cardStyle}">
          <div style="display: flex; flex-wrap: wrap;">
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(item.effective_date)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Transfer Type:</span> <span style="${valueStyle}">${safe(item.transfer_type)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Identifier:</span> <span style="${valueStyle}">${safe(item.identifierDisplay)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Current Owner:</span> <span style="${valueStyle}">${safe(item.currOwnerName)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Current Costcenter:</span> <span style="${valueStyle}">${safe(item.currCostcenterName)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Current Department:</span> <span style="${valueStyle}">${safe(item.currDepartmentCode)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">Current District:</span> <span style="${valueStyle}">${safe(item.currDistrictCode)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">New Owner:</span> <span style="${valueStyle}">${safe(item.newOwnerName)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">New Costcenter:</span> <span style="${valueStyle}">${safe(item.newCostcenterName)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">New Department:</span> <span style="${valueStyle}">${safe(item.newDepartmentCode)}</span></div>
            <div style="width: 50%; ${rowStyle}"><span style="${labelStyle}">New District:</span> <span style="${valueStyle}">${safe(item.newDistrictCode)}</span></div>
            <div style="width: 100%; ${rowStyle}"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(item.reasons || item.reason)}</span></div>
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
