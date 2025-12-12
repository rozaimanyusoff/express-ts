export default function vehicleMaintenancePortalEmail(data: any): string {
  const {
    footerName = 'Maintenance Team',
    portalUrl,
    recipientName = 'Tuan/Puan',
    requesterName = '',
    requestId,
    testMode = false
  } = data || {};

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Maintenance Portal Access</title>
  </head>
  <body style="margin:0;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f4f6fb; color:#1b1f23;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 20px rgba(17,24,39,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(90deg,#0052cc,#0066ff); padding:18px 22px; color:#fff;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div style="font-weight:700;font-size:20px">Vehicle Maintenance Portal</div>
                  <div style="font-size:13px;opacity:0.95">Request ID: <strong style="background:rgba(255,255,255,0.12); padding:4px 8px;border-radius:6px">#${requestId || ''}</strong></div>
                </div>
              </td>
            </tr>

            <!-- Greeting + Intro -->
            <tr>
              <td style="padding:20px 26px 8px 26px;">
                <p style="margin:0 0 10px 0; color:#253858; font-size:14px">Kepada <strong>${recipientName}</strong>,</p>
                <p style="margin:0;color:#42526e;font-size:13px;line-height:1.45">Anda boleh mengakses portal permohonan penyelenggaraan kenderaan menggunakan pautan di bawah. Sila jangan kongsikan pautan ini kepada pihak yang tidak sepatutnya kerana ia mengandungi maklumat akses yang disulitkan.</p>
              </td>
            </tr>

            <!-- Portal link panel -->
            <tr>
              <td style="padding:0 22px 18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:6px; overflow:hidden; border:1px solid rgba(37,56,88,0.06)">
                  <tr style="background:linear-gradient(90deg,#e6f0ff,#eef6ff);">
                    <td style="padding:14px 16px; font-weight:700; color:#0b3a8c; font-size:16px">Portal Access</td>
                    <td style="padding:14px 16px; text-align:right; color:#0b3a8c;"><small>${new Date().toLocaleDateString()}</small></td>
                  </tr>

                  <tr>
                    <td colspan="2" style="padding:18px; background:#fbfdff;">
                      <div style="font-size:14px;color:#243b55; margin-bottom:12px">Klik pautan di bawah untuk membuka portal permohonan penyelenggaraan bagi permohonan anda.</div>
                      <div style="margin:12px 0">
                        <a href="${portalUrl || '#'}" target="_blank" style="display:inline-block; background:#0052cc; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:700">Buka Portal Penyelenggaraan</a>
                      </div>

                      <div style="font-size:13px;color:#556; margin-top:8px">Pautan alternatif (jika butang tidak berfungsi):</div>
                      <div style="word-break:break-all; font-size:12px; color:#1b3a66; margin-top:6px">${portalUrl || '-'}</div>

                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px; border-top:1px dashed rgba(0,0,0,0.04); padding-top:12px">
                        <tr>
                          <td style="font-size:13px; color:#223">Request ID</td>
                          <td style="text-align:right; font-weight:700; color:#243b55">#${requestId || '-'}</td>
                        </tr>
                        <tr>
                          <td style="font-size:13px; color:#223; padding-top:8px">Original Requester</td>
                          <td style="text-align:right; font-weight:700; color:#243b55; padding-top:8px">${requesterName || '-'}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <!-- Note about test mode and security -->
            <tr>
              <td style="padding:0 22px 18px 22px;">
                <div style="font-size:12px;color:#6b7280">${testMode ? 'Nota: Emel ini dihantar dalam mod ujian.' : 'Nota: Jika anda tidak menjangkakan emel ini, sila abaikan atau hubungi pasukan penyelenggaraan.'}</div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 22px 28px 22px; background:#fff; border-top:1px solid rgba(17,24,39,0.04);">
                <div style="font-size:13px;color:#556;">Terima kasih,</div>
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
