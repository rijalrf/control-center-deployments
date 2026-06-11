import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

import { env } from '../config/env';

const router = Router();

// GitHub OAuth
router.get('/github', AuthController.githubLogin);
router.get('/github/callback', AuthController.githubCallback);

router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
