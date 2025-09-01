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
import jobbankRoutes from './p.jobbank/jobbankRoutes';
import maintenanceRoutes from './p.maintenance/maintenanceRoutes';
import importRoutes from './p.admin/importerRoutes';
import webstockRoutes from './s.webstock/webstockRoutes';
import summonRoutes from './p.compliance/complianceRoutes';
import errorHandler from './middlewares/errorHandler';
import corsMiddleware from './middlewares/cors';
import tokenValidator from './middlewares/tokenValidator';
import rateLimit from './middlewares/rateLimiter';
import securityHeaders from './middlewares/securityHeaders';
import logger from './utils/logger';
import path from 'path';

const app: Express = express();

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
app.use('/uploads', express.static('/mnt/winshare'));

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
app.use('/api/jobbank', jobbankRoutes);
app.use('/api/mtn', maintenanceRoutes);
app.use('/api/importer', tokenValidator, importRoutes);
app.use('/api/webstock', webstockRoutes);
app.use('/api/compliance', summonRoutes);

app.use(errorHandler);

export default app;