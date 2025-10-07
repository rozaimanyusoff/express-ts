
import { Request, Response } from 'express';
import * as complianceModel from './complianceModel';
import * as assetModel from '../p.asset/assetModel';
import { sendMail } from '../utils/mailer';
import { renderSummonNotification } from '../utils/emailTemplates/summonNotification';
import { renderSummonPaymentReceipt } from '../utils/emailTemplates/summonPaymentReceipt';
import { renderVehicleAssessmentNotification } from '../utils/emailTemplates/vehicleAssessmentNotification';
import { getSupervisorBySubordinate } from '../utils/employeeHelper';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { getUploadBase, safeMove, toPublicUrl } from '../utils/uploadUtil';
import * as adminNotificationModel from '../p.admin/notificationModel';

const summonAdminMail = 'admin@example.com';


// Helper to normalize a temp file path into stored relative path
function normalizeStoredPath(filePath?: string | null): string | null {
  if (!filePath) return null;
  const filename = path.basename(String(filePath).replace(/\\/g, '/'));
  return `uploads/compliance/summon/${filename}`;
}

// Format helpers for controller responses
function fmtDateOnly(input?: any): string | null {
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

// Format as d/m/yyyy (no leading zeros) for myeg_date display per frontend requirement
function fmtDateDMY(input?: any): string | null {
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

function fmtTimeOnly(input?: any): string | null {
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

function fmtDatetimeMySQL(input?: any): string | null {
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

// POST /api/compliance/assessments/test-email
// Body: { to: string, asset?: { id, code, name }, driver?: { full_name, email, ramco_id }, assessment?: { id, date, remark, rate, ncr }, portalLink?: string, securityPin?: string }
// Sends a test Vehicle Assessment email using the current template (no attachments)
export const sendAssessmentTestEmail = async (req: Request, res: Response) => {
  try {
    const to = String(req.body?.to || req.query?.to || '').trim();
    if (!to) return res.status(400).json({ status: 'error', message: 'Provide recipient email in body.to' });

    const asset = req.body?.asset || { id: 999, code: 'TEST-123', name: 'Test Vehicle' };
    const driver = req.body?.driver || { ramco_id: 'DRV001', full_name: 'Test Recipient', email: to };
    const now = new Date();
    const defaultAssess = { id: 1001, date: now.toISOString().slice(0, 10), remark: 'Automated test', rate: '-', ncr: '-' };
    const assessment = req.body?.assessment || defaultAssess;
    const securityPin = String(req.body?.securityPin || Math.floor(100000 + Math.random() * 900000));
    const frontendUrl = process.env.FRONTEND_URL || 'https://your-frontend-url';
    const portalLink = req.body?.portalLink || `${frontendUrl}/compliance/assessment/portal/${asset.id}?code=${driver.ramco_id}${securityPin}`;

    const { subject, html, text } = renderVehicleAssessmentNotification({ asset, driver, assessment, details: [], portalLink, securityPin });

    await sendMail(to, subject, html, { text });
    return res.json({ status: 'success', message: 'Test email sent', to, subject });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send test email';
    return res.status(500).json({ status: 'error', message: msg });
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

    const assets = Array.isArray(assetsRaw) ? (assetsRaw as any[]) : [];
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
        const owner = ownerRamco && employeeMap.has(ownerRamco) ? { ramco_id: ownerRamco, full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null } : null;
        asset = {
          id: r.asset_id,
          register_number: a.register_number || a.vehicle_regno || null,
          costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
          location: (() => {
            const locId = a.location_id ?? a.location?.id ?? null;
            if (!locId) return null;
            const found = locationMap.get(locId);
            return found ? { id: locId, code: found.code || found.name || null } : null;
          })(),
          owner
        };
      }

      const employee = r.ramco_id && employeeMap.has(r.ramco_id) ? (() => {
        const e = employeeMap.get(r.ramco_id);
        return { ramco_id: r.ramco_id, full_name: e.full_name || e.name || null, email: e.email || null, contact: e.contact_no || e.contact || null };
      })() : null;

      const { reg_no, f_name, v_email, ...rest } = r as any;
      // format date/time fields for API consumers
      if (rest.myeg_date) rest.myeg_date = fmtDateDMY(rest.myeg_date);
      if (rest.receipt_date) rest.receipt_date = fmtDateDMY(rest.receipt_date);
      if (rest.summon_date) rest.summon_date = fmtDateDMY(rest.summon_date);
      if (rest.summon_time) rest.summon_time = fmtTimeOnly(rest.summon_time);
      if (rest.summon_dt) rest.summon_dt = fmtDatetimeMySQL(rest.summon_dt);
      return { ...rest, summon_upl, summon_receipt, attachment_url, asset, employee };
    });

    res.json({ status: 'success', message: 'Summons retrieved', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to fetch summons', data: null });
  }
};

export const getSummonById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const rows = await complianceModel.getSummonById(id);
    if (!rows) return res.status(404).json({ status: 'error', message: 'Summon not found', data: null });
    const r = Array.isArray(rows) ? rows[0] : rows;

    const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);
    const assets = Array.isArray(assetsRaw) ? (assetsRaw as any[]) : [];
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
      const owner = ownerRamco && employeeMap.has(ownerRamco) ? { ramco_id: ownerRamco, full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null } : null;
      asset = {
        id: r.asset_id,
        register_number: a.register_number || a.vehicle_regno || null,
        costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
        location: (() => {
          const locId = a.location_id ?? a.location?.id ?? null;
          if (!locId) return null;
          const found = locationMap.get(locId);
          return found ? { id: locId, code: found.code || found.name || null } : null;
        })(),
        owner
      };
    }

    const employee = r.ramco_id && employeeMap.has(r.ramco_id) ? (() => {
      const e = employeeMap.get(r.ramco_id);
      return { ramco_id: r.ramco_id, full_name: e.full_name || e.name || null, email: e.email || null, contact: e.contact_no || e.contact || null };
    })() : null;

    const { reg_no, f_name, v_email, ...rest } = r as any;
    const data = { ...rest, summon_upl, summon_receipt, attachment_url, asset, employee };
    // format date/time fields for API consumers
    if ((data as any).myeg_date) (data as any).myeg_date = fmtDateDMY((data as any).myeg_date);
    if ((data as any).receipt_date) (data as any).receipt_date = fmtDateDMY((data as any).receipt_date);
    if ((data as any).summon_date) (data as any).summon_date = fmtDateDMY((data as any).summon_date);
    if ((data as any).summon_time) (data as any).summon_time = fmtTimeOnly((data as any).summon_time);
    if ((data as any).summon_dt) (data as any).summon_dt = fmtDatetimeMySQL((data as any).summon_dt);

    res.json({ status: 'success', message: 'Summon retrieved', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to fetch summon', data: null });
  }
};

export const createSummon = async (req: Request, res: Response) => {
  try {
    // Pass request body directly to the model (no payload construction here)
    const data: any = req.body || {};
    const id = await complianceModel.createSummon(data);

    // If there was an uploaded file, validate, move it into final storage and update the record
    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => { }); return res.status(400).json({ status: 'error', message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg,gif,webp)' }); }
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
        const toEmail = localTestEmail || (emp && (emp.email || emp.contact)) || r?.v_email || null;
        if (!toEmail) return;

        const html = renderSummonNotification({
          driverName: localTestName || (emp?.full_name || emp?.name) || null,
          smn_id: r?.smn_id || id,
          summon_no: r?.summon_no || null,
          summon_dt: r?.summon_dt || null,
          summon_loc: r?.summon_loc || null,
          summon_amt: r?.summon_amt || null,
          summon_agency: r?.summon_agency || null,
        });

        try {
          await sendMail(toEmail, `Summon notification #${r?.smn_id || id}`, html, { cc: summonAdminMail });
          await complianceModel.updateSummon(id, { emailStat: 1 }).catch(() => { });
        } catch (mailErr) {
          console.error('createSummon: mail send error', mailErr, 'to', toEmail);
        }
      } catch (e) {
        // non-blocking
      }
    })();

    res.status(201).json({ status: 'success', message: 'Summon created', data: { id, smn_id: id } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to create summon', data: null });
  }
};

export const updateSummon = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

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

    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => { }); return res.status(400).json({ status: 'error', message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg,gif,webp)' }); }
      const normalized = normalizeStoredPath(tempPath);
      if (normalized) payload.summon_upl = normalized as string;
    }

    await complianceModel.updateSummon(id, payload);

    if ((req as any).file && (req as any).file.path) {
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

    res.json({ status: 'success', message: 'Updated' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to update summon', data: null });
  }
};

// POST /api/compliance/summon/:id/payment
export const uploadSummonPayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const existing = await complianceModel.getSummonById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Summon not found', data: null });

    const payload: any = {};
    if (req.body && req.body.receipt_date !== undefined) payload.receipt_date = req.body.receipt_date ? String(req.body.receipt_date).trim() : null;

    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => { }); return res.status(400).json({ status: 'error', message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg)' }); }

      const filename = `summon-receipt-${id}-${Date.now()}${ext}`;
      const base = await getUploadBase();
      const destDir = path.join(base, 'compliance', 'summon');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await safeMove(tempPath, destPath);
      const storedRel = path.posix.join('uploads', 'compliance', 'summon', filename);
      payload.summon_receipt = storedRel;
    }

    if (Object.keys(payload).length === 0) return res.status(400).json({ status: 'error', message: 'No data provided' });

    await complianceModel.updateSummon(id, payload);
    // Notify admins via in-app notifications and optionally email
    (async () => {
      try {
        const created = await complianceModel.getSummonById(id);
        const r = Array.isArray(created) ? created[0] : created;
        const msg = `Payment receipt uploaded for summon #${r?.smn_id || id} by ${r?.ramco_id || 'unknown'}`;
        await adminNotificationModel.createAdminNotification({ type: 'summon_payment', message: msg });

        // Also send email to configured ADMIN_EMAIL (best-effort)
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;
        if (ADMIN_EMAIL) {
          const html = renderSummonPaymentReceipt({
            adminName: 'Admin',
            smn_id: r?.smn_id || id,
            summon_no: r?.summon_no || null,
            summon_dt: r?.summon_dt || null,
            summon_loc: r?.summon_loc || null,
            summon_amt: r?.summon_amt || null,
            summon_agency: r?.summon_agency || null,
            ramco_id: r?.ramco_id || null,
            receipt_date: payload.receipt_date || null,
            payer: payload.payer || null,
          });
          try { await sendMail(ADMIN_EMAIL, `Summon payment received #${r?.smn_id || id}`, html); } catch (e) { console.error('admin email send failed', e); }
        }
      } catch (e) {
        // silent
      }
    })();

    res.json({ status: 'success', message: 'Payment receipt uploaded', data: { id } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to upload payment receipt', data: null });
  }
};

// POST /api/compliance/summon/notify
export const resendSummonNotification = async (req: Request, res: Response) => {
  try {
    // Allow id in body or query
    const id = Number((req.body && (req.body.id || req.body.smn_id)) || req.query.id || req.query.smn_id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const record = await complianceModel.getSummonById(id);
    if (!record) return res.status(404).json({ status: 'error', message: 'Summon not found', data: null });
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
    const toEmail = localTestEmail || (emp && (emp.email || emp.contact)) || r?.v_email || null;
    if (!toEmail) return res.status(400).json({ status: 'error', message: 'Recipient email not found', data: null });

    const html = renderSummonNotification({
      driverName: localTestName || (emp?.full_name || emp?.name) || null,
      smn_id: r?.smn_id || id,
      summon_no: r?.summon_no || null,
      summon_dt: r?.summon_dt || null,
      summon_loc: r?.summon_loc || null,
      summon_amt: r?.summon_amt || null,
      summon_agency: r?.summon_agency || null,
    });

    try {
      await sendMail(toEmail, `Summon notification #${r?.smn_id || id}`, html);
      // mark emailStat = 1 (best-effort)
      await complianceModel.updateSummon(id, { emailStat: 1 }).catch(() => { });
      return res.json({ status: 'success', message: 'Notification sent', data: { id, sentTo: toEmail, testMode: !!localTestEmail } });
    } catch (mailErr) {
      // don't expose mail errors, but return failure status
      console.error('resendSummonNotification: mailer error', mailErr);
      return res.status(500).json({ status: 'error', message: 'Failed to send email', data: null });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error', data: null });
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
    res.json({ status: 'success', message: 'Summon deleted', data: null });
  } catch (err) {
    if (err instanceof Error && err.message === 'Summon record not found') {
      res.status(404).json({ status: 'error', message: err.message, data: null });
    } else {
      res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to delete summon', data: null });
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
    return res.json({ status: 'success', message: 'Summon types retrieved', data: out });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch summon types', data: null });
  }
};

export const getSummonTypeById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await complianceModel.getSummonTypeById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Summon type not found', data: null });
    const agencies = await complianceModel.getAgenciesByType(id);
    return res.json({ status: 'success', message: 'Summon type retrieved', data: { ...row, agencies } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch summon type', data: null });
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
        await complianceModel.createSummonTypeAgency({ type_id: id, agency_id: ag }).catch(() => { });
      }
    }
    return res.status(201).json({ status: 'success', message: 'Summon type created', data: { id } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create summon type', data: null });
  }
};

export const updateSummonType = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
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
        if (!currentIds.includes(aid)) await complianceModel.createSummonTypeAgency({ type_id: id, agency_id: aid }).catch(() => { });
      }
      // delete extras
      for (const c of current) {
        if (!desired.includes(Number(c.agency_id))) await complianceModel.deleteSummonTypeAgency(Number(c.id)).catch(() => { });
      }
    }
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update summon type', data: null });
  }
};

export const deleteSummonType = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await complianceModel.deleteSummonType(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete summon type', data: null });
  }
};

/* ====== SUMMON AGENCIES ====== */
export const getSummonAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonAgencies();
    return res.json({ status: 'success', message: 'Summon agencies retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch summon agencies', data: null });
  }
};

export const getSummonAgencyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await complianceModel.getSummonAgencyById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Summon agency not found', data: null });
    return res.json({ status: 'success', message: 'Summon agency retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch summon agency', data: null });
  }
};

export const createSummonAgency = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await complianceModel.createSummonAgency(data);
    return res.status(201).json({ status: 'success', message: 'Summon agency created', data: { id } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create summon agency', data: null });
  }
};

export const updateSummonAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const data: any = req.body || {};
    await complianceModel.updateSummonAgency(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update summon agency', data: null });
  }
};

export const deleteSummonAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await complianceModel.deleteSummonAgency(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete summon agency', data: null });
  }
};

/* ====== SUMMON TYPE <-> AGENCY MAPPINGS ====== */
export const getSummonTypeAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonTypeAgencies();
    return res.json({ status: 'success', message: 'Mappings retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch mappings', data: null });
  }
};

export const getSummonTypeAgencyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await complianceModel.getSummonTypeAgencyById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Mapping not found', data: null });
    return res.json({ status: 'success', message: 'Mapping retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch mapping', data: null });
  }
};

export const createSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await complianceModel.createSummonTypeAgency(data);
    return res.status(201).json({ status: 'success', message: 'Mapping created', data: { id } });
  } catch (e) {
    return res.status(400).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create mapping', data: null });
  }
};

export const updateSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const data: any = req.body || {};
    await complianceModel.updateSummonTypeAgency(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('exists')) return res.status(400).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update mapping', data: null });
  }
};

export const deleteSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await complianceModel.deleteSummonTypeAgency(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete mapping', data: null });
  }
};

// Return agencies that belong to a summon type (for chainable select)
export const getAgenciesByType = async (req: Request, res: Response) => {
  try {
    const typeId = Number(req.params.typeId || req.query.typeId);
    if (!typeId) return res.status(400).json({ status: 'error', message: 'Invalid type id' });
    const rows = await complianceModel.getAgenciesByType(typeId);
    return res.json({ status: 'success', message: 'Agencies retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch agencies by type', data: null });
  }
};

// Return all types with their assigned agencies (for initial load)
export const getSummonTypesWithAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getSummonTypesWithAgencies();
    return res.json({ status: 'success', message: 'Types with agencies retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch types with agencies', data: null });
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
    if (statusParam !== undefined && statusParam !== '' && !['active', 'inactive', '1', '0'].includes(statusParam)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status filter. Use active or inactive', data: null });
    }

  const rows = await complianceModel.getAssessmentCriteria();

    // If no filters, return raw rows
    if ((!statusParam || String(statusParam).trim() === '') && (!typeParam || String(typeParam).trim() === '') && (ownershipParam === undefined)) {
      const count = Array.isArray(rows) ? rows.length : 0;
      return res.json({ status: 'success', message: `Assessment criteria retrieved (${count})`, data: rows });
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
  return res.json({ status: 'success', message: `Assessment criteria retrieved (${count})`, data: filtered });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria', data: null });
  }
};

export const getAssessmentCriteriaById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await complianceModel.getAssessmentCriteriaById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment criteria not found', data: null });
    return res.json({ status: 'success', message: 'Assessment criteria retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria', data: null });
  }
};

export const createAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const qset_id = await complianceModel.createAssessmentCriteria(data);
    return res.status(201).json({ status: 'success', message: 'Assessment criteria created', data: { qset_id } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create assessment criteria', data: null });
  }
};

export const updateAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const data: any = req.body || {};
    await complianceModel.updateAssessmentCriteria(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update assessment criteria', data: null });
  }
};

export const deleteAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await complianceModel.deleteAssessmentCriteria(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete assessment criteria', data: null });
  }
};

export const reorderAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const qset_id = Number(req.params.id);
    if (!qset_id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const newOrderRaw = req.body && (req.body.qset_order ?? req.body.newOrder ?? req.body.order);
    if (newOrderRaw === undefined || newOrderRaw === null) return res.status(400).json({ status: 'error', message: 'new qset_order is required' });
    const newOrder = Number(newOrderRaw);
    if (!Number.isFinite(newOrder) || newOrder < 1) return res.status(400).json({ status: 'error', message: 'Invalid new qset_order' });

    await complianceModel.reorderAssessmentCriteria(qset_id, newOrder);
    return res.json({ status: 'success', message: 'Reordered' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to reorder assessment criteria', data: null });
  }
};


// ========== ASSESSMENT CRITERIA OWNERSHIP ==========
// GET /assessments/criteria/ownerships -> list all ownerships
export const getAssessmentCriteriaOwnerships = async (req: Request, res: Response) => {
  try {
    const rows = await complianceModel.getAssessmentCriteriaOwnerships();
    return res.json({ status: 'success', message: `Assessment criteria ownerships retrieved (${rows.length})`, data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria ownerships', data: null });
  }
};

//get by id
export const getAssessmentCriteriaOwnershipById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
    const row = await complianceModel.getAssessmentCriteriaOwnershipById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment criteria ownership not found', data: null });
    return res.json({ status: 'success', message: 'Assessment criteria ownership retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria ownership', data: null });
  }
};

//add a new ownership member
export const createAssessmentCriteriaOwnership = async (req: Request, res: Response) => {
  try {
    const { ramco_id, department_id, status } = req.body || {};
    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value', data: null });
    }
    // Store status as string
    await complianceModel.createAssessmentCriteriaOwnership({ ramco_id, department_id, status });
    return res.status(201).json({ status: 'success', message: 'Assessment criteria ownership created', data: { ramco_id, department_id, status } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create assessment criteria ownership', data: null });
  }
};

// PUT /assessments/criteria/:id/ownership -> set ownership for a single criteria
export const updateAssessmentCriteriaOwnership = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
    const { ownership, status } = req.body || {};
    if (ownership !== null && (ownership === undefined || Number.isNaN(Number(ownership)))) {
      return res.status(400).json({ status: 'error', message: 'Invalid ownership value', data: null });
    }
    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value', data: null });
    }
    await complianceModel.updateAssessmentCriteria(id, { ownership, qset_stat: status } as any);
    return res.json({ status: 'success', message: 'Ownership and status updated', data: null });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update ownership', data: null });
  }
};

//delete ownership
export const deleteAssessmentCriteriaOwnership = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
    // Check if ownership exists in any criteria
    const rows = await complianceModel.getAssessmentCriteria();
    const ownerships = Array.from(new Set(rows?.map((r: any) => r.ownership).filter(Boolean)));
    if (!ownerships.includes(id)) {
      return res.status(404).json({ status: 'error', message: 'Ownership not found', data: null });
    }
  // Remove ownership from all criteria that have it
    for (const r of rows) {
      if (r.ownership === id) {
        // ensure qset_id is a valid number before calling the model
        const qsetId = (r && r.qset_id !== undefined && r.qset_id !== null) ? Number(r.qset_id) : NaN;
        if (!Number.isFinite(qsetId) || qsetId <= 0) continue;
        await complianceModel.updateAssessmentCriteria(qsetId, { ownership: null } as any);
      }
    }
    return res.json({ status: 'success', message: 'Ownership deleted from all criteria', data: null });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete ownership', data: null });
  }
}

/* ========== ASSESSMENTS (parent) CONTROLLERS ========== */
export const getAssessments = async (req: Request, res: Response) => {
  try {
    // Parse optional year and asset filter from query params
    const yearParam = req.query.year as string;
    const assetParam = req.query.asset as string;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const asset_id = assetParam ? parseInt(assetParam, 10) : undefined;

    // Validate year if provided
    if (yearParam && (isNaN(year!) || year! < 1900 || year! > new Date().getFullYear() + 10)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid year parameter. Must be between 1900 and current year + 10.',
        data: null
      });
    }

    // Validate asset_id if provided
    if (assetParam && isNaN(asset_id!)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid asset parameter. Must be a valid number.',
        data: null
      });
    }

    const rows = await complianceModel.getAssessments(year, asset_id);

    // enrich asset_id into full asset object (reuse same enrichment pattern as summons)
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    const assets = Array.isArray(assetsRaw) ? (assetsRaw as any[]) : [];
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
      if (r.asset_id && assetMap.has(r.asset_id)) {
        const a = assetMap.get(r.asset_id);
        // compute purchase_date and age if available
        const purchase_date = a.purchase_date || a.pur_date || a.purchaseDate || null;
        let age: number | null = null;
        if (purchase_date) {
          const pd = new Date(String(purchase_date));
          if (!isNaN(pd.getTime())) {
            const diffMs = Date.now() - pd.getTime();
            age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
          }
        }
        const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
        const owner = ownerRamco && employeeMap.has(ownerRamco) ? { ramco_id: ownerRamco, full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null } : null;
        asset = {
          id: r.asset_id,
          register_number: a.register_number || a.vehicle_regno || null,
          purchase_date,
          age,
          costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
          location: (() => {
            const locId = a.location_id ?? a.location?.id ?? null;
            if (!locId) return null;
            const found = locationMap.get(locId);
            return found ? { id: locId, code: found.code || found.name || null } : null;
          })(),
          owner
        };
      }
      // omit reg_no, vehicle_id, asset_id, a_loc, ownership, loc_id, location_id from response (these are internal identifiers)
      const { reg_no, vehicle_id, asset_id, a_loc, ownership, loc_id, location_id, ...clean } = r as any;
      // attach assessed_location resolved from location_id (if present)
      const assessed_location = (r.location_id && locationMap.has(r.location_id)) ? (() => {
        const l = locationMap.get(r.location_id);
        return { id: r.location_id, code: l.code || l.name || null };
      })() : null;
      
      // Convert upload paths to full public URLs
      return { 
        ...clean, 
        asset, 
        assessed_location,
        // Convert attachment fields to full URLs
        a_upload: toPublicUrl(clean.a_upload),
        a_upload2: toPublicUrl(clean.a_upload2),
        a_upload3: toPublicUrl(clean.a_upload3),
        a_upload4: toPublicUrl(clean.a_upload4),
      };
    });

    return res.json({ status: 'success', message: 'Assessments retrieved', data });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessments', data: null });
  }
};

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await complianceModel.getAssessmentById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment not found', data: null });
    // also fetch child details and include them
    const details = await complianceModel.getAssessmentDetails(id).catch(() => []);

    // load assessment criteria to resolve adt_item (qset_id) -> qset_desc
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    for (const c of criteria) if (c && c.qset_id) qsetMap.set(Number(c.qset_id), c.qset_desc || null);

    // enrich asset_id into full asset object (reuse same enrichment pattern as other endpoints)
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);
    const assets = Array.isArray(assetsRaw) ? (assetsRaw as any[]) : [];
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
      let age: number | null = null;
      if (purchase_date) {
        const pd = new Date(String(purchase_date));
        if (!isNaN(pd.getTime())) {
          const diffMs = Date.now() - pd.getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
        }
      }
      const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
      const owner = ownerRamco && employeeMap.has(ownerRamco) ? { ramco_id: ownerRamco, full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null } : null;
      asset = {
        id: (row as any).asset_id,
        register_number: a.register_number || a.vehicle_regno || null,
        purchase_date,
        age,
        costcenter: a.costcenter_id && costcenterMap.has(a.costcenter_id) ? { id: a.costcenter_id, name: costcenterMap.get(a.costcenter_id).name } : null,
        location: (() => {
          const locId = a.location_id ?? a.location?.id ?? null;
          if (!locId) return null;
          const found = locationMap.get(locId);
          return found ? { id: locId, code: found.code || found.name || null } : null;
        })(),
        owner
      };
    }

    // attach qset_desc to each detail (if available)
    const enrichedDetails = (Array.isArray(details) ? details : []).map((d: any) => {
      const qid = d && d.adt_item ? Number(d.adt_item) : null;
      const qset_desc = qid && qsetMap.has(qid) ? qsetMap.get(qid) : null;
      const qset_type = qid && qsetMap.has(qid) ? ((criteria.find((c: any) => Number(c.qset_id) === qid) || {}).qset_type || null) : null;
      // remove internal ids from detail response
      const { vehicle_id, asset_id, ...rest } = d || {};
      return { 
        ...rest, 
        qset_desc, 
        qset_type,
        // Convert detail image URL to full path
        adt_image: toPublicUrl(rest.adt_image)
      };
    });

    // omit internal fields before returning
    const { reg_no, vehicle_id, asset_id, a_loc, ownership, loc_id, location_id, ...cleanRow } = row as any;
    const assessment_location = ((row as any).location_id && locationMap.has((row as any).location_id)) ? (() => {
      const l = locationMap.get((row as any).location_id);
      return { id: (row as any).location_id, code: l.code || l.name || null };
    })() : null;

    // Convert upload paths to full public URLs
    const responseData = {
      ...cleanRow,
      asset,
      assessment_location,
      details: enrichedDetails,
      // Convert attachment fields to full URLs
      a_upload: toPublicUrl(cleanRow.a_upload),
      a_upload2: toPublicUrl(cleanRow.a_upload2),
      a_upload3: toPublicUrl(cleanRow.a_upload3),
      a_upload4: toPublicUrl(cleanRow.a_upload4),
    };

    return res.json({ status: 'success', message: 'Assessment retrieved', data: responseData });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment', data: null });
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
            details = keys.map(k => (body.details as any)[k]);
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
        let idx: number | null = null;
        let field: string | null = null;
        for (const re of keyPatterns) {
          const m = re.exec(k);
          if (m) { idx = Number(m[1]); field = m[2]; break; }
        }
        if (idx === null || field === null) continue;
        if (!indexedMap.has(idx)) indexedMap.set(idx, {});
        const val = vRaw as any;
        if (['adt_item', 'adt_ncr', 'adt_rate2', 'vehicle_id'].includes(field)) {
          const num = Number(val);
          (indexedMap.get(idx) as any)[field] = isNaN(num) ? null : num;
        } else {
          (indexedMap.get(idx) as any)[field] = val;
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
    const persistDetailFile = async (file: Express.Multer.File, index: number): Promise<string | null> => {
      try {
        const tempPath = file.path;
        const ext = path.extname(file.originalname || tempPath) || '';
        const filename = `assess-detail-${assessId}-${index}-${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`;
        const base = await getUploadBase();
        const destDir = path.join(base, 'compliance', 'assessment');
        await fsPromises.mkdir(destDir, { recursive: true });
        const destPath = path.join(destDir, filename);
        await safeMove(tempPath, destPath);
        return path.posix.join('uploads', 'compliance', 'assessment', filename);
      } catch (err) {
        console.error('persistDetailFile error:', err);
        return null;
      }
    };

    for (let i = 0; i < details.length; i++) {
      const d = { ...details[i] } as any;
      d.assess_id = assessId;
      let attachedPath: string | null = null;

      // Strategy 1: adt_image_<index>
      if (!attachedPath) {
        const specific = filesByField.get(`adt_image_${i}`);
        if (specific && specific.length > 0) {
          attachedPath = await persistDetailFile(specific[0], i);
        }
      }

      // Strategy 2: array style field (same index)
      if (!attachedPath && adtImageArray.length > 0) {
        const sel = adtImageArray[i] || null;
        if (sel) attachedPath = await persistDetailFile(sel, i);
      }

      // Strategy 3: originalname equals provided d.adt_image (legacy behavior)
      if (!attachedPath && d.adt_image) {
        const matches = filesByOriginal.get(String(d.adt_image)) || [];
        if (matches.length > 0) {
          attachedPath = await persistDetailFile(matches[0], i);
        }
      }

      // Strategy 4: generic fallback field detail_<index>_image
      if (!attachedPath) {
        const generic = filesByField.get(`detail_${i}_image`);
        if (generic && generic.length > 0) {
          attachedPath = await persistDetailFile(generic[0], i);
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
        const { subject, html, text } = renderVehicleAssessmentNotification({
          asset: { id: asset?.id || assetId, code: asset?.register_number || asset?.asset_code || String(assetId), name: asset?.model_name, ramco_id: asset?.ramco_id },
          driver: { ramco_id: driver?.ramco_id || '', full_name: driver?.full_name || driver?.name || '', email: toEmail },
          assessment: { id: assessId, date: String(assessmentDate || ''), remark: (assess as any).a_remark, rate: (assess as any).a_rate, ncr: (assess as any).a_ncr },
          details: [],
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
        }).filter(Boolean) as Array<{ filename: string; path: string }>;

        try {
          await sendMail(toEmail, subject, html, { 
            text, 
            attachments,
            cc: supervisorEmail || undefined
          });
        } catch (mailErr) {
          console.error('createAssessment: mail send error', mailErr);
        }
      } catch (e) {
        // ignore email errors
      }
    })();

    return res.status(201).json({ status: 'success', message: 'Assessment created', data: { id: assessId } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create assessment', data: null });
  }
};

export const updateAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const data: any = req.body || {};
    await complianceModel.updateAssessment(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update assessment', data: null });
  }
};

export const deleteAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await complianceModel.deleteAssessment(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete assessment', data: null });
  }
};

// PUT /api/compliance/assessments/:id/acceptance
export const acceptAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid assessment id' });
    const { acceptance_status } = req.body;
    if (![1, 2].includes(Number(acceptance_status))) {
      return res.status(400).json({ status: 'error', message: 'Invalid acceptance_status (must be 1 or 2)' });
    }
    const acceptance_date = new Date();
    await complianceModel.updateAssessmentAcceptance(id, Number(acceptance_status), acceptance_date);
    return res.json({ status: 'success', message: 'Assessment acceptance updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update acceptance', data: null });
  }
};

/* ========== ASSESSMENT DETAILS (child) CONTROLLERS ========== */
export const getAssessmentDetails = async (req: Request, res: Response) => {
  try {
    const assess_id = Number(req.params.assessId || req.query.assess_id || req.query.assessId);
    if (!assess_id) return res.status(400).json({ status: 'error', message: 'Invalid assess_id' });
    const rows = await complianceModel.getAssessmentDetails(assess_id);
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    for (const c of criteria) if (c && c.qset_id) qsetMap.set(Number(c.qset_id), c.qset_desc || null);
    const enriched = (Array.isArray(rows) ? rows : []).map((r: any) => {
      const qid = r && r.adt_item ? Number(r.adt_item) : null;
      const qset_desc = qid && qsetMap.has(qid) ? qsetMap.get(qid) : null;
      const qset_type = qid && qsetMap.has(qid) ? ((criteria.find((c: any) => Number(c.qset_id) === qid) || {}).qset_type || null) : null;
      const { vehicle_id, asset_id, ...rest } = r || {};
      return { ...rest, qset_desc, qset_type };
    });
    return res.json({ status: 'success', message: 'Assessment details retrieved', data: enriched });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment details', data: null });
  }
};

export const getAssessmentDetailById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await complianceModel.getAssessmentDetailById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment detail not found', data: null });
    const criteriaRaw = await complianceModel.getAssessmentCriteria().catch(() => []);
    const criteria = Array.isArray(criteriaRaw) ? (criteriaRaw as any[]) : [];
    const qsetMap = new Map<number, string>();
    for (const c of criteria) if (c && c.qset_id) qsetMap.set(Number(c.qset_id), c.qset_desc || null);
    const qid = row && (row as any).adt_item ? Number((row as any).adt_item) : null;
    const qset_desc = qid && qsetMap.has(qid) ? qsetMap.get(qid) : null;
    const qset_type = qid && qsetMap.has(qid) ? ((criteria.find((c: any) => Number(c.qset_id) === qid) || {}).qset_type || null) : null;
    const { vehicle_id, asset_id, ...rest } = (row as any) || {};
    return res.json({ status: 'success', message: 'Assessment detail retrieved', data: { ...rest, qset_desc, qset_type } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment detail', data: null });
  }
};

export const createAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await complianceModel.createAssessmentDetail(data);
    return res.status(201).json({ status: 'success', message: 'Assessment detail created', data: { id } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to create assessment detail', data: null });
  }
};

export const updateAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const data: any = req.body || {};
    await complianceModel.updateAssessmentDetail(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update assessment detail', data: null });
  }
};

export const deleteAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await complianceModel.deleteAssessmentDetail(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete assessment detail', data: null });
  }
};
