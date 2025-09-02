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
  return `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Summon Notification</h2>
    <p>Dear ${driverName || 'Driver'},</p>
    <p>This is to inform you that a summon has been recorded with the following details:</p>
    <ul>
      ${smn_id ? `<li><strong>Summon ID:</strong> ${smn_id}</li>` : ''}
      ${summon_no ? `<li><strong>Summon No:</strong> ${summon_no}</li>` : ''}
      ${summon_dt ? `<li><strong>Date/Time:</strong> ${summon_dt}</li>` : ''}
      ${summon_loc ? `<li><strong>Location:</strong> ${summon_loc}</li>` : ''}
      ${summon_agency ? `<li><strong>Agency:</strong> ${summon_agency}</li>` : ''}
      ${summon_amt ? `<li><strong>Amount:</strong> ${summon_amt}</li>` : ''}
    </ul>
    <p>Please follow your department's procedure for handling summons. If you have any questions, reply to this email.</p>
    <p>Regards,<br/>ADMS</p>
  </div>
  `;
};
