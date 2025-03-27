import { rateLimit } from 'express-rate-limit';

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-8',
    legacyHeaders: false
});

export default rateLimiter;