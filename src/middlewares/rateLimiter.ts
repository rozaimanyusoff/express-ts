import { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

import { logAuthActivity } from '../utils/authLogger';

interface BlockRecord {
    blockedUntil: number;
    firstBlockedAt?: number;
    lastAttemptAt?: number;
    lastIdentity?: null | string;
}

const blockedMap = new Map<string, BlockRecord>();

// Lightweight attempt tracker to expose remaining attempts in current window
// We track FAILED login attempts per client key within a sliding window.
// This powers the UI's "remaining attempts" without counting successful logins.
interface AttemptRecord { fails: number; windowStart: number; }
const attemptMap = new Map<string, AttemptRecord>();

export function getAttemptInfo(req: Request, routeIdOverride?: string): { current: number; limit: number; remaining: number; resetAt: number } {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket.remoteAddress || (req as any).connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = routeIdOverride ?? `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}|${userAgent}|${routeId}`;
    const now = Date.now();
    const rec = attemptMap.get(key);
    if (!rec) {
        return { current: 0, limit: MAX_ATTEMPTS, remaining: MAX_ATTEMPTS, resetAt: now + WINDOW_MS };
    }
    // if window expired, effectively back to 0
    const inWindow = now - rec.windowStart < WINDOW_MS;
    const current = inWindow ? rec.fails : 0;
    const remaining = Math.max(0, MAX_ATTEMPTS - current);
    const resetAt = (inWindow ? rec.windowStart : now) + WINDOW_MS;
    return { current, limit: MAX_ATTEMPTS, remaining, resetAt };
}

// Increment failed-attempt counter for current window (used by controllers on auth failure)
export function recordFailedAttempt(req: Request, routeIdOverride?: string) {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket.remoteAddress || (req as any).connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = routeIdOverride ?? `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}|${userAgent}|${routeId}`;
    const now = Date.now();
    const rec = attemptMap.get(key);
    if (!rec) {
        attemptMap.set(key, { fails: 1, windowStart: now });
        return;
    }
    if (now - rec.windowStart >= WINDOW_MS) {
        rec.windowStart = now;
        rec.fails = 1;
    } else {
        rec.fails += 1;
    }
    attemptMap.set(key, rec);
}

// Reset failed-attempts for the current client key (used on successful auth)
export function resetAttempts(req: Request, routeIdOverride?: string) {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket.remoteAddress || (req as any).connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = routeIdOverride ?? `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}|${userAgent}|${routeId}`;
    attemptMap.delete(key);
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

// Helper: get block info for current or specific routeId
export function getClientBlockInfo(req: Request, routeIdOverride?: string): { blocked: boolean; blockedUntil: null | number; remainingMs: number; } {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket.remoteAddress || (req as any).connection?.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = routeIdOverride ?? `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}|${userAgent}|${routeId}`;
    const now = Date.now();
    const info = blockedMap.get(key);
    if (info && info.blockedUntil > now) {
        return { blocked: true, blockedUntil: info.blockedUntil, remainingMs: Math.max(0, info.blockedUntil - now) };
    }
    return { blocked: false, blockedUntil: null, remainingMs: 0 };
}

// Helper: build a stable client key (IP + user-agent)
export function getClientKey(req: Request): string {
    const xfwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(xfwd) ? xfwd[0] : (xfwd || '');
    const ip = String(forwarded || req.ip || req.socket.remoteAddress || req.connection.remoteAddress || '')
        .split(',')[0]
        .trim();
    const userAgent = String(req.headers['user-agent'] || '').trim();
    const routeId = `${req.baseUrl || ''}${req.path || ''}`;
    return `${ip}|${userAgent}|${routeId}`;
}

// Admin/utility: list active blocks (for observability)
export function listActiveBlocks(): { blockedUntil: number; firstBlockedAt: null | number; ip: string; key: string; lastAttemptAt: null | number; lastIdentity: null | string; remainingMs: number; route: string; userAgent: string; }[]{
    const now = Date.now();
    const rows: { blockedUntil: number; firstBlockedAt: null | number; ip: string; key: string; lastAttemptAt: null | number; lastIdentity: null | string; remainingMs: number; route: string; userAgent: string; }[] = [];
    for (const [key, info] of blockedMap.entries()) {
        if (!info.blockedUntil) continue;
        if (info.blockedUntil <= now) continue;
        const [ip = '', userAgent = '', route = ''] = key.split('|');
        rows.push({
            blockedUntil: info.blockedUntil,
            firstBlockedAt: info.firstBlockedAt ?? null,
            ip,
            key,
            lastAttemptAt: info.lastAttemptAt ?? null,
            lastIdentity: info.lastIdentity ?? null,
            remainingMs: Math.max(0, info.blockedUntil - now),
            route,
            userAgent
        });
    }
    return rows;
}

// Best-effort identity extraction for observability on auth routes
function extractIdentity(req: Request): null | string {
    const b: any = (req as any).body || {};
    const val = b.emailOrUsername ?? b.email ?? b.username ?? b.contact ?? null;
    return val != null ? String(val) : null;
}

// Periodic cleanup of expired blocks to avoid memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_BLOCKED_ENTRIES = 10000; // Prevent unbounded memory growth

const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let deleted = 0;
    
    // Remove expired entries
    for (const [key, info] of blockedMap.entries()) {
        if (info.blockedUntil <= now) {
            blockedMap.delete(key);
            deleted++;
        }
    }
    
    // If still over limit, remove oldest entries
    if (blockedMap.size > MAX_BLOCKED_ENTRIES) {
        const entriesToRemove = blockedMap.size - MAX_BLOCKED_ENTRIES;
        let removed = 0;
        for (const [key] of blockedMap.entries()) {
            if (removed >= entriesToRemove) break;
            blockedMap.delete(key);
            removed++;
        }
    }
    
    if (deleted > 0) {
        console.log(`[RateLimiter] Cleanup: removed ${deleted} expired entries, total: ${blockedMap.size}`);
    }
}, CLEANUP_INTERVAL);

// Attempt map cleanup with max size
const attemptCleanupInterval = setInterval(() => {
    const now = Date.now();
    let deleted = 0;
    
    // Remove expired attempt records
    for (const [key, rec] of attemptMap.entries()) {
        if (now - rec.windowStart >= WINDOW_MS) {
            attemptMap.delete(key);
            deleted++;
        }
    }
    
    // Enforce max size on attempt map
    if (attemptMap.size > MAX_BLOCKED_ENTRIES) {
        const entriesToRemove = attemptMap.size - MAX_BLOCKED_ENTRIES;
        let removed = 0;
        for (const [key] of attemptMap.entries()) {
            if (removed >= entriesToRemove) break;
            attemptMap.delete(key);
            removed++;
        }
    }
    
    if (deleted > 0) {
        console.log(`[RateLimiter] Attempt cleanup: removed ${deleted} expired records, total: ${attemptMap.size}`);
    }
}, CLEANUP_INTERVAL);

// Prevent cleanup timers from blocking process exit
cleanupInterval.unref();
attemptCleanupInterval.unref();

const rateLimiter = rateLimit({
    handler: async (req: Request, res: Response, next: NextFunction) => {
        const key = getClientKey(req);
        const now = Date.now();
        const prev = blockedMap.get(key);
        const identity = extractIdentity(req);
        blockedMap.set(key, {
            blockedUntil: now + BLOCK_DURATION,
            firstBlockedAt: prev?.firstBlockedAt ?? now,
            lastAttemptAt: now,
            lastIdentity: identity ?? prev?.lastIdentity ?? null
        });
        const [ip, userAgent] = key.split('|');
        await logAuthActivity(0, 'other', 'fail', { ip, reason: 'rate_limit_block', userAgent }, req).catch(() => {});
        // Communicate retry information for frontend UX (countdown)
        const retryAfterSec = Math.ceil(BLOCK_DURATION / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
            code: 429,
            message: 'Too many requests. This IP and device are temporarily blocked.',
            retryAfter: retryAfterSec,
            status: 'error'
        });
    },
    keyGenerator: (req: Request) => getClientKey(req),
    legacyHeaders: false,
    max: MAX_ATTEMPTS,
    standardHeaders: 'draft-8',
    windowMs: WINDOW_MS
});

// Middleware to check if IP+userAgent is blocked
function ipBlocker(req: Request, res: Response, next: NextFunction) {
    const key = getClientKey(req);
    const block = blockedMap.get(key);
    if (block && block.blockedUntil > Date.now()) {
        const [ip, userAgent] = key.split('|');
        logAuthActivity(0, 'other', 'fail', { ip, reason: 'ip_blocked', userAgent }, req).catch(() => {});
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
            blockedUntil: block.blockedUntil,
            code: 429,
            message: 'This IP and device are temporarily blocked due to too many requests.',
            retryAfter: retryAfterSec,
            status: 'error'
        });
        return;
    }
    if (block && block.blockedUntil <= Date.now()) {
        blockedMap.delete(key);
    }
    next();
}

export default [ipBlocker as import('express').RequestHandler, rateLimiter];