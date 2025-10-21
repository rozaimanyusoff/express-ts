import jwt, { SignOptions } from 'jsonwebtoken';
import * as assetModel from '../p.asset/assetModel';
import * as maintenanceModel from '../p.maintenance/maintenanceModel';
import * as mailer from './mailer';
import vehicleMaintenanceAuthorizationEmail from './emailTemplates/vehicleMaintenanceAuthorization';
import vehicleMaintenanceOutcomeEmail from './emailTemplates/vehicleMaintenanceOutcome';
import { resolveVehicleMtnRecord } from './maintenanceResolver';
import { getWorkflowPic } from './workflowHelper';
import { buildSectionsForRecord } from './maintenanceEmailHelper';

function buildPortalUrl(
  id: number,
  action: 'recommend' | 'approve',
  payload: any,
  ttl: string | number,
  authorizeRamco?: string | number | null
) {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
  const token = jwt.sign(payload as any, secret, { expiresIn: ttl } as SignOptions);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const authParam = authorizeRamco !== undefined && authorizeRamco !== null && String(authorizeRamco) !== ''
    ? `&authorize=${encodeURIComponent(String(authorizeRamco))}`
    : '';
  return `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${id}?action=${action}${authParam}&_cred=${encodeURIComponent(token)}`;
}

export async function sendRecommendationEmail(reqId: number) {
  const rec = await resolveVehicleMtnRecord(reqId);
  if (!rec) return;

  const nextPic = await getWorkflowPic('vehicle maintenance', 'Recommend');
  const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
  let to: string | null = nextPic?.email && isValidEmail(nextPic.email) ? nextPic.email : null;
  if (!to && nextPic?.ramco_id) {
    try {
      const emp = await assetModel.getEmployeeByRamco(String(nextPic.ramco_id));
      if (emp && isValidEmail((emp as any).email)) to = String((emp as any).email);
      if (!to) {
        const all = await assetModel.getEmployees();
        const found = (Array.isArray(all) ? (all as any[]) : []).find(e => String(e.ramco_id) === String(nextPic!.ramco_id));
        if (found && isValidEmail(found.email)) to = String(found.email);
      }
    } catch { /* ignore */ }
  }
  if (!to) return;

  const payload = { ramco_id: nextPic?.ramco_id || '', contact: to, req_id: reqId };
  const portalUrl = buildPortalUrl(reqId, 'recommend', payload, '3d', nextPic?.ramco_id || '');

  const { applicant, deptLocation, vehicleInfo, requestType, formattedDate } = await buildSectionsForRecord(rec);
  const emailBody = vehicleMaintenanceAuthorizationEmail({
    requestNo: reqId,
    date: formattedDate,
    greetingName: (nextPic && (nextPic as any).full_name) || applicant,
    role: 'Recommendation',
    applicant,
    deptLocation,
    vehicleInfo,
    requestType,
    portalUrl,
    footerName: 'ADMS (v4)'
  });
  const subject = `Vehicle Maintenance Request Pending Recommendation - Service Order: ${reqId}`;
  await mailer.sendMail(to, subject, emailBody);
}

export async function sendApprovalEmail(reqId: number) {
  const rec = await resolveVehicleMtnRecord(reqId);
  if (!rec) return;

  // Resolve approver via workflow helper (primary: 'vehicle maintenance', fallback: 'maintenance')
  const approverPic = (await getWorkflowPic('vehicle maintenance', 'Approval'))
    || (await getWorkflowPic('maintenance', 'Approval'));
  if (!approverPic) {
    // eslint-disable-next-line no-console
    console.warn('sendApprovalEmail: No workflow approver configured for module vehicle maintenance/maintenance');
    return;
  }

  const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
  let to: string | null = approverPic.email && isValidEmail(approverPic.email) ? approverPic.email : null;
  if (!to && approverPic.ramco_id) {
    try {
      const emp = await assetModel.getEmployeeByRamco(String(approverPic.ramco_id));
      if (emp && isValidEmail((emp as any).email)) to = String((emp as any).email);
      if (!to) {
        const all = await assetModel.getEmployees();
        const found = (Array.isArray(all) ? (all as any[]) : []).find(e => String(e.ramco_id) === String(approverPic!.ramco_id));
        if (found && isValidEmail(found.email)) to = String(found.email);
      }
    } catch { /* ignore */ }
  }
  if (!to) {
    // eslint-disable-next-line no-console
    console.warn('sendApprovalEmail: Unable to resolve email for approver', approverPic.ramco_id);
    return;
  }

  const payload = { ramco_id: approverPic.ramco_id || '', contact: to, req_id: reqId };
  const portalUrl = buildPortalUrl(reqId, 'approve', payload, '3d', approverPic.ramco_id || '');

  const { applicant, deptLocation, vehicleInfo, requestType, formattedDate } = await buildSectionsForRecord(rec);
  const emailBody = vehicleMaintenanceAuthorizationEmail({
    requestNo: reqId,
    date: formattedDate,
    greetingName: approverPic.full_name || applicant,
    role: 'Approval',
    applicant,
    deptLocation,
    vehicleInfo,
    requestType,
    portalUrl,
    footerName: 'ADMS (v4)'
  });
  const subject = `Vehicle Maintenance Request Pending Approval - Service Order: ${reqId}`;
  await mailer.sendMail(to, subject, emailBody);
}

export async function recommendVehicleMtnRequest(reqId: number, recommenderRamco: string | number, status: number) {
  await maintenanceModel.recommendVehicleMtnRequest(reqId, recommenderRamco, status);
  if (status === 1) {
    await sendApprovalEmail(reqId);
  }
}

export async function approveVehicleMtnRequest(reqId: number, approverRamco: string | number, status: number) {
  await maintenanceModel.approveVehicleMtnRequest(reqId, approverRamco, status);
}

// Notify requester that their application has been approved (or rejected)
export async function sendRequesterApprovalEmail(reqId: number, approvalStatus: number) {
  try {
    const rec = await resolveVehicleMtnRecord(reqId);
    if (!rec) return;
    const requesterRamco = (rec as any).requester?.ramco_id ? String((rec as any).requester.ramco_id) : '';
    if (!requesterRamco) return;

    const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
    let requester: any = null;
    try {
      requester = await assetModel.getEmployeeByRamco(requesterRamco);
    } catch { /* ignore */ }
    if (!requester || !isValidEmail((requester as any).email)) {
      try {
        const all = await assetModel.getEmployees();
        requester = (Array.isArray(all) ? (all as any[]) : []).find(e => String(e.ramco_id) === requesterRamco) || null;
      } catch { /* ignore */ }
    }
    const to = requester && isValidEmail((requester as any).email) ? String((requester as any).email) : null;
    if (!to) {
      // eslint-disable-next-line no-console
      console.warn('sendRequesterApprovalEmail: requester email not found for ramco', requesterRamco);
      return;
    }

    const jwtSecret2 = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
    const credData = { ramco_id: requesterRamco, contact: to, req_id: reqId } as any;
    const token = jwt.sign(credData, jwtSecret2, { expiresIn: '7d' } as SignOptions);

    const portalUrl = buildPortalUrl(reqId, 'approve', credData, '7d', requesterRamco);

    const approved = Number(approvalStatus) === 1;
    const subject = approved
      ? `Vehicle Maintenance Approved - Service Order: ${reqId}`
      : `Vehicle Maintenance Rejected - Service Order: ${reqId}`;
    const recipientName = (requester as any)?.full_name || (requester as any)?.name || '';

    const { applicant, deptLocation, vehicleInfo, requestType, formattedDate } = await buildSectionsForRecord(rec as any);
    const emailBody = vehicleMaintenanceOutcomeEmail({
      requestNo: reqId,
      date: formattedDate,
      greetingName: recipientName || 'Tuan/Puan',
      status: approved ? 'Approved' : 'Rejected',
      applicant,
      deptLocation,
      vehicleInfo,
      requestType,
      portalUrl,
      footerName: 'ADMS (v4)'
    });

    await mailer.sendMail(to, subject, emailBody);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('sendRequesterApprovalEmail failed', e);
  }
}
