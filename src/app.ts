import express, { Express, urlencoded, json } from 'express';
import authRoutes from './p.auth/adms/authRoutes';
import navRoutes from './p.nav/navRoutes';
import userRoutes from './p.user/userRoutes';
import roleRoutes from './p.role/roleRoutes';
import groupRoutes from './p.group/groupRoutes';
import assetRoutes from './p.asset/assetRoutes';
import stockRoutes from './p.stock/rt/stockRoutes';
import telcoRoutes from './p.telco/telcoRoutes';
import purchaseRoutes from './p.purchase/purchaseRoutes';
import billingRoutes from './p.billing/billingRoutes';
import jobbankRoutes from './p.jobbank/jobreposRoutes';
import maintenanceRoutes from './p.maintenance/maintenanceRoutes';
import importRoutes from './p.admin/importerRoutes';
import webstockRoutes from './s.webstock/webstockRoutes';
import summonRoutes from './p.compliance/complianceRoutes';
import notificationRoutes from './p.notification/notificationRoutes';
import errorHandler from './middlewares/errorHandler';
import corsMiddleware from './middlewares/cors';
import tokenValidator from './middlewares/tokenValidator';
import rateLimit from './middlewares/rateLimiter';
import securityHeaders from './middlewares/securityHeaders';
import logger from './utils/logger';
import path from 'path';
import fs from 'fs';
import { getUploadBaseSync } from './utils/uploadUtil';

const app: Express = express();

// Optionally trust proxy (needed if running behind Nginx/Load Balancer for correct client IPs)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);
app.options('*', corsMiddleware);
//app.use(rateLimit);
app.use(securityHeaders);

// Serve uploads directory for profile images
// Add CORS headers for static file responses
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
// Dynamically select static uploads directory.
// Priority: explicit STATIC_UPLOAD_PATH | existing /mnt/winshare | resolved upload base util
(() => {
  const explicit = process.env.STATIC_UPLOAD_PATH;
  const sharePath = '/mnt/winshare';
  let staticPath = explicit ? explicit : (fs.existsSync(sharePath) ? sharePath : getUploadBaseSync());
  try {
    // Ensure directory exists for fallback/local scenario.
    fs.mkdirSync(staticPath, { recursive: true });
  } catch (e) {
    logger.error(`Unable to ensure static uploads directory '${staticPath}': ${(e as any).message}`);
  }
  logger.info(`Serving /uploads from: ${staticPath}`);
  app.use('/uploads', express.static(staticPath));
})();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', tokenValidator, roleRoutes);
app.use('/api/groups', tokenValidator, groupRoutes);
app.use('/api/nav', tokenValidator, navRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/telco', telcoRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/bills', billingRoutes);
app.use('/api/jobs', jobbankRoutes);
app.use('/api/mtn', maintenanceRoutes);
app.use('/api/importer', tokenValidator, importRoutes);
app.use('/api/webstock', webstockRoutes);
app.use('/api/compliance', summonRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;