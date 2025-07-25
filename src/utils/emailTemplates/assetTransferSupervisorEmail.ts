// Asset Transfer Supervisor Email Template
// Usage: import and call with { request, items, requestor, supervisor, actionToken, actionBaseUrl }

import { AssetTransferDetailItem } from '../../p.asset/assetController';

interface EmailData {
  request: any;
  items: any[];
  requestor: any;
  supervisor: any;
  actionToken: string; // Required for supervisor action links
  actionBaseUrl: string; // e.g. https://yourdomain.com/api/asset-transfer
}

export default function assetTransferSupervisorEmail({ request, items, requestor, supervisor, actionToken, actionBaseUrl }: EmailData) {
  // Helper for safe value
  const safe = (v: any) => v || '-';
  // Requestor details
  const reqCostCenter = requestor?.costcenter_id && requestor?.costcenter ? requestor.costcenter.name : '-';
  const reqDepartment = requestor?.department_id && requestor?.department ? requestor.department.name : '-';
  const reqDistrict = requestor?.district_id && requestor?.district ? requestor.district.name : '-';
  const reqStatus = request?.request_status || '-';
  // Format date
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US') : '-';
  // Styles
  const cardStyle = `background: #FFF8E1; border: 1px solid #e0c080; border-radius: 8px; padding: 18px 18px 10px 18px; margin-bottom: 18px; font-size: 15px; line-height: 1.6;`;
  const labelStyle = 'font-weight: bold; display: inline-block; min-width: 140px; vertical-align: top;';
  const valueStyle = 'display: inline-block; min-width: 180px;';
  const rowStyle = 'margin-bottom: 6px;';
  // Action buttons (always for supervisor)
  const approveUrl = `${actionBaseUrl}/approve?id=${encodeURIComponent(request.id)}&token=${encodeURIComponent(actionToken)}`;
  const rejectUrl = `${actionBaseUrl}/reject?id=${encodeURIComponent(request.id)}&token=${encodeURIComponent(actionToken)}`;
  const actionButtons = `
    <div style="margin: 1.5em 0 1em 0;">
      <a href="${approveUrl}" style="background: #388e3c; color: #fff; padding: 10px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 18px;">Approve</a>
      <a href="${rejectUrl}" style="background: #d32f2f; color: #fff; padding: 10px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Reject</a>
    </div>
    <div style="font-size: 13px; color: #888; margin-bottom: 1em;">You are receiving this as the supervisor for this request. Please review and take action above.</div>
  `;
  // Email subject
  const subject = `Asset Transfer Request #${safe(request?.request_no)} - Supervisor Action Required`;
  // Email HTML
  const html = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2 style="margin-bottom: 0.5em;">Asset Transfer Request - Supervisor Action Required</h2>
      <p>Dear Supervisor,</p>
      <p>An asset transfer request <b>#${safe(request?.request_no)}</b> has been submitted by <b>${safe(requestor?.full_name)}</b> on <span style="color: #b26a00; font-weight: bold;">${formatDate(request?.request_date)}</span>.</p>
      <h3 style="margin-bottom: 0.3em;">Request Details</h3>
      <ul style="margin-top: 0; margin-bottom: 0.7em;">
        <li><b>Requestor:</b> ${safe(requestor?.full_name)} (${safe(requestor?.email)})</li>
        <li><b>Cost Center:</b> ${safe(reqCostCenter)}</li>
        <li><b>Department:</b> ${safe(reqDepartment)}</li>
        <li><b>District:</b> ${safe(reqDistrict)}</li>
        <li><b>Status:</b> ${safe(reqStatus)}</li>
      </ul>
      <h3 style="margin-bottom: 0.3em;">Transfer Items</h3>
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
            <div style="width: 100%; ${rowStyle}"><span style="${labelStyle}">Reason:</span> <span style="${valueStyle}">${safe(item.reasons)}</span></div>
          </div>
        </div>
      `).join('')}
      ${actionButtons}
      <div style="margin-top: 2em; font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 1em;">
        <b>Disclaimer:</b> If this request has not been made by your team, please contact the IT Asset Management team immediately. This is an automated notification; please do not reply to this email.
      </div>
      <div style="margin-top: 1.5em;">Thank you.</div>
    </div>
  `;
  return { subject, html };
}
