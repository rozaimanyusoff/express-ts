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
    await summonModel.updateAssessmentAcceptance(id, Number(acceptance_status), acceptance_date);
    return res.json({ status: 'success', message: 'Assessment acceptance updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update acceptance', data: null });
  }
};
import { Request, Response } from 'express';
import * as summonModel from './complianceModel';
import * as assetModel from '../p.asset/assetModel';
import { sendMail } from '../utils/mailer';
import { renderSummonNotification } from '../utils/emailTemplates/summonNotification';
import { renderSummonPaymentReceipt } from '../utils/emailTemplates/summonPaymentReceipt';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { getUploadBase, safeMove, toPublicUrl } from '../utils/uploadUtil';
import * as adminNotificationModel from '../p.admin/notificationModel';


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

export const getSummons = async (req: Request, res: Response) => {
  try {
    const rows = await summonModel.getSummons();
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

    const rows = await summonModel.getSummonById(id);
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
  const id = await summonModel.createSummon(data);

    // If there was an uploaded file, validate, move it into final storage and update the record
    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
  if (!['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg,gif,webp)' }); }
      const filename = `summon-${id}-${Date.now()}${ext}`;
      const base = await getUploadBase();
      const destDir = path.join(base, 'compliance', 'summon');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await safeMove(tempPath, destPath);
      const storedRel = path.posix.join('uploads', 'compliance', 'summon', filename);
      await summonModel.updateSummon(id, { summon_upl: storedRel }).catch(() => {});
    }

    // Fire-and-forget: try to send notification email (reuse logic from resend endpoint)
    (async () => {
      try {
        const created = await summonModel.getSummonById(id);
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
          await sendMail(toEmail, `Summon notification #${r?.smn_id || id}`, html);
          await summonModel.updateSummon(id, { emailStat: 1 }).catch(() => {});
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
  if (!['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg,gif,webp)' }); }
      const normalized = normalizeStoredPath(tempPath);
      if (normalized) payload.summon_upl = normalized as string;
    }

    await summonModel.updateSummon(id, payload);

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
  await summonModel.updateSummon(id, { summon_upl: stored });
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

    const existing = await summonModel.getSummonById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Summon not found', data: null });

    const payload: any = {};
    if (req.body && req.body.receipt_date !== undefined) payload.receipt_date = req.body.receipt_date ? String(req.body.receipt_date).trim() : null;

    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
  if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and common image uploads are allowed (png,jpg,jpeg)' }); }

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

    await summonModel.updateSummon(id, payload);
    // Notify admins via in-app notifications and optionally email
    (async () => {
      try {
        const created = await summonModel.getSummonById(id);
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
          try { await sendMail(ADMIN_EMAIL, `Summon payment received #${r?.smn_id || id}`, html); } catch(e) { console.error('admin email send failed', e); }
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

    const record = await summonModel.getSummonById(id);
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
      await summonModel.updateSummon(id, { emailStat: 1 }).catch(() => {});
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
    const existing = await summonModel.getSummonById(id);
    const prevFile = (existing as any)?.summon_upl || (existing as any)?.summon_receipt || (existing as any)?.attachment_path || null;
    if (prevFile) {
  const base3 = await getUploadBase();
  let rel = String(prevFile).replace(/^\/+/, '');
  if (rel.startsWith('uploads/')) rel = rel.replace(/^uploads\//, '');
  const full = path.join(base3, rel);
      await fsPromises.unlink(full).catch(() => {});
    }
    await summonModel.deleteSummon(id);
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
    const rows = await summonModel.getSummonTypes();
    // enrich with assigned agencies
    const out: any[] = [];
    for (const t of rows) {
      const agencies = await summonModel.getAgenciesByType(Number(t.id));
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
    const row = await summonModel.getSummonTypeById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Summon type not found', data: null });
  const agencies = await summonModel.getAgenciesByType(id);
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
  const id = await summonModel.createSummonType(payload);
    // if agency_ids provided, sync mappings
    if (Array.isArray(data.agency_ids) && data.agency_ids.length > 0) {
      const toAssign = data.agency_ids.map((v: any) => Number(v)).filter((v: number) => !!v);
      for (const ag of toAssign) {
        await summonModel.createSummonTypeAgency({ type_id: id, agency_id: ag }).catch(() => {});
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
  await summonModel.updateSummonType(id, payload);
    // sync agency assignments if provided (accept empty array to unassign all)
    if (Array.isArray(data.agency_ids)) {
      const desired = data.agency_ids.map((v: any) => Number(v)).filter((v: number) => !!v);
      // current mappings
      const current = await summonModel.getSummonTypeAgenciesByType(id);
      const currentIds = current.map(c => Number(c.agency_id));
      // create missing
      for (const aid of desired) {
        if (!currentIds.includes(aid)) await summonModel.createSummonTypeAgency({ type_id: id, agency_id: aid }).catch(() => {});
      }
      // delete extras
      for (const c of current) {
        if (!desired.includes(Number(c.agency_id))) await summonModel.deleteSummonTypeAgency(Number(c.id)).catch(() => {});
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
    await summonModel.deleteSummonType(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete summon type', data: null });
  }
};

/* ====== SUMMON AGENCIES ====== */
export const getSummonAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await summonModel.getSummonAgencies();
    return res.json({ status: 'success', message: 'Summon agencies retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch summon agencies', data: null });
  }
};

export const getSummonAgencyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await summonModel.getSummonAgencyById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Summon agency not found', data: null });
    return res.json({ status: 'success', message: 'Summon agency retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch summon agency', data: null });
  }
};

export const createSummonAgency = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await summonModel.createSummonAgency(data);
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
    await summonModel.updateSummonAgency(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update summon agency', data: null });
  }
};

export const deleteSummonAgency = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await summonModel.deleteSummonAgency(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete summon agency', data: null });
  }
};

/* ====== SUMMON TYPE <-> AGENCY MAPPINGS ====== */
export const getSummonTypeAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await summonModel.getSummonTypeAgencies();
    return res.json({ status: 'success', message: 'Mappings retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch mappings', data: null });
  }
};

export const getSummonTypeAgencyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await summonModel.getSummonTypeAgencyById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Mapping not found', data: null });
    return res.json({ status: 'success', message: 'Mapping retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch mapping', data: null });
  }
};

export const createSummonTypeAgency = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const id = await summonModel.createSummonTypeAgency(data);
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
    await summonModel.updateSummonTypeAgency(id, data);
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
    await summonModel.deleteSummonTypeAgency(id);
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
    const rows = await summonModel.getAgenciesByType(typeId);
    return res.json({ status: 'success', message: 'Agencies retrieved', data: rows });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch agencies by type', data: null });
  }
};

// Return all types with their assigned agencies (for initial load)
export const getSummonTypesWithAgencies = async (req: Request, res: Response) => {
  try {
    const rows = await summonModel.getSummonTypesWithAgencies();
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

    // Validate status if provided
    if (statusParam !== undefined && statusParam !== '' && !['active', 'inactive', '1', '0'].includes(statusParam)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status filter. Use active or inactive', data: null });
    }

    const rows = await summonModel.getAssessmentCriteria();

    // If no filters, return raw rows
    if ((!statusParam || String(statusParam).trim() === '') && (!typeParam || String(typeParam).trim() === '')) {
      return res.json({ status: 'success', message: 'Assessment criteria retrieved', data: rows });
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
      return okStatus && okType;
    });

    return res.json({ status: 'success', message: 'Assessment criteria retrieved', data: filtered });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria', data: null });
  }
};

export const getAssessmentCriteriaById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const row = await summonModel.getAssessmentCriteriaById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment criteria not found', data: null });
    return res.json({ status: 'success', message: 'Assessment criteria retrieved', data: row });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment criteria', data: null });
  }
};

export const createAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const data: any = req.body || {};
    const qset_id = await summonModel.createAssessmentCriteria(data);
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
    await summonModel.updateAssessmentCriteria(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update assessment criteria', data: null });
  }
};

export const deleteAssessmentCriteria = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await summonModel.deleteAssessmentCriteria(id);
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

    await summonModel.reorderAssessmentCriteria(qset_id, newOrder);
    return res.json({ status: 'success', message: 'Reordered' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to reorder assessment criteria', data: null });
  }
};

/* ========== ASSESSMENTS (parent) CONTROLLERS ========== */
export const getAssessments = async (req: Request, res: Response) => {
  try {
    // Parse optional year filter from query params
    const yearParam = req.query.year as string;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    
    // Validate year if provided
    if (yearParam && (isNaN(year!) || year! < 1900 || year! > new Date().getFullYear() + 10)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid year parameter. Must be between 1900 and current year + 10.',
        data: null 
      });
    }

    const rows = await summonModel.getAssessments(year);

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
      return { ...clean, asset, assessed_location };
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
    const row = await summonModel.getAssessmentById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment not found', data: null });
  // also fetch child details and include them
  const details = await summonModel.getAssessmentDetails(id).catch(() => []);

  // load assessment criteria to resolve adt_item (qset_id) -> qset_desc
  const criteriaRaw = await summonModel.getAssessmentCriteria().catch(() => []);
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
      return { ...rest, qset_desc, qset_type };
    });

    // omit internal fields before returning
    const { reg_no, vehicle_id, asset_id, a_loc, ownership, loc_id, location_id, ...cleanRow } = row as any;
    const assessment_location = ((row as any).location_id && locationMap.has((row as any).location_id)) ? (() => {
      const l = locationMap.get((row as any).location_id);
      return { id: (row as any).location_id, code: l.code || l.name || null };
    })() : null;
    return res.json({ status: 'success', message: 'Assessment retrieved', data: { ...cleanRow, asset, assessment_location, details: enrichedDetails } });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to fetch assessment', data: null });
  }
};

export const createAssessment = async (req: Request, res: Response) => {
  try {
    // We expect multipart/form-data with files in req.files and JSON fields in req.body
    const body: any = req.body || {};

    // Parse details JSON if provided as string
    let details: any[] = [];
    if (body.details) {
      try {
        details = typeof body.details === 'string' ? JSON.parse(body.details) : body.details;
        if (!Array.isArray(details)) details = [];
      } catch (err) {
        return res.status(400).json({ status: 'error', message: 'Invalid details JSON', data: null });
      }
    }

    // Prepare parent payload: allow known assessment fields to be set via form fields
    const payload: any = { ...body };
    // Remove details from payload
    delete payload.details;

    // create parent assessment first to get assess_id
    const assessId = await summonModel.createAssessment(payload);

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
      await summonModel.updateAssessment(assessId, parentUpdate);
    }

    // Insert details: for each detail, try to find a file using these strategies in order:
    // 1) file field with name 'adt_image' (single) or 'adt_image_<index>' or 'adt_image_<adt_id>'
    // 2) file originalname matches detail.adt_image (frontend may send the filename string in detail)
    // 3) file field with name 'detail_<index>_image' etc.

    for (let i = 0; i < details.length; i++) {
      const d = { ...details[i] } as any;
      d.assess_id = assessId;

      // attempt to attach an image
      let attachedPath: string | null = null;
      // try field 'adt_image'
      const f1 = filesByField.get('adt_image');
      if (f1 && f1.length > 0) {
        // if multiple, try to pick one by index
        const sel = f1[i] || f1[0];
        const tempPath = sel.path;
        const ext = path.extname(sel.originalname || tempPath) || '';
        const filename = `assess-detail-${assessId}-${i}-${Date.now()}${ext}`;
        const base = await getUploadBase();
        const destDir = path.join(base, 'compliance', 'assessment');
        await fsPromises.mkdir(destDir, { recursive: true });
        const destPath = path.join(destDir, filename);
        await safeMove(tempPath, destPath);
        attachedPath = path.posix.join('uploads', 'compliance', 'assessment', filename);
      }

      // try matching by originalname if not yet attached and detail has adt_image filename
      if (!attachedPath && d.adt_image) {
        const matches = filesByOriginal.get(String(d.adt_image)) || [];
        if (matches.length > 0) {
          const sel = matches[0];
          const tempPath = sel.path;
          const ext = path.extname(sel.originalname || tempPath) || '';
          const filename = `assess-detail-${assessId}-${i}-${Date.now()}${ext}`;
          const base = await getUploadBase();
          const destDir = path.join(base, 'compliance', 'assessment');
          await fsPromises.mkdir(destDir, { recursive: true });
          const destPath = path.join(destDir, filename);
          await safeMove(tempPath, destPath);
          attachedPath = path.posix.join('uploads', 'compliance', 'assessment', filename);
        }
      }

      // fallback: look for field 'adt_image_<i>'
      if (!attachedPath) {
        const key = `adt_image_${i}`;
        const arr = filesByField.get(key) || [];
        if (arr.length > 0) {
          const sel = arr[0];
          const tempPath = sel.path;
          const ext = path.extname(sel.originalname || tempPath) || '';
          const filename = `assess-detail-${assessId}-${i}-${Date.now()}${ext}`;
          const base = await getUploadBase();
          const destDir = path.join(base, 'compliance', 'assessment');
          await fsPromises.mkdir(destDir, { recursive: true });
          const destPath = path.join(destDir, filename);
          await safeMove(tempPath, destPath);
          attachedPath = path.posix.join('uploads', 'compliance', 'assessment', filename);
        }
      }

      if (attachedPath) d.adt_image = attachedPath;

      // create detail row
      await summonModel.createAssessmentDetail(d);
    }

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
    await summonModel.updateAssessment(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update assessment', data: null });
  }
};

export const deleteAssessment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await summonModel.deleteAssessment(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete assessment', data: null });
  }
};

/* ========== ASSESSMENT DETAILS (child) CONTROLLERS ========== */
export const getAssessmentDetails = async (req: Request, res: Response) => {
  try {
    const assess_id = Number(req.params.assessId || req.query.assess_id || req.query.assessId);
    if (!assess_id) return res.status(400).json({ status: 'error', message: 'Invalid assess_id' });
    const rows = await summonModel.getAssessmentDetails(assess_id);
    const criteriaRaw = await summonModel.getAssessmentCriteria().catch(() => []);
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
    const row = await summonModel.getAssessmentDetailById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Assessment detail not found', data: null });
    const criteriaRaw = await summonModel.getAssessmentCriteria().catch(() => []);
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
    const id = await summonModel.createAssessmentDetail(data);
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
    await summonModel.updateAssessmentDetail(id, data);
    return res.json({ status: 'success', message: 'Updated' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to update assessment detail', data: null });
  }
};

export const deleteAssessmentDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    await summonModel.deleteAssessmentDetail(id);
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) return res.status(404).json({ status: 'error', message: e.message, data: null });
    return res.status(500).json({ status: 'error', message: e instanceof Error ? e.message : 'Failed to delete assessment detail', data: null });
  }
};
