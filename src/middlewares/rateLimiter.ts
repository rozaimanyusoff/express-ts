import { rateLimit } from 'express-rate-limit';
import { logAuthActivity } from '../p.admin/logModel';
import { Request, Response, NextFunction } from 'express';

const blockedMap = new Map<string, { blockedUntil: number }>();
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window duration. allow 5 attempts every window (15 minutes)
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

// Allow other modules to clear a client block (e.g., upon successful login)
export function clearClientBlock(req: Request) {
    const key = getClientKey(req);
    blockedMap.delete(key);
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
        blockedMap.set(key, { blockedUntil: now + BLOCK_DURATION });
    const [ip, userAgent] = key.split('|');
        await logAuthActivity(0, 'other', 'fail', { reason: 'rate_limit_block', ip, userAgent }, req).catch(() => {});
        res.status(429).json({
            status: 'error',
            code: 429,
            message: 'Too many requests. This IP and device are temporarily blocked.'
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
        res.status(429).json({
            status: 'error',
            code: 429,
            message: 'This IP and device are temporarily blocked due to too many requests.'
        });
        return;
    }
    if (block && block.blockedUntil <= Date.now()) {
        blockedMap.delete(key);
    }
    next();
}

export default [ipBlocker as import('express').RequestHandler, rateLimiter];