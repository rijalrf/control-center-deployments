import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

import { env } from '../config/env';

const router = Router();

router.post('/login', AuthController.login);

router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
