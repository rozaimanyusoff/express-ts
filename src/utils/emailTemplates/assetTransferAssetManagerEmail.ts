// Asset Transfer Asset Manager Email Template
// Notifies asset managers when a transfer request has been initiated with their asset types

interface EmailData {
  applicant: any; // { full_name, ramco_id, email }
  date: Date | string;
  requestId: number;
  typeNames: string[];
}

export default function assetTransferAssetManagerEmail({ applicant, date, requestId, typeNames }: EmailData) {
  // Helpers
  const safe = (v: any) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : '-');
  const formatDate = (d: any) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Green theme styles
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

  const subject = `Asset Transfer Request #${safe(requestId)} Initiated`;

  const html = `
    <div style="font-family: Arial, sans-serif; color:#1a1a1a;">
      <div style="${container}">
        <div style="${header}">Asset Transfer</div>
        <div style="padding:16px 20px;">
          <div style="margin-bottom:10px; color:#444;">Dear Asset Manager,</div>
          <div style="margin-bottom:14px;">The asset transfer application <b>#${safe(requestId)}</b> has been initiated by <b>${safe(applicant?.full_name || applicant?.name)}</b> on <span style="color:${primarySoft}; font-weight:700;">${formatDate(date)}</span>.</div>
          
          <div style="${cardStyle}">
            <div style="${rowStyle}"><span style="${labelStyle}">Request ID:</span> <span style="${valueStyle}">#${safe(requestId)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Initiated By:</span> <span style="${valueStyle}">${safe(applicant?.full_name || applicant?.name)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Date:</span> <span style="${valueStyle}">${formatDate(date)}</span></div>
            <div style="${rowStyle}"><span style="${labelStyle}">Asset Types:</span> <span style="${valueStyle}">${safe(typeNames.join(', ') || '-')}</span></div>
          </div>

          <div style="margin-top: 1em; padding:12px; background:#e3f2fd; border:1px solid #2196f3; border-radius:6px; font-size:13px;">
            <b>ℹ️ Note:</b> Please monitor this transfer request for asset type(s) <b>${safe(typeNames.join(', ') || '-')}</b> in your system. Further action may be required as the request progresses through the approval workflow.
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
