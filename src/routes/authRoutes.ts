// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';
import { register, login } from '../controllers/authController';
import accountValidator from '../middlewares/accountValidator';
import asyncHandler from '../utils/asyncHandler';
import tokenValidator from '../middlewares/tokenValidator';

const router = Router();
router.post('/register', accountValidator, asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/protected', tokenValidator, (req, res) => {
  res.status(200).json({ message: 'This is a protected route' });
});

export default router;