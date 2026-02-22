# Swagger / OpenAPI Documentation

> **Server:** `http://localhost:3030/api-docs` · **Schema:** `http://localhost:3030/swagger.json`

---

## Table of Contents

1. [Setup Status](#1-setup-status)
2. [Quick Start](#2-quick-start)
3. [Configuration Reference](#3-configuration-reference)
4. [JSDoc Patterns (Templates)](#4-jsdoc-patterns-templates)
   - [Tag Definition](#41-tag-definition-once-per-module)
   - [GET — List](#42-get--list-with-pagination)
   - [GET — By ID](#43-get--by-id)
   - [POST — Create](#44-post--create)
   - [PUT — Update](#45-put--update)
   - [DELETE — Remove](#46-delete--remove)
   - [Protected Endpoint](#47-protected-endpoint-bearer-token)
   - [File Upload](#48-file-upload-multipart)
   - [Query Filters](#49-get--filtered-search)
5. [Module Coverage](#5-module-coverage)
6. [Reusable Schemas](#6-reusable-schemas)
7. [Adding a New Module — 3 Steps](#7-adding-a-new-module--3-steps)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Setup Status

### Packages

| Package                     | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `swagger-ui-express`        | Serves interactive Swagger UI                   |
| `swagger-jsdoc`             | Parses JSDoc `@swagger` comments → OpenAPI spec |
| `@types/swagger-ui-express` | TypeScript types                                |
| `@types/swagger-jsdoc`      | TypeScript types                                |

### Core Files

| File                            | Role                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `src/utils/swagger.ts`          | OpenAPI 3.0 spec definition, server URLs, security schemes, reusable schemas |
| `src/app.ts`                    | Mounts `/api-docs` (UI) and `/swagger.json` (raw spec)                       |
| `src/p.auth/adms/authRoutes.ts` | ✅ Fully documented — use as reference                                       |

### Integration in `app.ts`

```typescript
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./utils/swagger.js";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/swagger.json", (req, res) => res.json(swaggerSpec));
```

### TypeScript Compilation

```
✅ npm run type-check → exit 0
```

---

## 2. Quick Start

```bash
# Start server
npm run dev

# Swagger UI (interactive)
open http://localhost:3030/api-docs

# Raw OpenAPI JSON
curl http://localhost:3030/swagger.json
```

### Testing an Endpoint

1. Open `http://localhost:3030/api-docs`
2. Click **Authorize** → paste your JWT token
3. Find your endpoint → click **Try it out**
4. Fill parameters → **Execute**

---

## 3. Configuration Reference

**File:** `src/utils/swagger.ts`

```typescript
import swaggerJsdoc from "swagger-jsdoc";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.SERVER_PORT || 3030;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Enterprise Management API",
      version: "1.0.0",
      description: "API documentation for the Enterprise Management System",
    },
    servers: [
      { url: `http://localhost:${PORT}/api`, description: "Development server" },
      { url: "https://api.company.com/api", description: "Production server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        /* see §6 */
      },
    },
  },
  apis: [
    "src/p.auth/adms/authRoutes.ts",
    // Add more route files here as you document them
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
```

### Adding a Route File

Open `src/utils/swagger.ts` and append to the `apis` array:

```typescript
apis: [
  "src/p.auth/adms/authRoutes.ts", // ✅ done
  "src/p.user/userRoutes.ts", // add this
  "src/p.asset/assetRoutes.ts", // add this
];
```

---

## 4. JSDoc Patterns (Templates)

Copy these directly into your route files.

---

### 4.1 Tag Definition (once per module)

```typescript
/**
 * @swagger
 * tags:
 *   name: ModuleName
 *   description: Brief description of what this module manages
 */
```

---

### 4.2 GET — List with Pagination

```typescript
/**
 * @swagger
 * /path:
 *   get:
 *     summary: Get all items
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/", tokenValidator, asyncHandler(controller.getAll));
```

---

### 4.3 GET — By ID

```typescript
/**
 * @swagger
 * /path/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", tokenValidator, asyncHandler(controller.getById));
```

---

### 4.4 POST — Create

```typescript
/**
 * @swagger
 * /path:
 *   post:
 *     summary: Create new item
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Example Name
 *               description:
 *                 type: string
 *               status:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.post("/", tokenValidator, asyncHandler(controller.create));
```

---

### 4.5 PUT — Update

```typescript
/**
 * @swagger
 * /path/{id}:
 *   put:
 *     summary: Update item
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:id", tokenValidator, asyncHandler(controller.update));
```

---

### 4.6 DELETE — Remove

```typescript
/**
 * @swagger
 * /path/{id}:
 *   delete:
 *     summary: Delete item
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", tokenValidator, asyncHandler(controller.delete));
```

---

### 4.7 Protected Endpoint (Bearer Token)

Add the `security` block to any endpoint that requires authentication:

```typescript
/**
 * @swagger
 * /path:
 *   post:
 *     summary: Protected action
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []         # ← this line makes it protected
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient permissions
 */
```

---

### 4.8 File Upload (Multipart)

```typescript
/**
 * @swagger
 * /path/upload:
 *   post:
 *     summary: Upload file
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 url:
 *                   type: string
 *       400:
 *         description: No file provided
 */
router.post("/upload", tokenValidator, upload.single("file"), asyncHandler(controller.upload));
```

---

### 4.9 GET — Filtered / Search

```typescript
/**
 * @swagger
 * /path/search:
 *   get:
 *     summary: Search items
 *     tags:
 *       - ModuleName
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *         description: Filter by status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", tokenValidator, asyncHandler(controller.search));
```

---

## 5. Module Coverage

| Module         | Route File                                 | Status     |
| -------------- | ------------------------------------------ | ---------- |
| Authentication | `src/p.auth/adms/authRoutes.ts`            | ✅ Done    |
| Users          | `src/p.user/userRoutes.ts`                 | ⏳ Pending |
| Assets         | `src/p.asset/assetRoutes.ts`               | ⏳ Pending |
| Maintenance    | `src/p.maintenance/maintenanceRoutes.ts`   | ⏳ Pending |
| Billing        | `src/p.billing/billingRoutes.ts`           | ⏳ Pending |
| Purchase       | `src/p.purchase/purchaseRoutes.ts`         | ⏳ Pending |
| Compliance     | `src/p.compliance/complianceRoutes.ts`     | ⏳ Pending |
| Training       | `src/p.training/trainingRoutes.ts`         | ⏳ Pending |
| Stock RT       | `src/p.stock/rt/stockRoutes.ts`            | ⏳ Pending |
| Stock NRW      | `src/p.stock/nrw/nrwStockRoutes.ts`        | ⏳ Pending |
| Project        | `src/p.project/projectRoutes.ts`           | ⏳ Pending |
| Telco          | `src/p.telco/telcoRoutes.ts`               | ⏳ Pending |
| Admin          | `src/p.admin/adminRoutes.ts`               | ⏳ Pending |
| Notifications  | `src/p.notification/notificationRoutes.ts` | ⏳ Pending |
| Media          | `src/p.media/mediaRoutes.ts`               | ⏳ Pending |
| Job Bank       | `src/p.jobbank/jobreposRoutes.ts`          | ⏳ Pending |
| WebStock       | `src/s.webstock/webstockRoutes.ts`         | ⏳ Pending |

**Estimated effort per module:** 20–45 minutes depending on endpoint count.

---

## 6. Reusable Schemas

These are pre-defined in `src/utils/swagger.ts` and available via `$ref`:

```typescript
// Usage in JSDoc
schema: $ref: "#/components/schemas/User";
```

| Schema            | Fields                                              |
| ----------------- | --------------------------------------------------- |
| `Error`           | `status: string`, `message: string`                 |
| `Success`         | `status: string`, `message: string`, `data: object` |
| `User`            | `id`, `name`, `email`, `userType`, `status`         |
| `LoginRequest`    | `emailOrUsername: string`, `password: string`       |
| `LoginResponse`   | `status`, `message`, `token`, `user`                |
| `RegisterRequest` | `name`, `email`, `contact`, `userType`              |
| `ActivateRequest` | `activationCode`, `password`, `confirmPassword`     |

### Adding a Custom Schema

In `src/utils/swagger.ts` under `components.schemas`:

```typescript
Asset: {
  type: 'object',
  properties: {
    id:        { type: 'integer' },
    assetCode: { type: 'string', example: 'AST-0001' },
    assetName: { type: 'string' },
    status:    { type: 'string', enum: ['active', 'inactive', 'transferred'] },
    createdAt: { type: 'string', format: 'date-time' }
  }
}
```

---

## 7. Adding a New Module — 3 Steps

### Step 1: Add JSDoc to the Route File

```typescript
// src/p.user/userRoutes.ts

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profiles
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", tokenValidator, asyncHandler(getAllUser));
```

### Step 2: Register the File in `swagger.ts`

```typescript
apis: [
  "src/p.auth/adms/authRoutes.ts",
  "src/p.user/userRoutes.ts", // ← add
];
```

### Step 3: Verify

```bash
npm run dev
# Open http://localhost:3030/api-docs
# → "Users" section should appear
```

---

## 8. Troubleshooting

| Symptom                               | Cause                                            | Fix                                               |
| ------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Module doesn't appear in UI           | Route file not in `apis` array                   | Add path to `apis` in `swagger.ts`                |
| Endpoint appears but shows no details | JSDoc comment not directly above `router.*` line | Move `@swagger` block immediately above the route |
| `SwaggerUIBundle is not defined`      | Server not running                               | Run `npm run dev`                                 |
| Wrong port in "Servers" dropdown      | `SERVER_PORT` env var not set                    | Set `SERVER_PORT=3030` in `.env`                  |
| `Cannot find module swagger-jsdoc`    | Packages not installed                           | Run `npm install`                                 |
| YAML parse error in console           | Invalid indentation in JSDoc                     | Check 2-space indent consistency                  |
| Auth lock icon missing                | No `security` block on endpoint                  | Add `security: [{ bearerAuth: [] }]`              |
| Schemas not found via `$ref`          | Typo in schema name                              | Check exact name in `swagger.ts` schemas          |

### Verify the Spec is Valid

```bash
# Check raw JSON — if it parses, JSDoc is correct
curl http://localhost:3030/swagger.json | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{JSON.parse(d);console.log('✅ Valid JSON')})"
```

---

_Reference implementation: `src/p.auth/adms/authRoutes.ts` — all patterns demonstrated._
