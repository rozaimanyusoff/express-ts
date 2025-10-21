export default function vehicleMaintenanceEmail(data: any): string {
  const {
    requestNo,
    date,
    applicant,
    deptLocation,
    vehicleInfo,
    requestType,
    coordinatorRemarks,
    workshopRecommendation,
    recentRequests = [],
    annualSummary = [],
    footerName = 'ADMS3',
    ctaHtml = ''
  } = data || {};

  // recentRequests removed from template per requirements

  const summaryHtml = (annualSummary || []).length ? `
    <tr style="background:#f6f9ff; font-weight:700;">
      <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:20%">Year</td>
      <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:30%; text-align:center">Requests</td>
      <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:50%; text-align:right">Amount (RM)</td>
    </tr>
    ${(annualSummary || []).map((s: any) => `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06)">${s.year}</td>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); text-align:center">${s.requests || 0}</td>
        <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); text-align:right">RM ${Number(s.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('\n')}
  ` : '<tr><td colspan="3" style="padding:8px">No summary</td></tr>';

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Vehicle Maintenance Request</title>
  </head>
  <body style="margin:0;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f4f6fb; color:#1b1f23;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table width="500" cellpadding="0" cellspacing="0" role="presentation" style="max-width:500px; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 20px rgba(17,24,39,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(90deg,#0052cc,#0066ff); padding:18px 22px; color:#fff;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div style="font-weight:700;font-size:20px">Vehicle Maintenance</div>
                  <div style="font-size:13px;opacity:0.95">Request No: <strong style="background:rgba(255,255,255,0.12); padding:4px 8px;border-radius:6px">#${requestNo || ''}</strong></div>
                </div>
              </td>
            </tr>

            <!-- Greeting + Intro -->
            <tr>
              <td style="padding:20px 26px 8px 26px;">
                <p style="margin:0 0 10px 0; color:#253858; font-size:14px">Kepada <strong>${applicant || 'Tuan/Puan'}</strong>,</p>
                <p style="margin:0;color:#42526e;font-size:13px;line-height:1.45">Anda telah membuat permohonan servis kenderaan dengan butiran permohonan seperti berikut:</p>
              </td>
            </tr>

            <!-- Details panel -->
            <tr>
              <td style="padding:0 22px 18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:6px; overflow:hidden; border:1px solid rgba(37,56,88,0.06); table-layout:fixed;">

                  <tr style="background:linear-gradient(90deg,#e6f0ff,#eef6ff);">
                    <td style="padding:14px 16px; font-weight:700; color:#0b3a8c; font-size:16px">Request Summary</td>
                    <td style="padding:14px 16px; text-align:right; color:#0b3a8c;"><strong>${date || ''}</strong></td>
                  </tr>

                  <tr>
                    <td colspan="2" style="padding:12px 16px 18px 16px; background:#fbfdff;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="table-layout:fixed;">
                        <tr>
                          <td style="width:48%; vertical-align:top; padding-right:12px; word-break:break-word; overflow-wrap:anywhere; white-space:normal;">
                            <div style="font-size:13px;color:#223; margin-bottom:8px"><strong>Applicant</strong></div>
                            <div style="font-size:14px;color:#243b55">${applicant || '-'}</div>

                            <div style="margin-top:12px;font-size:13px;color:#223"><strong>Dept/Location</strong></div>
                            <div style="font-size:14px;color:#243b55">${deptLocation || '-'}</div>

                            <div style="margin-top:12px;font-size:13px;color:#223"><strong>Vehicle Info</strong></div>
                            <div style="font-size:14px;color:#243b55">${vehicleInfo || '-'}</div>

                          </td>
                          <td style="width:52%; vertical-align:top; padding-left:12px; border-left:1px dashed rgba(0,0,0,0.04); word-break:break-word; overflow-wrap:anywhere; white-space:normal;">
                            <div style="font-size:13px;color:#223; margin-bottom:8px"><strong>Request Type</strong></div>
                            <div style="font-size:14px;color:#243b55">${requestType || '-'}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- Recent requests -->
            <tr>
              <td style="padding:0 22px 12px 22px">
                <div style="background:#0052ca; color:#fff; padding:10px 12px; border-radius:6px; font-weight:700; width:96%">Recent Requests (Last 5)</div>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fbfdff; border:1px solid rgba(0,0,0,0.04); margin-top:6px; border-radius:6px; overflow:hidden; table-layout:fixed;">
                  <tr style="background:#f6f9ff; font-weight:700;">
                    <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:15%;">Req ID</td>
                    <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:18%;">Date</td>
                    <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:32%;">Type</td>
                    <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:20%;">Comment</td>
                    <td style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.06); width:15%;">Workshop</td>
                  </tr>
                  ${(recentRequests || []).length ? (recentRequests || []).map((r: any) => `
                    <tr>
                      <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); word-break:break-word; overflow-wrap:anywhere;">#${r.req_id}</td>
                      <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); word-break:break-word; overflow-wrap:anywhere;">${r.date || ''}</td>
                      <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); word-break:break-word; overflow-wrap:anywhere;">${r.requestType || ''}</td>
                      <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); word-break:break-word; overflow-wrap:anywhere;">${(r.comment || '').substring(0, 60)}</td>
                      <td style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.06); word-break:break-word; overflow-wrap:anywhere;">${r.workshop || ''}</td>
                    </tr>
                  `).join('\n') : '<tr><td colspan="5" style="padding:8px">No recent requests</td></tr>'}
                </table>
              </td>
            </tr>

            <!-- Annual summary -->
            <tr>
              <td style="padding:0 22px 22px 22px">
                <div style="background:#0052cc; color:#fff; padding:10px 12px; border-radius:6px; font-weight:700; width:96%">Annual Service Summary (Last 5 years)</div>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fbfdff; border:1px solid rgba(0,82,204,0.06); margin-top:6px; border-radius:6px; overflow:hidden; table-layout:fixed;">
                  ${summaryHtml}
                </table>
              </td>
            </tr>

            ${ctaHtml ? `
            <!-- Action Buttons -->
            <tr>
              <td style="padding:0 22px 22px 22px">
                <div style="max-width:100%; word-break:break-all; overflow-wrap:anywhere; white-space:normal;">
                  ${ctaHtml}
                </div>
              </td>
            </tr>
            ` : ''}

            <!-- Footer -->
            <tr>
              <td style="padding:18px 22px 28px 22px; background:#fff; border-top:1px solid rgba(17,24,39,0.04);">
                <div style="font-size:13px;color:#556;">Thank you,</div>
                <div style="font-weight:700; color:#0b3a8c; margin-top:8px">${footerName}</div>
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
