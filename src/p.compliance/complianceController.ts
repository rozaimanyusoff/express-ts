import { Request, Response } from 'express';
import * as summonModel from './complianceModel';
import * as assetModel from '../p.asset/assetModel';
import path from 'path';
import { promises as fsPromises } from 'fs';

// List summons
export const getSummons = async (req: Request, res: Response) => {
  try {
    const rows = await summonModel.getSummons();
    // map attachment to public URL if present
    const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    // fetch lookup data to enrich responses
    const [assetsRaw, costcentersRaw, locationsRaw, employeesRaw] = await Promise.all([
      // assetModel.getAssets may be heavy; use it anyway as caller requested
      assetModel.getAssets(),
      assetModel.getCostcenters(),
      assetModel.getLocations(),
      assetModel.getEmployees()
    ]);

    const assets = Array.isArray(assetsRaw) ? assetsRaw as any[] : [];
    const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw as any[] : [];
    const locations = Array.isArray(locationsRaw) ? locationsRaw as any[] : [];
    const employees = Array.isArray(employeesRaw) ? employeesRaw as any[] : [];

    const assetMap = new Map();
    for (const a of assets) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
    const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
    const locationMap = new Map(locations.map((l: any) => [l.id, l]));
    const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));

  const data = rows.map((r: any) => {
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

      // asset enrichment
      let asset = null;
      if (r.asset_id && assetMap.has(r.asset_id)) {
        const a = assetMap.get(r.asset_id);
        // resolve owner ramco id from possible fields on asset
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

      // employee enrichment
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
    const row = await summonModel.getSummonById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Summon not found', data: null });
  const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  const assetsRaw = Array.isArray(await assetModel.getAssets()) ? await assetModel.getAssets() as any[] : [];
  const costcentersRaw = await assetModel.getCostcenters();
  const locationsRaw = await assetModel.getLocations();
  const employeesRaw = await assetModel.getEmployees();

  const assetMap = new Map();
  for (const a of assetsRaw) { if (a.id) assetMap.set(a.id, a); if (a.asset_id) assetMap.set(a.asset_id, a); }
  const costcenterMap = new Map((Array.isArray(costcentersRaw) ? costcentersRaw : []).map((c: any) => [c.id, c]));
  const locationMap = new Map((Array.isArray(locationsRaw) ? locationsRaw : []).map((l: any) => [l.id, l]));
  const employeeMap = new Map((Array.isArray(employeesRaw) ? employeesRaw : []).map((e: any) => [e.ramco_id, e]));

  const makeUrl = (val: any) => {
    if (!val) return null;
    const s = String(val).trim();
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s.replace(/^\/+/, '');
    return `${base}/${s.replace(/^\/+/, '')}`;
  };
  const summon_upl = makeUrl((row as any).summon_upl || null);
  const summon_receipt = makeUrl((row as any).summon_receipt || null);
  const attachment_url = summon_upl || summon_receipt || null;

  let asset = null;
  if ((row as any).asset_id && assetMap.has((row as any).asset_id)) {
    const a = assetMap.get((row as any).asset_id);
    const ownerRamco = a.ramco_id ?? a.owner_ramco ?? a.owner?.ramco_id ?? a.assigned_to ?? a.employee_ramco ?? a.user_ramco ?? null;
    const owner = ownerRamco && employeeMap.has(ownerRamco) ? { ramco_id: ownerRamco, full_name: employeeMap.get(ownerRamco).full_name || employeeMap.get(ownerRamco).name || null } : null;
    asset = {
      id: (row as any).asset_id,
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

  const employee = (row as any).ramco_id && employeeMap.has((row as any).ramco_id) ? (() => {
    const e = employeeMap.get((row as any).ramco_id);
    return { ramco_id: (row as any).ramco_id, full_name: e.full_name || e.name || null, email: e.email || null, contact: e.contact_no || e.contact || null };
  })() : null;

  const { reg_no, f_name, v_email, ...restRow } = row as any;
  const data = { ...restRow, summon_upl, summon_receipt, attachment_url, asset, employee };
    res.json({ status: 'success', message: 'Summon retrieved', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to fetch summon', data: null });
  }
};

// Create summon (supports optional single file attachment under 'attachment')
export const createSummon = async (req: Request, res: Response) => {
  try {
    // Accept flexible fields from body matching the summon schema
    const payload: any = { ...req.body };
    if (!payload.summon_dt) payload.summon_dt = new Date().toISOString();

    // if multer stored a temp file, persist path now into `summon_upl`
    if ((req as any).file && (req as any).file.path) {
      const normalized = normalizeStoredPath((req as any).file.path);
      if (normalized) payload.summon_upl = normalized as string;
    }

    const id = await summonModel.createSummon(payload);

    // If a file was uploaded, move to canonical location including id
    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = path.extname(originalName) || path.extname(tempPath) || '';
      const filename = `summon-${id}-${Date.now()}${ext}`;
      const base = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : process.cwd();
      const destDir = path.join(base, 'upload', 'summons');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await fsPromises.rename(tempPath, destPath);
  const stored = `upload/summons/${filename}`;
  // store canonical filename into summon_upl column
  await summonModel.updateSummon(id, { summon_upl: stored });
    }

    res.status(201).json({ status: 'success', message: 'Summon created', data: { id } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err instanceof Error ? err.message : 'Failed to create summon', data: null });
  }
};

export const updateSummon = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
  // accept flexible update fields
  const update: any = { ...req.body };

    if ((req as any).file && (req as any).file.path) {
      const tempPath: string = (req as any).file.path;
      const originalName: string = (req as any).file.originalname || path.basename(tempPath);
      const ext = path.extname(originalName) || path.extname(tempPath) || '';
      const filename = `summon-${id}-${Date.now()}${ext}`;
      const base = process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : process.cwd();
      const destDir = path.join(base, 'upload', 'summons');
      await fsPromises.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await fsPromises.rename(tempPath, destPath);
      // remove previous file if exists (check multiple possible columns)
      try {
        const existing = await summonModel.getSummonById(id);
        const prevFile = (existing as any)?.summon_upl || (existing as any)?.summon_receipt || (existing as any)?.attachment_path || null;
        if (prevFile) {
          const prev = path.join(process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : process.cwd(), 'upload', 'summons', path.basename(String(prevFile)));
          await fsPromises.unlink(prev).catch(() => {});
        }
      } catch (e) {}
      update.summon_upl = `upload/summons/${filename}`;
    }

    await summonModel.updateSummon(id, update);
    res.json({ status: 'success', message: 'Summon updated', data: null });
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
      const full = path.join(process.env.UPLOAD_BASE_PATH ? String(process.env.UPLOAD_BASE_PATH) : process.cwd(), 'upload', 'summons', path.basename(String(prevFile)));
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

function normalizeStoredPath(filePath?: string | null): string | null {
  if (!filePath) return null;
  const filename = path.basename(String(filePath).replace(/\\/g, '/'));
  return `upload/summons/${filename}`;
}
