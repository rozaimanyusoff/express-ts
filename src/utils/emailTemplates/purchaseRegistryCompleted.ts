export function renderPurchaseRegistryCompleted(opts: {
  recipientName?: string | null;
  prNo?: string | null;
  prDate?: string | null;
  itemType?: string | null;
  items?: string | null;
  brand?: string | null;
  costcenterName?: string | null;
  itemCount?: number | null;
  audience?: 'procurement' | 'manager';
}) {
  const {
    recipientName,
    prNo,
    prDate,
    itemType,
    items,
    brand,
    costcenterName,
    itemCount,
    audience = 'manager',
  } = opts || {};

  const intro = audience === 'procurement'
    ? `Assets for PR ${prNo || ''} have been registered by the asset management team. Details below.`
    : `Your asset registration has been recorded successfully for PR ${prNo || ''}. Details below for your reference.`;

  const detailRow = (label: string, value?: string | null) => `
    <tr>
      <td style="padding:8px 10px; color:#445; width:36%; border-bottom:1px solid rgba(17,24,39,0.06)"><strong>${label}</strong></td>
      <td style="padding:8px 10px; color:#111; border-bottom:1px solid rgba(17,24,39,0.06)">${value || '-'}</td>
    </tr>`;

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Purchase Assets Registered</title>
  </head>
  <body style="margin:0; background:#f4f6fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#1b1f23;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 20px rgba(17,24,39,0.08);">
            <tr>
              <td style="background:linear-gradient(90deg,#0b7dda,#3ba7ff); padding:18px 22px; color:#fff;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div style="font-weight:700;font-size:18px">Assets Registered</div>
                  <div style="font-size:13px;opacity:0.95">PR: <strong style="background:rgba(255,255,255,0.16); padding:3px 8px;border-radius:6px">${prNo || '-'}</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px 8px 26px;">
                <p style="margin:0 0 10px 0; color:#253858; font-size:14px">Dear ${recipientName || 'Colleague'},</p>
                <p style="margin:0;color:#42526e;font-size:13px;line-height:1.5">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 22px 22px">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fbfdff; border:1px solid rgba(17,24,39,0.06); border-radius:8px; overflow:hidden">
                  <tr style="background:#eef7ff;">
                    <td colspan="2" style="padding:12px 14px; font-weight:700; color:#0b3a8c; font-size:15px">Purchase Details</td>
                  </tr>
                  ${detailRow('PR Number', prNo)}
                  ${detailRow('PR Date', prDate)}
                  ${detailRow('Item Type', itemType)}
                  ${detailRow('Items / Description', items)}
                  ${detailRow('Brand', brand)}
                  ${detailRow('Cost Center', costcenterName)}
                  ${detailRow('Registered Items', (itemCount ?? 0).toString())}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 22px 24px 22px; background:#fff; border-top:1px solid rgba(17,24,39,0.04);">
                <div style="font-size:13px;color:#556;">Thank you,</div>
                <div style="font-weight:700; color:#0b3a8c; margin-top:6px">ADMS</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

