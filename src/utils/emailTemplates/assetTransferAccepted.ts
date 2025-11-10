// Email templates for asset transfer acceptance notifications
// Usage: Call appropriate function with transfer data

interface AssetTransferAcceptedParams {
  request: any;
  items: any[];
  requestor?: any; // employee who requested the transfer
  currentOwner?: any; // previous owner
  newOwner: any; // person who accepted
  newOwnerHod?: any; // HOD of new owner
  acceptanceDate?: string | Date;
  acceptanceRemarks?: string | null;
}

const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US') : '-';

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

// 1. Email to Requestor/Applicant
export function assetTransferAcceptedRequestorEmail({ request, items, requestor, newOwner, acceptanceDate, acceptanceRemarks }: AssetTransferAcceptedParams) {
  const subject = `Asset Transfer Accepted - Request #${safe(request?.request_no || request?.id)}`;
  const acceptedDate = formatDate(acceptanceDate || new Date());
  
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(requestor?.full_name)},</div>
          <div style="margin-bottom:14px;">Your asset transfer request <b>#${safe(request?.request_no || request?.id)}</b> has been <b style="color:${primarySoft};">accepted</b> by the new owner <b>${safe(newOwner?.full_name)}</b> on <span style="color:${primarySoft}; font-weight:700;">${acceptedDate}</span>.</div>
          
          <div style="${sectionTitle}">Request Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(request?.request_no || request?.id)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Request Date:</span> <span style="${valueStyle}">${formatDate(request?.request_date || request?.transfer_date)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Accepted By:</span> <span style="${valueStyle}">${safe(newOwner?.full_name)} (${safe(newOwner?.ramco_id)})</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Acceptance Date:</span> <span style="${valueStyle}">${acceptedDate}</span></div>
            ${acceptanceRemarks ? `<div style="${rowStyle}"><span style="${labelStyle}">Remarks:</span> <span style="${valueStyle}">${safe(acceptanceRemarks)}</span></div>` : ''}
          </div>

          <div style="${sectionTitle}">Accepted Items</div>
          ${items.map((it: any) => `
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Identifier:</span> <span style="${valueStyle}">${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Transfer Type:</span> <span style="${valueStyle}">${safe(it.transfer_type)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(it.effective_date)}</span></div>
          </div>
          `).join('')}

          <div style="margin-top: 1em;">
            The asset has been successfully received by the new owner. The transfer process is now complete.
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

// 2. Email to Current/Previous Owner
export function assetTransferAcceptedCurrentOwnerEmail({ request, items, currentOwner, newOwner, acceptanceDate, acceptanceRemarks }: AssetTransferAcceptedParams) {
  const subject = `Asset Transfer Completed - Request #${safe(request?.request_no || request?.id)}`;
  const acceptedDate = formatDate(acceptanceDate || new Date());
  
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(currentOwner?.full_name)},</div>
          <div style="margin-bottom:14px;">The asset transfer request <b>#${safe(request?.request_no || request?.id)}</b> for assets previously assigned to you has been <b style="color:${primarySoft};">accepted and received</b> by the new owner <b>${safe(newOwner?.full_name)}</b> on <span style="color:${primarySoft}; font-weight:700;">${acceptedDate}</span>.</div>
          
          <div style="${sectionTitle}">Transfer Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(request?.request_no || request?.id)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">New Owner:</span> <span style="${valueStyle}">${safe(newOwner?.full_name)} (${safe(newOwner?.ramco_id)})</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Acceptance Date:</span> <span style="${valueStyle}">${acceptedDate}</span></div>
            ${acceptanceRemarks ? `<div style="${rowStyle}"><span style="${labelStyle}">Remarks:</span> <span style="${valueStyle}">${safe(acceptanceRemarks)}</span></div>` : ''}
          </div>

          <div style="${sectionTitle}">Transferred Items</div>
          ${items.map((it: any) => `
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Identifier:</span> <span style="${valueStyle}">${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Transfer Type:</span> <span style="${valueStyle}">${safe(it.transfer_type)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(it.effective_date)}</span></div>
          </div>
          `).join('')}

          <div style="margin-top: 1em;">
            The transfer is now complete and these assets are no longer under your responsibility.
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

// 3. Email to New Owner's HOD
export function assetTransferAcceptedHodEmail({ request, items, newOwner, newOwnerHod, acceptanceDate, acceptanceRemarks }: AssetTransferAcceptedParams) {
  const subject = `Asset Transfer Accepted by ${safe(newOwner?.full_name)} - Request #${safe(request?.request_no || request?.id)}`;
  const acceptedDate = formatDate(acceptanceDate || new Date());
  
  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear ${safe(newOwnerHod?.full_name || 'Head of Department')},</div>
          <div style="margin-bottom:14px;">This is to inform you that <b>${safe(newOwner?.full_name)}</b> (${safe(newOwner?.ramco_id)}) from your department has <b style="color:${primarySoft};">accepted and received</b> the following asset(s) under transfer request <b>#${safe(request?.request_no || request?.id)}</b> on <span style="color:${primarySoft}; font-weight:700;">${acceptedDate}</span>.</div>
          
          <div style="${sectionTitle}">Transfer Summary</div>
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request No:</span> <span style="${valueStyle}">${safe(request?.request_no || request?.id)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">New Owner:</span> <span style="${valueStyle}">${safe(newOwner?.full_name)} (${safe(newOwner?.ramco_id)})</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Department:</span> <span style="${valueStyle}">${safe(newOwner?.department?.name || newOwner?.department_name)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Cost Center:</span> <span style="${valueStyle}">${safe(newOwner?.costcenter?.name || newOwner?.costcenter_name)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Acceptance Date:</span> <span style="${valueStyle}">${acceptedDate}</span></div>
            ${acceptanceRemarks ? `<div style="${rowStyle}"><span style="${labelStyle}">Remarks:</span> <span style="${valueStyle}">${safe(acceptanceRemarks)}</span></div>` : ''}
          </div>

          <div style="${sectionTitle}">Accepted Assets</div>
          ${items.map((it: any) => `
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Identifier:</span> <span style="${valueStyle}">${safe(it.identifierDisplay || it.identifier || it.asset_code || it.register_number)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Transfer Type:</span> <span style="${valueStyle}">${safe(it.transfer_type)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Effective Date:</span> <span style="${valueStyle}">${formatDate(it.effective_date)}</span></div>
          </div>
          `).join('')}

          <div style="margin-top: 1em;">
            These assets are now under the responsibility of your department member. Please ensure proper custody and accountability are maintained.
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
