import { rateLimit } from 'express-rate-limit';
import { logAuthActivity } from '../p.admin/logModel';
import { Request, Response, NextFunction } from 'express';

type BlockRecord = {
    blockedUntil: number;
    lastIdentity?: string | null;
    firstBlockedAt?: number;
    lastAttemptAt?: number;
};

const blockedMap = new Map<string, BlockRecord>();

// Lightweight attempt tracker to expose remaining attempts in current window
type AttemptRecord = { windowStart: number; hits: number };
const attemptMap = new Map<string, AttemptRecord>();

function trackAttemptForKey(key: string, now: number) {
    const rec = attemptMap.get(key);
    if (!rec) {
        attemptMap.set(key, { windowStart: now, hits: 1 });
        return;
    }
    // reset window if expired
    if (now - rec.windowStart >= WINDOW_MS) {
        rec.windowStart = now;
        rec.hits = 1;
    } else {
        rec.hits += 1;
    }
    attemptMap.set(key, rec);
}

export function getAttemptInfo(req: Request, routeIdOverride?: string): { current: number; remaining: number; limit: number; resetAt: number } {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket?.remoteAddress || (req as any).connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = routeIdOverride ?? `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}|${userAgent}|${routeId}`;
    const now = Date.now();
    const rec = attemptMap.get(key);
    if (!rec) {
        return { current: 0, remaining: MAX_ATTEMPTS, limit: MAX_ATTEMPTS, resetAt: now + WINDOW_MS };
    }
    // if window expired, effectively back to 0
    const inWindow = now - rec.windowStart < WINDOW_MS;
    const current = inWindow ? rec.hits : 0;
    const remaining = Math.max(0, MAX_ATTEMPTS - current);
    const resetAt = (inWindow ? rec.windowStart : now) + WINDOW_MS;
    return { current, remaining, limit: MAX_ATTEMPTS, resetAt };
}

// Read runtime configuration from env with safe defaults
const toPosInt = (v: any, defVal: number) => {
    const n = Number.parseInt(String(v ?? ''));
    return Number.isFinite(n) && n > 0 ? n : defVal;
};

// Defaults preserve existing behavior unless env overrides are set
const BLOCK_MINUTES = toPosInt(process.env.RATE_LIMIT_BLOCK_MINUTES, 60); // default 60 minutes
const BLOCK_DURATION = BLOCK_MINUTES * 60 * 1000;
const MAX_ATTEMPTS = toPosInt(process.env.RATE_LIMIT_MAX_ATTEMPTS, 5); // default 5
const WINDOW_MINUTES = toPosInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 15); // default 15 minutes
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000; // allow MAX_ATTEMPTS per WINDOW_MINUTES
// Middleware to limit the number of requests from a single IP+userAgent
// to prevent brute-force attacks
// and to block IP+userAgent for a certain period of time if the limit is exceeded
// This middleware uses express-rate-limit and a custom in-memory store

// Helper: build a stable client key (IP + user-agent)
export function getClientKey(req: Request): string {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = `${req.baseUrl || ''}${req.path || ''}`;
    return `${ip}|${userAgent}|${routeId}`;
}

// Best-effort identity extraction for observability on auth routes
function extractIdentity(req: Request): string | null {
    const b: any = (req as any).body || {};
    const val = b.emailOrUsername ?? b.email ?? b.username ?? b.contact ?? null;
    return val != null ? String(val) : null;
}

// Helper: get block info for current or specific routeId
export function getClientBlockInfo(req: Request, routeIdOverride?: string): { blocked: boolean; remainingMs: number; blockedUntil: number | null } {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket?.remoteAddress || (req as any).connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = routeIdOverride ?? `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}|${userAgent}|${routeId}`;
    const now = Date.now();
    const info = blockedMap.get(key);
    if (info && info.blockedUntil > now) {
        return { blocked: true, remainingMs: Math.max(0, info.blockedUntil - now), blockedUntil: info.blockedUntil };
    }
    return { blocked: false, remainingMs: 0, blockedUntil: null };
}

// Allow other modules to clear a client block (e.g., upon successful login)
export function clearClientBlock(req: Request) {
    const key = getClientKey(req);
    blockedMap.delete(key);
}

// Admin/utility: clear a client block by full key
export function clearClientBlockByKey(key: string): boolean {
    return blockedMap.delete(key);
}

// Admin/utility: clear by parts (ip, userAgent, routeId)
export function clearClientBlockByParams(ip: string, userAgent: string, routeId: string): boolean {
    const key = `${String(ip).trim()}|${String(userAgent).trim()}|${String(routeId).trim()}`;
    return blockedMap.delete(key);
}

// Admin/utility: list active blocks (for observability)
export function listActiveBlocks(): Array<{ key: string; ip: string; userAgent: string; route: string; blockedUntil: number; remainingMs: number; lastIdentity: string | null; firstBlockedAt: number | null; lastAttemptAt: number | null }>{
    const now = Date.now();
    const rows: Array<{ key: string; ip: string; userAgent: string; route: string; blockedUntil: number; remainingMs: number; lastIdentity: string | null; firstBlockedAt: number | null; lastAttemptAt: number | null }> = [];
    for (const [key, info] of blockedMap.entries()) {
        if (!info?.blockedUntil) continue;
        if (info.blockedUntil <= now) continue;
        const [ip = '', userAgent = '', route = ''] = key.split('|');
        rows.push({
            key,
            ip,
            userAgent,
            route,
            blockedUntil: info.blockedUntil,
            remainingMs: Math.max(0, info.blockedUntil - now),
            lastIdentity: info.lastIdentity ?? null,
            firstBlockedAt: info.firstBlockedAt ?? null,
            lastAttemptAt: info.lastAttemptAt ?? null
        });
    }
    return rows;
}

// Periodic cleanup of expired blocks to avoid memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, info] of blockedMap.entries()) {
        if (info.blockedUntil <= now) blockedMap.delete(key);
    }
}, CLEANUP_INTERVAL).unref?.();

const rateLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_ATTEMPTS,
    keyGenerator: (req: Request) => getClientKey(req),
    handler: async (req: Request, res: Response, next: NextFunction) => {
        const key = getClientKey(req);
        const now = Date.now();
        const prev = blockedMap.get(key);
        const identity = extractIdentity(req);
        blockedMap.set(key, {
            blockedUntil: now + BLOCK_DURATION,
            lastIdentity: identity ?? prev?.lastIdentity ?? null,
            firstBlockedAt: prev?.firstBlockedAt ?? now,
            lastAttemptAt: now
        });
        const [ip, userAgent] = key.split('|');
        await logAuthActivity(0, 'other', 'fail', { reason: 'rate_limit_block', ip, userAgent }, req).catch(() => {});
        // Communicate retry information for frontend UX (countdown)
        const retryAfterSec = Math.ceil(BLOCK_DURATION / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
            status: 'error',
            code: 429,
            message: 'Too many requests. This IP and device are temporarily blocked.',
            retryAfter: retryAfterSec
        });
    },
    standardHeaders: 'draft-8',
    legacyHeaders: false
});

// Middleware to check if IP+userAgent is blocked
function ipBlocker(req: Request, res: Response, next: NextFunction) {
    const key = getClientKey(req);
    const block = blockedMap.get(key);
    if (block && block.blockedUntil > Date.now()) {
        const [ip, userAgent] = key.split('|');
        logAuthActivity(0, 'other', 'fail', { reason: 'ip_blocked', ip, userAgent }, req).catch(() => {});
        // Update metadata for observability
        try {
            const identity = extractIdentity(req);
            block.lastIdentity = identity ?? block.lastIdentity ?? null;
            block.lastAttemptAt = Date.now();
            blockedMap.set(key, block);
        } catch {}
        const remainingMs = Math.max(0, block.blockedUntil - Date.now());
        const retryAfterSec = Math.ceil(remainingMs / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
            status: 'error',
            code: 429,
            message: 'This IP and device are temporarily blocked due to too many requests.',
            retryAfter: retryAfterSec,
            blockedUntil: block.blockedUntil
        });
        return;
    }
    if (block && block.blockedUntil <= Date.now()) {
        blockedMap.delete(key);
    }
    // Track this attempt for remaining-attempts visibility
    try { trackAttemptForKey(key, Date.now()); } catch {}
    next();
}

export default [ipBlocker as import('express').RequestHandler, rateLimiter];