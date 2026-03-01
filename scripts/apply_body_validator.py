"""Apply validateBody to key create handlers in billing and compliance controllers."""

# ── billingController.ts ─────────────────────────────────────────────────────

with open('src/p.billing/billingController.ts') as f:
    billing = f.read()

# 1. Add validateBody import after the env import
old = "import { BACKEND_URL, UPLOAD_BASE_PATH } from '../utils/env';"
new = ("import { BACKEND_URL, UPLOAD_BASE_PATH } from '../utils/env';\n"
       "import { validateBody } from '../utils/bodyValidator';")
billing = billing.replace(old, new, 1)

# 2. createFuelBilling — add validation before destructuring req.body
old_fuel = ("\t\t// Map frontend payload to backend model\n"
            "\t\tconst { details, diesel_amount, petrol_amount, stmt_count, stmt_date, stmt_diesel, stmt_disc, stmt_issuer, stmt_litre, stmt_no, stmt_ron95, stmt_ron97, stmt_stotal, stmt_total, stmt_total_km } = req.body;")
new_fuel = ("\t\tconst bodyErr = validateBody(req.body, ['stmt_issuer', 'stmt_date', 'stmt_no']);\n"
            "\t\tif (bodyErr) return res.status(400).json({ data: null, status: 'error', ...bodyErr });\n"
            "\t\t// Map frontend payload to backend model\n"
            "\t\tconst { details, diesel_amount, petrol_amount, stmt_count, stmt_date, stmt_diesel, stmt_disc, stmt_issuer, stmt_litre, stmt_no, stmt_ron95, stmt_ron97, stmt_stotal, stmt_total, stmt_total_km } = req.body;")
billing = billing.replace(old_fuel, new_fuel, 1)

# 3. createTempVehicleRecord — add validation before using req.body
old_temp = ("export const createTempVehicleRecord = async (req: Request, res: Response) => {\n"
            "\tconst payload = req.body;")
new_temp = ("export const createTempVehicleRecord = async (req: Request, res: Response) => {\n"
            "\tconst bodyErr = validateBody(req.body, []);\n"
            "\tif (bodyErr) return res.status(400).json({ data: null, status: 'error', ...bodyErr });\n"
            "\tconst payload = req.body;")
billing = billing.replace(old_temp, new_temp, 1)

# 4. createWorkshop — add validation before passing to model
old_ws = "\t\tconst insertId = await billingModel.createWorkshop(req.body);"
new_ws = ("\t\tconst bodyErr = validateBody(req.body, []);\n"
          "\t\tif (bodyErr) return res.status(400).json({ data: null, status: 'error', ...bodyErr });\n"
          "\t\tconst insertId = await billingModel.createWorkshop(req.body);")
billing = billing.replace(old_ws, new_ws, 1)

with open('src/p.billing/billingController.ts', 'w') as f:
    f.write(billing)
print('billing done')

# ── complianceController.ts ──────────────────────────────────────────────────

with open('src/p.compliance/complianceController.ts') as f:
    compliance = f.read()

# 1. Add validateBody import after errorUtils import
old = "import { getErrorMessage, isMysqlError } from '../utils/errorUtils';"
new = ("import { getErrorMessage, isMysqlError } from '../utils/errorUtils';\n"
       "import { validateBody } from '../utils/bodyValidator';")
compliance = compliance.replace(old, new, 1)

# 2. createSummon — replace unvalidated req.body with validateBody check
old_summon = ("    // Pass request body directly to the model (no payload construction here)\n"
              "    const data: any = req.body || {};\n"
              "    const id = await complianceModel.createSummon(data);")
new_summon = ("    const bodyErr = validateBody(req.body, ['asset_id', 'summon_no', 'summon_date']);\n"
              "    if (bodyErr) return res.status(400).json({ data: null, status: 'error', ...bodyErr });\n"
              "    const data = req.body as Record<string, unknown>;\n"
              "    const id = await complianceModel.createSummon(data as any);")
compliance = compliance.replace(old_summon, new_summon, 1)

with open('src/p.compliance/complianceController.ts', 'w') as f:
    f.write(compliance)
print('compliance done')

# ── purchaseController.ts ────────────────────────────────────────────────────

with open('src/p.purchase/purchaseController.ts') as f:
    purchase = f.read()

# Check if validateBody import already present
if "validateBody" not in purchase:
    old = "import { getErrorMessage } from '../utils/errorUtils';"
    new = ("import { getErrorMessage } from '../utils/errorUtils';\n"
           "import { validateBody } from '../utils/bodyValidator';")
    purchase = purchase.replace(old, new, 1)

# createPurchaseRequest — add validateBody as pre-flight before existing manual validation
old_pr = ("    const body = req.body || {};\n"
          "    const payload: any = {")
new_pr = ("    const bodyErr = validateBody(req.body, ['costcenter_id', 'pr_date', 'ramco_id', 'request_type']);\n"
          "    if (bodyErr) return res.status(400).json({ data: null, status: 'error', ...bodyErr });\n"
          "    const body = req.body || {};\n"
          "    const payload: any = {")
purchase = purchase.replace(old_pr, new_pr, 1)

# createPurchaseAssetsRegistry already has: if (!purchaseId || !Array.isArray(assets)...)
# No change needed — already validated.

with open('src/p.purchase/purchaseController.ts', 'w') as f:
    f.write(purchase)
print('purchase done')
