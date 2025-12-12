import jwt, { SignOptions } from 'jsonwebtoken';

import * as assetModel from '../p.asset/assetModel';
import * as maintenanceModel from '../p.maintenance/maintenanceModel';
import * as userModel from '../p.user/userModel';
import vehicleMaintenanceAuthorizationEmail from '../utils/emailTemplates/vehicleMaintenanceAuthorization';
import * as mailer from '../utils/mailer';
import { buildSectionsForRecord } from '../utils/maintenanceEmailHelper';
import { resolveVehicleMtnRecord } from '../utils/maintenanceResolver';
import { getWorkflowPic } from '../utils/workflowHelper';

export async function approveVehicleMtnRequest(reqId: number, approverRamco: number | string, status: number) {
  await maintenanceModel.approveVehicleMtnRequest(reqId, approverRamco, status);
}

export async function recommendVehicleMtnRequest(reqId: number, recommenderRamco: number | string, status: number) {
  await maintenanceModel.recommendVehicleMtnRequest(reqId, recommenderRamco, status);
  if (status === 1) {
    await sendApprovalEmail(reqId);
  }
}

export async function sendApprovalEmail(reqId: number) {
  const rec = await resolveVehicleMtnRecord(reqId);
  if (!rec) return;

  const workflowsRaw = await userModel.getWorkflows();
  const arr = Array.isArray(workflowsRaw) ? (workflowsRaw as any[]) : [];
  const approver = arr.find(w => String(w.module_name).toLowerCase() === 'maintenance' && Number(w.level_order) === 3);
  const approverRamco = approver?.ramco_id || approver?.employee?.ramco_id || null;

  const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
  let to: null | string = null;
  if (approverRamco) {
    const emp = await assetModel.getEmployeeByRamco(String(approverRamco));
    if (emp && isValidEmail((emp as any).email)) to = String((emp as any).email);
  }
  if (!to) return;

  const payload = { contact: to, ramco_id: approverRamco || '', req_id: reqId };
  const portalUrl = buildPortalUrl(reqId, 'approve', payload, '3d');

  const { applicant, deptLocation, formattedDate, requestType, vehicleInfo } = await buildSectionsForRecord(rec);
  const emailBody = vehicleMaintenanceAuthorizationEmail({
    applicant,
    date: formattedDate,
    deptLocation,
    footerName: 'ADMS (v4)',
    greetingName: (approver?.full_name) || applicant,
    portalUrl,
    requestNo: reqId,
    requestType,
    role: 'Approval',
    vehicleInfo
  });
  const subject = `Vehicle Maintenance Request Pending Approval - Service Order: ${reqId}`;
  await mailer.sendMail(to, subject, emailBody);
}

export async function sendRecommendationEmail(reqId: number) {
  const rec = await resolveVehicleMtnRecord(reqId);
  if (!rec) return;

  const nextPic = await getWorkflowPic('vehicle maintenance', 'Recommend');
  const isValidEmail = (v: any) => typeof v === 'string' && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v);
  let to: null | string = nextPic?.email && isValidEmail(nextPic.email) ? nextPic.email : null;
  if (!to && nextPic?.ramco_id) {
    try {
      const emp = await assetModel.getEmployeeByRamco(String(nextPic.ramco_id));
      if (emp && isValidEmail((emp as any).email)) to = String((emp as any).email);
      if (!to) {
        const all = await assetModel.getEmployees();
        const found = (Array.isArray(all) ? (all as any[]) : []).find(e => String(e.ramco_id) === String(nextPic.ramco_id));
        if (found && isValidEmail(found.email)) to = String(found.email);
      }
    } catch { /* ignore */ }
  }
  if (!to) return;

  const payload = { contact: to, ramco_id: nextPic?.ramco_id || '', req_id: reqId };
  const portalUrl = buildPortalUrl(reqId, 'recommend', payload, '3d');

  const { applicant, deptLocation, formattedDate, requestType, vehicleInfo } = await buildSectionsForRecord(rec);
  const emailBody = vehicleMaintenanceAuthorizationEmail({
    applicant,
    date: formattedDate,
    deptLocation,
    footerName: 'ADMS (v4)',
    greetingName: (nextPic && (nextPic as any).full_name) || applicant,
    portalUrl,
    requestNo: reqId,
    requestType,
    role: 'Recommendation',
    vehicleInfo
  });
  const subject = `Vehicle Maintenance Request Pending Recommendation - Service Order: ${reqId}`;
  await mailer.sendMail(to, subject, emailBody);
}

function buildPortalUrl(id: number, action: 'approve' | 'recommend', payload: any, ttl: number | string) {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default_secret_key';
  const token = jwt.sign(payload, secret, { expiresIn: ttl } as SignOptions);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl.replace(/\/?$/, '')}/mtn/vehicle/portal/${id}?action=${action}&_cred=${encodeURIComponent(token)}`;
}
