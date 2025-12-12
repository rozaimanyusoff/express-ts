import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    helmet({
        contentSecurityPolicy: {
            directives: {
                connectSrc: [
                    "'self'",
                    'https://serv.ranhilltechnologies.com.my' // ✅ allow XHR/fetch to API
                ],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", "https:"],
                imgSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                upgradeInsecureRequests: [],
            },
        },
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        referrerPolicy: { policy: 'no-referrer' },
        xssFilter: true,
    })(req, res, next);
};

export default securityHeaders;