import * as maintenanceModel from '../p.maintenance/maintenanceModel';
import * as assetModel from '../p.asset/assetModel';
import * as billingModel from '../p.billing/billingModel';

// Build applicant/dept/location/vehicle/requestType + recentRequests + annualSummary for a resolved record
export async function buildSectionsForRecord(rec: any) {
  // Applicant string
  const applicantName = rec?.requester?.name || rec?.requester?.full_name || 'Tuan/Puan';
  const applicantDetails: string[] = [];
  if (rec?.requester?.ramco_id) applicantDetails.push(String(rec.requester.ramco_id));
  if (rec?.requester?.contact) applicantDetails.push(String(rec.requester.contact));
  const applicant = applicantName + (applicantDetails.length ? ` (${applicantDetails.join(' • ')})` : '');

  // Dept/Location
  const deptLocation = rec?.asset && rec.asset.costcenter
    ? `${rec.asset.costcenter.name}${rec.asset.location ? ' / ' + rec.asset.location.name : ''}`
    : '';

  // Vehicle info
  const vehicleInfo = rec?.asset
    ? (`${rec.asset.register_number || ''} ${(rec.asset.brand && rec.asset.brand.name) || ''} ${(rec.asset.model && rec.asset.model.name) || ''}`.trim()
        + (rec.asset.age_years !== null && rec.asset.age_years !== undefined ? ` — ${rec.asset.age_years} yrs` : ''))
    : '';

  // Request type list
  const requestType = Array.isArray(rec?.svc_type) ? rec.svc_type.map((s: any) => s.name).join(', ') : '';

  // Formatted date dd/m/yyyy
  let formattedDate = '';
  if (rec?.req_date) {
    const d = new Date(rec.req_date);
    if (!Number.isNaN(d.getTime())) formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  // Annual summary and recent requests (asset scoped)
  let annualSummary: Array<{ year: number; amount: number; requests: number }> = [];
  let recentRequests: any[] = [];
  try {
    const assetId = rec?.asset?.id ? Number(rec.asset.id) : null;
    if (assetId) {
      // Annual summary: join billing+request counts per year (last 5 years)
      const [allBillingsRaw, allRequestsRaw] = await Promise.all([
        billingModel.getVehicleMtnBillings(),
        maintenanceModel.getVehicleMtnRequestByAssetId(assetId)
      ]);
      const billingArray = Array.isArray(allBillingsRaw) ? allBillingsRaw : (allBillingsRaw ? [allBillingsRaw] : []);
      const requestArray = Array.isArray(allRequestsRaw) ? allRequestsRaw : (allRequestsRaw ? [allRequestsRaw] : []);
      const billingByYear = new Map<number, number>();
      billingArray.forEach((b: any) => {
        const assetMatch = (b.asset_id !== undefined && b.asset_id !== null && Number(b.asset_id) === assetId) || (b.vehicle_id !== undefined && b.vehicle_id !== null && Number(b.vehicle_id) === assetId);
        if (!assetMatch) return;
        const invDate = b.inv_date ? new Date(b.inv_date) : null;
        const year = invDate && !Number.isNaN(invDate.getTime()) ? invDate.getFullYear() : null;
        if (year) billingByYear.set(year, (billingByYear.get(year) || 0) + (Number(b.inv_total) || 0));
      });
      const requestsByYear = new Map<number, number>();
      requestArray.forEach((r: any) => {
        if (Number(r.asset_id) !== assetId) return;
        const rd = r.req_date ? new Date(r.req_date) : null;
        const year = rd && !Number.isNaN(rd.getTime()) ? rd.getFullYear() : null;
        if (year) requestsByYear.set(year, (requestsByYear.get(year) || 0) + 1);
      });
      const years = new Set<number>([...billingByYear.keys(), ...requestsByYear.keys()]);
      const yearList = Array.from(years).sort((a, b) => b - a);
      const currentYear = new Date().getFullYear();
      const validYears = yearList.filter(y => Number.isFinite(y) && y >= 2000 && y <= currentYear).slice(0, 5);
      annualSummary = validYears.map(y => ({ year: y, amount: billingByYear.get(y) || 0, requests: requestsByYear.get(y) || 0 }));

      // Recent requests (exclude current)
      const [svcTypesRaw, workshopsRaw, rrRaw] = await Promise.all([
        maintenanceModel.getServiceTypes(),
        billingModel.getWorkshops(),
        maintenanceModel.getVehicleMtnRequestByAssetId(assetId)
      ]);
      const svcTypeMapLocal = new Map((Array.isArray(svcTypesRaw) ? svcTypesRaw : []).map((s: any) => [s.svcTypeId || s.id || s.id, s]));
      const wsMapLocal = new Map((Array.isArray(workshopsRaw) ? workshopsRaw : []).map((w: any) => [w.ws_id || w.id || String(w.ws_id), w]));
      const rr = Array.isArray(rrRaw) ? rrRaw : (rrRaw ? [rrRaw] : []);
      const currentReqId = Number((rec && rec.req_id) ? rec.req_id : 0);
      const others = (rr as any[]).filter((r: any) => Number(r.req_id) !== currentReqId);
      recentRequests = others
        .map((r: any) => {
          const rd = r.req_date ? new Date(r.req_date) : null;
          const dateFormatted = rd && !Number.isNaN(rd.getTime()) ? `${rd.getDate()}/${rd.getMonth() + 1}/${rd.getFullYear()}` : (r.req_date || '');
          const svcIds = r.svc_opt ? String(r.svc_opt).split(',').map((id: string) => parseInt(id.trim())).filter((n: number) => Number.isFinite(n)) : [];
          const svcNames = svcIds.map((id: number) => {
            const s = svcTypeMapLocal.get(id) || svcTypeMapLocal.get(String(id));
            return s ? (s.svcType || s.name || String(id)) : String(id);
          }).join(', ');
          const statusVal = r.status || r.req_status || r.request_status || r.inv_status || r.state || r.status_name || '';
          let workshopName = '';
          if (r.ws_name) workshopName = r.ws_name;
          else if (r.workshop) workshopName = r.workshop;
          else if (r.ws_id && wsMapLocal && wsMapLocal.has(r.ws_id)) workshopName = (wsMapLocal.get(r.ws_id) as any)?.ws_name || '';
          return { req_id: r.req_id, date: dateFormatted, dateRaw: rd && !Number.isNaN(rd.getTime()) ? rd.getTime() : 0, requestType: svcNames || (r.svc_opt || ''), status: statusVal, comment: r.req_comment || '', workshop: workshopName };
        })
        .sort((a: any, b: any) => (b.dateRaw || 0) - (a.dateRaw || 0))
        .slice(0, 5)
        .map(({ dateRaw, ...rest }: any) => rest);
    }
  } catch (e) {
    // swallow computation issues, return partials
  }

  return { applicant, deptLocation, vehicleInfo, requestType, recentRequests, annualSummary, formattedDate };
}

export function getAdminCcList(): { ccArray: string[]; ccString?: string } {
  const ADMIN_EMAIL_ENV = (process.env.ADMIN_EMAIL || '').trim();
  const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
  const ccArray = ADMIN_EMAIL_ENV
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => isValidEmail(s));
  return { ccArray, ccString: ccArray.length ? ccArray.join(',') : undefined };
}
