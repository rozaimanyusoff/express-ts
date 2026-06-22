import { Router } from 'express';
import { getEmailConfig, sendTestEmail } from './emailController';

const router = Router();

router.get('/config', getEmailConfig);
router.post('/test', sendTestEmail);

export default router;
