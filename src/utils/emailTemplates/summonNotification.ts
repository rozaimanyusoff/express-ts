export const renderSummonNotification = (opts: {
  driverName?: string | null;
  smn_id?: number | null;
  summon_no?: string | null;
  summon_dt?: string | null;
  summon_loc?: string | null;
  summon_amt?: number | string | null;
  summon_agency?: string | null;
}) => {
  const { driverName, smn_id, summon_no, summon_dt, summon_loc, summon_amt, summon_agency } = opts;
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const portalLink = smn_id ? `${base}/compliance/summon/portal/${smn_id}` : null;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #222; background:#f6f8fb; padding:20px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(90deg,#2b6cb0,#3182ce); padding:18px 24px; color:#fff;">
        <h1 style="margin:0; font-size:20px; font-weight:600;">Summon Notification</h1>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 12px;">Dear <strong>${driverName || 'Driver'}</strong>,</p>
        <p style="margin:0 0 18px; color:#444;">A summon has been recorded for you. Please find the details below.</p>

        <table role="presentation" width="100%" style="border-collapse:collapse; margin-bottom:18px;">
          <tbody>
            ${smn_id ? `<tr><td style="padding:8px 0; color:#666; width:40%;">Summon ID</td><td style="padding:8px 0; font-weight:600;">${smn_id}</td></tr>` : ''}
            ${summon_no ? `<tr><td style="padding:8px 0; color:#666;">Summon No</td><td style="padding:8px 0; font-weight:600;">${summon_no}</td></tr>` : ''}
            ${summon_dt ? `<tr><td style="padding:8px 0; color:#666;">Date / Time</td><td style="padding:8px 0; font-weight:600;">${summon_dt}</td></tr>` : ''}
            ${summon_loc ? `<tr><td style="padding:8px 0; color:#666;">Location</td><td style="padding:8px 0; font-weight:600;">${summon_loc}</td></tr>` : ''}
            ${summon_agency ? `<tr><td style="padding:8px 0; color:#666;">Agency</td><td style="padding:8px 0; font-weight:600;">${summon_agency}</td></tr>` : ''}
            ${summon_amt ? `<tr><td style="padding:8px 0; color:#666;">Amount</td><td style="padding:8px 0; font-weight:600;">${summon_amt}</td></tr>` : ''}
          </tbody>
        </table>

        ${portalLink ? `<p style="text-align:center; margin:18px 0;"><a href="${portalLink}" style="background:#2b6cb0; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; display:inline-block;">View in Portal</a></p>` : ''}

        <p style="margin:12px 0 0; color:#666; font-size:13px;">Please follow your department's procedure for handling summons. If you have any questions, reply to this email.</p>
      </div>
      <div style="background:#f3f6fb; padding:12px 20px; font-size:12px; color:#6b7280;">
        <div>Regards,<br/>ADMS</div>
      </div>
    </div>
  </div>
  `;
};
