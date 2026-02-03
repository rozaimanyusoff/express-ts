export function renderFleetCardUpdatedNotification(opts: {
  cardId?: number;
  cardNo?: string;
  fuelType?: null | string;
  regDate?: null | string;
  expiryDate?: null | string;
  registerNumber?: null | string;
  costcenterName?: null | string;
  assetOwnerName?: null | string;
  userName?: string;
}) {
  const {
    cardId,
    cardNo,
    fuelType,
    regDate,
    expiryDate,
    registerNumber,
    costcenterName,
    assetOwnerName,
    userName,
  } = opts || {};

  const detailRow = (label: string, value?: null | number | string) => `
    <tr>
      <td style="padding:10px 12px; color:#666; width:40%; border-bottom:1px solid rgba(0,0,0,0.08); font-weight:600"><strong>${label}</strong></td>
      <td style="padding:10px 12px; color:#111; border-bottom:1px solid rgba(0,0,0,0.08)">${value || 'N/A'}</td>
    </tr>`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fleet Card Updated</title>
  </head>
  <body style="margin:0; background:#f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f5; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg, #28a745 0%, #1e7e34 100%); padding:24px 20px; color:#fff;">
                <div style="font-size:22px; font-weight:700;">Fleet Card Updated</div>
                <div style="font-size:13px; opacity:0.9; margin-top:4px;">Successful Update Notification</div>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:28px 20px;">
                <p style="margin:0 0 16px 0; font-size:15px;">Hi <strong>${userName || 'User'}</strong>,</p>
                <p style="margin:0 0 20px 0; font-size:14px; line-height:1.6; color:#555;">
                  You have successfully updated a fleet card. Here are the current details:
                </p>

                <!-- Card Details Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; border-radius:6px; overflow:hidden; border:1px solid #e0e0e0;">
                  ${detailRow('Card ID', cardId)}
                  ${detailRow('Card Number', cardNo)}
                  ${detailRow('Fuel Type', fuelType)}
                  ${detailRow('Registration Date', regDate)}
                  ${detailRow('Expiry Date', expiryDate)}
                </table>

                ${registerNumber || costcenterName || assetOwnerName ? `
                <!-- Asset Assignment Section -->
                <div style="background:#f9f9f9; padding:16px; border-radius:6px; margin:20px 0; border-left:4px solid #28a745;">
                  <div style="font-weight:600; color:#28a745; margin-bottom:12px;">Assigned Asset</div>
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                    ${detailRow('Register Number', registerNumber)}
                    ${detailRow('Cost Center', costcenterName)}
                    ${detailRow('Asset Owner', assetOwnerName)}
                  </table>
                </div>
                ` : ''}

                <!-- Footer Message -->
                <div style="margin-top:24px; padding-top:20px; border-top:1px solid #e0e0e0; font-size:12px; color:#999;">
                  <p style="margin:0;">This is an automated notification from the ADMS system.</p>
                  <p style="margin:4px 0 0 0;">Timestamp: ${new Date().toLocaleString()}</p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9; padding:16px 20px; border-top:1px solid #e0e0e0; font-size:11px; color:#999; text-align:center;">
                <p style="margin:0;">ADMS - Asset & Document Management System</p>
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
