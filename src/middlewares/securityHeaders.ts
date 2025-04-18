import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                connectSrc: [
                    "'self'",
                    'https://serv.ranhilltechnologies.com.my' // ✅ allow XHR/fetch to API
                ],
                fontSrc: ["'self'", "https:"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        referrerPolicy: { policy: 'no-referrer' },
        frameguard: { action: 'deny' },
        xssFilter: true,
        hidePoweredBy: true,
    })(req, res, next);
};

export default securityHeaders;