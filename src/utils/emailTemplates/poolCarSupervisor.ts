interface PoolCarDetails {
  applicant_name?: null | string;
  date_from?: null | string;
  date_to?: null | string;
  id: number;
  pcar_datererq?: null | string;
  pcar_day?: null | number;
  pcar_dest?: null | string;
  pcar_empid: string;
  pcar_hour?: null | number;
  pcar_purp?: null | string;
  subject: string;
}

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '-' : String(v));

export default function poolCarSupervisorEmail(details: PoolCarDetails) {
  const {
    applicant_name,
    date_from,
    date_to,
    id,
    pcar_datererq,
    pcar_day,
    pcar_dest,
    pcar_empid,
    pcar_hour,
    pcar_purp,
    subject
  } = details;

  return `
  <div style="background:#f9fafb; padding:24px;">
    <div style="max-width:680px; margin:0 auto; font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827;">
      <div style="background:linear-gradient(90deg, #22c55e, #16a34a, #065f46); height:6px; border-top-left-radius:8px; border-top-right-radius:8px;"></div>
      <div style="background:#ffffff; padding:20px 24px; border-bottom-left-radius:8px; border-bottom-right-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <h2 style="margin:0 0 4px; font-size:20px;">Pool Car Request <span style="color:#065f46;">(ID #${id})</span></h2>
        <p style="margin:0 0 16px; color:#374151;">For your information. No action is required.</p>

        <table cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0 8px; width:100%;">
          <tbody>
            <tr>
              <td style="color:#6b7280; width:260px;">Subject</td>
              <td><strong>${fmt(subject)}</strong></td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Application Date</td>
              <td style="color:#065f46; font-weight:600;">${formatDateDMY12h(pcar_datererq)}</td>
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
              <td style="color:#065f46; font-weight:600;">${formatDateDMY12h(date_from)} → ${formatDateDMY12h(date_to)}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;">Duration</td>
              <td>${fmt(pcar_day)} day(s), ${fmt(pcar_hour)} hour(s)</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:12px; color:#6b7280; font-size:12px;">This email is a notification only.</p>
        <div style="margin-top:16px; border-top:1px solid #e5e7eb; padding-top:12px; color:#065f46; font-weight:600;">ADMS4</div>
      </div>
    </div>
  </div>`;
}

function formatDateDMY12h(s?: null | string): string {
  const d = parseDateLocal(s);
  if (!d) return '-';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${day}/${month}/${year} ${hours}:${mm} ${ampm}`;
}

function parseDateLocal(s?: null | string): Date | null {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) {
    const [_, Y, M, D, h, m2, s2] = m;
    return new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m2), s2 ? Number(s2) : 0);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
