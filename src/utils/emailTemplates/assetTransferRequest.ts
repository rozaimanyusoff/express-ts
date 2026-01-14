// Asset Transfer Request Email Template
// Usage: import and call with { request, items, requestor, supervisor }

import crypto from 'crypto';

import { AssetTransferDetailItem } from '../../p.asset/assetController';
import { generateTransferItemCard, ItemFormatConfig } from './assetTransferItemFormat';

interface EmailData {
  actionBaseUrl?: string; // e.g. https://yourdomain.com/api/asset-transfer
  actionToken?: string; // For supervisor action links
  items: any[];
  request: any;
  requestor: any;
  supervisor: any;
}

export default function assetTransferRequestEmail({ actionBaseUrl, actionToken, items, request, requestor, supervisor }: EmailData) {
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
  
  // Configuration object for item card generation
  const itemFormatConfig: ItemFormatConfig = {
    bgSoft,
    border,
    primarySoft,
    tdLabelStyle,
    tdStyle,
    tableStyle,
    thStyle
  };
  // Action buttons (only for supervisor)
  let actionButtons = '';
  if (actionToken && actionBaseUrl && supervisor?.email) {
    const approveUrl = `${actionBaseUrl}/approve?id=${encodeURIComponent(request.id)}&token=${encodeURIComponent(actionToken)}`;
    const rejectUrl = `${actionBaseUrl}/reject?id=${encodeURIComponent(request.id)}&token=${encodeURIComponent(actionToken)}`;
    actionButtons = `
      <div style="margin: 1.5em 0 1em 0;">
        <a href="${approveUrl}" style="background: #388e3c; color: #fff; padding: 10px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-right: 18px;">Approve</a>
        <a href="${rejectUrl}" style="background: #d32f2f; color: #fff; padding: 10px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Reject</a>
      </div>
      <div style="font-size: 13px; color: #888; margin-bottom: 1em;">You are receiving this as the supervisor for this request. Please review and take action above.</div>
    `;
  }
  // Email subject
  const subject = `Asset Transfer Request #${safe(reqNo)} Submitted`;
  // Determine greeting
  let greeting = `Dear ${safe(requestor?.full_name)},`;
  if (actionToken && actionBaseUrl && supervisor?.email && requestor?.email !== supervisor?.email) {
    greeting = 'Dear Supervisor,';
  }
  // Email HTML
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">${greeting}</div>
          <div style="margin-bottom:14px;">Your asset transfer request <b>#${safe(reqNo)}</b> has been submitted on <span style="color:${primarySoft}; font-weight:700;">${formatDate(reqDate)}</span>.</div>
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
      ${items.map(item => generateTransferItemCard(item, itemFormatConfig)).join('')}
          <div style="margin-top: 1em;">
            <span>This request will be reviewed by your supervisor: <b>${safe(supervisor?.name || requestor?.supervisor_name || 'Supervisor')}</b> (<span style="color:${primarySoft}; font-weight:700;">${safe(supervisor?.email)}</span>).</span>
          </div>
        </div>
      </div>
      <div style="margin-top: 1em; font-size: 12px; color: #607d8b;">
        <b>Disclaimer:</b> If this request has not been made by you, please contact the IT Asset Management team immediately. This is an automated notification; please do not reply to this email.
      </div>
      <div style="margin-top: 1.2em;">Thank you.</div>
    </div>
  `;
  return { html, subject };
}
