import * as assetModel from '../p.asset/assetModel';
import * as billingModel from '../p.billing/billingModel';
import * as maintenanceModel from '../p.maintenance/maintenanceModel';

// Helper: fetch raw record from model and resolve nested lookups into a consistent shape
export async function resolveVehicleMtnRecord(id: number) {
  const record = await maintenanceModel.getVehicleMtnRequestById(Number(id));
  if (!record) return null;

  const [assetsRaw, categoriesRaw, brandsRaw, modelsRaw, costcentersRaw, departmentsRaw, locationsRaw, workshopsRaw, employeesRaw, svcTypeRaw] = await Promise.all([
    assetModel.getAssets(),
    assetModel.getCategories(),
    assetModel.getBrands(),
    assetModel.getModels(),
    assetModel.getCostcenters(),
    (assetModel as any).getDepartments ? (assetModel as any).getDepartments() : Promise.resolve([]),
    assetModel.getLocations(),
    billingModel.getWorkshops(),
    assetModel.getEmployees(),
    maintenanceModel.getServiceTypes()
  ]);

  const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const departments = Array.isArray(departmentsRaw) ? (departmentsRaw) : [];
  const locations = Array.isArray(locationsRaw) ? locationsRaw : [];
  const workshops = Array.isArray(workshopsRaw) ? workshopsRaw : [];
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const svcTypes = Array.isArray(svcTypeRaw) ? svcTypeRaw : [];

  const assetMap = new Map(assets.map((asset: any) => [asset.id, asset]));
  const categoryMap = new Map(categories.map((cat: any) => [cat.id, cat]));
  const brandMap = new Map(brands.map((brand: any) => [brand.id, brand]));
  const modelMap = new Map(models.map((m: any) => [m.id, m]));
  const ccMap = new Map(costcenters.map((cc: any) => [cc.id, cc]));
  const locationMap = new Map(locations.map((loc: any) => [loc.id, loc]));
  const deptMap = new Map(departments.map((d: any) => [Number(d.id), d]));
  const wsMap = new Map(workshops.map((ws: any) => [ws.ws_id, ws]));
  const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  const svcTypeMap = new Map(svcTypes.map((svc: any) => [svc.svcTypeId, svc]));

  const svcTypeIds = (record as any).svc_opt ? (record as any).svc_opt.split(',').map((id: string) => parseInt(id.trim())) : [];
  const svcTypeArray = svcTypeIds
    .filter((id: number) => svcTypeMap.has(id))
    .map((id: number) => {
      const svcType = svcTypeMap.get(id);
      return {
        id: svcType.svcTypeId,
        name: svcType.svcType
      };
    });

  const resolvedRecord = {
    approval_by: employeeMap.has((record as any).approval) ? {
      name: (employeeMap.get((record as any).approval))?.full_name,
      ramco_id: (record as any).approval
    } : null,
    approval_date: (record as any).approval_date,
    asset: assetMap.has((record as any).asset_id) ? (() => {
      const a = assetMap.get((record as any).asset_id);
      return {
        age_years: (() => {
          if (!a?.purchase_date) return null;
          const pd = new Date(a.purchase_date);
          if (Number.isNaN(pd.getTime())) return null;
          const diffMs = Date.now() - pd.getTime();
          const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
          return years;
        })(),
        brand: a?.brand_id ? { id: a.brand_id, name: (brandMap.get(a.brand_id))?.name } : null,
        category: a?.category_id ? { id: a.category_id, name: (categoryMap.get(a.category_id))?.name } : null,
        classification: a?.classification,
        costcenter: a?.costcenter_id ? { id: a.costcenter_id, name: (ccMap.get(a.costcenter_id))?.name } : null,
        department: a?.department_id ? { id: a.department_id, name: (deptMap.get(Number(a.department_id)))?.name } : null,
        id: (record as any).asset_id,
        location: a?.location_id ? { id: a.location_id, name: (locationMap.get(a.location_id))?.name } : null,
        model: a?.model_id ? { id: a.model_id, name: (modelMap.get(a.model_id))?.name } : null,
        purchase_date: a?.purchase_date,
        record_status: a?.record_status,
        register_number: a?.register_number
      };
    })() : null,
    emailStat: (record as any).emailStat,
    form_upload_date: (record as any).form_upload_date,
    inv_status: (record as any).inv_status,
    recommendation_by: employeeMap.has((record as any).recommendation) ? {
      name: (employeeMap.get((record as any).recommendation))?.full_name,
      ramco_id: (record as any).recommendation
    } : null,
    recommendation_date: (record as any).recommendation_date,
    req_comment: (record as any).req_comment,
    req_date: (record as any).req_date,
    req_id: (record as any).req_id,
    requester: employeeMap.has((record as any).ramco_id) ? {
      contact: (employeeMap.get((record as any).ramco_id))?.contact,
      name: (employeeMap.get((record as any).ramco_id))?.full_name,
      ramco_id: (record as any).ramco_id
    } : null,
    status: (record as any).status,
    svc_type: svcTypeArray,
    upload_date: (record as any).upload_date,
    verification_date: (record as any).verification_date,
    workshop: wsMap.has((record as any).ws_id) ? {
      id: (record as any).ws_id,
      name: (wsMap.get((record as any).ws_id))?.ws_name
    } : null
  };

  return resolvedRecord;
}
