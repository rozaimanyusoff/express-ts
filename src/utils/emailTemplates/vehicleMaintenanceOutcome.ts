export default function vehicleMaintenanceOutcomeEmail(data: any): string {
  const {
    requestNo,
    date,
    greetingName = 'Tuan/Puan',
    status = 'Approved', // 'Approved' | 'Rejected'
    applicant,
    deptLocation,
    vehicleInfo,
    requestType,
    portalUrl,
    footerName = 'ADMS (v4)'
  } = data || {};

  const statusWord = String(status || 'Approved');
  const titleColor = statusWord.toLowerCase() === 'approved' ? 'linear-gradient(90deg,#1f8f36,#2eb85c)' : 'linear-gradient(90deg,#b30021,#de350b)';

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Vehicle Maintenance ${statusWord}</title>
  </head>
  <body style="margin:0;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f4f6fb; color:#1b1f23;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table width="500" cellpadding="0" cellspacing="0" role="presentation" style="width:100%; max-width:500px; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 20px rgba(17,24,39,0.08);">
            <tr>
              <td style="background:${titleColor}; padding:16px 20px; color:#fff;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div style="font-weight:700;font-size:18px">Vehicle Maintenance ${statusWord}</div>
                  <div style="font-size:12px;opacity:0.95">Request No: <strong style="background:rgba(255,255,255,0.12); padding:3px 6px;border-radius:6px">#${requestNo || ''}</strong></div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 22px 6px 22px;">
                <p style="margin:0 0 10px 0; color:#253858; font-size:14px">Dear ${greetingName || 'Tuan/Puan'},</p>
                <p style="margin:0;color:#42526e;font-size:13px;line-height:1.45">Your maintenance request has been <strong>${statusWord.toLowerCase()}</strong>. You can review and download the service form from Vehicle Maaintenance application in ADMS4 app.</p>
              </td>
            </tr>

            <!-- Summary -->
            <tr>
              <td style="padding:0 20px 18px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:6px; overflow:hidden; border:1px solid rgba(37,56,88,0.08); table-layout:fixed;">
                  <tr style="background:#f7fbff;">
                    <td style="padding:12px 14px; font-weight:700; color:#0b3a8c; font-size:15px">Request Summary</td>
                    <td style="padding:12px 14px; text-align:right; color:#0b3a8c;"><strong>${date || ''}</strong></td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:12px 14px; background:#fbfdff;">
                      <div style="font-size:13px;color:#223; margin-bottom:6px"><strong>Applicant</strong></div>
                      <div style="font-size:14px;color:#243b55;word-break:break-word;overflow-wrap:anywhere;">${applicant || '-'}</div>
                      <div style="margin-top:10px;font-size:13px;color:#223"><strong>Dept/Location</strong></div>
                      <div style="font-size:14px;color:#243b55;word-break:break-word;overflow-wrap:anywhere;">${deptLocation || '-'}</div>
                      <div style="margin-top:10px;font-size:13px;color:#223"><strong>Vehicle Info</strong></div>
                      <div style="font-size:14px;color:#243b55;word-break:break-word;overflow-wrap:anywhere;">${vehicleInfo || '-'}</div>
                      <div style="margin-top:10px;font-size:13px;color:#223"><strong>Request Type</strong></div>
                      <div style="font-size:14px;color:#243b55;word-break:break-word;overflow-wrap:anywhere;">${requestType || '-'}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 20px 22px 20px; background:#fff; border-top:1px solid rgba(17,24,39,0.06);">
                <div style="font-size:13px;color:#556;">Thank you,</div>
                <div style="font-weight:700; color:#0b3a8c; margin-top:6px">${footerName}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
