// API Security Recommendations

# API Security Recommendations

This document outlines prioritized, concrete improvements for the API’s security posture based on a quick review of middleware, auth, and related wiring. Each section includes rationale and actionable suggestions you can implement incrementally.

## Priorities (Fix in This Order)

1) Unprotected endpoints: default-protect all `/api` routes; allowlist public ones.
2) JWT verification hardening: remove fallback secret, restrict algorithms, consider session checks.
3) CORS alignment: remove wildcards where credentials are used; unify allowed origins across API, static, and Socket.IO.
4) Helmet/CSP tightening: avoid `unsafe-inline`; add HSTS/COOP/COEP; remove deprecated options.
5) Rate limiting & IP extraction: enable a global limiter; handle `x-forwarded-for` properly; plan for shared store.
6) Uploads & static files: enforce file type/size limits; avoid blanket `*` for static; use configured base path.
7) Error handling: avoid leaking internals; use logger; respect `headersSent`.

---

## Auth & JWT

- Files of interest
  - `src/middlewares/tokenValidator.ts`
  - `src/app.ts`
  - `src/p.auth/adms/authController.ts`

- Implemented
  - Hardened `tokenValidator`:
    - No insecure fallback secret; responds 500 if `JWT_SECRET` is not set.
    - Restricts verification to `HS256` algorithms only.
    - Returns 401 consistently on invalid/expired tokens.
    - Optional per-request DB session validation when `SINGLE_SESSION_ENFORCEMENT=true`.

- Issues (remaining)
  - Many non-auth routers are mounted without `tokenValidator` by default.

- Recommendations
  - Fail fast if `process.env.JWT_SECRET` is missing; never default to a literal.
  - Restrict algorithms on `jwt.verify` (e.g., `['HS256']`). Optionally validate `iss`/`aud` claims.
  - Return 401 on invalid/expired tokens with a consistent body (do not leak specifics).
  - Verify DB session token in `tokenValidator` (compare `decoded.session` with stored session) when single-session enforcement is enabled. This is implemented.
  - Default-protect all `/api` routes: mount `tokenValidator` on `/api`, then explicitly allowlist public routes (login, register, reset flows, activation, refresh-token, email action links that must be public, etc.).

- Example approach (pseudocode)
  - tokenValidator.ts
    ```ts
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    // Optionally: check decoded.iss/aud; check DB session if enabled
    ```
  - app.ts
    ```ts
    // Public routes first
    app.use('/api/auth', authRoutes);
    // Then guard the remainder by default
    app.use('/api', tokenValidator);
    // Mount protected routers
    app.use('/api/users', userRoutes);
    // ...
    ```

- Refresh tokens
  - Current `/refresh-token` relies on the same short-lived token; consider implementing a proper refresh token flow with httpOnly, secure cookies, rotation, and revocation.

---

## CORS

- Files of interest
  - `src/middlewares/cors.ts`
  - `src/app.ts` (static `/uploads` headers)
  - `src/server.ts` (Socket.IO CORS)

- Issues
  - API allowed origins are hardcoded; not env-driven.
  - Static `/uploads` responses add `Access-Control-Allow-Origin: *` while the API uses credentials — these conflict under some scenarios.
  - Socket.IO CORS is `'*'`.

- Recommendations
  - Move allowed origins to an env var (comma-separated), support regex if needed; log rejects for visibility.
  - If `credentials: true` for API, avoid `*` anywhere for those endpoints.
  - For `/uploads`, if assets are public, `*` may be acceptable; otherwise restrict to the same origin list as the API.
  - Align Socket.IO `origin` with API CORS config. Consider namespacing and auth at connection.

- Example approach
  - cors.ts
    ```ts
    const origins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    const allow = (origin?: string) => !origin || origins.includes(origin);
    ```
  - server.ts (Socket.IO)
    ```ts
    const io = new Server(httpServer, {
      cors: { origin: origins, methods: ['GET','POST'] }
    });
    ```

---

## Security Headers (Helmet/CSP)

- File of interest
  - `src/middlewares/securityHeaders.ts`

- Issues
  - Uses `"'unsafe-inline'"` in `scriptSrc`/`styleSrc`.
  - `xssFilter` is deprecated in Helmet.

- Recommendations
  - Remove `xssFilter`. Prefer modern defaults.
  - Avoid `unsafe-inline`; migrate to nonces or hashes. If migration is not feasible immediately, start by tightening other directives and plan a nonce rollout.
  - Add `hsts` (production-only): e.g., `maxAge ~ 180 days`, `includeSubDomains`, `preload` if appropriate.
  - Add `crossOriginOpenerPolicy` and `crossOriginEmbedderPolicy` if app supports them.
  - Keep `frameguard: 'deny'` and `hidePoweredBy`.

- Example approach
  ```ts
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], /* avoid unsafe-inline */ }},
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000 } : false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: process.env.COEP === 'true' ? true : false,
    hidePoweredBy: true,
  })
  ```

---

## Rate Limiting & Abuse Controls

- File of interest
  - `src/middlewares/rateLimiter.ts`
  - `src/app.ts`

- Implemented
  - Per-route client keying for auth limiter: key = first X-Forwarded-For IP + user-agent + route path.
  - Cleanup cycle for expired blocks and clear-on-success after login.
  - Optional `app.set('trust proxy', 1)` under `TRUST_PROXY=true` for correct IP extraction behind proxies.

- Issues
  - Global rate limiter remains disabled.
  - In-memory store is not shared across instances and won’t survive restarts.

- Recommendations
  - Enable a modest global rate limiter (e.g., 100–300 req/15 min) in addition to strict auth endpoints limits.
  - If behind a proxy, add `app.set('trust proxy', true)` in `app.ts` and parse the first IP from `x-forwarded-for`.
  - Move rate limit store and block list to Redis (or similar) when scaling horizontally.
  - Consider separate stricter limits for login, reset-password, and activation endpoints.

- Example IP extraction
  ```ts
  const xfwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = xfwd || req.socket?.remoteAddress || '';
  ```

---

## Error Handling

- File of interest
  - `src/middlewares/errorHandler.ts`

- Issues
  - Uses `console.error` instead of central logger.
  - Doesn’t check `res.headersSent` before responding.

- Recommendations
  - If `res.headersSent`, delegate to `next(err)`.
  - Use existing `logger` util.
  - Only expose generic messages for 5xx; consider adding a `code` field and correlation IDs for tracing.

- Example approach
  ```ts
  if (res.headersSent) return next(err);
  logger.error('Global error handler', { err });
  res.status(status).json({ status: false, message: prod ? 'Internal Server Error' : err.message });
  ```

---

## RSA Decrypt Middleware

- File of interest
  - `src/middlewares/rsaDecrypt.ts`

- Issues
  - Reads private key from a fixed relative path at module load.

- Recommendations
  - If continuing to use, read key path from env and handle missing key with a clear startup error.
  - Avoid logging any decrypted credentials.
  - Prefer TLS to prevent needing application-layer crypto for passwords. Consider removing this middleware if not strictly necessary.

---

## File Uploads & Static Files

- Files of interest
  - `src/utils/fileUploader.ts`
  - `src/utils/uploadUtil.ts`
  - `src/p.user/userRoutes.ts`
  - `src/app.ts` (static `/uploads` mount)

- Issues
  - Profile upload uses `multer()` without limits or type filter.
  - Static `/uploads` is served from a hardcoded path with permissive CORS.

- Recommendations
  - Swap to `createUploader('users/profile')` and `validateUploadedFile` where appropriate. Ensure max size and MIME filters are applied.
  - Use `UPLOAD_BASE_PATH` (via `uploadUtil`) to determine storage and serve from that base.
  - Configure static serving options (`immutable`, `maxAge`, `dotfiles: 'ignore'`) and avoid `*` for origins unless truly public.

- Example router change
  ```ts
  import { createUploader, validateUploadedFile } from '../utils/fileUploader';
  const uploadProfile = createUploader('users/profile');
  router.put('/update-profile', tokenValidator, uploadProfile.single('profileImage'), validateUploadedFile, handler);
  ```

---

## Input Validation & Sanitization

- Recommendation
  - Add a validation middleware layer with Zod/Joi/Celebrate to enforce schemas for `req.body`, `req.params`, `req.query` per route. Start with auth, user management, and any endpoints that write to DB.
  - Normalize/trim inputs at the edge; encode or sanitize any user-supplied content that could reflect in responses (mostly a frontend concern, but consider server-side normalization).

---

## Operational Hardening

- Body size limits
  - Current JSON/urlencoded limit is 10MB. Lower defaults (e.g., 1–2MB) and selectively raise for endpoints that need larger payloads.

- Logging
  - Add HTTP access logging (e.g., `pino-http` or `morgan`) with redaction of `authorization`, `cookie`, and sensitive fields.
  - Ensure security-sensitive events (login failures, rate-limit blocks) are consistent in structure for easier alerting.

- Trust proxy
  - If behind a load balancer/reverse proxy, set `app.set('trust proxy', true)` to ensure accurate IP extraction.

---

## Socket.IO

- File of interest
  - `src/server.ts`

- Issues
  - CORS `origin: '*'`.

- Recommendations
  - Use the same allowed origins list as the API.
  - Consider an authentication handshake (JWT in `auth` payload) and verify on `connection`.
  - Apply namespacing as needed and consider per-namespace rate limits.

- Example approach
  ```ts
  const io = new Server(httpServer, { cors: { origin: origins, methods: ['GET','POST'] }});
  io.use((socket, next) => { /* verify JWT here */ next(); });
  ```

---

## Suggested Next Steps (Walkthrough Plan)

1) Guard `/api` by default, allowlist public routes in `authRoutes`.
2) [Done] Harden `tokenValidator` (no fallback secret, restrict algs, 401 on invalid, optional session check).
3) Align CORS across API, `/uploads`, and Socket.IO using env-driven origins.
4) Tighten Helmet: remove deprecated options, add HSTS/COOP/COEP, plan nonce rollout to drop `unsafe-inline`.
5) Enable a small global rate limiter; fix IP parsing; add `app.set('trust proxy', true)` as needed. [Partially done: trust proxy toggle, per-route keys, clear-on-success]
6) Migrate profile upload to `createUploader` with size/MIME limits; serve uploads from configured base with strict options.
7) Improve error handler logging and `headersSent` handling.
8) (Optional) Implement proper refresh tokens with cookie storage and rotation.

Each step can be implemented and tested independently. I can start with steps 1–3 unless you prefer a different order.

