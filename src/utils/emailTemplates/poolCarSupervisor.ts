type PoolCarDetails = {
  id: number;
  subject: string;
  pcar_datererq?: string | null;
  pcar_empid: string;
  applicant_name?: string | null;
  pcar_dest?: string | null;
  pcar_purp?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  pcar_day?: number | null;
  pcar_hour?: number | null;
  backendUrl: string;
  supervisor_id: string;
};

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '-' : String(v));

export default function poolCarSupervisorEmail(details: PoolCarDetails) {
  const {
    id,
    subject,
    pcar_datererq,
    pcar_empid,
    applicant_name,
    pcar_dest,
    pcar_purp,
    date_from,
    date_to,
    pcar_day,
    pcar_hour,
    backendUrl,
    supervisor_id
  } = details;

  const approveUrl = `${backendUrl}/api/mtn/poolcars/${id}/verify?ramco=${encodeURIComponent(supervisor_id)}&decision=approved`;
  const rejectUrl = `${backendUrl}/api/mtn/poolcars/${id}/verify?ramco=${encodeURIComponent(supervisor_id)}&decision=rejected`;

  return `
  <div style="background:#f9fafb; padding:24px;">
    <div style="max-width:680px; margin:0 auto; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
      <div style="background:#16a34a; height:6px; border-top-left-radius:8px; border-top-right-radius:8px;"></div>
      <div style="background:#ffffff; padding:20px 24px; border-bottom-left-radius:8px; border-bottom-right-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <h2 style="margin:0 0 4px; font-size:20px;">Verify Pool Car Request <span style="color:#065f46;">(ID #${id})</span></h2>
        <p style="margin:0 0 16px; color:#374151;">Please review and verify the following pool car application:</p>

        <table cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0 8px; width:100%;">
          <tbody>
            <tr>
              <td style="color:#6b7280; width:260px;">Subject</td>
              <td><strong>${fmt(subject)}</strong></td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Application Date</td>
              <td>${fmt(pcar_datererq)}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Applicant</td>
              <td>${fmt(applicant_name)} <span style="color:#6b7280;">(${fmt(pcar_empid)})</span></td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Destination & Purpose</td>
              <td>${fmt(pcar_dest)} — ${fmt(pcar_purp)}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Trip From / To</td>
              <td>${fmt(date_from)} → ${fmt(date_to)}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Duration</td>
              <td>${fmt(pcar_day)} day(s), ${fmt(pcar_hour)} hour(s)</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:16px;">
          <a href="${approveUrl}" style="background:#16a34a; color:#fff; text-decoration:none; padding:10px 14px; border-radius:6px; margin-right:8px; display:inline-block;">Approve</a>
          <a href="${rejectUrl}" style="background:#dc2626; color:#fff; text-decoration:none; padding:10px 14px; border-radius:6px; display:inline-block;">Reject</a>
        </div>

        <p style="margin-top:12px; color:#6b7280; font-size:12px;">These buttons will perform verification via the backend endpoint.</p>
      </div>
    </div>
  </div>`;
}
