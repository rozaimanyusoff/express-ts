# Code Quality Audit

> Scanned: 131 TypeScript source files across `src/`  
> Date: 2026-02-22  
> Purpose: Baseline for fine-tuning — issues ranked by impact

---

## Summary

| Category                          | Count         | Severity  |
| --------------------------------- | ------------- | --------- |
| `console.*` instead of logger     | 324 usages    | 🔴 High   |
| `any` type usages                 | 2,763 usages  | 🔴 High   |
| Response without `return`         | 576 instances | 🔴 High   |
| `SELECT *` queries                | 319 queries   | 🟡 Medium |
| Unguarded `process.env`           | 45 usages     | 🟡 Medium |
| Async calls inside loops          | ~20 instances | 🟡 Medium |
| Unvalidated `req.body` access     | 63 usages     | 🟡 Medium |
| `pool.query` without `await`      | 6 instances   | 🔴 High   |
| God files (>1000 lines)           | 10 files      | 🟡 Medium |
| Hardcoded localhost:3000 fallback | 8 instances   | 🟡 Medium |
| Dead code (`old.purchase/`)       | 1 module      | 🟢 Low    |
| No shared domain types            | —             | 🟡 Medium |
| No input validation library       | —             | 🔴 High   |

---

## 🔴 HIGH SEVERITY

---

### 1. `console.*` Used Instead of `logger` — 324 usages

The project has a structured Winston logger at `src/utils/logger.ts` but 324 console calls bypass it. This means those logs have no timestamps, no log levels, no file rotation, and won't appear in PM2's log files.

**Worst offenders:**

| File                                     | Count |
| ---------------------------------------- | ----- |
| `p.asset/assetController.ts`             | 71    |
| `p.maintenance/maintenanceController.ts` | 49    |
| `p.compliance/complianceController.ts`   | 31    |
| `p.admin/adminController.ts`             | 27    |
| `p.admin/adminModel.ts`                  | 19    |
| `p.user/userController.ts`               | 15    |
| `p.asset/assetModel.ts`                  | 14    |
| `utils/workflowService.ts`               | 13    |
| `p.purchase/purchaseController.ts`       | 12    |

**Fix pattern:**

```typescript
// ❌ Before
console.log("Processing transfer:", id);
console.error("Failed:", err);

// ✅ After
import logger from "../utils/logger.js";
logger.info("Processing transfer:", { id });
logger.error("Failed:", { err: err.message });
```

---

### 2. `any` Type — 2,763 Usages

TypeScript's `strict: true` is enabled but negated by pervasive `as any` casts. Every `any` is a hole in type safety where runtime errors cannot be caught at compile time.

**Worst offenders:**

| File                                     | Count |
| ---------------------------------------- | ----- |
| `p.asset/assetController.ts`             | 394   |
| `p.billing/billingController.ts`         | 369   |
| `p.maintenance/maintenanceController.ts` | 271   |
| `p.compliance/complianceController.ts`   | 235   |
| `p.purchase/purchaseController.ts`       | 174   |
| `p.asset/assetModel.ts`                  | 121   |
| `p.telco/telcoController.ts`             | 120   |

**Primary cause:** MySQL `pool.query()` returns `any[]` by default. The fix is to use typed RowDataPacket:

```typescript
// ❌ Before
const [rows]: any[] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
const user = rows[0]; // unknown shape

// ✅ After
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}

const [rows] = await pool.query<UserRow[]>("SELECT id, name, email FROM users WHERE id = ?", [id]);
const user = rows[0]; // typed
```

**Strategy:** Define interfaces in `src/types/` per domain and progressively replace `any` starting with the most-used models.

---

### 3. `res.json()` Without `return` — 576 Instances

When `res.json()` is called without `return`, code execution continues after the response is sent. This **doesn't throw immediately** but leads to:

- "Cannot set headers after they are sent" ERR_HTTP_HEADERS_SENT errors
- Unnecessary DB queries that run after the response
- Code paths that silently execute extra logic

This is exactly why `noImplicitReturns` in `tsconfig.json` surfaced 159 errors — the compiler caught these mixed return paths.

**Worst offenders:**

| File                                     | Count |
| ---------------------------------------- | ----- |
| `p.asset/assetController.ts`             | 111   |
| `p.billing/billingController.ts`         | 89    |
| `p.maintenance/maintenanceController.ts` | 83    |
| `p.stock/nrw/nrwStockController.ts`      | 72    |
| `p.stock/rt/stockController.ts`          | 53    |
| `p.purchase/purchaseController.ts`       | 41    |
| `p.telco/telcoController.ts`             | 37    |

**Fix pattern:**

```typescript
// ❌ Before
export const getItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ status: "error", message: "ID required" }); // execution continues!
  }
  const item = await model.getById(id);
  res.json({ status: "success", data: item });
};

// ✅ After
export const getItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ status: "error", message: "ID required" });
  }
  const item = await model.getById(id);
  res.json({ status: "success", data: item });
};
```

**How to re-enable the guard:** Once controllers are annotated with `: Promise<void>`, uncomment `"noImplicitReturns": true` in `tsconfig.json`.

---

### 4. `pool.query` Without `await` — 6 Instances

These are **silently dropped Promises** — the query fires but the result is never awaited, meaning:

- Errors are swallowed
- The function returns before the DB operation completes

**Location:** `src/p.telco/telcoModel.ts` lines 275, 280, 285, 290 (concurrent fire-and-forget block) and `src/p.admin/adminModel.ts`

```typescript
// ❌ Dangerous — no await, errors swallowed
pool.query<RowDataPacket[]>(`UPDATE ...`);

// ✅ If parallel is intended, use Promise.all
await Promise.all([pool.query(`UPDATE table1 ...`), pool.query(`UPDATE table2 ...`)]);
```

---

### 5. No Input Validation Library

`req.body` fields are used directly in controllers without schema validation. 63 unvalidated usages found across purchase, billing, compliance, and telco modules. This enables:

- Type coercion attacks (passing objects where strings expected)
- Missing required field errors surfacing as unhandled DB errors instead of clean 400 responses
- Inconsistent error messages

**Worst offenders:** `purchaseController.ts` (32), `billingController.ts` (14), `complianceController.ts` (5)

**Recommended:** Add `zod` for runtime validation

```typescript
import { z } from "zod";

const CreateAssetSchema = z.object({
  assetCode: z.string().min(1).max(50),
  assetName: z.string().min(1),
  categoryId: z.number().int().positive(),
});

export const createAsset = async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ status: "error", message: parsed.error.flatten() });
  }
  // parsed.data is fully typed from here
};
```

---

## 🟡 MEDIUM SEVERITY

---

### 6. `SELECT *` Queries — 319 Instances

Fetches every column on every query, including large text fields, blobs, and sensitive data (hashed passwords, PII). In cluster environments this has significant network and memory impact.

**Worst offenders:**

| File                              | Count |
| --------------------------------- | ----- |
| `p.asset/assetModel.ts`           | 69    |
| `p.billing/billingModel.ts`       | 44    |
| `p.stock/nrw/nrwStockModel.ts`    | 32    |
| `p.compliance/complianceModel.ts` | 28    |
| `p.telco/telcoModel.ts`           | 24    |

**Fix:** Explicitly name columns. Start with tables that have large text or binary columns (documents, notes, descriptions).

```typescript
// ❌ SELECT * FROM assets
// ✅ SELECT id, asset_code, asset_name, category_id, status, created_at FROM assets
```

---

### 7. No Pagination on List Endpoints

Only 156 uses of `LIMIT`/`offset`/`page` across 319 `SELECT *` list queries. Many `getAll*` style queries return unbounded result sets. In production with thousands of records this will cause:

- API response timeouts
- Memory spikes per request
- Frontend render hangs

**Fix:** Standardize a pagination utility:

```typescript
// src/utils/pagination.ts
export const parsePagination = (query: any) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};
```

---

### 8. Unguarded `process.env` Access — 45 Instances

45 `process.env.*` accesses with no fallback (`||`) and no null-check. If the variable is absent in production, these will pass `undefined` silently into JWT signing, email headers, and URL construction.

**Key examples:**

- `process.env.EMAIL_FROM` passed directly to nodemailer `from:` field (8 usages in authController)
- `process.env.JWT_SECRET` — guarded with `if (!process.env.JWT_SECRET)` in some places but not all
- `process.env.BACKEND_URL` in maintenanceController and mediaController

**Fix:** Validate all required env vars at startup:

```typescript
// src/utils/env.ts
const required = ["JWT_SECRET", "DB_HOST", "DB_NAME", "EMAIL_FROM", "SERVER_PORT"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
```

---

### 9. Async Calls Inside Loops (N+1 Pattern)

Confirmed in `src/p.telco/telcoController.ts` — `await telcoModel.getTelcoBillingDetailsById(b.id)` and `await telcoModel.createTelcoBillingDetail(detail)` are called inside `for...of` loops. Each iteration fires a separate DB round-trip.

**Fix:** Batch operations with `Promise.all` or use a single query with `IN (?)`:

```typescript
// ❌ N+1 — fires one query per item
for (const item of items) {
  const detail = await telcoModel.getDetailById(item.id);
}

// ✅ Single query
const ids = items.map((i) => i.id);
const details = await telcoModel.getDetailsByIds(ids);
```

---

### 10. God Files — Controllers Too Large

Controllers act as both orchestration layer AND business logic layer. Single-responsibility is violated.

| File                                     | Lines     |
| ---------------------------------------- | --------- |
| `p.asset/assetController.ts`             | **5,926** |
| `p.billing/billingController.ts`         | **4,558** |
| `p.compliance/complianceController.ts`   | **3,468** |
| `p.maintenance/maintenanceController.ts` | **3,311** |
| `p.asset/assetModel.ts`                  | **3,170** |
| `p.purchase/purchaseController.ts`       | **2,455** |
| `p.telco/telcoController.ts`             | **2,063** |

**Recommended split for large controllers:**

```
p.asset/
├── assetController.ts        → route handlers only (thin, delegates to services)
├── assetModel.ts             → raw SQL queries
├── assetService.ts           → business logic, orchestration    ← ADD THIS
└── assetTypes.ts             → interfaces for this domain       ← ADD THIS
```

---

### 11. Hardcoded `localhost:3000` Fallback — 8 Instances

The server runs on port **3030** but fallback URLs default to `3000`:

```typescript
// ❌ src/p.auth/adms/authController.ts
return "http://localhost:3000"; // Safe fallback

// ❌ src/p.media/mediaController.ts
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
```

This silently generates broken links in emails and webhooks during local development when `BACKEND_URL` is unset.

**Files affected:** `authController.ts` (2), `maintenanceController.ts` (5), `mediaController.ts` (1), `mediaModel.ts` (2)

**Fix:** Change all `localhost:3000` fallbacks to `localhost:3030`, or better, consolidate into a single env guard:

```typescript
// src/utils/env.ts
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3030";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
```

---

### 12. No Shared Domain Types (`src/types/` Underused)

`src/types/` contains only `express/` augmentation and `pdfkit.d.ts`. There are zero shared interfaces for domain entities (User, Asset, Maintenance, etc.). Every controller/model duplicates its own inline object shapes, leading to drift between layers.

**Fix:** Progressively add domain interfaces:

```
src/types/
├── express/          ← existing
├── domain/
│   ├── user.types.ts
│   ├── asset.types.ts
│   ├── billing.types.ts
│   └── maintenance.types.ts
```

---

## 🟢 LOW SEVERITY

---

### 13. Dead Code — `src/old.purchase/` Module

`src/old.purchase/` (purchaseController.ts, purchaseModel.ts, purchaseRoutes.ts) is present but the module is not imported in `app.ts`. It should be deleted to avoid confusion and to keep the module list clean.

```bash
rm -rf src/old.purchase/
```

---

### 14. Curl Example Comment in Production Controller

`src/p.maintenance/maintenanceController.ts` line 1061 contains a `curl` command embedded in a comment block inside production source code. Not harmful but indicates the file mixes documentation with implementation — belongs in `documentations/` instead.

---

### 15. `@types/*` Packages in `dependencies` (Not `devDependencies`)

`package.json` lists `@types/ioredis`, `@types/multer`, `@types/socket.io`, `@types/uuid` under `dependencies` instead of `devDependencies`. Type declaration packages are compile-time only and add unnecessary weight to production installs.

**Fix:**

```bash
npm install --save-dev @types/ioredis @types/multer @types/socket.io @types/uuid
```

---

## Fine-Tuning Roadmap

Suggested order of attack based on effort vs impact:

| Phase | Task                                               | Files                        | Effort    |
| ----- | -------------------------------------------------- | ---------------------------- | --------- |
| 1     | Add `: Promise<void>` to all controller signatures | 15 files                     | 2–3 hrs   |
| 1     | Enable `noImplicitReturns` in tsconfig             | tsconfig.json                | 0 hrs     |
| 1     | Fix `pool.query` missing `await`                   | telcoModel.ts, adminModel.ts | 30 min    |
| 1     | Move `@types/*` to devDependencies                 | package.json                 | 5 min     |
| 1     | Delete `old.purchase/` module                      | —                            | 5 min     |
| 2     | Replace all `console.*` with `logger.*`            | 15 files                     | 3–4 hrs   |
| 2     | Fix hardcoded `localhost:3000` fallbacks           | 5 files                      | 30 min    |
| 2     | Add startup env validation                         | New `src/utils/env.ts`       | 1 hr      |
| 3     | Add pagination utility + apply to list routes      | All models                   | 4–6 hrs   |
| 3     | Add `zod` schema validation on POST/PUT routes     | All controllers              | 6–8 hrs   |
| 4     | Replace `SELECT *` with explicit columns           | All models                   | 4–8 hrs   |
| 4     | Fix async-in-loops in telcoController.ts           | telcoController.ts           | 2–3 hrs   |
| 5     | Extract service layer from god-file controllers    | 7 files                      | 10–15 hrs |
| 5     | Create domain type interfaces in `src/types/`      | 7 modules                    | 4–6 hrs   |
| 6     | Replace `any` with typed interfaces                | All files                    | 10–20 hrs |
