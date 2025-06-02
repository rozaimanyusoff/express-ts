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

const rateLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_ATTEMPTS,
    keyGenerator: (req: Request) => {
        const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        return `${ip}|${userAgent}`;
    },
    handler: async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        const key = `${ip}|${userAgent}`;
        const now = Date.now();
        blockedMap.set(key, { blockedUntil: now + BLOCK_DURATION });
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
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const key = `${ip}|${userAgent}`;
    const block = blockedMap.get(key);
    if (block && block.blockedUntil > Date.now()) {
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