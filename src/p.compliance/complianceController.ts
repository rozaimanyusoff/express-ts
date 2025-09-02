import { Request, Response } from 'express';
import * as summonModel from './complianceModel';
import * as assetModel from '../p.asset/assetModel';
import { sendMail } from '../utils/mailer';
import { renderSummonNotification } from '../utils/emailTemplates/summonNotification';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Determine upload base path.
// Priority: UPLOAD_BASE_PATH (if set), existing 'uploads' directory (legacy), else ensure 'upload' directory in project
const getUploadBase = async (): Promise<string> => {
  const envBase = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : '';
  const projectRoot = process.cwd();
  if (envBase) {
    // use env value as-is when provided (user requested uploads be placed under UPLOAD_BASE_PATH/uploads/...)
    return envBase;
  }

  const legacy = path.join(projectRoot, 'uploads');
  try {
    const stat = await fsPromises.stat(legacy).catch(() => null);
    if (stat && stat.isDirectory()) return legacy;
  } catch (e) {
    // ignore
  }

  const fallback = path.join(projectRoot, 'upload');
  await fsPromises.mkdir(fallback, { recursive: true }).catch(() => {});
  return fallback;
};

// Safe move helper: try rename, fall back to copy+unlink when crossing devices (EXDEV)
const safeMove = async (src: string, dest: string) => {
  try {
    await fsPromises.rename(src, dest);
    return;
  } catch (err: any) {
    if (err && err.code === 'EXDEV') {
      // cross-device, copy + unlink
      await fsPromises.copyFile(src, dest);
      await fsPromises.unlink(src).catch(() => {});
      return;
    }
    throw err;
  }
};

// Helper to normalize a temp file path into stored relative path
function normalizeStoredPath(filePath?: string | null): string | null {
  if (!filePath) return null;
  const filename = path.basename(String(filePath).replace(/\\/g, '/'));
  return `uploads/compliance/summon/${filename}`;
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

    res.json({ status: 'success', message: 'Summon retrieved', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to fetch summon', data: null });
  }
};

export const createSummon = async (req: Request, res: Response) => {
  try {
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

  // summon_dt is not set from the payload here; keep summon_date and summon_time as separate fields

    if (body.myeg_date !== undefined) payload.myeg_date = body.myeg_date ? String(body.myeg_date).trim() : null;

    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = (path.extname(originalName) || path.extname(tempPath) || '').toLowerCase();
      if (!['.pdf', '.png'].includes(ext)) { await fsPromises.unlink(tempPath).catch(() => {}); return res.status(400).json({ status: 'error', message: 'Only PDF and PNG uploads are allowed' }); }
      const normalized = normalizeStoredPath(tempPath);
      if (normalized) payload.summon_upl = normalized as string;
    }

    const id = await summonModel.createSummon(payload);

    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = path.extname(originalName) || path.extname(tempPath) || '';
  const filename = `summon-${id}-${Date.now()}${ext}`;
  const base = await getUploadBase();
  const destDir = path.join(base, 'uploads', 'compliance', 'summon');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await safeMove(tempPath, destPath);
      const storedRel = path.posix.join('uploads', 'compliance', 'summon', filename);
      await summonModel.updateSummon(id, { summon_upl: storedRel });
    }

    // After creation, try to resolve driver email by ramco_id and send notification
    (async () => {
      try {
        const created = await summonModel.getSummonById(id);
  const ramco = created?.ramco_id || null;
        if (ramco) {
          const emp = await assetModel.getEmployeeByRamco(String(ramco));
          const toEmail = emp?.email || created?.v_email || null;
          if (toEmail) {
            const html = renderSummonNotification({
              driverName: emp?.full_name || emp?.name || null,
              smn_id: created?.smn_id || id,
              summon_no: created?.summon_no || null,
              summon_dt: created?.summon_dt || null,
              summon_loc: created?.summon_loc || null,
              summon_amt: created?.summon_amt || null,
              summon_agency: created?.summon_agency || null,
            });
            await sendMail(toEmail, `Summon notification #${created?.smn_id || id}`, html).catch(() => {});
            // mark emailStat = 1
            await summonModel.updateSummon(id, { emailStat: 1 }).catch(() => {});
          }
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
  const destDir = path.join(base2, 'uploads', 'compliance', 'summon');
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

export const deleteSummon = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await summonModel.getSummonById(id);
    const prevFile = (existing as any)?.summon_upl || (existing as any)?.summon_receipt || (existing as any)?.attachment_path || null;
    if (prevFile) {
  const base3 = await getUploadBase();
  const rel = String(prevFile).replace(/^\/+/, '');
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
