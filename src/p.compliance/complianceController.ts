
import { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';

import * as adminNotificationModel from '../p.admin/notificationModel';
import * as assetModel from '../p.asset/assetModel';
import { renderSummonNotification } from '../utils/emailTemplates/summonNotification';
import { renderSummonPaymentReceipt } from '../utils/emailTemplates/summonPaymentReceipt';
import { renderVehicleAssessmentNotification } from '../utils/emailTemplates/vehicleAssessmentNotification';
import { renderITAssessmentNotification } from '../utils/emailTemplates/itAssessmentNotification';
import { getSupervisorBySubordinate } from '../utils/employeeHelper';
import { sendMail } from '../utils/mailer';
import { getUploadBase, safeMove, toPublicUrl } from '../utils/uploadUtil';
import * as complianceModel from './complianceModel';

// Optional admin CC for summon notifications
const ADMIN_EMAIL_ENV = (process.env.ADMIN_EMAIL || '').trim();


// Format as d/m/yyyy (no leading zeros) for myeg_date display per frontend requirement
function fmtDateDMY(input?: any): null | string {
  if (!input) return null;
  try {
    const d = new Date(String(input));
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate());
    const month = String(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return null;
  }
}

// Format helpers for controller responses
function fmtDateOnly(input?: any): null | string {
  if (!input) return null;
  try {
    const s = String(input);
    // If already in YYYY-MM-DD, return as-is (or if contains space/ T, take date part)
    const tIndex = s.indexOf('T');
    if (tIndex > 0) return s.slice(0, tIndex);
    const sp = s.indexOf(' ');
    if (sp > 0) return s.slice(0, sp);
    // fallback: try Date
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  } catch (e) {
    return null;
  }
}

// Safe JSON parse for display_interfaces varchar field
function parseDisplayInterfaces(value: any): string[] | null {
  if (!value) return null;
  try {
    if (typeof value === 'string') {
      // Try to parse as JSON first
      try {
        return JSON.parse(value);
      } catch (parseErr) {
        // If JSON parse fails, treat as comma-separated string
        const interfaces = value.split(',').map((i: string) => i.trim()).filter((i: string) => i);
        return interfaces.length > 0 ? interfaces : null;
      }
    }
    return Array.isArray(value) ? value : null;
  } catch (e) {
    // If all else fails, return null
    return null;
  }
}

// Safe parse for comma-separated varchar fields (display_interfaces, installed_software, etc.)
function parseCommaSeparatedArray(value: any): string[] | null {
  if (!value) return null;
  try {
    if (typeof value === 'string') {
      // Try to parse as JSON first
      try {
        return JSON.parse(value);
      } catch (parseErr) {
        // If JSON parse fails, treat as comma-separated string
        const items = value.split(',').map((i: string) => i.trim()).filter((i: string) => i);
        return items.length > 0 ? items : null;
      }
    }
    return Array.isArray(value) ? value : null;
  } catch (e) {
    // If all else fails, return null
    return null;
  }
}

function fmtDatetimeMySQL(input?: any): null | string {
  if (!input) return null;
  const s = String(input).trim();
  // If already in 'YYYY-MM-DD HH:mm:ss' or contains T, normalize
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

function fmtTimeOnly(input?: any): null | string {
  if (!input) return null;
  try {
    const s = String(input).trim();
    // If it's already HH:MM or HH:MM:SS, normalize to HH:MM:SS
    const parts = s.split('T').pop()?.split(' ')[0] || s;
    const p = parts.split(':');
    const hh = String(Number(p[0] || 0)).padStart(2, '0');
    const mm = String(Number(p[1] || 0)).padStart(2, '0');
    const ss = p[2] ? String(Number(p[2])).padStart(2, '0') : '00';
    return `${hh}:${mm}:${ss}`;
  } catch (e) {
    return null;
  }
}

// Helper to normalize a temp file path into stored relative path
function normalizeStoredPath(filePath?: null | string): null | string {
  if (!filePath) return null;
  const filename = path.basename(String(filePath).replace(/\\/g, '/'));
  return `uploads/compliance/summon/${filename}`;
}

// POST /api/compliance/assessments/test-email
// Body: { to: string, asset?: { id, code, name }, driver?: { full_name, email, ramco_id }, assessment?: { id, date, remark, rate, ncr }, portalLink?: string, securityPin?: string }
// Sends a test Vehicle Assessment email using the current template (no attachments)
export const sendAssessmentTestEmail = async (req: Request, res: Response) => {
  try {
    const to = String(req.body?.to || req.query.to || '').trim();
    if (!to) return res.status(400).json({ message: 'Provide recipient email in body.to', status: 'error' });

    const asset = req.body?.asset || { code: 'TEST-123', id: 999, name: 'Test Vehicle' };
    const driver = req.body?.driver || { email: to, full_name: 'Test Recipient', ramco_id: 'DRV001' };
    const now = new Date();
    const defaultAssess = { date: now.toISOString().slice(0, 10), id: 1001, ncr: '-', rate: '-', remark: 'Automated test' };
    const assessment = req.body?.assessment || defaultAssess;
    const securityPin = String(req.body?.securityPin || Math.floor(100000 + Math.random() * 900000));
    const frontendUrl = process.env.FRONTEND_URL || 'https://your-frontend-url';
    const portalLink = req.body?.portalLink || `${frontendUrl}/compliance/assessment/portal/${asset.id}?code=${driver.ramco_id}${securityPin}`;

    const { html, subject, text } = renderVehicleAssessmentNotification({ assessment, asset, details: [], driver, portalLink, securityPin });

    await sendMail(to, subject, html, { text });
    return res.json({ message: 'Test email sent', status: 'success', subject, to });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send test email';
    return res.status(500).json({ message: msg, status: 'error' });
  }
};

export const getSummons = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummons();
    const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');

    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];

    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    const makeUrl = (val: any) => {
      if (!val) return null;
      const s = String(val).trim();
      if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s.replace(/^\/+/, '');
      return `${base}/${s.replace(/^\/+/, '')}`;
    };

    const data = (rows || []).map((r: any) => {
      const rawUpl = r.summon_upl || null;
      const rawReceipt = r.summon_receipt || null;
      const summon_upl = toPublicUrl(rawUpl);
      const summon_receipt = toPublicUrl(rawReceipt);
      const attachment_url = summon_upl || summon_receipt || null;

      let asset = null;
      if (r.asset_id && assetMap.has(r.asset_id)) {
        const a = assetMap.get(r.asset_id);
        const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
        const owner = ownerRamco && employeeMap.has(ownerRamco) ? { full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null, ramco_id: ownerRamco } : null;
        asset = {
          costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
          id: r.asset_id,
          location: (() => {
            const locId = a.location_id ?? a.location?.id ?? null;
            if (!locId) return null;
            const found = locationMap.get(locId);
            return found ? { code: found.code || found.name || null, id: locId } : null;
          })(),
          owner,
          register_number: a.register_number || a.vehicle_regno || null
        };
      }

      const employee = r.ramco_id && employeeMap.has(r.ramco_id) ? (() => {
        const e = employeeMap.get(r.ramco_id);
        return { contact: e.contact_no || e.contact || null, email: e.email || null, full_name: e.full_name || e.name || null, ramco_id: r.ramco_id };
      })() : null;

      const { f_name, reg_no, v_email, ...rest } = r;
      // format date/time fields for API consumers
      if (rest.myeg_date) rest.myeg_date = fmtDateDMY(rest.myeg_date);
      if (rest.receipt_date) rest.receipt_date = fmtDateDMY(rest.receipt_date);
      if (rest.summon_date) rest.summon_date = fmtDateDMY(rest.summon_date);
      if (rest.summon_time) rest.summon_time = fmtTimeOnly(rest.summon_time);
      if (rest.summon_dt) rest.summon_dt = fmtDatetimeMySQL(rest.summon_dt);
      return { ...rest, asset, attachment_url, employee, summon_receipt, summon_upl };
    });

    res.json({ data, message: 'Summons retrieved', status: 'success' });
  } catch (err) {
    res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to fetch summons', status: 'error' });
  }
};

export const getSummonById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });

    const rows = await complianceModel.getSummonById(id);
    if (!rows) return res.status(404).json({ data: null, message: 'Summon not found', status: 'error' });
    const r = Array.isArray(rows) ? rows[0] : rows;

    const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);
    const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];

    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    const rawUpl = r.summon_upl || null;
    const rawReceipt = r.summon_receipt || null;
    const makeUrl = (val: any) => {
      if (!val) return null;
      const s = String(val).trim();
      if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s.replace(/^\/+/, '');
      return `${base}/${s.replace(/^\/+/, '')}`;
    };
    const summon_upl = makeUrl(rawUpl);
    const summon_receipt = makeUrl(rawReceipt);
    const attachment_url = summon_upl || summon_receipt || null;

    let asset = null;
    if (r.asset_id && assetMap.has(r.asset_id)) {
      const a = assetMap.get(r.asset_id);
      const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
      const owner = ownerRamco && employeeMap.has(ownerRamco) ? { full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null, ramco_id: ownerRamco } : null;
      asset = {
        costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
        id: r.asset_id,
        location: (() => {
          const locId = a.location_id ?? a.location?.id ?? null;
          if (!locId) return null;
          const found = locationMap.get(locId);
          return found ? { code: found.code || found.name || null, id: locId } : null;
        })(),
        owner,
        register_number: a.register_number || a.vehicle_regno || null
      };
    }

    const employee = r.ramco_id && employeeMap.has(r.ramco_id) ? (() => {
      const e = employeeMap.get(r.ramco_id);
      return { contact: e.contact_no || e.contact || null, email: e.email || null, full_name: e.full_name || e.name || null, ramco_id: r.ramco_id };
    })() : null;

    const { f_name, reg_no, v_email, ...rest } = r;
    const data = { ...rest, asset, attachment_url, employee, summon_receipt, summon_upl };
    // format date/time fields for API consumers
    if ((data).myeg_date) (data).myeg_date = fmtDateDMY((data).myeg_date);
    if ((data).receipt_date) (data).receipt_date = fmtDateDMY((data).receipt_date);
    if ((data).summon_date) (data).summon_date = fmtDateDMY((data).summon_date);
    if ((data).summon_time) (data).summon_time = fmtTimeOnly((data).summon_time);
    if ((data).summon_dt) (data).summon_dt = fmtDatetimeMySQL((data).summon_dt);

    res.json({ data, message: 'Summon retrieved', status: 'success' });
  } catch (err) {
    res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to fetch summon', status: 'error' });
  }
};

export const createSummon = async (req: Request, res: Response) => {
  try {
    // Pass request body directly to the model (no payload construction here)
    const data: any = req.body || {};
    const id = await complianceModel.createSummon(data);

    // If there was an uploaded file, validate, move it into final storage and update the record
    if ((req as any).file?.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.gif', '.jpeg', '.jpg', '.pdf', '.png', '.webp'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => { }); return res.status(400).json({ message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg,gif,webp)', status: 'error' }); }
      const filename = `summon-${id}-${Date.now()}${ext}`;
      const base = await getUploadBase();
      const destDir = path.join(base, 'compliance', 'summon');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await safeMove(tempPath, destPath);
      const storedRel = path.posix.join('uploads', 'compliance', 'summon', filename);
      await complianceModel.updateSummon(id, { summon_upl: storedRel }).catch(() => { });
    }

    // Fire-and-forget: try to send notification email (reuse logic from resend endpoint)
    (async () => {
      try {
        const created = await complianceModel.getSummonById(id);
        const r = Array.isArray(created) ? created[0] : created;
        if (!r) return;

        // TEST EMAIL OVERRIDE: prefer query/body override, then env TEST_EMAIL/TEST_NAME
        const GLOBAL_TEST_EMAIL = process.env.TEST_EMAIL || null;
        const GLOBAL_TEST_NAME = process.env.TEST_NAME || null;
        const localTestEmail = (req.query && (req.query.testEmail as string)) || (req.body && (req.body.testEmail || req.body.TEST_EMAIL)) || GLOBAL_TEST_EMAIL || null;
        const localTestName = (req.query && (req.query.testName as string)) || (req.body && (req.body.testName || req.body.TEST_NAME)) || GLOBAL_TEST_NAME || null;

        const ramco = r?.ramco_id || null;
        let emp: any = null;
        if (ramco) emp = await assetModel.getEmployeeByRamco(String(ramco));
  const toCandidate = localTestEmail || (emp && (emp.email || emp.contact)) || r?.v_email || null;
  const isValidEmail = (s: any) => typeof s === 'string' && s.includes('@');
  const adminCc = isValidEmail(ADMIN_EMAIL_ENV) ? ADMIN_EMAIL_ENV : undefined;
  const toEmail = isValidEmail(toCandidate) ? String(toCandidate) : (ADMIN_EMAIL_ENV || null);
  if (!toEmail) return; // no valid recipient

        const html = renderSummonNotification({
          driverName: localTestName || (emp?.full_name || emp?.name) || null,
          smn_id: r?.smn_id || id,
          summon_agency: r?.summon_agency || null,
          summon_amt: r?.summon_amt || null,
          summon_dt: r?.summon_dt || null,
          summon_loc: r?.summon_loc || null,
          summon_no: r?.summon_no || null,
        });

        try {
          const mailOpts = adminCc ? { cc: adminCc } : undefined;
          await sendMail(toEmail, `Summon notification #${r?.smn_id || id}`, html, mailOpts);
          await complianceModel.updateSummon(id, { emailStat: 1 }).catch(() => { });
        } catch (mailErr) {
          console.error('createSummon: mail send error', mailErr, 'to', toEmail);
        }
      } catch (e) {
        // non-blocking
      }
    })();

    res.status(201).json({ data: { id, smn_id: id }, message: 'Summon created', status: 'success' });
  } catch (err) {
    res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to create summon', status: 'error' });
  }
};

export const updateSummon = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });

    const body: any = { ...req.body };
    const payload: any = {};

    if (body.registration_no !== undefined) payload.asset_id = Number(body.registration_no) || body.registration_no;
    if (body.asset_id !== undefined) payload.asset_id = Number(body.asset_id) || body.asset_id;
    if (body.assigned_driver !== undefined) payload.ramco_id = String(body.assigned_driver).trim();
    if (body.ramco_id !== undefined && !payload.ramco_id) payload.ramco_id = String(body.ramco_id).trim();
    if (body.summon_no !== undefined) payload.summon_no = String(body.summon_no).trim();
    if (body.summon_loc !== undefined) payload.summon_loc = String(body.summon_loc).trim();
    if (body.summon_agency !== undefined) payload.summon_agency = String(body.summon_agency).trim();
    if (body.type_of_summon !== undefined) payload.type_of_summon = String(body.type_of_summon).trim();
    if (body.summon_amt !== undefined) payload.summon_amt = Number(body.summon_amt) || 0;

    // summon_dt is not set on update; keep summon_date and summon_time as separate fields

    if (body.myeg_date !== undefined) payload.myeg_date = body.myeg_date ? String(body.myeg_date).trim() : null;

    if ((req as any).file?.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.gif', '.jpeg', '.jpg', '.pdf', '.png', '.webp'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => { }); return res.status(400).json({ message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg,gif,webp)', status: 'error' }); }
      const normalized = normalizeStoredPath(tempPath);
      if (normalized) payload.summon_upl = normalized;
    }

    await complianceModel.updateSummon(id, payload);

    if ((req as any).file?.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = path.extname(originalName) || path.extname(tempPath) || '';
      const filename = `summon-${id}-${Date.now()}${ext}`;
      const base2 = await getUploadBase();
      const destDir = path.join(base2, 'compliance', 'summon');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await safeMove(tempPath, destPath);
      const stored = path.posix.join('uploads', 'compliance', 'summon', filename);
      await complianceModel.updateSummon(id, { summon_upl: stored });
    }

    res.json({ message: 'Updated', status: 'success' });
  } catch (err) {
    res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to update summon', status: 'error' });
  }
};

// POST /api/compliance/summon/:id/payment
export const uploadSummonPayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });

    const existing = await complianceModel.getSummonById(id);
    if (!existing) return res.status(404).json({ data: null, message: 'Summon not found', status: 'error' });

    const payload: any = {};
    if (req.body && req.body.receipt_date !== undefined) payload.receipt_date = req.body.receipt_date ? String(req.body.receipt_date).trim() : null;

    if ((req as any).file?.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.jpeg', '.jpg', '.pdf', '.png'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => { }); return res.status(400).json({ message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg)', status: 'error' }); }

      const filename = `summon-receipt-${id}-${Date.now()}${ext}`;
      const base = await getUploadBase();
      const destDir = path.join(base, 'compliance', 'summon');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await safeMove(tempPath, destPath);
      const storedRel = path.posix.join('uploads', 'compliance', 'summon', filename);
      payload.summon_receipt = storedRel;
    }

    if (Object.keys(payload).length === 0) return res.status(400).json({ message: 'No data provided', status: 'error' });

    await complianceModel.updateSummon(id, payload);
    // Notify admins via in-app notifications and optionally email
    (async () => {
      try {
        const created = await complianceModel.getSummonById(id);
        const r = Array.isArray(created) ? created[0] : created;
        const msg = `Payment receipt uploaded for summon #${r?.smn_id || id} by ${r?.ramco_id || 'unknown'}`;
        await adminNotificationModel.createAdminNotification({ message: msg, type: 'summon_payment' });

        // Also send email to configured ADMIN_EMAIL (best-effort)
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;
        if (ADMIN_EMAIL) {
          const html = renderSummonPaymentReceipt({
            adminName: 'Admin',
            payer: payload.payer || null,
            ramco_id: r?.ramco_id || null,
            receipt_date: payload.receipt_date || null,
            smn_id: r?.smn_id || id,
            summon_agency: r?.summon_agency || null,
            summon_amt: r?.summon_amt || null,
            summon_dt: r?.summon_dt || null,
            summon_loc: r?.summon_loc || null,
            summon_no: r?.summon_no || null,
          });
          try { await sendMail(ADMIN_EMAIL, `Summon payment received #${r?.smn_id || id}`, html); } catch (e) { console.error('admin email send failed', e); }
        }
      } catch (e) {
        // silent
      }
    })();

    res.json({ data: { id }, message: 'Payment receipt uploaded', status: 'success' });
  } catch (err) {
    res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to upload payment receipt', status: 'error' });
  }
};

// POST /api/compliance/summon/notify
export const resendSummonNotification = async (req: Request, res: Response) => {
  try {
    // Allow id in body or query
    const id = Number((req.body && (req.body.id || req.body.smn_id)) || req.query.id || req.query.smn_id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id', status: 'error' });

    const record = await complianceModel.getSummonById(id);
    if (!record) return res.status(404).json({ data: null, message: 'Summon not found', status: 'error' });
    const r = Array.isArray(record) ? record[0] : record;

    // TEST EMAIL OVERRIDE: prefer query/body override, then env TEST_EMAIL/TEST_NAME
    const GLOBAL_TEST_EMAIL = process.env.TEST_EMAIL || null;
    const GLOBAL_TEST_NAME = process.env.TEST_NAME || null;

    const localTestEmail = (req.query && (req.query.testEmail as string)) || (req.body && (req.body.testEmail || req.body.TEST_EMAIL)) || GLOBAL_TEST_EMAIL || null;
    const localTestName = (req.query && (req.query.testName as string)) || (req.body && (req.body.testName || req.body.TEST_NAME)) || GLOBAL_TEST_NAME || null;

    // Resolve recipient email: prefer employee email by ramco_id, fallback to stored v_email
    const ramco = r?.ramco_id || null;
    let emp: any = null;
    if (ramco) emp = await assetModel.getEmployeeByRamco(String(ramco));
  const toCandidate = localTestEmail || (emp && (emp.email || emp.contact)) || r?.v_email || null;
  const isValidEmail = (s: any) => typeof s === 'string' && s.includes('@');
  const adminCc = (ADMIN_EMAIL_ENV && isValidEmail(ADMIN_EMAIL_ENV)) ? ADMIN_EMAIL_ENV : undefined;
  const toEmail = isValidEmail(toCandidate) ? String(toCandidate) : (ADMIN_EMAIL_ENV || null);
  if (!toEmail) return res.status(400).json({ data: null, message: 'Recipient email not found', status: 'error' });

    const html = renderSummonNotification({
      driverName: localTestName || (emp?.full_name || emp?.name) || null,
      smn_id: r?.smn_id || id,
      summon_agency: r?.summon_agency || null,
      summon_amt: r?.summon_amt || null,
      summon_dt: r?.summon_dt || null,
      summon_loc: r?.summon_loc || null,
      summon_no: r?.summon_no || null,
    });

    try {
      const mailOpts = adminCc ? { cc: adminCc } : undefined;
      await sendMail(toEmail, `Summon notification #${r?.smn_id || id}`, html, mailOpts);
      // mark emailStat = 1 (best-effort)
      await complianceModel.updateSummon(id, { emailStat: 1 }).catch(() => { });
      return res.json({ data: { id, sentTo: toEmail, testMode: !!localTestEmail }, message: 'Notification sent', status: 'success' });
    } catch (mailErr) {
      // don't expose mail errors, but return failure status
      console.error('resendSummonNotification: mailer error', mailErr);
      return res.status(500).json({ data: null, message: 'Failed to send email', status: 'error' });
    }
  } catch (err) {
    return res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Unknown error', status: 'error' });
  }
};

export const deleteSummon = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await complianceModel.getSummonById(id);
    const prevFile = (existing as any)?.summon_upl || (existing as any)?.summon_receipt || (existing as any)?.attachment_path || null;
    if (prevFile) {
      const base3 = await getUploadBase();
      let rel = String(prevFile).replace(/^\/+/, '');
      if (rel.startsWith('uploads/')) rel = rel.replace(/^uploads\//, '');
      const full = path.join(base3, rel);
      await fsPromises.unlink(full).catch(() => { });
    }
    await complianceModel.deleteSummon(id);
    res.json({ data: null, message: 'Summon deleted', status: 'success' });
  } catch (err) {
    if (err instanceof Error && err.message === 'Summon record not found') {
      res.status(404).json({ data: null, message: err.message, status: 'error' });
    } else {
      res.status(500).json({ data: null, message: err instanceof Error ? err.message : 'Failed to delete summon', status: 'error' });
    }
  }
};

/* ====== SUMMON TYPES ====== */
export const getSummonTypes = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonTypes();
    // enrich with assigned agencies
    const out: any[] = [];
    for (const t of rows) {
      const agencies = await complianceModel.getAgenciesByType(Number(t.id));
      out.push({ ...t, agencies });
    }
    return res.json({ data: out, message: 'Summon types retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch summon types', status: 'error' });
  }
};

export const getSummonTypeById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getSummonTypeById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Summon type not found', status: 'error' });
    const agencies = await complianceModel.getAgenciesByType(id);
    return res.json({ data: { ...row, agencies }, message: 'Summon type retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch summon type', status: 'error' });
  }
};

export const createSummonType = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    // avoid passing agency_ids into the DB insert for summon_type
    const payload: any = { ...data };
    if ('agency_ids' in payload) delete payload.agency_ids;
    const id = await complianceModel.createSummonType(payload);
    // if agency_ids provided, sync mappings
    if (Array.isArray(data.agency_ids) && data.agency_ids.length > 0) {
      const toAssign = data.agency_ids.map((v: any) => Number(v)).filter((v: number) => !!v);
      for (const ag of toAssign) {
        await complianceModel.createSummonTypeAgency({ agency_id: ag, type_id: id }).catch(() => { });
      }
    }
    return res.status(201).json({ data: { id }, message: 'Summon type created', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create summon type', status: 'error' });
  }
};

export const updateSummonType = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const data: any = req.body || {};
    // avoid passing agency_ids into the DB update for summon_type
    const payload: any = { ...data };
    if ('agency_ids' in payload) delete payload.agency_ids;
    await complianceModel.updateSummonType(id, payload);
    // sync agency assignments if provided (accept empty array to unassign all)
    if (Array.isArray(data.agency_ids)) {
      const desired = data.agency_ids.map((v: any) => Number(v)).filter((v: number) => !!v);
      // current mappings
      const current = await complianceModel.getSummonTypeAgenciesByType(id);
      const currentIds = current.map(c => Number(c.agency_id));
      // create missing
      for (const aid of desired) {
        if (!currentIds.includes(aid)) await complianceModel.createSummonTypeAgency({ agency_id: aid, type_id: id }).catch(() => { });
      }
      // delete extras
      for (const c of current) {
        if (!desired.includes(Number(c.agency_id))) await complianceModel.deleteSummonTypeAgency(Number(c.id)).catch(() => { });
      }
    }
    return res.json({ message: 'Updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update summon type', status: 'error' });
  }
};

export const deleteSummonType = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    await complianceModel.deleteSummonType(id);
    return res.json({ message: 'Deleted', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete summon type', status: 'error' });
  }
};

/* ====== SUMMON AGENCIES ====== */
export const getSummonAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonAgencies();
    return res.json({ data: rows, message: 'Summon agencies retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch summon agencies', status: 'error' });
  }
};

export const getSummonAgencyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getSummonAgencyById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Summon agency not found', status: 'error' });
    return res.json({ data: row, message: 'Summon agency retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch summon agency', status: 'error' });
  }
};

export const createSummonAgency = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await complianceModel.createSummonAgency(data);
    return res.status(201).json({ data: { id }, message: 'Summon agency created', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create summon agency', status: 'error' });
  }
};

export const updateSummonAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const data: any = req.body || {};
    await complianceModel.updateSummonAgency(id, data);
    return res.json({ message: 'Updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update summon agency', status: 'error' });
  }
};

export const deleteSummonAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    await complianceModel.deleteSummonAgency(id);
    return res.json({ message: 'Deleted', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete summon agency', status: 'error' });
  }
};

/* ====== SUMMON TYPE <-> AGENCY MAPPINGS ====== */
export const getSummonTypeAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonTypeAgencies();
    return res.json({ data: rows, message: 'Mappings retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch mappings', status: 'error' });
  }
};

export const getSummonTypeAgencyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getSummonTypeAgencyById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Mapping not found', status: 'error' });
    return res.json({ data: row, message: 'Mapping retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch mapping', status: 'error' });
  }
};

export const createSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await complianceModel.createSummonTypeAgency(data);
    return res.status(201).json({ data: { id }, message: 'Mapping created', status: 'success' });
  } catch (e) {
    return res.status(400).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create mapping', status: 'error' });
  }
};

export const updateSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const data: any = req.body || {};
    await complianceModel.updateSummonTypeAgency(id, data);
    return res.json({ message: 'Updated', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('exists')) return res.status(400).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update mapping', status: 'error' });
  }
};

export const deleteSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    await complianceModel.deleteSummonTypeAgency(id);
    return res.json({ message: 'Deleted', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete mapping', status: 'error' });
  }
};

// Return agencies that belong to a summon type (for chainable select)
export const getAgenciesByType = async (req: Request, res: Response) => {
  try {
    const typeId = Number(req.params.typeId || req.query.typeId);
    if (!typeId) return res.status(400).json({ message: 'Invalid type id', status: 'error' });
    const rows = await complianceModel.getAgenciesByType(typeId);
    return res.json({ data: rows, message: 'Agencies retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch agencies by type', status: 'error' });
  }
};

// Return all types with their assigned agencies (for initial load)
export const getSummonTypesWithAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonTypesWithAgencies();
    return res.json({ data: rows, message: 'Types with agencies retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch types with agencies', status: 'error' });
  }
};


/* ========== ASSESSMENT CRITERIA CONTROLLERS ========== */
export const getAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    // Accept optional query params: ?status=active|inactive and ?type={type}
    const statusParam = typeof req.query.status === 'string' ? String(req.query.status).trim().toLowerCase() : undefined;
    const typeParam = typeof req.query.type === 'string' ? String(req.query.type).trim() : undefined;
    const ownershipParamRaw = typeof req.query.ownership === 'string' ? String(req.query.ownership).trim() : undefined;
    const ownershipParam = ownershipParamRaw !== undefined && ownershipParamRaw !== '' && !Number.isNaN(Number(ownershipParamRaw))
      ? Number(ownershipParamRaw)
      : undefined;

    // Validate status if provided
    if (statusParam !== undefined && statusParam !== '' && !['0', '1', 'active', 'inactive'].includes(statusParam)) {
      return res.status(400).json({ data: null, message: 'Invalid status filter. Use active or inactive', status: 'error' });
    }

  const rows = await complianceModel.getAssessmentCriteria();

    // If no filters, return raw rows
    if ((!statusParam || String(statusParam).trim() === '') && (!typeParam || String(typeParam).trim() === '') && (ownershipParam === undefined)) {
      const count = Array.isArray(rows) ? rows.length : 0;
      return res.json({ data: rows, message: `Assessment criteria retrieved (${count})`, status: 'success' });
    }

    // Helper to interpret qset_stat values flexibly
    const statusMatches = (rowStat: any, wanted: string) => {
      if (wanted === undefined || wanted === '') return true;
      const s = String(rowStat ?? '').toLowerCase();
      if (wanted === 'active' || wanted === '1') {
        return s === 'active' || s === '1' || s === 'a' || s === 'y' || s === 'yes' || s === 'enabled';
      }
      if (wanted === 'inactive' || wanted === '0') {
        return s === 'inactive' || s === '0' || s === 'i' || s === 'n' || s === 'no' || s === 'disabled';
      }
      return s === wanted;
    };

    // Helper to match type: be permissive about field name (qset_type, type, qset_for)
    const typeMatches = (row: any, wanted: string) => {
      if (wanted === undefined || wanted === '') return true;
      const candidates = [row.qset_type, row.type, row.qset_for, row.qset_id, row.qset_quesno];
      for (const c of candidates) {
        if (c === undefined || c === null) continue;
        if (String(c) === wanted) return true;
        // numeric compare
        if (!isNaN(Number(wanted)) && Number(c) === Number(wanted)) return true;
      }
      return false;
    };

    const filtered = (rows || []).filter((r: any) => {
      const okStatus = statusParam ? statusMatches(r.qset_stat, statusParam) : true;
      const okType = typeParam ? typeMatches(r, typeParam) : true;
      const okOwnership = ownershipParam !== undefined
        ? (r.ownership !== undefined && r.ownership !== null && Number(r.ownership) === Number(ownershipParam))
        : true;
      return okStatus && okType && okOwnership;
    });

  const count = Array.isArray(filtered) ? filtered.length : 0;
  return res.json({ data: filtered, message: `Assessment criteria retrieved (${count})`, status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria', status: 'error' });
  }
};

export const getAssessmentCriteriaById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getAssessmentCriteriaById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Assessment criteria not found', status: 'error' });
    return res.json({ data: row, message: 'Assessment criteria retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria', status: 'error' });
  }
};

export const createAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const qset_id = await complianceModel.createAssessmentCriteria(data);
    return res.status(201).json({ data: { qset_id }, message: 'Assessment criteria created', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create assessment criteria', status: 'error' });
  }
};

export const updateAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const data: any = req.body || {};
    await complianceModel.updateAssessmentCriteria(id, data);
    return res.json({ message: 'Updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update assessment criteria', status: 'error' });
  }
};

export const deleteAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    await complianceModel.deleteAssessmentCriteria(id);
    return res.json({ message: 'Deleted', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete assessment criteria', status: 'error' });
  }
};

export const reorderAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const qset_id = Number(req.params.id);
    if (!qset_id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const newOrderRaw = req.body && (req.body.qset_order ?? req.body.newOrder ?? req.body.order);
    if (newOrderRaw === undefined || newOrderRaw === null) return res.status(400).json({ message: 'new qset_order is required', status: 'error' });
    const newOrder = Number(newOrderRaw);
    if (!Number.isFinite(newOrder) || newOrder < 1) return res.status(400).json({ message: 'Invalid new qset_order', status: 'error' });

    await complianceModel.reorderAssessmentCriteria(qset_id, newOrder);
    return res.json({ message: 'Reordered', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to reorder assessment criteria', status: 'error' });
  }
};


// ========== ASSESSMENT CRITERIA OWNERSHIP ==========
// GET /assessments/criteria/ownerships -> list all ownerships
export const getAssessmentCriteriaOwnerships = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getAssessmentCriteriaOwnerships();
    return res.json({ data: rows, message: `Assessment criteria ownerships retrieved (${rows.length})`, status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria ownerships', status: 'error' });
  }
};

//get by id
export const getAssessmentCriteriaOwnershipById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getAssessmentCriteriaOwnershipById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Assessment criteria ownership not found', status: 'error' });
    return res.json({ data: row, message: 'Assessment criteria ownership retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria ownership', status: 'error' });
  }
};

//add a new ownership member
export const createAssessmentCriteriaOwnership = async (req: Request, res: Response) => {
  try {
    const { department_id, ramco_id, status } = req.body || {};
    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ data: null, message: 'Invalid status value', status: 'error' });
    }
    // Store status as string
    await complianceModel.createAssessmentCriteriaOwnership({ department_id, ramco_id, status });
    return res.status(201).json({ data: { department_id, ramco_id, status }, message: 'Assessment criteria ownership created', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create assessment criteria ownership', status: 'error' });
  }
};

// PUT /assessments/criteria/:id/ownership -> set ownership for a single criteria
export const updateAssessmentCriteriaOwnership = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
    const { ownership, status } = req.body || {};
    if (ownership !== null && (ownership === undefined || Number.isNaN(Number(ownership)))) {
      return res.status(400).json({ data: null, message: 'Invalid ownership value', status: 'error' });
    }
    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ data: null, message: 'Invalid status value', status: 'error' });
    }
    await complianceModel.updateAssessmentCriteria(id, { ownership, qset_stat: status } as any);
    return res.json({ data: null, message: 'Ownership and status updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update ownership', status: 'error' });
  }
};

//delete ownership
export const deleteAssessmentCriteriaOwnership = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
    // Check if ownership exists in any criteria
    const rows = await complianceModel.getAssessmentCriteria();
    const ownerships = Array.from(new Set(rows.map((r: any) => r.ownership).filter(Boolean)));
    if (!ownerships.includes(id)) {
      return res.status(404).json({ data: null, message: 'Ownership not found', status: 'error' });
    }
  // Remove ownership from all criteria that have it
    for (const r of rows) {
      if (r.ownership === id) {
        // ensure qset_id is a valid number before calling the model
        const qsetId = (r.qset_id !== undefined && r.qset_id !== null) ? Number(r.qset_id) : NaN;
        if (!Number.isFinite(qsetId) || qsetId <= 0) continue;
        await complianceModel.updateAssessmentCriteria(qsetId, { ownership: null } as any);
      }
    }
    return res.json({ data: null, message: 'Ownership deleted from all criteria', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete ownership', status: 'error' });
  }
}

/* ========== ASSESSMENTS (parent) CONTROLLERS ========== */
export const getAssessments = async (req: Request, res: Response) => {
  try {
    // Parse optional year, asset, and owner filter from query params
    const yearParam = req.query.year as string;
    const assetParam = req.query.asset as string;
    const ownerParam = req.query.owner as string;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const asset = assetParam ? parseInt(assetParam, 10) : undefined;
    const owner = ownerParam ? String(ownerParam).trim() : undefined;

    // Validate year if provided
    if (yearParam && (isNaN(year!) || year! < 1900 || year! > new Date().getFullYear() + 10)) {
      return res.status(400).json({
        data: null,
        message: 'Invalid year parameter. Must be between 1900 and current year + 10.',
        status: 'error'
      });
    }

    // Validate asset_id if provided
    if (assetParam && isNaN(asset!)) {
      return res.status(400).json({
        data: null,
        message: 'Invalid asset parameter. Must be a valid number.',
        status: 'error'
      });
    }

    // Fetch assessments with NCR details
    const rows = await complianceModel.getAssessmentsWithNCRDetails(year, asset);

    // enrich asset_id into full asset object (reuse same enrichment pattern as summons)
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];

    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    const data = (rows || []).map((r: any) => {
      let asset = null;
      let ownerRamcoForFilter = null;
      
      if (r.asset_id && assetMap.has(r.asset_id)) {
        const a = assetMap.get(r.asset_id);
        // compute purchase_date and age if available
        const purchase_date = a.purchase_date || a.pur_date || a.purchaseDate || null;
        let age: null | number = null;
        if (purchase_date) {
          const pd = new Date(String(purchase_date));
          if (!isNaN(pd.getTime())) {
            const diffMs = Date.now() - pd.getTime();
            age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
          }
        }
        const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
        ownerRamcoForFilter = ownerRamco; // Store for filtering
        const ownerData = ownerRamco && employeeMap.has(ownerRamco) ? { full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null, ramco_id: ownerRamco } : null;
        asset = {
          age,
          costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
          id: r.asset_id,
          location: (() => {
            const locId = a.location_id ?? a.location?.id ?? null;
            if (!locId) return null;
            const found = locationMap.get(locId);
            return found ? { code: found.code || found.name || null, id: locId } : null;
          })(),
          owner: ownerData,
          purchase_date,
          register_number: a.register_number || a.vehicle_regno || null
        };
      }
      // omit reg_no, vehicle_id, asset_id, a_loc, ownership, loc_id, location_id from response (these are internal identifiers)
      const { a_loc, asset_id, loc_id, location_id, ownership, reg_no, vehicle_id, ncr_details, ...clean } = r;
      // attach assessed_location resolved from location_id (if present)
      const assessed_location = (r.location_id && locationMap.has(r.location_id)) ? (() => {
        const l = locationMap.get(r.location_id);
        return { code: l.code || l.name || null, id: r.location_id };
      })() : null;
      
      // Transform ncr_details: remove internal fields and map status
      const formattedNcrDetails = (ncr_details || []).map((detail: any) => {
        const { created_at, updated_at, vehicle_id: vid, assess_id: aid, ...ncrClean } = detail;
        return {
          ...ncrClean,
          is_closed: detail.ncr_status !== null && detail.ncr_status !== 'open'
        };
      });
      
      // Convert upload paths to full public URLs
      return { 
        ...clean, 
        // Convert attachment fields to full URLs
        a_upload: toPublicUrl(clean.a_upload), 
        a_upload2: toPublicUrl(clean.a_upload2),
        a_upload3: toPublicUrl(clean.a_upload3),
        a_upload4: toPublicUrl(clean.a_upload4),
        assessed_location,
        asset,
        ncr_details: formattedNcrDetails,
        _ownerRamco: ownerRamcoForFilter, // Internal field for filtering
      };
    }).filter(item => {
      // Apply owner filter if provided
      if (owner && item._ownerRamco !== owner) {
        return false;
      }
      return true;
    }).map(item => {
      // Remove internal filter field before returning
      const { _ownerRamco, ...finalItem } = item;
      return finalItem;
    });

    return res.json({ data, message: 'Assessments retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessments', status: 'error' });
  }
};

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getAssessmentById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Assessment not found', status: 'error' });
    // also fetch child details and include them
    const details = await complianceModel.getAssessmentDetails(id).catch(() => []);

    // load assessment criteria to resolve adt_item (qset_id) -> qset_desc
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    for (const c of criteria) if (c?.qset_id) qsetMap.set(Number(c.qset_id), c.qset_desc || null);

    // enrich asset_id into full asset object (reuse same enrichment pattern as other endpoints)
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);
    const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];
    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    let asset = null;
    if ((row as any).asset_id && assetMap.has((row as any).asset_id)) {
      const a = assetMap.get((row as any).asset_id);
      // compute purchase_date and age if available
      const purchase_date = a.purchase_date || a.pur_date || a.purchaseDate || null;
      let age: null | number = null;
      if (purchase_date) {
        const pd = new Date(String(purchase_date));
        if (!isNaN(pd.getTime())) {
          const diffMs = Date.now() - pd.getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
        }
      }
      const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
      const owner = ownerRamco && employeeMap.has(ownerRamco) ? { full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null, ramco_id: ownerRamco } : null;
      asset = {
        age,
        costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
        id: (row as any).asset_id,
        location: (() => {
          const locId = a.location_id ?? a.location?.id ?? null;
          if (!locId) return null;
          const found = locationMap.get(locId);
          return found ? { code: found.code || found.name || null, id: locId } : null;
        })(),
        owner,
        purchase_date,
        register_number: a.register_number || a.vehicle_regno || null
      };
    }

    // attach qset_desc to each detail (if available)
    const enrichedDetails = (Array.isArray(details) ? details : []).map((d: any) => {
      const qid = d?.adt_item ? Number(d.adt_item) : null;
      const qset_desc = qid && qsetMap.has(qid) ? qsetMap.get(qid) : null;
      const qset_type = qid && qsetMap.has(qid) ? ((criteria.find((c: any) => Number(c.qset_id) === qid) || {}).qset_type || null) : null;
      // remove internal ids from detail response
      const { asset_id, vehicle_id, ...rest } = d || {};
      return { 
        ...rest, 
        // Convert detail image URL to full path
        adt_image: toPublicUrl(rest.adt_image), 
        qset_desc,
        qset_type
      };
    });

    // omit internal fields before returning
    const { a_loc, asset_id, loc_id, location_id, ownership, reg_no, vehicle_id, ...cleanRow } = row as any;
    const assessment_location = ((row as any).location_id && locationMap.has((row as any).location_id)) ? (() => {
      const l = locationMap.get((row as any).location_id);
      return { code: l.code || l.name || null, id: (row as any).location_id };
    })() : null;

    // Convert upload paths to full public URLs
    const responseData = {
      ...cleanRow,
      // Convert attachment fields to full URLs
      a_upload: toPublicUrl(cleanRow.a_upload),
      a_upload2: toPublicUrl(cleanRow.a_upload2),
      a_upload3: toPublicUrl(cleanRow.a_upload3),
      a_upload4: toPublicUrl(cleanRow.a_upload4),
      assessment_location,
      asset,
      details: enrichedDetails,
    };

    return res.json({ data: responseData, message: 'Assessment retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment', status: 'error' });
  }
};

export const createAssessment = async (req: Request, res: Response) => {
  try {
    // We expect multipart/form-data with files in req.files and JSON fields in req.body
    const body: any = req.body || {};

    // Parse details from multiple possible encodings to be robust to form encoders
    let details: any[] = [];
    if (body.details !== undefined) {
      try {
        if (typeof body.details === 'string') {
          const parsed = JSON.parse(body.details);
          if (Array.isArray(parsed)) details = parsed;
        } else if (Array.isArray(body.details)) {
          details = body.details as any[];
        } else if (body.details && typeof body.details === 'object') {
          // Handle object with numeric keys: { '0': {...}, '1': {...} }
          const keys = Object.keys(body.details).filter(k => /^\d+$/.test(k)).sort((a,b)=>Number(a)-Number(b));
          if (keys.length > 0) {
            details = keys.map(k => (body.details)[k]);
          }
        }
      } catch (err) {
        // Ignore JSON parse errors; we will try indexed key parsing below
      }
    }
    if (!Array.isArray(details) || details.length === 0) {
      // Fallback: parse bracketed/indexed keys e.g. details[0][field], details[0].field, details.0.field
      const indexedMap = new Map<number, any>();
      const keyPatterns: RegExp[] = [
        /^details\[(\d+)\]\[([^\]]+)\]$/,
        /^details\[(\d+)\]\.([^.]+)$/,
        /^details\.(\d+)\.([^.]+)$/
      ];
      for (const [k, vRaw] of Object.entries(body)) {
        let idx: null | number = null;
        let field: null | string = null;
        for (const re of keyPatterns) {
          const m = re.exec(k);
          if (m) { idx = Number(m[1]); field = m[2]; break; }
        }
        if (idx === null || field === null) continue;
        if (!indexedMap.has(idx)) indexedMap.set(idx, {});
        const val = vRaw as any;
        if (['adt_item', 'adt_ncr', 'adt_rate2', 'vehicle_id'].includes(field)) {
          const num = Number(val);
          (indexedMap.get(idx))[field] = isNaN(num) ? null : num;
        } else {
          (indexedMap.get(idx))[field] = val;
        }
      }
      if (indexedMap.size > 0) {
        const maxIdx = Math.max(...Array.from(indexedMap.keys()));
        const arr: any[] = [];
        for (let i = 0; i <= maxIdx; i++) if (indexedMap.has(i)) arr.push(indexedMap.get(i));
        details = arr;
      } else {
        details = [];
      }
    }

    // Prepare parent payload: allow known assessment fields to be set via form fields
    const payload: any = { ...body };
    // Remove details from payload
    delete payload.details;

    // create parent assessment first to get assess_id
    const assessId = await complianceModel.createAssessment(payload);

    // Files array from multer (uploadAssessment.any())
    const files: Express.Multer.File[] = Array.isArray((req as any).files) ? (req as any).files as Express.Multer.File[] : [];

    // Helper maps: originalname -> file, and fieldname -> files[]
    const filesByOriginal = new Map<string, Express.Multer.File[]>();
    const filesByField = new Map<string, Express.Multer.File[]>();
    for (const f of files) {
      const on = f.originalname || '';
      if (!filesByOriginal.has(on)) filesByOriginal.set(on, []);
      filesByOriginal.get(on)!.push(f);
      const fn = f.fieldname || '';
      if (!filesByField.has(fn)) filesByField.set(fn, []);
      filesByField.get(fn)!.push(f);
    }

    // Move vehicle images into storage and set up to 4 upload columns: a_upload..a_upload4
    // Frontend now sends field names: a_upload, a_upload2, a_upload3, a_upload4
    const vehicleFiles = ['a_upload', 'a_upload2', 'a_upload3', 'a_upload4'];
    const parentUpdate: any = {};

    for (let i = 0; i < vehicleFiles.length; i++) {
      const fieldName = vehicleFiles[i];
      const fileArray = filesByField.get(fieldName);

      if (fileArray && fileArray.length > 0) {
        const f = fileArray[0]; // Take first file if multiple
        try {
          const tempPath = f.path;
          const ext = path.extname(f.originalname || tempPath) || '';
          const filename = `assessment-${assessId}-${fieldName}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          const base = await getUploadBase();
          const destDir = path.join(base, 'compliance', 'assessment');
          await fsPromises.mkdir(destDir, { recursive: true });
          const destPath = path.join(destDir, filename);
          await safeMove(tempPath, destPath);
          const stored = path.posix.join('uploads', 'compliance', 'assessment', filename);
          parentUpdate[fieldName] = stored;
        } catch (err) {
          console.error(`Failed to process file for ${fieldName}:`, err);
          // Continue processing others; skip failures
        }
      }
    }

    // Update parent assessment with file paths
    if (Object.keys(parentUpdate).length > 0) {
      await complianceModel.updateAssessment(assessId, parentUpdate);
    }

    // Insert details: for each detail, try to find a file using these strategies in order:
  // 1) Dedicated field per index: adt_image_<index>
  // 2) Array-style fields: adt_image or adt_images (take i-th element)
  // 3) Original name equals provided d.adt_image (when frontend supplies reference filename)
  // 4) Generic fallback: detail_<index>_image
  // NOTE: Previous implementation reused the same 'adt_image' collection for all rows causing
  // index misalignment when the client sent multiple files; also relying on originalname often
  // failed because multer's storage renames files. We now use fieldname-based matching only
  // and only fall back to originalname if the client explicitly provided one in d.adt_image.

    // Pre-extract possible array style fields
    const adtImageArray = filesByField.get('adt_image') || filesByField.get('adt_images') || [];

    // Helper to persist a temp file and return stored relative path
    const persistDetailFile = async (file: Express.Multer.File, index: number, adtItem?: any): Promise<null | string> => {
      try {
        const tempPath = file.path;
        const ext = path.extname(file.originalname || tempPath) || '';
        const safeItem = adtItem !== undefined && adtItem !== null ? String(adtItem).replace(/[^a-zA-Z0-9_-]+/g, '').slice(0,40) : 'item';
        const filename = `assess-${assessId}-idx${index}-itm${safeItem}-${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`;
        const base = await getUploadBase();
        // Store inside nested folder by assess_id for easier traceability
        const destDir = path.join(base, 'compliance', 'assessment', String(assessId));
        await fsPromises.mkdir(destDir, { recursive: true });
        const destPath = path.join(destDir, filename);
        await safeMove(tempPath, destPath);
        return path.posix.join('uploads', 'compliance', 'assessment', String(assessId), filename);
      } catch (err) {
        console.error('persistDetailFile error:', err);
        return null;
      }
    };

    for (let i = 0; i < details.length; i++) {
      const d = { ...details[i] };
      d.assess_id = assessId;
      let attachedPath: null | string = null;

      // Strategy 0: bracket/dot-nested fieldnames e.g. details[0][adt_image]
      if (!attachedPath) {
        const bracket = filesByField.get(`details[${i}][adt_image]`);
        const dot = filesByField.get(`details.${i}.adt_image`);
        const mixed = filesByField.get(`details[${i}].adt_image`);
        const nested = bracket || dot || mixed;
        if (nested && nested.length > 0) {
          attachedPath = await persistDetailFile(nested[0], i, d.adt_item);
        }
      }

      // Strategy 1: adt_image_<index>
      if (!attachedPath) {
        const specific = filesByField.get(`adt_image_${i}`);
        if (specific && specific.length > 0) {
          attachedPath = await persistDetailFile(specific[0], i, d.adt_item);
        }
      }

      // Strategy 2: array style field (same index)
      if (!attachedPath && adtImageArray.length > 0) {
        const sel = adtImageArray[i] || null;
        if (sel) attachedPath = await persistDetailFile(sel, i, d.adt_item);
      }

      // Strategy 3: originalname equals provided d.adt_image (legacy behavior)
      if (!attachedPath && d.adt_image) {
        const matches = filesByOriginal.get(String(d.adt_image)) || [];
        if (matches.length > 0) {
          attachedPath = await persistDetailFile(matches[0], i, d.adt_item);
        }
      }

      // Strategy 4: generic fallback field detail_<index>_image
      if (!attachedPath) {
        const generic = filesByField.get(`detail_${i}_image`);
        if (generic && generic.length > 0) {
          attachedPath = await persistDetailFile(generic[0], i, d.adt_item);
        }
      }

      if (attachedPath) {
        d.adt_image = attachedPath;
      } else {
        // If frontend supplied a string path (already uploaded) keep it, else null
        if (typeof d.adt_image !== 'string' || d.adt_image.trim() === '') {
          delete d.adt_image; // avoid inserting empty placeholder
        }
      }

      await complianceModel.createAssessmentDetail(d);
    }

    // Fire-and-forget: send assessment notification email to driver/owner if possible
    (async () => {
      try {
        const assess = await complianceModel.getAssessmentById(assessId);
        if (!assess) return;
        const assetId = Number((assess as any).asset_id) || null;
        let asset: any = null;
        if (assetId) asset = await assetModel.getAssetById(assetId).catch(() => null);
        // find driver from asset.ramco_id if available
        const ramco = asset && (asset.ramco_id || asset.owner_ramco_id || asset.assigned_driver);
        let driver: any = null;
        if (ramco) driver = await assetModel.getEmployeeByRamco(String(ramco)).catch(() => null);

        const toEmail = (driver && (driver.email || driver.contact)) || null;
        if (!toEmail) return;

        // Get supervisor information for CC
        const supervisor = driver?.ramco_id ? await getSupervisorBySubordinate(driver.ramco_id) : null;
        const supervisorEmail = supervisor?.email || null;

        // Generate 6-digit security PIN for portal access
        const generateSecurityPin = (ramcoId: string, assessmentId: number): string => {
          // Create a consistent 6-digit PIN based on ramco_id and assessment_id
          const combined = `${ramcoId}${assessmentId}`;
          let hash = 0;
          for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          // Ensure positive number and convert to 6 digits
          const pin = Math.abs(hash).toString().padStart(6, '0').slice(-6);
          return pin;
        };

        const securityPin = generateSecurityPin(driver?.ramco_id || '', assessId);
        const portalCode = `${driver?.ramco_id || ''}${securityPin}`;
        const frontendUrl = process.env.FRONTEND_URL || 'https://your-frontend-url';
        const portalLink = `${frontendUrl}/compliance/assessment/portal/${assetId}?code=${portalCode}`;

        // Build template data
        const assessmentDate = (assess as any).a_date || (assess as any).a_dt || null;
        const { html, subject, text } = renderVehicleAssessmentNotification({
          assessment: { date: String(assessmentDate || ''), id: assessId, ncr: (assess as any).a_ncr, rate: (assess as any).a_rate, remark: (assess as any).a_remark },
          asset: { code: asset?.register_number || asset?.asset_code || String(assetId), id: asset?.id || assetId, name: asset?.model_name, ramco_id: asset?.ramco_id },
          details: [],
          driver: { email: toEmail, full_name: driver?.full_name || driver?.name || '', ramco_id: driver?.ramco_id || '' },
          portalLink,
          securityPin,
        });

        // Prepare attachments (up to four parent uploads)
        const basePath = (process.env.UPLOAD_BASE_PATH || process.env.STATIC_UPLOAD_PATH || '').trim();
        const attachPaths: string[] = [
          (assess as any).a_upload,
          (assess as any).a_upload2,
          (assess as any).a_upload3,
          (assess as any).a_upload4,
        ].filter(Boolean);
        const attachments = attachPaths.map((p: string) => {
          const filename = path.basename(p.replace(/^uploads\//, ''));
          // If basePath exists, attach file via absolute path; else, skip attaching and rely on links in email body
          const absPath = basePath ? path.join(basePath, p.replace(/^uploads\//, '')) : undefined;
          return absPath ? { filename, path: absPath } : null;
        }).filter(Boolean) as { filename: string; path: string }[];

        try {
          await sendMail(toEmail, subject, html, { 
            attachments, 
            cc: supervisorEmail || undefined,
            text
          });
        } catch (mailErr) {
          console.error('createAssessment: mail send error', mailErr);
        }
      } catch (e) {
        // ignore email errors
      }
    })();

    return res.status(201).json({ data: { id: assessId }, message: 'Assessment created', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create assessment', status: 'error' });
  }
};

export const updateAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const data: any = req.body || {};
    await complianceModel.updateAssessment(id, data);
    return res.json({ message: 'Updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update assessment', status: 'error' });
  }
};

export const deleteAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    await complianceModel.deleteAssessment(id);
    return res.json({ message: 'Deleted', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete assessment', status: 'error' });
  }
};

// PUT /api/compliance/assessments/:id/acceptance
export const acceptAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid assessment id', status: 'error' });
    const { acceptance_status } = req.body;
    if (![1, 2].includes(Number(acceptance_status))) {
      return res.status(400).json({ message: 'Invalid acceptance_status (must be 1 or 2)', status: 'error' });
    }
    const acceptance_date = new Date();
    await complianceModel.updateAssessmentAcceptance(id, Number(acceptance_status), acceptance_date);
    return res.json({ message: 'Assessment acceptance updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update acceptance', status: 'error' });
  }
};

/* ========== ASSESSMENT DETAILS (child) CONTROLLERS ========== */
export const getAssessmentDetails = async (req: Request, res: Response) => {
  try {
    const assess_id = Number(req.params.assessId || req.query.assess_id || req.query.assessId);
    if (!assess_id) return res.status(400).json({ message: 'Invalid assess_id', status: 'error' });
    const rows = await complianceModel.getAssessmentDetails(assess_id);
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    for (const c of criteria) if (c?.qset_id) qsetMap.set(Number(c.qset_id), c.qset_desc || null);
    const enriched = (Array.isArray(rows) ? rows : []).map((r: any) => {
      const qid = r?.adt_item ? Number(r.adt_item) : null;
      const qset_desc = qid && qsetMap.has(qid) ? qsetMap.get(qid) : null;
      const qset_type = qid && qsetMap.has(qid) ? ((criteria.find((c: any) => Number(c.qset_id) === qid) || {}).qset_type || null) : null;
      const { asset_id, vehicle_id, ...rest } = r || {};
      return { ...rest, qset_desc, qset_type };
    });
    return res.json({ data: enriched, message: 'Assessment details retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment details', status: 'error' });
  }
};

export const getAssessmentDetailById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const row = await complianceModel.getAssessmentDetailById(id);
    if (!row) return res.status(404).json({ data: null, message: 'Assessment detail not found', status: 'error' });
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    for (const c of criteria) if (c?.qset_id) qsetMap.set(Number(c.qset_id), c.qset_desc || null);
    const qid = row && (row as any).adt_item ? Number((row as any).adt_item) : null;
    const qset_desc = qid && qsetMap.has(qid) ? qsetMap.get(qid) : null;
    const qset_type = qid && qsetMap.has(qid) ? ((criteria.find((c: any) => Number(c.qset_id) === qid) || {}).qset_type || null) : null;
    const { asset_id, vehicle_id, ...rest } = (row as any) || {};
    return res.json({ data: { ...rest, qset_desc, qset_type }, message: 'Assessment detail retrieved', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to fetch assessment detail', status: 'error' });
  }
};

export const createAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await complianceModel.createAssessmentDetail(data);
    return res.status(201).json({ data: { id }, message: 'Assessment detail created', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to create assessment detail', status: 'error' });
  }
};

export const updateAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    const data: any = req.body || {};
    await complianceModel.updateAssessmentDetail(id, data);
    return res.json({ message: 'Updated', status: 'success' });
  } catch (e) {
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to update assessment detail', status: 'error' });
  }
};

export const deleteAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id', status: 'error' });
    await complianceModel.deleteAssessmentDetail(id);
    return res.json({ message: 'Deleted', status: 'success' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ data: null, message: e.message, status: 'error' });
    return res.status(500).json({ data: null, message: e instanceof Error ? e.message : 'Failed to delete assessment detail', status: 'error' });
  }
};

export const closeNCRItem = async (req: Request, res: Response) => {
  try {
    const assessId = Number(req.params.assess_id);
    const adtId = Number(req.params.adt_id);
    
    if (!assessId || !adtId) {
      return res.status(400).json({
        status: 'error',
        message: 'Assessment ID and NCR detail ID are required',
        data: null,
      });
    }
    
    const { ncr_status, closed_at, action, svc_order } = req.body;
    
    if (!ncr_status || !closed_at || !action || svc_order === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'ncr_status, closed_at, action, and svc_order are required',
        data: null,
      });
    }
    
    // Update the NCR item
    const affectedRows = await complianceModel.closeNCRItem(adtId, {
      ncr_status,
      closed_at,
      action,
      svc_order,
    });
    
    return res.json({
      status: 'success',
      message: 'NCR item closed successfully',
      data: {
        adt_id: adtId,
        assess_id: assessId,
        ncr_status,
        closed_at,
        action,
        svc_order,
        updated_rows: affectedRows,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) {
      return res.status(404).json({
        status: 'error',
        message: e.message,
        data: null,
      });
    }
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to close NCR item',
      data: null,
    });
  }
};

// GET /api/compliance/assessments/details?asset={asset_id}&year={year}
export const getAssessmentDetailsByAssetAndYear = async (req: Request, res: Response) => {
  try {
    const assetParam = req.query.asset as string;
    const yearParam = req.query.year as string;

    if (!assetParam) {
      return res.status(400).json({ data: null, message: 'asset parameter is required', status: 'error' });
    }

    const asset_id = parseInt(assetParam, 10);
    if (isNaN(asset_id)) {
      return res.status(400).json({ data: null, message: 'Invalid asset parameter', status: 'error' });
    }

    if (!yearParam) {
      return res.status(400).json({ data: null, message: 'year parameter is required', status: 'error' });
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
      return res.status(400).json({ data: null, message: 'Invalid year parameter', status: 'error' });
    }

    const assessments = await complianceModel.getAssessmentDetailsByAssetAndYear(asset_id, year);

    // Enrich with asset data
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];

    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    // Enrich with criteria descriptions
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, any>();
    for (const c of criteria) {
      if (c?.qset_id) {
        qsetMap.set(Number(c.qset_id), { 
          qset_desc: c.qset_desc || null,
          qset_type: c.qset_type || null
        });
      }
    }

    // Enrich details with criteria descriptions and convert URLs
    const enrichedData = assessments.map((assessment: any) => {
      const enrichedDetails = (assessment.details || []).map((d: any) => {
        const qid = d?.adt_item ? Number(d.adt_item) : null;
        const qset_info = qid && qsetMap.has(qid) ? qsetMap.get(qid) : { qset_desc: null, qset_type: null };
        const { asset_id, vehicle_id, ...rest } = d || {};
        return { 
          ...rest, 
          adt_image: toPublicUrl(rest.adt_image),
          qset_desc: qset_info.qset_desc,
          qset_type: qset_info.qset_type
        };
      });

      const { a_loc, asset_id: aid, details, loc_id, location_id, ownership, reg_no, vehicle_id, ...cleanAssessment } = assessment;
      
      // Build asset object
      let asset = null;
      if (aid && assetMap.has(aid)) {
        const a = assetMap.get(aid);
        const purchase_date = a.purchase_date || a.pur_date || a.purchaseDate || null;
        let age: null | number = null;
        if (purchase_date) {
          const pd = new Date(String(purchase_date));
          if (!isNaN(pd.getTime())) {
            const diffMs = Date.now() - pd.getTime();
            age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
          }
        }
        const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
        const owner = ownerRamco && employeeMap.has(ownerRamco) ? { full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null, ramco_id: ownerRamco } : null;
        asset = {
          age,
          costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
          id: aid,
          location: (() => {
            const locId = a.location_id ?? a.location?.id ?? null;
            if (!locId) return null;
            const found = locationMap.get(locId);
            return found ? { code: found.code || found.name || null, id: locId } : null;
          })(),
          owner,
          purchase_date,
          register_number: a.register_number || a.vehicle_regno || null
        };
      }

      // Build assessed_location
      const assessed_location = location_id && locationMap.has(location_id) 
        ? { code: locationMap.get(location_id).code || locationMap.get(location_id).name || null, id: location_id }
        : null;

      return {
        ...cleanAssessment,
        a_upload: toPublicUrl(cleanAssessment.a_upload),
        a_upload2: toPublicUrl(cleanAssessment.a_upload2),
        a_upload3: toPublicUrl(cleanAssessment.a_upload3),
        a_upload4: toPublicUrl(cleanAssessment.a_upload4),
        assessed_location,
        asset,
        details: enrichedDetails,
      };
    });

    return res.json({ 
      data: enrichedData, 
      message: `${enrichedData.length} assessment(s) retrieved`, 
      status: 'success' 
    });
  } catch (e) {
    return res.status(500).json({ 
      data: null, 
      message: e instanceof Error ? e.message : 'Failed to fetch assessment details', 
      status: 'error' 
    });
  }
};

// GET /api/compliance/assessments/details/ncr?asset={asset_id}&year={year}
export const getAssessmentNCRDetailsByAsset = async (req: Request, res: Response) => {
  try {
    const assetParam = req.query.asset as string;
    const yearParam = req.query.year as string;

    if (!assetParam) {
      return res.status(400).json({ data: null, message: 'asset parameter is required', status: 'error' });
    }

    const asset_id = parseInt(assetParam, 10);
    if (isNaN(asset_id)) {
      return res.status(400).json({ data: null, message: 'Invalid asset parameter', status: 'error' });
    }

    if (!yearParam) {
      return res.status(400).json({ data: null, message: 'year parameter is required', status: 'error' });
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
      return res.status(400).json({ data: null, message: 'Invalid year parameter', status: 'error' });
    }

    const assessments = await complianceModel.getAssessmentNCRDetailsByAsset(asset_id, year);

    // Enrich with asset data
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    const assets = Array.isArray(assetsRaw) ? (assetsRaw) : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];

    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    // Enrich with criteria descriptions
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, any>();
    for (const c of criteria) {
      if (c?.qset_id) {
        qsetMap.set(Number(c.qset_id), { 
          qset_desc: c.qset_desc || null,
          qset_type: c.qset_type || null
        });
      }
    }

    // Enrich details with criteria descriptions and convert URLs
    const enrichedData = assessments.map((assessment: any) => {
      // Filter out closed NCR items - only show open ones
      const enrichedDetails = (assessment.details || [])
        .filter((d: any) => !d.ncr_status || d.ncr_status !== 'closed')
        .map((d: any) => {
          const qid = d?.adt_item ? Number(d.adt_item) : null;
          const qset_info = qid && qsetMap.has(qid) ? qsetMap.get(qid) : { qset_desc: null, qset_type: null };
          const { asset_id, vehicle_id, ...rest } = d || {};
          return { 
            ...rest, 
            adt_image: toPublicUrl(rest.adt_image),
            qset_desc: qset_info.qset_desc,
            qset_type: qset_info.qset_type
          };
        });

      const { a_loc, asset_id: aid, details, loc_id, location_id, ownership, reg_no, vehicle_id, ...cleanAssessment } = assessment;
      
      // Build asset object
      let asset = null;
      if (aid && assetMap.has(aid)) {
        const a = assetMap.get(aid);
        const purchase_date = a.purchase_date || a.pur_date || a.purchaseDate || null;
        let age: null | number = null;
        if (purchase_date) {
          const pd = new Date(String(purchase_date));
          if (!isNaN(pd.getTime())) {
            const diffMs = Date.now() - pd.getTime();
            age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
          }
        }
        const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
        const owner = ownerRamco && employeeMap.has(ownerRamco) ? { full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null, ramco_id: ownerRamco } : null;
        asset = {
          age,
          costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
          id: aid,
          location: (() => {
            const locId = a.location_id ?? a.location?.id ?? null;
            if (!locId) return null;
            const found = locationMap.get(locId);
            return found ? { code: found.code || found.name || null, id: locId } : null;
          })(),
          owner,
          purchase_date,
          register_number: a.register_number || a.vehicle_regno || null
        };
      }

      // Build assessed_location
      const assessed_location = location_id && locationMap.has(location_id) 
        ? { code: locationMap.get(location_id).code || locationMap.get(location_id).name || null, id: location_id }
        : null;

      return {
        ...cleanAssessment,
        a_upload: toPublicUrl(cleanAssessment.a_upload),
        a_upload2: toPublicUrl(cleanAssessment.a_upload2),
        a_upload3: toPublicUrl(cleanAssessment.a_upload3),
        a_upload4: toPublicUrl(cleanAssessment.a_upload4),
        assessed_location,
        asset,
        details: enrichedDetails,
      };
    });

    // Filter out assessments with no open NCR items
    const filteredData = enrichedData.filter((assessment: any) => assessment.details.length > 0);

    return res.json({ 
      data: filteredData, 
      message: `${filteredData.length} assessment(s) with open NCR retrieved`, 
      status: 'success' 
    });
  } catch (e) {
    return res.status(500).json({ 
      data: null, 
      message: e instanceof Error ? e.message : 'Failed to fetch NCR assessment details', 
      status: 'error' 
    });
  }
};

/* ========== COMPUTER ASSESSMENT ENDPOINTS ========== */

export const getComputerAssessments = async (req: Request, res: Response) => {
  try {
    const assetIdParam = req.query.asset_id;
    const assessmentYearParam = req.query.assessment_year;
    const technicianParam = req.query.technician;
    const ramcoIdParam = req.query.ramco_id;

    const filters: any = {};
    if (assetIdParam) filters.asset_id = Number(assetIdParam);
    if (assessmentYearParam) filters.assessment_year = String(assessmentYearParam);
    if (technicianParam) filters.technician = String(technicianParam);
    if (ramcoIdParam) filters.ramco_id = String(ramcoIdParam);

    const assessments = await complianceModel.getComputerAssessments(filters);
    
    // Fetch lookup data in parallel
    const [costcentersRaw, departmentsRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getCostcenters(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      assetModel.getLocations(),
      assetModel.getEmployees(),
    ]);

    // Build lookup maps
    const ccMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((cc: any) => [Number(cc.id), cc]));
    const deptMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [Number(d.id), d]));
    const locMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));
    const empMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));

    // Parse and enrich data
    const enriched = assessments.map((a: any) => ({
      ...a,
      costcenter: a.costcenter_id ? { id: Number(a.costcenter_id), name: (ccMap.get(Number(a.costcenter_id)))?.name || null } : null,
      department: a.department_id ? { id: Number(a.department_id), name: (deptMap.get(Number(a.department_id)))?.code || null } : null,
      display_interfaces: parseCommaSeparatedArray(a.display_interfaces),
      employee: a.ramco_id && empMap.has(a.ramco_id) ? { full_name: empMap.get(a.ramco_id).full_name || empMap.get(a.ramco_id).name || null, ramco_id: a.ramco_id } : null,
      installed_software: parseCommaSeparatedArray(a.installed_software),
      location: a.location_id ? { id: Number(a.location_id), name: (locMap.get(Number(a.location_id)))?.name || null } : null,
      technician_name: a.technician, // Keep original technician (ramco_id)
      costcenter_id: undefined,
      department_id: undefined,
      location_id: undefined,
      ramco_id: undefined,
    }));

    return res.json({
      status: 'success',
      message: `${enriched.length} computer assessment(s) retrieved`,
      data: enriched,
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to fetch computer assessments',
      data: null,
    });
  }
};

export const getComputerAssessmentById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ data: null, message: 'Invalid assessment ID', status: 'error' });

    const assessment = await complianceModel.getComputerAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ data: null, message: 'Computer assessment not found', status: 'error' });
    }

    // Fetch lookup data in parallel
    const [costcentersRaw, departmentsRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getCostcenters(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      assetModel.getLocations(),
      assetModel.getEmployees(),
    ]);

    // Build lookup maps
    const ccMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((cc: any) => [Number(cc.id), cc]));
    const deptMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [Number(d.id), d]));
    const locMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));
    const empMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));

    // Parse and enrich data
    const enriched = {
      ...assessment,
      attachment_1: assessment.attachment_1 || null,
      attachment_2: assessment.attachment_2 || null,
      attachment_3: assessment.attachment_3 || null,
      costcenter: assessment.costcenter_id ? { id: Number(assessment.costcenter_id), name: (ccMap.get(Number(assessment.costcenter_id)))?.name || null } : null,
      department: assessment.department_id ? { id: Number(assessment.department_id), name: (deptMap.get(Number(assessment.department_id)))?.code || null } : null,
      display_interfaces: parseCommaSeparatedArray(assessment.display_interfaces),
      employee: assessment.ramco_id && empMap.has(assessment.ramco_id) ? { full_name: empMap.get(assessment.ramco_id).full_name || empMap.get(assessment.ramco_id).name || null, ramco_id: assessment.ramco_id } : null,
      installed_software: parseCommaSeparatedArray(assessment.installed_software),
      location: assessment.location_id ? { id: Number(assessment.location_id), name: (locMap.get(Number(assessment.location_id)))?.name || null } : null,
      technician_name: assessment.technician, // Keep original technician (ramco_id)
      costcenter_id: undefined,
      department_id: undefined,
      location_id: undefined,
      ramco_id: undefined,
    };

    return res.json({
      status: 'success',
      message: 'Computer assessment retrieved successfully',
      data: enriched,
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to fetch computer assessment',
      data: null,
    });
  }
};

export const createComputerAssessment = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Check for duplicate assessment (same year, asset_id, and register_number)
    const existingAssessments = await complianceModel.getComputerAssessments({
      assessment_year: String(data.assessment_year),
      asset_id: Number(data.asset_id),
    });
    
    const isDuplicate = existingAssessments.some((a: any) => 
      a.register_number === data.register_number &&
      a.assessment_year === data.assessment_year &&
      a.asset_id === data.asset_id
    );
    
    if (isDuplicate) {
      return res.status(400).json({
        status: 'error',
        message: `Assessment already exists for asset ${data.register_number} in year ${data.assessment_year}`,
        data: null,
      });
    }

    const id = await complianceModel.createComputerAssessment(data);

    // Update the computer specs (type_id = 1) in assets.1_specs table
    try {
      if (data.asset_id) {
        const specsUpdateData: any = {
          type_id: 1,
          os_name: data.os_name || null,
          os_version: data.os_version || null,
          cpu_manufacturer: data.cpu_manufacturer || null,
          cpu_model: data.cpu_model || null,
          cpu_generation: data.cpu_generation || null,
          memory_manufacturer: data.memory_manufacturer || null,
          memory_type: data.memory_type || null,
          memory_size_gb: data.memory_size_gb || null,
          storage_manufacturer: data.storage_manufacturer || null,
          storage_type: data.storage_type || null,
          storage_size_gb: data.storage_size_gb || null,
          graphics_type: data.graphics_type || null,
          graphics_manufacturer: data.graphics_manufacturer || null,
          graphics_specs: data.graphics_specs || null,
          display_manufacturer: data.display_manufacturer || null,
          display_size: data.display_size || null,
          display_resolution: data.display_resolution || null,
          display_form_factor: data.display_form_factor || null,
          display_interfaces: data.display_interfaces || null,
          ports_usb_a: data.ports_usb_a || 0,
          ports_usb_c: data.ports_usb_c || 0,
          ports_thunderbolt: data.ports_thunderbolt || 0,
          ports_ethernet: data.ports_ethernet || 0,
          ports_hdmi: data.ports_hdmi || 0,
          ports_displayport: data.ports_displayport || 0,
          ports_vga: data.ports_vga || 0,
          ports_sdcard: data.ports_sdcard || 0,
          ports_audiojack: data.ports_audiojack || 0,
          battery_equipped: data.battery_equipped || null,
          battery_capacity: data.battery_capacity || null,
          adapter_equipped: data.adapter_equipped || null,
          adapter_output: data.adapter_output || null,
          av_installed: data.av_installed || null,
          av_vendor: data.av_vendor || null,
          av_status: data.av_status || null,
          av_license: data.av_license || null,
          vpn_installed: data.vpn_installed || null,
          vpn_setup_type: data.vpn_setup_type || null,
          vpn_username: data.vpn_username || null,
          installed_software: data.installed_software || null,
          office_account: data.office_account || null,
          attachment_1: data.attachment_1 || null,
          attachment_2: data.attachment_2 || null,
          attachment_3: data.attachment_3 || null,
          assess_id: id,
          upgraded_at: data.upgraded_at || null,
          updated_by: data.ramco_id || null
        };
        
        await assetModel.updateAssetBasicSpecs(data.asset_id, specsUpdateData);
      }
    } catch (specsErr) {
      // Log error but don't fail the assessment creation
      console.error('Error updating computer specs:', specsErr);
    }

    // Handle attachment files if present
    const files: Express.Multer.File[] = Array.isArray((req as any).files) ? (req as any).files as Express.Multer.File[] : [];
    const attachmentUpdates: any = {};
    
    if (files.length > 0) {
      const filesByField = new Map<string, Express.Multer.File[]>();
      for (const f of files) {
        const fn = f.fieldname || '';
        if (!filesByField.has(fn)) filesByField.set(fn, []);
        filesByField.get(fn)!.push(f);
      }

      // Process attachments[0], attachments[1], attachments[2]
      for (let i = 0; i < 3; i++) {
        const fieldName = `attachments[${i}]`;
        const fileArray = filesByField.get(fieldName);
        
        if (fileArray && fileArray.length > 0) {
          const f = fileArray[0];
          try {
            const tempPath = f.path;
            const ext = path.extname(f.originalname || tempPath) || '';
            const filename = `assessment-${id}-attachment-${i}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
            const base = await getUploadBase();
            const destDir = path.join(base, 'compliance', 'assessment', 'computer');
            await fsPromises.mkdir(destDir, { recursive: true });
            const destPath = path.join(destDir, filename);
            await safeMove(tempPath, destPath);
            const stored = path.posix.join('uploads', 'compliance', 'assessment', 'computer', filename);
            const attachmentNum = i + 1;
            attachmentUpdates[`attachment_${attachmentNum}`] = stored;
          } catch (err) {
            console.error(`Failed to process attachment ${i}:`, err);
          }
        }
      }

      // Update assessment with attachment paths if any were processed
      if (Object.keys(attachmentUpdates).length > 0) {
        await complianceModel.updateComputerAssessment(id, attachmentUpdates);
      }
    }

    // Send notification email to technician
    try {
      if (data.ramco_id) {
        const employeesRaw = await assetModel.getEmployees();
        const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
        const technician = employees.find((e: any) => e.ramco_id === data.ramco_id) as any;
        
        if (technician && technician.email) {
          const { html, subject } = renderITAssessmentNotification({
            assessment: {
              date: data.assessment_date ? new Date(data.assessment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              id,
              overall_score: data.overall_score,
              remarks: data.remarks,
              year: data.assessment_year,
            },
            asset: {
              brand: data.brand,
              category: data.category,
              id: data.asset_id,
              model: data.model,
              register_number: data.register_number,
            },
            technician: {
              email: technician.email,
              full_name: technician.full_name || technician.name || 'Technician',
              ramco_id: data.ramco_id,
            },
          });
          
          await sendMail(technician.email, subject, html);
        }
      }
    } catch (emailErr) {
      // Log email error but don't fail the assessment creation
      console.error('Error sending IT assessment notification email:', emailErr);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Computer assessment created successfully',
      data: { id },
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to create computer assessment',
      data: null,
    });
  }
};

export const updateComputerAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ data: null, message: 'Invalid assessment ID', status: 'error' });

    const data = req.body;

    // Handle attachment files if present
    const files: Express.Multer.File[] = Array.isArray((req as any).files) ? (req as any).files as Express.Multer.File[] : [];
    
    if (files.length > 0) {
      const filesByField = new Map<string, Express.Multer.File[]>();
      for (const f of files) {
        const fn = f.fieldname || '';
        if (!filesByField.has(fn)) filesByField.set(fn, []);
        filesByField.get(fn)!.push(f);
      }

      // Process attachments[0], attachments[1], attachments[2]
      for (let i = 0; i < 3; i++) {
        const fieldName = `attachments[${i}]`;
        const fileArray = filesByField.get(fieldName);
        
        if (fileArray && fileArray.length > 0) {
          const f = fileArray[0];
          try {
            const tempPath = f.path;
            const ext = path.extname(f.originalname || tempPath) || '';
            const filename = `assessment-${id}-attachment-${i}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
            const base = await getUploadBase();
            const destDir = path.join(base, 'compliance', 'assessment', 'computer');
            await fsPromises.mkdir(destDir, { recursive: true });
            const destPath = path.join(destDir, filename);
            await safeMove(tempPath, destPath);
            const stored = path.posix.join('uploads', 'compliance', 'assessment', 'computer', filename);
            const attachmentNum = i + 1;
            (data as any)[`attachment_${attachmentNum}`] = stored;
          } catch (err) {
            console.error(`Failed to process attachment ${i}:`, err);
          }
        }
      }
    }

    await complianceModel.updateComputerAssessment(id, data);

    // Update the computer specs (type_id = 1) in assets.1_specs table
    try {
      if (data.asset_id) {
        const specsUpdateData: any = {
          type_id: 1,
          os_name: data.os_name || null,
          os_version: data.os_version || null,
          cpu_manufacturer: data.cpu_manufacturer || null,
          cpu_model: data.cpu_model || null,
          cpu_generation: data.cpu_generation || null,
          memory_manufacturer: data.memory_manufacturer || null,
          memory_type: data.memory_type || null,
          memory_size_gb: data.memory_size_gb || null,
          storage_manufacturer: data.storage_manufacturer || null,
          storage_type: data.storage_type || null,
          storage_size_gb: data.storage_size_gb || null,
          graphics_type: data.graphics_type || null,
          graphics_manufacturer: data.graphics_manufacturer || null,
          graphics_specs: data.graphics_specs || null,
          display_manufacturer: data.display_manufacturer || null,
          display_size: data.display_size || null,
          display_resolution: data.display_resolution || null,
          display_form_factor: data.display_form_factor || null,
          display_interfaces: data.display_interfaces || null,
          ports_usb_a: data.ports_usb_a || 0,
          ports_usb_c: data.ports_usb_c || 0,
          ports_thunderbolt: data.ports_thunderbolt || 0,
          ports_ethernet: data.ports_ethernet || 0,
          ports_hdmi: data.ports_hdmi || 0,
          ports_displayport: data.ports_displayport || 0,
          ports_vga: data.ports_vga || 0,
          ports_sdcard: data.ports_sdcard || 0,
          ports_audiojack: data.ports_audiojack || 0,
          battery_equipped: data.battery_equipped || null,
          battery_capacity: data.battery_capacity || null,
          adapter_equipped: data.adapter_equipped || null,
          adapter_output: data.adapter_output || null,
          av_installed: data.av_installed || null,
          av_vendor: data.av_vendor || null,
          av_status: data.av_status || null,
          av_license: data.av_license || null,
          vpn_installed: data.vpn_installed || null,
          vpn_setup_type: data.vpn_setup_type || null,
          vpn_username: data.vpn_username || null,
          installed_software: data.installed_software || null,
          office_account: data.office_account || null,
          attachment_1: data.attachment_1 || null,
          attachment_2: data.attachment_2 || null,
          attachment_3: data.attachment_3 || null,
          assess_id: id,
          upgraded_at: data.upgraded_at || null,
          updated_by: data.ramco_id || null
        };
        
        await assetModel.updateAssetBasicSpecs(data.asset_id, specsUpdateData);
      }
    } catch (specsErr) {
      // Log error but don't fail the assessment update
      console.error('Error updating computer specs:', specsErr);
    }

    const updated = await complianceModel.getComputerAssessmentById(id);
    
    // Fetch lookup data in parallel
    const [costcentersRaw, departmentsRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getCostcenters(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      assetModel.getLocations(),
      assetModel.getEmployees(),
    ]);

    // Build lookup maps
    const ccMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((cc: any) => [Number(cc.id), cc]));
    const deptMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [Number(d.id), d]));
    const locMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [Number(l.id), l]));
    const empMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));

    // Parse and enrich data
    const enriched = {
      ...updated,
      costcenter: updated?.costcenter_id ? { id: Number(updated.costcenter_id), name: (ccMap.get(Number(updated.costcenter_id)))?.name || null } : null,
      department: updated?.department_id ? { id: Number(updated.department_id), name: (deptMap.get(Number(updated.department_id)))?.code || null } : null,
      display_interfaces: parseCommaSeparatedArray(updated?.display_interfaces),
      employee: updated?.ramco_id && empMap.has(updated.ramco_id) ? { full_name: empMap.get(updated.ramco_id).full_name || empMap.get(updated.ramco_id).name || null, ramco_id: updated.ramco_id } : null,
      installed_software: parseCommaSeparatedArray(updated?.installed_software),
      location: updated?.location_id ? { id: Number(updated.location_id), name: (locMap.get(Number(updated.location_id)))?.name || null } : null,
      technician_name: updated?.technician, // Keep original technician (ramco_id)
      costcenter_id: undefined,
      department_id: undefined,
      location_id: undefined,
      ramco_id: undefined,
    };

    return res.json({
      status: 'success',
      message: 'Computer assessment updated successfully',
      data: enriched,
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to update computer assessment',
      data: null,
    });
  }
};

export const deleteComputerAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ data: null, message: 'Invalid assessment ID', status: 'error' });

    await complianceModel.deleteComputerAssessment(id);

    return res.json({
      status: 'success',
      message: 'Computer assessment deleted successfully',
      data: null,
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to delete computer assessment',
      data: null,
    });
  }
};

/**
 * Get all IT assets with their assessment status
 * Shows which IT assets have been assessed and which haven't
 * Enriches asset data with lookup tables (brand, category, type, costcenter, department, location, owner)
 * Query params:
 * - assessment_year: Filter by specific year
 * - assessed_only: true to show only assessed assets
 * - not_assessed_only: true to show only assets without assessments
 */
export const getITAssetsWithAssessmentStatus = async (req: Request, res: Response) => {
  try {
    const assessmentYearParam = req.query.assessment_year;
    const assessedOnlyParam = req.query.assessed_only;
    const notAssessedOnlyParam = req.query.not_assessed_only;

    const filters: any = {};
    if (assessmentYearParam) filters.assessment_year = String(assessmentYearParam);
    if (assessedOnlyParam === 'true') filters.assessed_only = true;
    if (notAssessedOnlyParam === 'true') filters.not_assessed_only = true;

    const result = await complianceModel.getITAssetsWithAssessmentStatus(filters);

    // Fetch lookup data in parallel for enrichment
    const [
      typesRaw,
      categoriesRaw,
      brandsRaw,
      modelsRaw,
      departmentsRaw,
      costcentersRaw,
      locationsRaw,
      employeesRaw
    ] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCategories(),
      assetModel.getBrands(),
      assetModel.getModels(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    // Build lookup maps
    const typeMap = new Map((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [t.id, t]));
    const categoryMap = new Map((Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => [c.id, c]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));
    const modelMap = new Map((Array.isArray(modelsRaw) ? modelsRaw : []).map((m: any) => [m.id, m]));
    const departmentMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [d.id, d]));
    const costcenterMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((c: any) => [c.id, c]));
    const locationMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [l.id, l]));
    const employeeMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));

    // Enrich assets with lookup data
    const enrichedResult = result.map((item: any) => {
      const asset = item.asset;
      const type = typeMap.get(asset.type_id);
      const nbv = assetModel.calculateNBV(asset.unit_price, asset.purchase_year);
      const age = assetModel.calculateAge(asset.purchase_year);

      return {
        ...item,
        asset: {
          age,
          asset_code: asset.asset_code,
          brand: asset.brand_id && brandMap.has(asset.brand_id)
            ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)?.name || null }
            : null,
          category: asset.category_id && categoryMap.has(asset.category_id)
            ? { id: asset.category_id, name: categoryMap.get(asset.category_id)?.name || null }
            : null,
          classification: asset.classification,
          condition_status: asset.condition_status,
          costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
            ? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
            : null,
          department: asset.department_id && departmentMap.has(asset.department_id)
            ? { id: asset.department_id, name: departmentMap.get(asset.department_id)?.code || null }
            : null,
          disposed_date: asset.disposed_date,
          entry_code: asset.entry_code,
          id: asset.id,
          location: asset.location_id && locationMap.has(asset.location_id)
            ? { id: asset.location_id, name: locationMap.get(asset.location_id)?.name || null }
            : null,
          model: asset.model_id && modelMap.has(asset.model_id)
            ? { id: asset.model_id, name: modelMap.get(asset.model_id)?.name || null }
            : null,
          nbv,
          owner: asset.ramco_id && employeeMap.has(asset.ramco_id)
            ? {
              full_name: employeeMap.get(asset.ramco_id)?.full_name || null,
              ramco_id: employeeMap.get(asset.ramco_id)?.ramco_id || null
            }
            : null,
          purchase_date: asset.purchase_date,
          purchase_id: asset.purchase_id,
          purchase_year: asset.purchase_year,
          purpose: asset.purpose,
          record_status: asset.record_status,
          register_number: asset.register_number,
          type: type ? { id: type.id, name: type.name } : null,
          unit_price: asset.unit_price,
        }
      };
    });

    return res.json({
      status: 'success',
      message: `${enrichedResult.length} IT asset(s) retrieved with assessment status`,
      data: enrichedResult,
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to fetch IT assets with assessment status',
      data: null,
    });
  }
};
/**
 * Get a single IT asset with its assessment status by ID
 * Returns enriched asset data with assessment history
 */
export const getITAssetWithAssessmentStatusById = async (req: Request, res: Response) => {
  try {
    const assetId = Number(req.params.id);
    if (!assetId || isNaN(assetId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid asset ID',
        data: null,
      });
    }

    const result = await complianceModel.getITAssetWithAssessmentStatusById(assetId);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'IT asset not found',
        data: null,
      });
    }

    // Fetch lookup data in parallel for enrichment
    const [
      typesRaw,
      categoriesRaw,
      brandsRaw,
      modelsRaw,
      departmentsRaw,
      costcentersRaw,
      locationsRaw,
      employeesRaw
    ] = await Promise.all([
      assetModel.getTypes(),
      assetModel.getCategories(),
      assetModel.getBrands(),
      assetModel.getModels(),
      (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    // Build lookup maps
    const typeMap = new Map((Array.isArray(typesRaw) ? typesRaw : []).map((t: any) => [t.id, t]));
    const categoryMap = new Map((Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => [c.id, c]));
    const brandMap = new Map((Array.isArray(brandsRaw) ? brandsRaw : []).map((b: any) => [b.id, b]));
    const modelMap = new Map((Array.isArray(modelsRaw) ? modelsRaw : []).map((m: any) => [m.id, m]));
    const departmentMap = new Map((Array.isArray(departmentsRaw) ? departmentsRaw : []).map((d: any) => [d.id, d]));
    const costcenterMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((c: any) => [c.id, c]));
    const locationMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [l.id, l]));
    const employeeMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));

    // Enrich asset with lookup data
    const asset = result.asset;
    const type = typeMap.get(asset.type_id);
    const nbv = assetModel.calculateNBV(asset.unit_price, asset.purchase_year);
    const age = assetModel.calculateAge(asset.purchase_year);

    const enrichedAsset = {
      age,
      asset_code: asset.asset_code,
      brand: asset.brand_id && brandMap.has(asset.brand_id)
        ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)?.name || null }
        : null,
      category: asset.category_id && categoryMap.has(asset.category_id)
        ? { id: asset.category_id, name: categoryMap.get(asset.category_id)?.name || null }
        : null,
      classification: asset.classification,
      condition_status: asset.condition_status,
      costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
        ? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
        : null,
      department: asset.department_id && departmentMap.has(asset.department_id)
        ? { id: asset.department_id, name: departmentMap.get(asset.department_id)?.code || null }
        : null,
      disposed_date: asset.disposed_date,
      entry_code: asset.entry_code,
      id: asset.id,
      location: asset.location_id && locationMap.has(asset.location_id)
        ? { id: asset.location_id, name: locationMap.get(asset.location_id)?.name || null }
        : null,
      model: asset.model_id && modelMap.has(asset.model_id)
        ? { id: asset.model_id, name: modelMap.get(asset.model_id)?.name || null }
        : null,
      nbv,
      owner: asset.ramco_id && employeeMap.has(asset.ramco_id)
        ? {
          full_name: employeeMap.get(asset.ramco_id)?.full_name || null,
          ramco_id: employeeMap.get(asset.ramco_id)?.ramco_id || null
        }
        : null,
      purchase_date: asset.purchase_date,
      purchase_id: asset.purchase_id,
      purchase_year: asset.purchase_year,
      purpose: asset.purpose,
      record_status: asset.record_status,
      register_number: asset.register_number,
      type: type ? { id: type.id, name: type.name } : null,
      unit_price: asset.unit_price,
    };

    // Enrich assessments with lookup data (same as getComputerAssessmentById)
    const enrichedAssessments = result.assessments.map((a: any) => ({
      id: a.id,
      asset_id: a.asset_id,
      register_number: a.register_number,
      assessment_year: a.assessment_year,
      assessment_date: a.assessment_date,
      overall_score: a.overall_score,
      remarks: a.remarks,
      os_name: a.os_name,
      os_version: a.os_version,
      os_patch_status: a.os_patch_status,
      cpu_manufacturer: a.cpu_manufacturer,
      cpu_model: a.cpu_model,
      cpu_generation: a.cpu_generation,
      memory_manufacturer: a.memory_manufacturer,
      memory_type: a.memory_type,
      memory_size_gb: a.memory_size_gb,
      storage_manufacturer: a.storage_manufacturer,
      storage_type: a.storage_type,
      storage_size_gb: a.storage_size_gb,
      graphics_type: a.graphics_type,
      graphics_manufacturer: a.graphics_manufacturer,
      graphics_specs: a.graphics_specs,
      display_manufacturer: a.display_manufacturer,
      display_size: a.display_size,
      display_resolution: a.display_resolution,
      display_form_factor: a.display_form_factor,
      display_interfaces: parseCommaSeparatedArray(a.display_interfaces),
      ports_usb_a: a.ports_usb_a,
      ports_usb_c: a.ports_usb_c,
      ports_thunderbolt: a.ports_thunderbolt,
      ports_ethernet: a.ports_ethernet,
      ports_hdmi: a.ports_hdmi,
      ports_displayport: a.ports_displayport,
      ports_vga: a.ports_vga,
      ports_sdcard: a.ports_sdcard,
      ports_audiojack: a.ports_audiojack,
      battery_equipped: a.battery_equipped,
      battery_capacity: a.battery_capacity,
      adapter_equipped: a.adapter_equipped,
      adapter_output: a.adapter_output,
      av_installed: a.av_installed,
      av_vendor: a.av_vendor,
      av_status: a.av_status,
      av_license: a.av_license,
      vpn_installed: a.vpn_installed,
      vpn_setup_type: a.vpn_setup_type,
      vpn_username: a.vpn_username,
      installed_software: parseCommaSeparatedArray(a.installed_software),
      purchase_date: a.purchase_date,
      attachment_1: a.attachment_1,
      attachment_2: a.attachment_2,
      attachment_3: a.attachment_3,
      office_account: a.office_account,
      created_at: a.created_at,
      updated_at: a.updated_at,
      costcenter: a.costcenter_id ? { id: Number(a.costcenter_id), name: costcenterMap.get(Number(a.costcenter_id))?.name || null } : null,
      department: a.department_id ? { id: Number(a.department_id), name: departmentMap.get(Number(a.department_id))?.code || null } : null,
      employee: a.ramco_id && employeeMap.has(a.ramco_id) ? { full_name: employeeMap.get(a.ramco_id).full_name || employeeMap.get(a.ramco_id).name || null, ramco_id: a.ramco_id } : null,
      location: a.location_id ? { id: Number(a.location_id), name: locationMap.get(Number(a.location_id))?.name || null } : null,
      technician_name: a.technician,
    }));

    return res.json({
      status: 'success',
      message: 'IT asset with assessment status retrieved successfully',
      data: {
        asset: enrichedAsset,
        assessed: result.assessed,
        assessment_count: result.assessment_count,
        assessments: enrichedAssessments,
      },
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to fetch IT asset with assessment status',
      data: null,
    });
  }
};

/**
 * Track driver actions for NCR items in a vehicle assessment
 * Returns assessment with NCR details and corresponding maintenance actions taken by driver
 */
export const trackAssessmentNCRActions = async (req: Request, res: Response) => {
  try {
    const assessmentId = Number(req.params.id);
    if (!assessmentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Assessment ID is required',
        data: null,
      });
    }

    // Fetch the assessment
    const assessment = await complianceModel.getAssessmentById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assessment not found',
        data: null,
      });
    }

    // Fetch assessment details (which include adt_ncr flags)
    const details = await complianceModel.getAssessmentDetails(assessmentId).catch(() => []);

    // Get asset information
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees(),
    ]);
    const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
    const costcenters = Array.isArray(costcentersRaw) ? (costcentersRaw as any[]) : [];
    const locations = Array.isArray(locationsRaw) ? (locationsRaw as any[]) : [];
    const employees = Array.isArray(employeesRaw) ? (employeesRaw as any[]) : [];

    const assetMap = new Map();
    for (const a of assets) {
      if (a.id) assetMap.set(a.id, a);
      if (a.asset_id) assetMap.set(a.asset_id, a);
    }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

    // Enrich asset information
    let asset = null;
    if ((assessment as any).asset_id && assetMap.has((assessment as any).asset_id)) {
      const a = assetMap.get((assessment as any).asset_id);
      const purchase_date = a.purchase_date || a.pur_date || a.purchaseDate || null;
      let age: null | number = null;
      if (purchase_date) {
        const pd = new Date(String(purchase_date));
        if (!isNaN(pd.getTime())) {
          const diffMs = Date.now() - pd.getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
        }
      }
      const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
      const owner = ownerRamco && employeeMap.has(ownerRamco)
        ? {
            full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null,
            ramco_id: ownerRamco,
          }
        : null;
      asset = {
        age,
        costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id)
          ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name }
          : null,
        id: (assessment as any).asset_id,
        location: (() => {
          const locId = a.location_id ?? a.location?.id ?? null;
          if (!locId) return null;
          const found = locationMap.get(locId);
          return found ? { code: found.code || found.name || null, id: locId } : null;
        })(),
        owner,
        purchase_date,
        register_number: a.register_number || a.vehicle_regno || null,
      };
    }

    // Fetch NCR maintenance actions for this asset after assessment date
    const ncrActions = (assessment as any).asset_id && (assessment as any).a_date
      ? await complianceModel.getNCRActionsByAssetAndAssessmentDate((assessment as any).asset_id, (assessment as any).a_date).catch(() => [])
      : [];

    // Filter assessment details to only include NCR items (adt_ncr = 2 means non-compliance)
    const ncrItems = Array.isArray(details)
      ? details.filter((d: any) => d.adt_ncr === 2)
      : [];

    // Load assessment criteria to resolve adt_item (qset_id) -> qset_desc
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    const qsetTypeMap = new Map<number, string>();
    for (const c of criteria) {
      if (c?.qset_id) {
        qsetMap.set(Number(c.qset_id), c.qset_desc || null);
        qsetTypeMap.set(Number(c.qset_id), c.qset_type || null);
      }
    }

    // Enrich NCR items with criteria information
    const enrichedNCRItems = ncrItems.map((item: any) => {
      const qid = item?.adt_item ? Number(item.adt_item) : null;
      return {
        ...item,
        qset_desc: qid && qsetMap.has(qid) ? qsetMap.get(qid) : null,
        qset_type: qid && qsetTypeMap.has(qid) ? qsetTypeMap.get(qid) : null,
      };
    });

    // Summary statistics
    const ncrCount = ncrItems.length;
    const actionsTaken = ncrActions.length;

    return res.json({
      status: 'success',
      message: 'Assessment NCR tracking retrieved',
      data: {
        assessment: {
          assess_id: (assessment as any).assess_id,
          a_date: (assessment as any).a_date,
          a_rate: (assessment as any).a_rate,
          a_remark: (assessment as any).a_remark,
          asset,
        },
        ncr_items: {
          count: ncrCount,
          items: enrichedNCRItems,
        },
        driver_actions: {
          total_taken: actionsTaken,
          records: ncrActions.map((action: any) => ({
            req_id: action.req_id,
            req_date: action.req_date,
            req_comment: action.req_comment,
            drv_stat: action.drv_stat,
            drv_date: action.drv_date,
            verification_stat: action.verification_stat,
            verification_date: action.verification_date,
            recommendation_stat: action.recommendation_stat,
            recommendation_date: action.recommendation_date,
            approval_stat: action.approval_stat,
            approval_date: action.approval_date,
          })),
        },
      },
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to fetch assessment NCR tracking',
      data: null,
    });
  }
};

/**
 * Debug endpoint: Show which asset_ids have NCR maintenance records with forms
 * Helps diagnose asset_id mismatches between assessments and maintenance records
 */
export const debugNCRMaintenance = async (req: Request, res: Response) => {
  try {
    const records = await complianceModel.debugNCRRecords();
    
    return res.json({
      status: 'success',
      message: 'Debug: Asset IDs with NCR maintenance records',
      data: {
        total_groups: records.length,
        asset_groups: records,
      },
    });
  } catch (e) {
    return res.status(500).json({
      status: 'error',
      message: e instanceof Error ? e.message : 'Failed to fetch debug data',
      data: null,
    });
  }
};