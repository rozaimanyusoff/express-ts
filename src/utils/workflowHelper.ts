import * as assetModel from '../p.asset/assetModel';
import * as userModel from '../p.user/userModel';

interface WorkflowEmployee {
  email?: null | string;
  full_name?: null | string;
  ramco_id: string;
}

// Resolve the next PIC from workflows by module and level, with email via employee directory
export async function getWorkflowPic(moduleName: string, levelName: string): Promise<null | WorkflowEmployee> {
  try {
    const workflowsRaw = await userModel.getWorkflows();
    const list: any[] = Array.isArray(workflowsRaw) ? workflowsRaw : (workflowsRaw ? [workflowsRaw] : []);
    const mod = String(moduleName || '').trim().toLowerCase();
    const lvl = String(levelName || '').trim().toLowerCase();

    // Match by flexible field names and ignore-case
    const matches = list.filter((w: any) => {
      const moduleVal = String(w?.module_name ?? w?.module ?? '').trim().toLowerCase();
      const levelVal = String(w?.level_name ?? w?.level ?? w?.levelName ?? '').trim().toLowerCase();
      return moduleVal === mod && levelVal === lvl;
    });
    if (!matches.length) return null;

    // Prefer active ones first
    const sorted = matches.sort((a: any, b: any) => {
      const aActive = Number(a?.is_active ?? 1) ? 1 : 0;
      const bActive = Number(b?.is_active ?? 1) ? 1 : 0;
      return bActive - aActive;
    });
    const pick = sorted[0];

    // Resolve ramco id from multiple possible fields
    const ramco = String(
      pick?.ramco_id ?? pick?.employee?.ramco_id ?? pick?.emp_id ?? pick?.employee_id ?? ''
    ).trim();
    if (!ramco) return null;

    // Try to resolve email/name: workflow record may already include email/full_name
    let email: null | string = null;
    let full_name: null | string = null;
    try {
      const emp = await assetModel.getEmployeeByRamco(ramco);
      if (emp) {
        email = (emp as any).email ? String((emp as any).email) : null;
        full_name = (emp as any).full_name || (emp as any).name || null;
      }
    } catch {
      // ignore directory failure
    }

    if (!email) {
      email = pick?.email ?? pick?.employee?.email ?? null;
      if (email) email = String(email);
    }
    if (!full_name) {
      full_name = pick?.employee?.full_name || pick?.full_name || pick?.name || null;
      if (full_name) full_name = String(full_name);
    }

    return { email, full_name, ramco_id: ramco };
  } catch (e) {
     
    console.warn('getWorkflowPic failed', e);
    return null;
  }
}
