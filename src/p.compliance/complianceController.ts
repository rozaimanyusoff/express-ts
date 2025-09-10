import { Request, Response } from 'express';
import * as summonModel from './complianceModel';
import * as assetModel from '../p.asset/assetModel';
import { sendMail } from '../utils/mailer';
import { renderSummonNotification } from '../utils/emailTemplates/summonNotification';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { getUploadBase, safeMove, toPublicUrl } from '../utils/uploadUtil';


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
      if (!['.pdf', '.png'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and PNG uploads are allowed' }); }
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
      if (!['.pdf', '.png'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and PNG uploads are allowed' }); }
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
      if (!['.pdf', '.png'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and PNG uploads are allowed' }); }

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
