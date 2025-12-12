export const renderSummonPaymentReceipt = (opts: {
  adminName?: null | string;
  payer?: null | string;
  ramco_id?: null | string;
  receipt_date?: null | string;
  smn_id?: null | number;
  summon_agency?: null | string;
  summon_amt?: null | number | string;
  summon_dt?: null | string;
  summon_loc?: null | string;
  summon_no?: null | string;
}) => {
  const { adminName, payer, ramco_id, receipt_date, smn_id, summon_agency, summon_amt, summon_dt, summon_loc, summon_no } = opts;
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const portalLink = smn_id ? `${base}/compliance/summon/portal/${smn_id}` : null;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #222; background:#f6f8fb; padding:20px;">
    <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(90deg,#0f766e,#16a34a); padding:18px 24px; color:#fff;">
        <h1 style="margin:0; font-size:20px; font-weight:600;">Summon Payment Received</h1>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 12px;">Dear <strong>${adminName || 'Admin'}</strong>,</p>
        <p style="margin:0 0 18px; color:#444;">A payment receipt has been uploaded for the following summon. Details are provided for your reference.</p>

        <table role="presentation" width="100%" style="border-collapse:collapse; margin-bottom:18px;">
          <tbody>
            ${smn_id ? `<tr><td style="padding:8px 0; color:#666; width:40%;">Summon ID</td><td style="padding:8px 0; font-weight:600;">${smn_id}</td></tr>` : ''}
            ${summon_no ? `<tr><td style="padding:8px 0; color:#666;">Summon No</td><td style="padding:8px 0; font-weight:600;">${summon_no}</td></tr>` : ''}
            ${ramco_id ? `<tr><td style="padding:8px 0; color:#666;">Ramco ID</td><td style="padding:8px 0; font-weight:600;">${ramco_id}</td></tr>` : ''}
            ${summon_dt ? `<tr><td style="padding:8px 0; color:#666;">Date / Time</td><td style="padding:8px 0; font-weight:600;">${summon_dt}</td></tr>` : ''}
            ${summon_loc ? `<tr><td style="padding:8px 0; color:#666;">Location</td><td style="padding:8px 0; font-weight:600;">${summon_loc}</td></tr>` : ''}
            ${summon_agency ? `<tr><td style="padding:8px 0; color:#666;">Agency</td><td style="padding:8px 0; font-weight:600;">${summon_agency}</td></tr>` : ''}
            ${summon_amt ? `<tr><td style="padding:8px 0; color:#666;">Amount</td><td style="padding:8px 0; font-weight:600;">${summon_amt}</td></tr>` : ''}
            ${receipt_date ? `<tr><td style="padding:8px 0; color:#666;">Receipt Date</td><td style="padding:8px 0; font-weight:600;">${receipt_date}</td></tr>` : ''}
            ${payer ? `<tr><td style="padding:8px 0; color:#666;">Payer</td><td style="padding:8px 0; font-weight:600;">${payer}</td></tr>` : ''}
          </tbody>
        </table>

        ${portalLink ? `<p style="text-align:center; margin:18px 0;"><a href="${portalLink}" style="background:#0f766e; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; display:inline-block;">Open Summon</a></p>` : ''}

        <p style="margin:12px 0 0; color:#666; font-size:13px;">This is an automated notification. No attachment included. To view full details, open the portal using the link above.</p>
      </div>
      <div style="background:#f3f6fb; padding:12px 20px; font-size:12px; color:#6b7280;">
        <div>Regards,<br/>ADMS</div>
      </div>
    </div>
  </div>
  `;
};
